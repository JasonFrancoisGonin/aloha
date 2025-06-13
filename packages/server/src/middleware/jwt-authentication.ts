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

import { AuthenticationStrategy, schemas } from "aloha-shared";
import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";

const logger = getLogger("JWT-AUTH-MIDDLEWARE");
const repository = () => injector.resolve("tokenRepository");
const tokensCache = () => injector.resolve("jwtCache");

export type AlohaJWTPayload = {
  tokenId: string;
  userId: string;
  sub: string;
  claims: string[];
  expirationDate: string;
};

const PROVIDER_NAME = "JWT";
export const AGENT_PROJECT = "AGENT";

// const projectRepository = injector.resolve("projectRepository");

const jwtAuthenticationStrategy: AuthenticationStrategy.AuthenticationStrategy =
  {
    async init() {},

    // eslint-disable-next-line @typescript-eslint/require-await
    async getAuthenticationMiddleware(): Promise<
      RequestHandler | RequestHandler[]
    > {
      logger().info("Server is starting with JWT token authentication.");

      const CLIENT_SECRET = process.env.CLIENT_SECRET;
      if (!CLIENT_SECRET) {
        throw new Error("CLIENT_SECRET environment variable is required");
      }

      return async (req, res, next) => {
        if (!req.user) {
          // Check for Authentication Bearer token
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
              const decodedToken = await tokensCache().get(
                token,
                async () => {
                  logger().info("Token verification miss, searching the db");
                  try {
                    const decoded = jwt.verify(token, CLIENT_SECRET, {
                      algorithms: ["HS256"],
                    }) as AlohaJWTPayload;
                    const dbToken = await repository().findById(
                      decoded.tokenId
                    );
                    if (!dbToken || dbToken.disabled) {
                      console.error(
                        "JWT token was not found, or it is disabled"
                      );
                      return null;
                    }
                    return decoded;
                  } catch (error) {
                    console.error("JWT verification error:", error);
                  }
                  return null;
                },
                300
              );
              if (decodedToken != null) {
                req.user = {
                  id: decodedToken.userId,
                  userId: decodedToken.userId,
                  displayName: decodedToken.sub,
                  permissions: decodedToken.claims,
                  provider: PROVIDER_NAME,
                };
              }
            } catch (error) {
              console.error("JWT verification error:", error);
            }
          }
        }
        next();
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async checkPermissions(
      user: AuthenticationStrategy.UserPrincipal,
      requiredPermissions: string[]
    ) {
      if (user.provider !== PROVIDER_NAME) return false;
      return requiredPermissions.every((perm) =>
        user.permissions.includes(perm)
      );
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

export default jwtAuthenticationStrategy;

export function createJwtToken(token: schemas.JWTTokenWithId) {
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  if (!CLIENT_SECRET) {
    throw new Error("CLIENT_SECRET environment variable is required");
  }
  const payload: AlohaJWTPayload = {
    tokenId: token.id,
    userId: token.userId,
    sub: token.projectId,
    claims: token.permissions,
    expirationDate: token.expirationDate.toUTCString(),
  };
  return jwt.sign(payload, CLIENT_SECRET);
}
