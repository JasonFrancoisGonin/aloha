# Docker Setup Instructions

This document provides instructions for setting up all services required for the
Aloha application using Docker.

## Prerequisites

Before starting, ensure you have:

- Docker installed on your system
- Docker Compose installed
- Access to the necessary environment variables

## Services Overview

The application consists of the following services:

1. **Server** - Main application server
2. **Client** - Frontend application
3. **MongoDB** - Database service
4. **Keycloak** - Identity Provider (OpenID Connect)
5. **Prometheus** - Monitoring service

## Environment Variables Configuration

### Authentication Configuration (OIDC)

The application uses OpenID Connect for authentication with KeyCloak as the
Identity Provider. Configure the following environment variables:

```bash
OIDC_ENABLED=true
OIDC_CODE_REDIRECT_URI=http://server:3000/api/oauth2/code/login
OIDC_JWKS=YOUR_GENERATED_JWKS_VALUE_HERE
OIDC_CLIENT_ID=aloha
OIDC_ISSUER_URL=http://localhost:8080/realms/oidc
OIDC_IDENTITY_PROPAGATION_SERVICE_PATH=
OIDC_USE_IDENTITY_PROPAGATION_SERVICE=true
OIDC_UNKNOWN_USERS_ALLOW=true
OIDC_UNKNOWN_USERS_PERMISSIONS=CLIENTS_READ,MCP_PROXY_ACCESS
OIDC_JWKS= <see below>
```

#### The OIDC_JWKS

The `OIDC_JWKS` variable should contain a JSON Web Key Set (JWKS) that defines
the public keys used to validate JWT tokens issued by your OpenID Connect provider.

To generate a valid JWKS value:

1. Visit <https://jwkset.com/generate>
2. Set the following constraints:
   - Key type: ECDSA
   - Key ID: leave as default
   - Key algorithm: ES512
   - Key use: Signature
   - Curve: P-521
3. Copy the generated JWKS JSON and use it as the value for the `OIDC_JWKS`
   environment variable and store also in a .json file for further import
   remeber to wrap the generated key in a JSON envelop like this:
   ```json
   {
       "keys": [
            {... your generated JWK ...}
       ]
   }
   ```

Note: The default JWKS value shown in the docker-compose configuration is for
demonstration purposes only and should be replaced with your own generated keys.

#### Configure KeyCloak

To configure KeyCloak for the aloha client, follow these steps after starting
the KeyCloak service with `docker-compose up keycloak` and accessing the
KeyCloak admin console at <http://localhost:8080/admin> (username/password are
specified in the docker-compose.yaml file):

1. **Create Realm**
   - Navigate to "Manage Realms" and click "Create realm"
   - Name the realm "oidc" (matching OIDC_ISSUER_URL)

2. **Create Client**
   - Select the "oidc" realm
   - Navigate to "Clients" and click "Create Client"
   - Set Client ID to "aloha" (matching OIDC_CLIENT_ID)

3. **Configure Client Settings**
   Use these settings:
   - Client Authentication: On
   - Service Account Roles: Enable
   - Standard Token Exchange: Enable
   - Root URL: <http://localhost:3000>
   - PKCE Method: S256
   - Root URL: <http://localhost:3000>
   - Home URL: <http://localhost:3000>
   - Valid Redirect URIs: <http://localhost:3000/api/oauth2/code/login>
   - Web Origins: + (to allow all origins)

4. **Configure Client Secrets**
   - Navigate to the "Credentials" tab of the aloha client
   - Select "Signed JWT"
   - Click Save and confirm
   - Navigate to "Keys" tab
   - Click Import
   - In Archive format, select JSON Web Key Set
   - Import the .json file containing the JWKS previously generated.

5. **Configure Identity Propagation Service**
   - Ensure the client has proper permissions
   - Go to the advanced client tab and set:
     - Pushed authorization request required: On and click Save
     - ID token signature algorithm: ES512 and click Save
   - Create a client role called `aloha-role` with the following associated
     client roles:
     - broker:
       - read-token
     - realm-management:
       - create-client
       - view-clients
       - manage-users
       - manage-client
       - query-groups
     - account:
       - view-groups

6. **Create `aloha-group`**
   - Go to Groups left menu and create a new group called `aloha-group`
   - In the newly created group, go to the tab `Role mapping` and add the client
     role `aloha-role`

7. **Create a Aloha `admin` user**
   - Go to the User menu item and create a new user, call it `admin` or with
     the username chosen in the docker-compose file
   - Create all the desired standard users
   - Assign the group `aloha-group` to all the users created in this step.

## Docker Compose Setup

Edit the `docker-compose.yaml` and change the variables used by the services
according to your needs. If you decide to change something, take
into account that the instructions above should refer to your changes

## Setup Steps

1. **Build and Run Services**

   ```bash
   docker-compose build
   docker-compose up
   ```

   Or, if you have a proxy configured and are using podman

   ```bash
   podman-compose --podman-run-args='--http-proxy=false' up --build
   ```

2. **Access the Application**

- Main application: <http://localhost:3000>
- Keycloak Admin Console: <http://localhost:8080/admin>
- Prometheus: <http://localhost:9090>

## Troubleshooting

### Common Issues

1. **Connection refused to MongoDB**
   - Ensure MongoDB service is running
   - Check the connection string in environment variables

2. **Authentication failures**
   - Verify OIDC configurations match Keycloak settings
   - Confirm client ID and secret are correct
   - Check redirect URIs in Keycloak client configuration

3. **Build failures**
   - Ensure all dependencies are properly installed
   - Check that required files exist in the correct locations

### Debugging Commands

```bash
# Check running containers
docker ps

# View logs for a specific service
docker logs <service-name>

# Enter a running container for debugging
docker exec -it <container-id> /bin/sh
```
