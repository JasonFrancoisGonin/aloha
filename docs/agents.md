# Agents

[← Back to Index](./index.md)

---

## What are Agents?

Aloha agents are components within the Aloha platform that facilitate the automation, access, and authentication of various tools and services through a standardized interface. All agents act as MCP servers and can access MCP tools through ALOHA.

### Agent Types

**MCP Agents** - External agents that connect to ALOHA's MCP endpoint

- Communicate using the MCP protocol
- Access MCP clients (tools) assigned through ALOHA UI

**A2A Agents** - External agents that communicate via the Agent-to-Agent protocol

- Still act as MCP servers for tool access
- Can also receive tasks from other agents via A2A protocol
- Access MCP clients (tools) assigned through ALOHA UI

### Key Characteristics

- All agents act as **MCP servers**
- Capable of accessing tools via associated MCP clients
- Aloha manages routing, authentication, and client associations
- Users can assign one or more MCP clients to each agent through the UI

---

## Agent Registration Process

Agents are registered in the Aloha platform with the following required fields:

### Common Fields (All Agents)

- **Agent name** - Unique identifier
- **Description** - Purpose and functionality
- **Agent path** - Must be unique
- **Tags** - Searchable labels

### Protocol-Specific Fields

**MCP Agents**:

- **Server protocol** - Streamable HTTP or SSE (legacy)
- **URL** - Endpoint address of the MCP server
- **Authentication type** - Basic authentication, Bearer token, or OpenID Connect

**A2A Agents**:

- **Server protocol** - A2A
- **URL** - Endpoint address of the A2A agent
- **Authentication type** - Basic authentication, Bearer token, or OpenID Connect

---

## Testbed Agents

### What is a Testbed Agent?

Testbed agents run inside the browser and are linked to local or remote large language models (LLMs). They allow developers to:

- Test and debug agents
- Simulate agent reasoning
- Test tool invocation
- Prototype within the interface

**Key Difference:** While standard agents are deployed entities, testbed agents are for prototyping and testing within the interface.

![MCP Agent](./assets/MCP_agent.gif)

### Creating a Testbed Agent

Agents can be created through the interface by filling in a form with required fields:

- **LLM base URL** - Endpoint for the language model
- **API Key** - Authentication credential
- **Model** - Specific model identifier
- **Prompt** - Initial instructions

### Associating Clients

Clients can be associated with the agent through the interface, allowing the agent to access the tools and resources provided by those clients.

---

## Agent Sequence Diagrams

### Tools and Agents Interaction Flow

```
User/Application → Aloha → Agent → Aloha → Client (MCP Server) → Tool/Resource
                      ↓              ↓
                   Routing & Authentication
```

The interaction flow demonstrates how:

1. Users or applications connect to Aloha
2. Aloha routes requests to appropriate agents
3. Agents invoke clients (MCP servers) through Aloha
4. Clients provide access to tools and resources
5. Results flow back through the chain

---

## Navigation

- [← Previous: Clients](./clients.md)
- [Next: Servers →](./servers.md)
- [Go to Index](./index.md)
