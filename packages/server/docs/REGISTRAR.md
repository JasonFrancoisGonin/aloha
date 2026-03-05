# Custom IdentityPropagationServiceRegistrar

This document explains how to create a custom
`IdentityPropagationServiceRegistrar` implementation to register and unregister
clients with identity providers.

## Overview

The `IdentityPropagationServiceRegistrar` interface defines methods for
registering and unregistering clients with an identity provider. The default
implementation uses Keycloak, but you can create your own implementation for
other identity providers.

## Interface Definition

The interface is defined in `src/middleware/oidc/identity-propagation-service-registrar.ts`:

```typescript
export interface IdentityPropagationServiceRegistrar {
  init(): Promise<void>;
  registerClient(client: ClientRegistrationMetadataRequest): Promise<void>;
  unregisterClient(clientId: string): Promise<void>;
}
```

## Creating a Custom Registrar

To create a custom registrar, you need to implement the
`IdentityPropagationServiceRegistrar` interface. Here's a template based on the
Keycloak implementation:

```typescript
import { injector } from "../../injector/injector";
import { getLogger } from "../../injector/provide-logger";
import {
  ClientRegistrationMetadataRequest,
  IdentityPropagationServiceRegistrar,
} from "./identity-propagation-service-registrar";

const logger = getLogger("CUSTOM-REGISTRAR");

export class MyCustomIdentityPropagationServiceRegistrar
  implements IdentityPropagationServiceRegistrar
{
  public async init(): Promise<void> {
    // Initialize your custom registrar here
    // This might include setting up connections to your identity provider
    logger().info("Initializing custom registrar");

    // Example: Resolve configuration values from injector
    // const config = injector().resolve("myCustomConfig");
  }

  public async registerClient(
    client: ClientRegistrationMetadataRequest
  ): Promise<void> {
    // Implement client registration logic for your identity provider
    logger().child({ clientId: client.client_id }).info("Registering client");

    // Your custom registration logic here
    // This might involve making HTTP requests to your identity provider's API
  }

  public async unregisterClient(clientId: string): Promise<void> {
    // Implement client unregistration logic for your identity provider
    logger().child({ clientId: clientId }).info("Unregistering client");

    // Your custom unregistration logic here
    // This might involve making HTTP requests to your identity provider's API
  }
}
```

## Loading Your Custom Registrar

To use your custom registrar, you need to set the
`OIDC_IDENTITY_PROPAGATION_REGISTRAR_PATH` environment variable to point to your
implementation.

### Setting the Environment Variable

Add the following to your `.env` file or set it in your deployment environment:

```sh
OIDC_IDENTITY_PROPAGATION_REGISTRAR_PATH=./path/to/your/custom/registrar.ts
```

### Path Resolution

The path should be relative to the project root. For example, if your custom
registrar is located at `src/middleware/oidc/my-custom-registrar.ts`, you would set:

```sh
OIDC_IDENTITY_PROPAGATION_REGISTRAR_PATH=./src/middleware/oidc/my-custom-registrar.ts
```

### Important Notes

1. Your custom registrar must be exported as a default export from the module
2. The registrar must implement the `IdentityPropagationServiceRegistrar` interface
3. The `init()` method will be called during server startup
4. The registrar will be instantiated once and reused for all
   registration/unregistration operations

## Example Implementation

Here's a simplified example of a custom registrar that might work with a
different identity provider:

```typescript
import { injector } from "../../injector/injector";
import { getLogger } from "../../injector/provide-logger";
import {
  ClientRegistrationMetadataRequest,
  IdentityPropagationServiceRegistrar,
} from "./identity-propagation-service-registrar";

const logger = getLogger("EXAMPLE-REGISTRAR");

export class ExampleIdentityPropagationServiceRegistrar
  implements IdentityPropagationServiceRegistrar
{
  private apiUrl!: string;
  private apiKey!: string;

  public async init(): Promise<void> {
    logger().info("Initializing example registrar");

    // Resolve configuration from injector
    this.apiUrl = injector().resolve("exampleApiUrl");
    this.apiKey = injector().resolve("exampleApiKey");

    if (!this.apiUrl || !this.apiKey) {
      throw new Error("Example registrar configuration is incomplete");
    }
  }

  public async registerClient(
    client: ClientRegistrationMetadataRequest
  ): Promise<void> {
    logger().child({ clientId: client.client_id }).info("Registering client");

    // Example API call to register client
    // const response = await fetch(`${this.apiUrl}/clients`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     client_id: client.client_id,
    //     client_name: client.client_name,
    //     redirect_uris: client.redirect_uris
    //   })
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Failed to register client: ${response.statusText}`);
    // }
  }

  public async unregisterClient(clientId: string): Promise<void> {
    logger().child({ clientId: clientId }).info("Unregistering client");

    // Example API call to unregister client
    // const response = await fetch(`${this.apiUrl}/clients/${clientId}`, {
    //   method: 'DELETE',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`
    //   }
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Failed to unregister client: ${response.statusText}`);
    // }
  }
}
```

## KeyCloak implementation

The default implementation of `IdentityPropagationServiceRegistrar` uses
Keycloak as the identity provider. This implementation handles client
registration and unregistration through Keycloak's Admin REST API.

### Class Overview

The `KeyCloakIdentityPropagationServiceDefaultRegistrar` class implements the
`IdentityPropagationServiceRegistrar` interface with three main methods:

1. `init()`: Initializes the connection to Keycloak by resolving the issuer URL
   and extracting the realm
2. `registerClient()`: Registers a new client with Keycloak, including role and
   group mappings
3. `unregisterClient()`: Removes a client from Keycloak by its client ID

### Method Implementations

#### `init()`

This method initializes the Keycloak connection by:

- Resolving the OIDC issuer URL from the injector
- Extracting the realm from the issuer URL
- Ensuring the issuer URL ends with a trailing slash for proper URL construction

```typescript
init(): Promise<void> {
  return new Promise<void>((resolve) => {
    logger().info("Init KeyCloak Default registrar");

    const issuer = injector().resolve("oidcIssuerUrl");
    if (!issuer) {
      throw new Error("OIDC issuer URL is not configured.");
    }
    this.issuerUrl = issuer;
    const comps = issuer.split("/");
    this.realm = comps[comps.length - 1];
    if (!this.issuerUrl.endsWith("/")) {
      this.issuerUrl += "/";
    }
    resolve();
  });
}
```

#### `registerClient()`

This method registers a new client with Keycloak by:

1. Checking if a client with the same ID already exists
2. Creating a client representation object with properties from the input client
   metadata
3. Using Keycloak's client registration endpoint
   (`clients-registrations/default`) to create the client
4. Creating a role for the new client
5. Retrieving the newly created roles
6. Finding the "aloha-group" in Keycloak
7. Mapping the client's roles to the "aloha-group"

```typescript
public async registerClient(
  client: ClientRegistrationMetadataRequest
): Promise<void> {
  logger().child({ clientId: client.client_id }).info("Registering client");

  const alreadyPresentClient = await this.getClientByClientId(
    client.client_id
  );

  if (alreadyPresentClient) {
    throw new Error(`Client with ID '${client.client_id}' already exists.`);
  }

  const clientRepresentation: KCClientRepresentation = {
    clientId: client.client_id,
    name: client.client_name,
    rootUrl: client.root_url,
    redirectUris: client.redirect_uris,
    secret: client.secret,
    clientAuthenticatorType: "client-secret",
    serviceAccountsEnabled: true,
    directAccessGrantsEnabled: false,
    publicClient: false,
    protocol: "openid-connect",
    webOrigins: ["*"],
    enabled: true,
    standardFlowEnabled: true,
  };

  const newClient: KCClientRepresentation = await this.callKC(
    "clients-registrations/default",
    "POST",
    KCClientRepresentationSchema,
    clientRepresentation
  );

  const clientUUID = newClient.id!;

  await this.callKC(
    `/admin/realms/${this.realm}/clients/${clientUUID}/roles`,
    "POST",
    undefined,
    {
      name: `${client.client_id}-role`,
      composite: false,
      clientRole: true,
    }
  );
  const newRoles = await this.callKC(
    `/admin/realms/${this.realm}/clients/${clientUUID}/roles`,
    "GET",
    z.array(KCRoleRepresentationSchema)
  );

  if (newRoles.length === 0) {
    throw new Error("No roles created after registration");
  }

  const groups = await this.callKC(
    `/admin/realms/${this.realm}/groups`,
    "GET",
    z.array(KCGroupRepresentationSchema)
  );

  const alohaGroupUUID = groups.find((e) => e.name === "aloha-group")?.id;
  if (!alohaGroupUUID) {
    throw new Error("Aloha group not found");
  }

  await this.callKC(
    `/admin/realms/${this.realm}/groups/${alohaGroupUUID}/role-mappings/realm`,
    "POST",
    undefined,
    []
  );

  await this.callKC(
    `/admin/realms/${this.realm}/groups/${alohaGroupUUID}/role-mappings/clients/${clientUUID}`,
    "POST",
    undefined,
    newRoles
  );
}
```

#### `unregisterClient()`

This method removes a client from Keycloak by:

1. Finding the client by its client ID
2. If found, deleting the client using Keycloak's Admin REST API

```typescript
public async unregisterClient(clientId: string): Promise<void> {
  logger().child({ clientId: clientId }).info("Unregistering client");

  const client = await this.getClientByClientId(clientId);
  if (!client) {
    return;
  }

  const clientUUID = client.id!;

  await this.callKC(
    `/admin/realms/${this.realm}/clients/${clientUUID}`,
    "DELETE"
  );
}
```

### KeyCloak Integration Approach

The implementation follows Keycloak's Admin REST API approach for managing
clients. It leverages:

- Keycloak's client registration endpoint for creating new clients
- Keycloak's Admin REST API for managing roles and group mappings
- Token-based authentication using the `oidcAlohaTokenSetProvider` to
  authenticate with Keycloak

The approach ensures that when a new client is registered, it's properly
configured with:

- Client metadata (ID, name, redirect URIs, etc.)
- A dedicated role for the client
- Proper group membership for role mapping
- Standard OpenID Connect protocol configuration

This implementation provides a robust foundation for integrating with Keycloak
as the identity provider while maintaining flexibility for customization.

See the file
@/src/middleware/oidc/keycloak-identity-propagation-service-default-registrar.ts
for more details
