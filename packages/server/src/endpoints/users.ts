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

import { authentication_strategy, schemas } from "aloha-shared";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { crudGenerator, HTTPError } from "./utils";
import { assertFieldInObject } from "../utils/type-utils";
import z from "zod";

const fetchCache = () => injector().resolve("fetchCache");

const logger = getLogger("USERS");

const userRepository = () => injector().resolve("userRepository");
const connectionOptionsRepository = () =>
  injector().resolve("connectionOptionsRepository");
const serverOptionsRepository = () =>
  injector().resolve("serverOptionsRepository");

export function usersRoutes() {
  logger().info("Registering users router");

  const checkUserName = async (userId: string, databaseId?: string) => {
    if (userId == authentication_strategy.ANONYMOUS_USER) {
      throw new HTTPError(502, "User id cannot be a reserved word");
    }
    const alreadyExisting = await userRepository().findByPattern({
      userId,
    });
    if (alreadyExisting.length > 0) {
      if (
        databaseId !== undefined &&
        alreadyExisting.length == 1 &&
        alreadyExisting[0].id == databaseId
      ) {
        return true;
      }
      throw new HTTPError(502, "A user with the same userId already exists");
    }
    return true;
  };

  const router = crudGenerator({
    name: "users",
    logger: logger,
    repository: userRepository,
    schema: schemas.UserSchema,
    readPermissions: [authentication_strategy.Permissions.UsersRead],
    writePermissions: [authentication_strategy.Permissions.UsersWrite],
    endpoints: {
      list: true,
      get: true,
      create: async (req) => {
        const user = req.body as schemas.User;
        if (!(await checkUserName(user.userId))) {
          throw Error("User already exists");
        }
        return userRepository().create(user);
      },
      update: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const user = req.body as Partial<schemas.User>;
        const existingUser = await userRepository().findById(id);
        if (existingUser === null) {
          throw new HTTPError(404, "User not found");
        }
        return (
          (await checkUserName(existingUser.userId, existingUser.id)) &&
          (await userRepository().updateById(id, user))
        );
      },
      delete: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const deleted = await userRepository().deleteById(id);
        if (deleted) {
          // Remove the "creator" from the user's clients and servers
          const clients = await connectionOptionsRepository().findByPattern({
            creator: id,
          });
          for (const { id } of clients) {
            await connectionOptionsRepository().unsetCreator(id);
          }
          const servers = await serverOptionsRepository().findByPattern({
            creator: id,
          });
          for (const { id } of servers) {
            await serverOptionsRepository().unsetCreator(id);
          }

          fetchCache().clear();
          return true;
        } else {
          return false;
        }
      },
    },
  });

  return router;
}
