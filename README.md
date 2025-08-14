# ALOHA

Aloha (AI Logical Orchestrator Hub for Agents) is a Hub to manage and
interconnect data and AI Agents.

It is built leveraging the [Model Context Protocol](https://modelcontextprotocol.io/).

It allows seamless communication between applications and MCP servers, improving
tool discoverability and interoperability.

It also provides out of the box functionalities to test your MCP servers, and to run
demo agents directly in your browser

[![Homepage](docs/assets/homepage.png)](docs/assets/homepage.png)

## Features

- Easily connect to MCP servers locally and remotely, supporting different kind of authentication strategies
- Rapidly deploy proxy MCP servers, to easily connect your agent and applications to tools and data sources
- Test your MCP servers with a built-in MCP client, and run simple agentic loops directly in-browser

### Connect to MCP servers

[![MCP Clients page](docs/assets/MCP_clients.webm)](docs/assets/MCP_clients.webm)

Simply provide the URL of the MCP server, the protocol (ALOHA supports streamingHTTP and the legacy SSE) and the authentication strategy.

Directly from the browser, you can test how the MCP servers respond to different requests, to help debug issues and improve your tools.

ALOHA supports the following:

- Basic authentication
- Bearer token
- OAuth2 (coming soon)

It is also easy to add your own authentication strategy, by writing a plugin.

### Deploy proxy MCP servers

[![MCP Servers page](docs/assets/MCP_servers.webm)](docs/assets/MCP_servers.webm)

Write a name and a description, and ALOHA will do the rest. From the user interface, you can decide what MCP servers to expose,
and your agent or application will only need to connect to a single endpoint and manage a single authentication process.

Requests will be seemingly proxied, and user identity will be propagated accordingly, so you can focus on writing only the code
that is important.

### Run demo agents

[![MCP Servers page](docs/assets/MCP_agent.webm)](docs/assets/MCP_agent.webm)

ALOHA can leverage any OpenAI compatible endpoint to run agentic loops directly in your browser. By then connecting to MCP servers,
you can test how they perform when put to work by an agent.

## Deployment

To run, you first need to clone this repository
`git clone PLACEHOLDER_URL`

If you do not yet have `pnpm` installed, run first `npm install -g pnpm`,
then run `pnpm install`

Now you can build Aloha by running `pnpm lerna run build` and,
after configuring it, serve it with
`pnpm lerna run start` ([See the development section](#development))

## Configuration

### Server Configuration

As default, Aloha relies on an existing MongoDB database to store information.
You can provide the [connection string](https://www.mongodb.com/docs/manual/reference/connection-string/)
to the database in the server package with the environment variable `MONGODB_URI`.

It is possible to specify the port of the server, by setting the
environment variable `SERVER_PORT`, and then providing it
to the client by setting the full URL of the server in
the environment variable `VITE_SERVER_URL` [See the client configuration section](#client-configuration).

For \*nix environment, you can create a sample `.env` file running the commands

```bash
cp ./packages/server/env.example ./packages/server/.env
```

The sample configuration is

```ini
SERVER_PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/ALOHA
SERVER_SECRET=replace me with a random secret key
CLIENT_SECRET=replace me with a random secret key
```

Please, set the variables according to your needs

### MongoDB configuration

You have to configure a MongoDB instance to store the ALOHA data.
An existing instance can be used or you can start a dedicated one
by using `docker`.

Here below are the steps to start a MongoDB instance using Docker:

1. From the ALOHA project root create a directory called `mongodb_data`

   ```bash
   mkdir ./mongodb_data
   ```

2. Start MongoDB with docker

   ```bash
   docker run -p 27017:27017 \
              -v $PWD/mongodb_data:/data/db \
              --name mongodb \
              -it \
              --rm \
              docker.io/mongo
   ```

### Client configuration

In order to use the ALOHA client in development mode, you have to configure
the `VITE_SERVER_PORT` and `API_URL`.

On \*nix environment, to use the default configuration run

```bash
cp ./packages/client/env.example ./packages/client/.env
```

The sample configuration is

```ini
VITE_SERVER_PORT=5173
API_URL=http://localhost
```

### Authentication and authorisation

By default, Aloha comes without an authentication and authorisation layer.
Everyone with access to your instance can do everything!

You can build your own, by creating a new project in plugins, and
implementing the interface `AuthenticationStrategy` defined in package
`aloha-shared`.

You should then set the path to the plugin, in the environment variable
`AUTHENTICATION_PLUGIN`

Here is an example of such plugin:

```typescript
import {
  authentication_strategy,
} from "aloha-shared";

import { RequestHandler } from "express";

const myAuthPlugin: authentication_strategy.AuthenticationStrategy = {
  async getAuthenticationMiddleware(): Promise<
    RequestHandler | RequestHandler[]
  > {
    console.log("Using Custom authentication");
    return [
      // Your authentication middleware stack
      (req, res, next) => {
        // For example: JWT validation, OAuth handling, etc.
        const user: authentication_strategy.UserPrincipal = {
          id: "123",
          userId: "userId",
          displayName: "Jhon Doe",
          permissions: [
            "CLIENTS_READ",
            "CLIENTS_WRITE",
            "SERVERS_READ",
            "SERVERS_WRITE",
          ],
          provider: "SAMPLE"
        }; // Mock user

        authentication_strategy.storeUserIntoSession(
          req,
          user
        );

        next();
      },
    ];
  },

  async checkPermissions(user: UserPrincipal, requiredPermissions: string[]) {
    return requiredPermissions.every((perm) => user.permissions.includes(perm));
  },

  async login(){
    return return (req, res, next) => {
      // Logic for login
      next();
    };
  },

  async logout(): RequestHandler | RequestHandler[] {
    return (req, res, next) => {
      next();
    };
  },


  async getInfo() {
    return {
      provider: PROVIDER_NAME,
    };
  },
};

export default myAuthPlugin;
```

### Development

1. Clone the repository
2. Install the dependencies `pnpm install`
3. Build aloha-shared and all plugins
   `(cd packages/aloha-shared && pnpm install && pnpm run build)`
4. Run the server in development mode `pnpm lerna run dev`

### Production

1. Clone the repository
2. Install the dependencies `pnpm install`
3. Build the server in production mode `lerna run build`
4. Run the server `cd packages/server && pnpn run start`
