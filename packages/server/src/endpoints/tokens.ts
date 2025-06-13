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

import {
  AuthenticationStrategy,
  schemas,
  entrypoint_schemas,
} from "aloha-shared";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { crudGenerator, validateRequestBody } from "./utils";
import { authorise } from "../middleware/authorise";
import { Request, Response } from "express";
import { createJwtToken } from "../middleware/jwt-authentication";
import { NO_AUTHENTICATION_USER_ID } from "../middleware/no-authentication";

const fetchCache = () => injector.resolve("fetchCache");
const logger = getLogger("TOKENS");

const repository = () => injector.resolve("tokenRepository");
const projectRepository = () => injector.resolve("projectRepository");
const userRepository = () => injector.resolve("userRepository");

export function tokensRoutes() {
  const router = crudGenerator<schemas.JWTToken>({
    name: "tokens",
    logger: logger,
    repository,
    schema: schemas.JWTTokenSchema,
    readPermissions: [],
    writePermissions: [],
    endpoints: {
      list: true,
    },
  });

  router.post(
    "/",
    authorise([]),
    validateRequestBody(entrypoint_schemas.JWTTokenRequestSchema, logger),
    async (req: Request, res: Response) => {
      const log = logger().child({ jwtTokenRequest: req.body as unknown });
      log.info("Create new JWT Token");
      try {
        const request = req.body as entrypoint_schemas.JWTTokenRequest;
        const user = req.user!; // Given the authorise, we can be sure to have a user
        const projects = await projectRepository().findByPattern({
          projectId: request.project,
        });
        if (!projects || projects.length == 0) {
          res
            .status(500)
            .json({ error: "Failed to retrieve the provided project" });
          return;
        }
        const project = projects[0];

        let userId = NO_AUTHENTICATION_USER_ID;

        if (user.id !== NO_AUTHENTICATION_USER_ID) {
          const dbUsers = await userRepository().findByPattern({
            userId: user.id,
          });
          if (
            !dbUsers ||
            dbUsers.length == 0 ||
            !dbUsers[0].projects?.includes(project.id)
          ) {
            res.status(403).json({ error: "Not authorised" });
            return;
          }

          userId = dbUsers[0].id;
        }
        const tokenPermissions = [
          AuthenticationStrategy.Permissions.ProxyApiAccess,
        ];
        const newToken = await repository().create({
          userId: userId,
          permissions: tokenPermissions,
          projectId: project.id,
          expirationDate: new Date(request.expirationDate),
          disabled: false,
        });
        const jwt = createJwtToken(newToken);

        fetchCache().clear();
        res.send({ token: jwt }).end();
      } catch (e) {
        log.error(e);
        res
          .status(500)
          .json({ error: "Failed to create a token for the current user" });
      }
    }
  );

  router.post(
    "/:id/_disable",
    authorise([]),
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const log = logger().child({ jwtTokenId: id });
      log.info("Disable token");

      try {
        const token = await repository().findById(id);

        if (!token) {
          res.status(404).json({ error: "JWT Token not found" });
          return;
        }

        token.disabled = true;
        await repository().updateById(id, token);

        fetchCache().clear();
        res.status(204).end();
      } catch (error) {
        log.error(error);
        res.status(500).json({ error: "Failed to delete user" });
      }
    }
  );

  return router;
}
