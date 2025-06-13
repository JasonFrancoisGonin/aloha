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
import { RequestHandler } from "express";
import { getLogger } from "../injector/provide-logger";

const logger = getLogger("AUTHORISE");

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticationStrategy.UserPrincipal;
    }
  }
}

let authPlugins: AuthenticationStrategy.AuthenticationStrategy[];

export function getAuthPlugins() {
  return authPlugins;
}

export function setAuthPlugins(
  plugin: AuthenticationStrategy.AuthenticationStrategy[]
) {
  authPlugins = plugin;
}

export function authorise(requiredPermissions?: string[]): RequestHandler {
  if (requiredPermissions === undefined) {
    return (_req, _res, next) => {
      logger().info("No permission to check, pass to next RequestHandler");
      next();
    };
  }

  return async (req, res, next) => {
    const log = logger().child({
      method: req.method,
      originalUrl: req.originalUrl,
    });

    if (!req.user) {
      log.error("No user logged in");
      res.status(401).json({ error: "Not authenticated" });
    } else {
      let check: boolean = false;

      for (const p of authPlugins) {
        check = await p.checkPermissions(req.user, requiredPermissions);
        if (check) {
          const info = await p.getInfo();
          log.info({ provider: info.provider }, "Check passed");
          break;
        }
      }

      if (check) {
        return next();
      }
      log.error("No plugin auhorized the request");
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
  };
}
