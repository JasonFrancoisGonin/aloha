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
import { NextFunction, Request, RequestHandler, Response } from "express";
import { getLogger } from "../injector/provide-logger";
import { injector } from "../injector/injector";

export const NO_AUTHENTICATION_USER_ID = "NOAUTH_user";

const logger = getLogger("NO-AUTH-MIDDLEWARE");

const PROVIDER_NAME = "NO-AUTH";

const userRepository = () => injector().resolve("userRepository");

let notAuthenticatedUserId: string | undefined = undefined;

const noAuthenticationStrategy: authentication_strategy.AuthenticationStrategy =
  {
    async init() {
      const user = await userRepository().findByUserId(
        NO_AUTHENTICATION_USER_ID
      );
      if (!user) {
        const inserted = await userRepository().create({
          userId: NO_AUTHENTICATION_USER_ID,
          fullName: "Developer",
          permissions: Object.values(authentication_strategy.Permissions),
        });

        logger().debug("Created default user for no-authentication strategy");
        notAuthenticatedUserId = inserted.id;
      } else {
        logger().debug("Default user for no-authentication strategy exists");
        notAuthenticatedUserId = user.id;
      }
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async getAuthenticationMiddleware(): Promise<
      RequestHandler | RequestHandler[]
    > {
      logger().warn(
        "Server is starting without authentication. Use it only in development environment."
      );

      return (req, res, next) => {
        next();
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async checkPermissions() {
      return true;
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async login() {
      return (req: Request, res: Response) => {
        const storeUserSession = () => {
          if (!notAuthenticatedUserId) {
            logger().error(
              "No authentication user not present in the database"
            );
            res.status(401).json({
              error: "No authentication user not present in the database",
            });
            return;
          }
          authentication_strategy.storeUserIntoSession(req, {
            id: notAuthenticatedUserId,
            userId: NO_AUTHENTICATION_USER_ID,
            displayName: "Developer",
            permissions: Object.values(authentication_strategy.Permissions),
            provider: PROVIDER_NAME,
          });
        };
        if (authentication_strategy.isUserAuthenticated(req)) {
          authentication_strategy.clearSession(req, (err) => {
            if (err) {
              logger().error("Error clearing session", err);
            }
            storeUserSession();

            res.redirect("/");
          });
        } else {
          storeUserSession();
          res.redirect("/");
        }
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
