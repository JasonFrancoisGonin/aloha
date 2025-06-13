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

import { AuthenticationStrategy } from "aloha-shared";
import cookie_parser from "cookie-parser";
import express from "express";
import path from "path";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { setAuthPlugins } from "../middleware/authorise";
import jwtAuthenticationStrategy from "../middleware/jwt-authentication";
import noAuthenticationStrategy from "../middleware/no-authentication";
import { clientsRoutes } from "./clients";
import { projectsRoutes } from "./projects";
import { serverRoutes } from "./servers";
import { serverProxyRoutes } from "./servers-proxy";
import { tokensRoutes } from "./tokens";
import { userInfoRouter } from "./user-info";
import { usersRoutes } from "./users";
import promMid from "express-prometheus-middleware";
import { agentRoutes } from "./agents";
import { hubRouter } from "./hub";

const logger = getLogger("EXPRESS-SETUP");

async function loadAuthPlugins(): Promise<
  AuthenticationStrategy.AuthenticationStrategy[]
> {
  const log = logger();
  log.info("Loading auth plugins");
  const plugins: AuthenticationStrategy.AuthenticationStrategy[] = [];
  if (process.env.DEFAULT_JWT_AUTHENTICATION !== "false") {
    log.info("Use JWT AuthenticationStrategy");
    plugins.push(jwtAuthenticationStrategy);
  }
  const pluginPath = process.env.AUTHENTICATION_PLUGIN;
  if (!pluginPath) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTHENTICATION_PLUGIN environment variable not set");
    } else {
      log.info("Use NO Auth AuthenticationStrategy");
      plugins.push(noAuthenticationStrategy);
    }
  } else {
    try {
      const paths = pluginPath.split(":");
      for (const path of paths) {
        log.info({ path }, "Loading plugin AuthenticationStrategy");

        const pluginModule = (await import(path)) as {
          default: AuthenticationStrategy.AuthenticationStrategy;
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
        const userRepository = injector.resolve("userRepository");
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
        labels.user = req.user?.id || "anonymous";
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

  // Add react dist and health endpoints, if in production
  if (process.env.NODE_ENV === "production") {
    const clientDir = process.env.CLIENT_DIR;
    if (!clientDir) {
      throw new Error("CLIENT_DIR env variable is not defined");
    }
    app.use(express.static(clientDir));
    // Serve index.html for all undefined routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });

    app.get("/healtz", (_req, res) => {
      res.header("X-Health-Check", "Ok").send("alive");
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
