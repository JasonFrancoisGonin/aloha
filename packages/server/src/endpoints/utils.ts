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

import { authentication_strategy, logger, schemas } from "aloha-shared";
import express, { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { CrudRepository } from "../database/repositories/interfaces/repository-interfaces";
import { VisibilityRepositoryInterface } from "../database/repositories/interfaces/visibility-repository-interface";
import { injector } from "../injector/injector";
import { authorise } from "../middleware/authorise";

const fetchCache = () => injector().resolve("fetchCache");
const userProjectsCache = () => injector().resolve("userProjectsCache");

type PermissionType = "read" | "write" | "execute";

type EndpointFactoryArray<T> = (req: Request) => Promise<T[]>;
type EndpointFactory<T, R = T> = (req: Request) => Promise<R>;

type EndpointOption<T, R = T> =
  | boolean
  | EndpointFactory<R>
  | {
      enableCache: boolean;
      factory: EndpointFactory<R>;
    };

type EndpointOptionArray<T> =
  | boolean
  | EndpointFactoryArray<T>
  | {
      enableCache: boolean;
      factory: EndpointFactoryArray<T>;
    };
interface EndpointList<T extends object> {
  list: EndpointOptionArray<T>;
  get: EndpointOption<T>;
  create: EndpointOption<T>;
  update: EndpointOption<T, boolean>;
  delete: EndpointOption<T, boolean>;
}

type Options<T extends object> = {
  name: string;
  repository: () => CrudRepository<T>;
  schema: z.ZodSchema<T>;
  logger: () => logger.Logger;
  readPermissions?: authentication_strategy.Permissions[];
  writePermissions?: authentication_strategy.Permissions[];
  endpoints: Partial<EndpointList<T>>;
};
type PermissionsOptions<T extends schemas.VisibilityInterface> = {
  router: Router;
  name: string;
  repository: () => VisibilityRepositoryInterface<T>;
  logger: () => logger.Logger;
  writePermissions?: authentication_strategy.Permissions[];
};

export const validateRequestBody =
  (
    schema: z.ZodSchema,
    logger: () => logger.Logger,
    injectDefaultPermissions: boolean = false
  ) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // console.log(schema);
      // logger().info(
      //   `injectDefaultPermissions: ${injectDefaultPermissions}, schema: ${schema instanceof z.ZodObject}`
      // );
      if (injectDefaultPermissions && schema instanceof z.ZodObject) {
        let instanceOfVisibility = true;
        for (const key of Object.keys(schemas.VisibilitySchema.shape)) {
          if (!(key in schema.shape)) {
            instanceOfVisibility = false;
            break;
          }
        }
        // logger().info(`instanceOfVisibility: ${instanceOfVisibility}`);
        if (instanceOfVisibility) {
          if (!authentication_strategy.isUserAuthenticated(req)) {
            res.status(401).json({ error: "Not authorised" });
            return;
          }
          // if (!(req.body instanceof object)) {
          //   res.status(400).json({ error: "Invalid request" });
          //   return;
          // }
          // Inject default values for creator and visibility
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const creator = req.body?.creator as string;
          // if (!authentication_strategy.isUserAuthenticated(req)) {
          //   throw new HTTPError(500, "Could not resolve the logged user");
          // }
          let user = authentication_strategy.getUserFromSession(req);
          // Check if there's a temporary user (for NO-AUTH users)
          // if ((req as any).temporaryUser) {
          //   user = (req as any).temporaryUser;
          // }

          if (
            !creator &&
            user.permissions.includes(
              authentication_strategy.Permissions.Administration
            )
          ) {
            // For NO-AUTH users with temporary ID, we don't need to look up in DB
            if (user.provider === "NO-AUTH") {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              req.body.creator = user.id;
            } else {
              const loggedUser = await userRepository().findById(user.id);
              if (!loggedUser) {
                throw new HTTPError(500, "Could not resolve the logged user");
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              req.body.creator = loggedUser.id;
            }
          }
          if (!("visibility" in req.body))
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            req.body["visibility"] = schemas.Visibility.Private;
        }
      }
      schema.parse(req.body);
      next();
    } catch (error) {
      logger().error(error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };

const userRepository = () => injector().resolve("userRepository");
const usersCache = () => injector().resolve("usersCache");

// const agentRepository = () => injector.resolve("agentRepository");
// const agentsCache = () => injector.resolve("agentsCache");

export const verifyPermission = async (
  obj: schemas.VisibilityInterface,
  req: Request,
  permission: PermissionType,
  raiseException: boolean = false
) => {
  if (obj.visibility == schemas.Visibility.Public && permission == "read")
    return true;

  if (!authentication_strategy.isUserAuthenticated(req)) {
    if (raiseException) throw new HTTPError(401, "Not authenticated");
    return false;
  }

  const userFromSession = authentication_strategy.getUserFromSession(req);
  const user = await usersCache().get(userFromSession.id, async () => {
    return await userRepository().findById(userFromSession.id);
  });

  if (!user) {
    if (raiseException) throw new HTTPError(401, "Not authenticated");
    return false;
  }

  // Creators always have permissions on their objects
  if (obj.creator == user.id) return true;

  // Public objects can be executed by anyone provided they are logged in
  if (obj.visibility == schemas.Visibility.Public && permission == "execute")
    return true;

  // Administrators always have READ permissions on all objects
  const askReadAndUserIsAdmin =
    permission == "read" &&
    user.permissions.includes(
      authentication_strategy.Permissions.Administration
    );

  // Administrators always have full permission on orphaned objects
  const objectIsOphanAndUserIsAdmin =
    (obj.creator === undefined || obj.creator === null) &&
    user.permissions.includes(
      authentication_strategy.Permissions.Administration
    );

  if (askReadAndUserIsAdmin || objectIsOphanAndUserIsAdmin) return true;

  const objectIsPrivate = obj.visibility == schemas.Visibility.Private;

  if (objectIsPrivate) {
    if (raiseException) throw new HTTPError(403, "Not authorised");
    return false;
  }

  const userProjects = await userProjectsCache().get(user.id, () =>
    userRepository().projectsByUser(user.id)
  );
  return (
    !!obj.projects &&
    obj.projects.length > 0 &&
    obj.projects.some((p) => userProjects?.some((up) => up.id == p))
  );
};

function asZodObject(x: z.ZodSchema): z.SomeZodObject {
  if ("partial" in (x as object)) {
    return x as z.SomeZodObject;
  } else {
    throw new Error(`Not a ZodObject`);
  }
}

export class HTTPError extends Error {
  public errorCode: number;

  constructor(errorCode: number, message?: string) {
    super(message || `Error ${errorCode}`);
    this.errorCode = errorCode;
  }
}

function getFactoryFromOption<T, R = T>(
  options: EndpointOption<T, R> | undefined,
  defaultFactory: EndpointFactory<T, R>
): EndpointFactory<T, R>;

function getFactoryFromOption<T>(
  options: EndpointOptionArray<T> | undefined,
  defaultFactory: EndpointFactoryArray<T>
): EndpointFactoryArray<T>;

function getFactoryFromOption<T, R = T>(
  options: EndpointOption<T, R> | EndpointFactoryArray<T> | undefined,
  defaultFactory: EndpointFactory<T, R> | EndpointOptionArray<T>
) {
  if (typeof options === "function") {
    return options;
  }
  if (typeof options === "object" && "factory" in options) {
    return options.factory;
  }
  return defaultFactory;
}

function getCacheForOption(
  options: EndpointOptionArray<unknown> | EndpointOption<unknown> | undefined
) {
  if (typeof options === "object" && "enableCache" in options) {
    return options.enableCache
      ? fetchCache()
      : injector().resolve("emptyCache");
  } else {
    return fetchCache();
  }
}
export function crudGenerator<T extends object>({
  name,
  repository,
  schema,
  logger,
  readPermissions,
  writePermissions,
  endpoints = {
    list: true,
    get: true,
    create: true,
    update: true,
    delete: true,
  },
}: Options<T>) {
  const router: Router = express.Router();
  // Middleware to parse JSON bodies
  router.use(express.json());

  // router.get("/", authorise());

  if (endpoints.list !== undefined && endpoints.list !== false)
    router.get(
      "/",
      authorise(readPermissions),
      async (req: Request, res: Response) => {
        try {
          const resultFactory = getFactoryFromOption(endpoints.list, () =>
            repository().findByPattern({})
          );

          const cache = getCacheForOption(endpoints.list);

          res.json(await cache.get(`${name}_list`, () => resultFactory(req)));
        } catch (error) {
          if (error instanceof HTTPError) {
            res.status(error.errorCode).json({ error: error.message });
          } else {
            logger().error(error);
            res.status(500).json({ error: `Failed to get ${name} list` });
          }
        }
      }
    );

  if (endpoints.create !== undefined && endpoints.create !== false)
    router.post(
      "/",
      authorise(writePermissions),
      validateRequestBody(schema, logger, true),
      async (req, res) => {
        try {
          const createFactory = getFactoryFromOption(endpoints.create, () =>
            repository().create(req.body as T)
          );

          await createFactory(req);
          getCacheForOption(endpoints.create).clear();
          res.status(204).end();
        } catch (error) {
          if (error instanceof HTTPError) {
            res.status(error.errorCode).json({ error: error.message });
          } else {
            logger().error(error);
            res.status(500).json({ error: `Failed to create the ${name}` });
          }
        }
      }
    );

  if (endpoints.get !== undefined && endpoints.get !== false)
    router.get("/:id", authorise(readPermissions), async (req, res) => {
      if (!req.params.id) {
        res.status(500).send("Id is required");
        return;
      }
      try {
        const resultFactory = getFactoryFromOption(endpoints.get, () =>
          repository().findById(req.params.id)
        );

        const project = await getCacheForOption(endpoints.get).get(
          `${name}_get_${req.params.id}`,
          () => resultFactory(req)
        );
        if (project) {
          res.json(project);
        } else {
          res.status(404).json({ error: `${name} not found` });
        }
      } catch (error) {
        if (error instanceof HTTPError) {
          res.status(error.errorCode).json({ error: error.message });
        } else {
          logger().error(error);
          res.status(500).json({ error: `Failed to get the ${name}` });
        }
      }
    });

  if (endpoints.update !== undefined && endpoints.update !== false)
    router.post(
      "/:id",
      authorise(writePermissions),
      validateRequestBody(asZodObject(schema).partial(), logger),
      async (req, res) => {
        if (!req.params.id) {
          res.status(500).send("Id is required");
          return;
        }
        try {
          const updateFactory = getFactoryFromOption(
            endpoints.update,
            async () => {
              const item = req.body as Partial<T>;
              const result = await repository().updateById(req.params.id, item);
              return result;
            }
          );

          const updated = await updateFactory(req);
          if (updated) {
            getCacheForOption(endpoints.update).clear();
            res.status(204).end();
          } else {
            res.status(404).json({ error: `${name} not found` });
          }
        } catch (error) {
          if (error instanceof HTTPError) {
            res.status(error.errorCode).json({ error: error.message });
          } else {
            logger().error(error);
            res.status(500).json({ error: `Failed to update the ${name}` });
          }
        }
      }
    );

  if (endpoints.delete !== undefined && endpoints.delete !== false)
    router.post(
      "/:id/_delete",
      authorise(writePermissions),
      async (req, res) => {
        if (!req.params.id) {
          res.status(500).send("Id is required");
          return;
        }
        try {
          const deleteFactory = getFactoryFromOption(endpoints.delete, () =>
            repository().deleteById(req.params.id)
          );

          const deleted = await deleteFactory(req);

          if (deleted) {
            getCacheForOption(endpoints.delete).clear();
            res.status(204).end();
          } else {
            res
              .status(404)
              .json({ error: `${name} not found` })
              .end();
          }
        } catch (error) {
          if (error instanceof HTTPError) {
            res.status(error.errorCode).json({ error: error.message });
          } else {
            logger().error(error);
            res.status(500).json({ error: `Failed to delete the ${name}` });
          }
        }
      }
    );

  return router;
}

export function permissionsManagerGenerator<
  T extends schemas.VisibilityInterface,
>({
  router,
  name,
  repository,
  logger,
  writePermissions,
}: PermissionsOptions<T>) {
  router.post(
    "/:id/_setCreator",
    authorise([authentication_strategy.Permissions.Administration]),
    validateRequestBody(
      z.object({ creator: z.string().min(1, "Creator is required") }).strict(),
      logger
    ),
    async (req, res) => {
      const dbObject = await repository().findById(req.params.id);
      if (!dbObject) {
        res.status(404).send(`${name} not found`);
        return;
      }
      const update = await repository().updateById(
        req.params.id,
        req.body as Partial<T>
      );
      if (!update) {
        res
          .status(500)
          .json({ error: `Failed to set the creator of the entity` });
      } else {
        fetchCache().clear();
        res.status(204).end();
      }
    }
  );
  router.post(
    "/:id/_setVisibility",
    authorise(writePermissions),
    validateRequestBody(schemas.VisibilitySchema.strict(), logger),
    async (req, res) => {
      if (!req.params.id) {
        res.status(500).send("Id is required");
        return;
      }
      const dbObject = await repository().findById(req.params.id);
      if (!dbObject) {
        res.status(404).send(`${name} not found`);
        return;
      }
      try {
        await verifyPermission(dbObject, req, "write", true);
      } catch (error) {
        if (error instanceof HTTPError) {
          res.status(error.errorCode).json({ error: error.message });
        } else {
          logger().error(error);
          res.status(500).json({
            error: `Failed to check the user permissions of the ${name}`,
          });
        }
        return;
      }

      const visibility = req.body as T;
      try {
        await repository().setVisibility(req.params.id, visibility);
        fetchCache().clear();
        res.status(204).end();
      } catch (error) {
        logger().error(error);
        res
          .status(500)
          .json({ error: `Failed to set the visibility of the ${name}` });
      }
    }
  );
}
