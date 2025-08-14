/*
Copyright (C) 2025 European Union
 
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the
European Commission – subsequent versions of the EUPL (the “Licence”);
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12 *

Unless required by applicable law or agreed to in writing, software distributed under
the Licence is distributed on an “AS IS” basis, WITHOUT WARRANTIES OR CONDITIONS
OF ANY KIND, either express or implied. See the Licence for the specific language
governing permissions and limitations under the Licence.
*/

import { authentication_strategy } from "aloha-shared";
import cookie_parser from "cookie-parser";
import express from "express";
import promMid from "express-prometheus-middleware";
import session from "express-session";
import path from "path";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { setAuthPlugins } from "../middleware/authorise";
import jwtAuthenticationStrategy from "../middleware/jwt-authentication";
import noAuthenticationStrategy from "../middleware/no-authentication";
import { agentRoutes } from "./agents";
import { clientsRoutes } from "./clients";
import { hubRouter } from "./hub";
import { projectsRoutes } from "./projects";
import { serverRoutes } from "./servers";
import { serverProxyRoutes } from "./servers-proxy";
import { testbedAgentRoutes } from "./testbed-agents";
import { tokensRoutes } from "./tokens";
import { userInfoRouter } from "./user-info";
import { usersRoutes } from "./users";
import { testbedAgentProxyRoutes } from "./testbed-agents-proxy";

const logger = getLogger("EXPRESS-SETUP");

async function loadAuthPlugins(): Promise<
  authentication_strategy.AuthenticationStrategy[]
> {
  const log = logger();
  log.info("Loading auth plugins");
  const plugins: authentication_strategy.AuthenticationStrategy[] = [];

  if (injector().resolve("defaultJWTAuthentication")) {
    log.info("Use JWT AuthenticationStrategy");
    plugins.push(jwtAuthenticationStrategy);
    await jwtAuthenticationStrategy.init({
      loggerFactory: getLogger("JWT-Authentication"),
    });
  }

  const pluginPath = injector().resolve("pluginPath");

  if (!pluginPath) {
    if (injector().resolve("isProduction")) {
      throw new Error("AUTHENTICATION_PLUGIN environment variable not set");
    } else {
      log.info("Use NO Auth AuthenticationStrategy");
      plugins.push(noAuthenticationStrategy);
      await noAuthenticationStrategy.init({
        loggerFactory: getLogger("No-Authentication"),
      });
    }
  } else {
    try {
      const paths = pluginPath.split(":");
      for (const path of paths) {
        log.info({ path }, "Loading plugin AuthenticationStrategy");

        const pluginModule = (await import(path)) as {
          default: authentication_strategy.AuthenticationStrategy;
        };

        await pluginModule.default.init({
          loggerFactory: getLogger("PLUGIN"),
        });
        plugins.push(pluginModule.default || pluginModule);
      }
    } catch (error: unknown) {
      log.error(error);
      throw new Error(`Failed to load auth plugin`);
    }
  }
  return plugins;
}

export async function expressSetup() {
  const app = express();

  const sessionConfig: session.SessionOptions = {
    secret: injector().resolve("sessionSecret"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: injector().resolve("isProduction"),
      maxAge: injector().resolve("sessionMaxAge"),
    },
    store: injector().resolve("sessionStore"),
  };
  app.set("trust proxy", 1);
  app.use(session(sessionConfig));

  // Load authentication plugin
  const authPlugins = await loadAuthPlugins();
  setAuthPlugins(authPlugins);

  app.use(cookie_parser());

  // Apply authentication middlewares
  const log = logger();

  log.info("Registering AuthenticationStrategy middlewares");
  for (const plugin of authPlugins) {
    app.use(
      await plugin.getAuthenticationMiddleware(async (username: string) => {
        const userRepository = injector().resolve("userRepository");
        return await userRepository.findByUserId(username);
      })
    );
  }

  log.info("Registering prometheus endpoint");
  app.use(
    promMid({
      metricsPath: "/metrics",
      prefix: "aloha_",
      collectDefaultMetrics: true,
      requestDurationBuckets: [0.1, 0.5, 1, 1.5],
      requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
      responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
      customLabels: ["user"],
      transformLabels: (labels, req) => {
        if (!authentication_strategy.isUserAuthenticated(req)) {
          return "anonymous";
        }
        labels.user = authentication_strategy.getUserFromSession(req).id;
      },
    })
  );

  log.info("Registering login endpoint");
  app.use(
    "/api/login",
    ...(await Promise.all(authPlugins.map((plugin) => plugin.login())))
  );

  log.info("Registering logout endpoint");
  app.use(
    "/api/logout",
    ...(await Promise.all(authPlugins.map((plugin) => plugin.logout())))
  );

  // Apply routes
  log.info("Registering API routes");

  app.use("/api/hub/", hubRouter());
  app.use("/api/user-info/", userInfoRouter());
  app.use("/api/mcp/", serverProxyRoutes());
  app.use("/api/client/", clientsRoutes());
  app.use("/api/server/", serverRoutes());
  app.use("/api/user/", usersRoutes());
  app.use("/api/token/", tokensRoutes());
  app.use("/api/project/", projectsRoutes());
  app.use("/api/agent/", agentRoutes());
  app.use("/api/testbedAgent/", testbedAgentRoutes());
  app.use("/api/testbedAgentProxy/", testbedAgentProxyRoutes());

  // Add react dist and health endpoints, if in production
  if (injector().resolve("isProduction")) {
    const clientDir = process.env.CLIENT_DIR;
    if (!clientDir) {
      throw new Error("CLIENT_DIR env variable is not defined");
    }

    // Serve index.html for all undefined routes

    logger().info("Registering healtz route");
    app.get("/healtz", (_req, res) => {
      res.header("X-Health-Check", "Ok").send("alive");
    });

    logger().info("Registering static data route");
    app.use(express.static(clientDir));

    logger().info("Registering all routes");
    app.use((req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  // Error handling middleware
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      logger().error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  );

  return app;
}
