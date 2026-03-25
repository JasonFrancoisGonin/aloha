# Clients

[← Back to Index](./index.md)

---

## What are Clients?

Clients are entities that interact with servers or services to request and receive data or perform specific tasks.

Technically, clients are MCP servers that Aloha connects to. They contain the tools and resources that agents can gain access to.

![MCP Clients](./assets/MCP_clients.gif)

---

## Client Registration Process

Clients are registered in the Aloha platform with the following required fields:

- **Connection name** - Unique identifier for the client
- **Server URL** - Endpoint for the MCP server
- **Description** - Purpose and functionality description
- **Tags** - Searchable labels for discovery
- **Authentication type** - Method for securing connections

### Supported Authentication Methods

- Basic authentication
- Bearer token
- OpenID Connect

### Identity Propagation

Identity propagation is only active when the authentication type is set to **OpenID Connect**. When enabled:

- User credentials are automatically forwarded to the client
- The client can enforce permissions based on the propagated identity
- Enables transparent authentication without requiring separate credentials

For clients using Basic authentication or Bearer token, user credentials are not propagated.

---

## Client Management

### Ownership and Visibility

- **Ownership** - Managed by the client owner. In the owner's absence, an administrator can take over control
- **Visibility Settings**:
  - **Private** - Only you can see and use this item
  - **Public** - Everyone can see and use this item, only you can change it
  - **Managed** - Only users in selected projects can see and use this item, only you can change it

### Editing and Deleting Clients

- **Editing** - Pre-filled form for modifying client details
- **Deleting** - Confirmation step required
- **Restrictions** - Actions are restricted based on ownership and administrative rights

### Associated Components

A client can have one or more of the following associated:

- Tools
- Resources
- Templates
- Prompts

---

## Navigation

- [← Previous: Introduction](./introduction.md)
- [Next: Agents →](./agents.md)
- [Go to Index](./index.md)
