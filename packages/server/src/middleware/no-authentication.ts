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
import { NextFunction, Request, RequestHandler, Response } from "express";
import { getLogger } from "../injector/provide-logger";

export const NO_AUTHENTICATION_USER_ID = "NOAUTH_user";

const logger = getLogger("NO-AUTH-MIDDLEWARE");

const PROVIDER_NAME = "NO-AUTH";

const noAuthenticationStrategy: AuthenticationStrategy.AuthenticationStrategy =
  {
    async init() {},

    // eslint-disable-next-line @typescript-eslint/require-await
    async getAuthenticationMiddleware(): Promise<
      RequestHandler | RequestHandler[]
    > {
      logger().info(
        "Server is starting without authentication. Use it only in development environment."
      );
      return (req, res, next) => {
        if (!req.user) {
          req.user = {
            id: NO_AUTHENTICATION_USER_ID,
            userId: NO_AUTHENTICATION_USER_ID,
            displayName: "Developer",
            permissions: Object.values(AuthenticationStrategy.Permissions),
            provider: PROVIDER_NAME,
          };
        }
        next();
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async checkPermissions() {
      return true;
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async login() {
      return (_req: Request, _res: Response, next: NextFunction) => {
        next();
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async logout() {
      return (_req: Request, _res: Response, next: NextFunction) => {
        next();
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async getInfo() {
      return {
        provider: PROVIDER_NAME,
      };
    },
  };

export default noAuthenticationStrategy;
