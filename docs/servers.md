# Servers

[← Back to Index](./index.md)

---

## What are Servers?

Servers in the Aloha platform are collections of clients and agents that expose grouped tools via a server path.

![MCP Servers](./assets/MCP_servers.gif)

### Key Features

- **Aggregate clients** - Group multiple clients together
- **Manage access** - Control access via server-level access tokens
- **Testing environments** - Provide environments for development and debugging
- **Drag-and-drop association** - Easy client management

---

## MCP Servers Overview

In general, MCP servers are programs that expose specific capabilities to AI applications through standardized protocol interfaces.

### Common Examples

- **File system servers** - Document access
- **Database servers** - Data queries
- **GitHub servers** - Code management
- **Calendar servers** - Scheduling

You can use existing servers or create your own.

---

## Server Management

### Visibility Settings

Servers support three visibility levels:

- **Private** - Only you can see and use this item
- **Public** - Everyone can see and use this item, only you can change it
- **Managed** - Only users in selected projects can see and use this item, only you can change it

### Server Owner Capabilities

The server owner can:

- Associate clients with the server
- Remove clients from the server
- Configure server settings

### Client Association

Users can associate clients with servers using:

- **Drag-and-drop interface** - Simple visual management
- **Access control** - Server-level token management
- **Grouped exposure** - Tools exposed via server path

### Identity Propagation

Identity propagation forwards user credentials and context to connected clients. This feature is only active when a client's authentication type is set to **OpenID Connect**.

When enabled:

- User authentication credentials are automatically forwarded to clients configured with OpenID Connect
- Clients can enforce permissions based on the propagated identity
- Enables transparent authentication across the proxy

For clients using Basic authentication or Bearer token, credentials are not propagated.

---

## Adding Your Own Server

### Server Creation Process

To add a new server, provide the following information:

1. **Server name** - Unique identifier
2. **Description** - Purpose and functionality
3. **Path** - Unique server path for routing
4. **Tags** - Searchable labels for discovery

### Server Path Requirements

- Must be unique across the platform
- Used for routing requests
- Forms part of the endpoint URL

### Example Server Creation

```
Name: My Development Server
Description: Server for testing new MCP clients
Path: /dev/my-server
Tags: development, testing, experimental
```

---

## Navigation

- [← Previous: Agents](./agents.md)
- [Next: Projects & Access Management →](./projects.md)
- [Go to Index](./index.md)
