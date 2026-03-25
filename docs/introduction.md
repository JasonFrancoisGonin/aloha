# Introduction to Aloha

## What is Aloha?

Aloha stands for **AI Logical Orchestrator Hub for Agents** and is a web application that facilitates coordinated interactions among AI agents, with integrated access to data and tools.

Aloha is a platform where AI Agents – and humans alike – can discover and use tools and other AI Agents. It serves as a centralized hub for managing and interconnecting data and AI Agents.

### AI Agents

AI agents are software systems that use AI to pursue goals and complete tasks on behalf of users. They demonstrate a level of autonomy to make reasoning, planning, and memory decisions, learn, and adapt.

![Aloha Homepage](./assets/homepage.png)

---

## Benefits of Using Aloha

### Hub for MCP Services

Aloha acts as a hub for Model Context Protocol (MCP) protocol-based services, allowing users to:

- Access, orchestrate, and authenticate to various tools and services
- Connect to multiple servers and tools through a standardized interface

### Proxy Functionality

Aloha acts as a proxy, simplifying:

- Direct connections to multiple servers
- Authentication management
- Endpoint management

### Transparent Interactions

Interactions between Aloha, agents, and servers are designed to be transparent for the end user or applications. Users connect directly to Aloha, with all functionalities appearing as if provided by Aloha directly.

### Key Features

- **Implements the Model Context Protocol** - Uses the MCP open standard
- **Plug-and-Play Interfaces** - Does not "run" agents itself, but provides interfaces to any agents following MCP
- **Safe Experimentation** - Designed as a safe place to experiment with AI Agents
- **Open Source** - Released under EUPL license

---

## What is the Model Context Protocol (MCP)?

MCP is an open-source standard for connecting AI applications to external systems.

Using MCP, AI applications can connect to:

- **Data sources** - Local files, databases
- **Tools** - Search engines, calculators
- **Workflows** - Specialized prompts

Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect electronic devices, MCP provides a standardized way to connect AI applications to external systems.

For more information, visit the [official MCP website](https://modelcontextprotocol.io/).

---

## What is the Agent-to-Agent (A2A) Protocol?

A2A is a protocol for direct communication between AI agents. Unlike MCP which connects agents to tools and services, A2A enables agents to delegate tasks to other agents and receive responses.

Using A2A, agents can:

- **Delegate tasks** - Send work to specialized agents
- **Receive results** - Get streaming responses from remote agents
- **Chain operations** - Build complex workflows across multiple agents

---

## Identity Propagation

Identity propagation allows ALOHA to forward user credentials and context to connected servers and clients. This enables:

- **Transparent authentication** - Users authenticate once to ALOHA, credentials are automatically forwarded
- **Access control** - Servers can enforce permissions based on propagated identity
- **Audit trails** - Track which user performed actions on external systems

Identity propagation is configured at the server and client level, not at the project level.

---

## Navigation

- [Next: Clients →](./clients.md)
- [← Back to home](../README.md)
- [Go to Index](./index.md)
