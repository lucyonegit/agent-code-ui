# Agent Code UI

An experimental React workspace for streaming AI-agent conversations and browser-based coding workflows.

The project focuses on one practical question: how should a user interface make an agent's intermediate work—thought streams, Plans, tool calls, generated files, and final answers—understandable without losing the simplicity of chat?

## What is implemented

- Streaming SSE handling for thoughts, normal messages, tool calls, tool results, Plans, and final answers.
- Separate chat and coding workspaces with light and dark themes.
- A resizable conversation/code layout for coding tasks.
- WebContainer-backed code execution and preview.
- OPFS-backed browser persistence for generated project files.
- Markdown rendering, syntax highlighting, artifact previews, and file-tree views.
- Dedicated UI cards for Plans, tools, BDD output, architecture output, generated code, and completion results.

## Runtime flow

```text
Agent server (SSE)
        │
        ▼
src/services/sseClient.ts
        │
        ▼
src/hooks/useChat.ts
        │
        ├── conversation timeline
        ├── Plan and tool state
        └── generated files / artifacts
                    │
                    ▼
          WebContainer + OPFS
```

## Project structure

```text
src/
  components/          Timeline, tool, Plan, artifact, and coding UI
  hooks/               Chat streaming, theme, and WebContainer lifecycle
  lib/webcontainer/    Browser runtime and OPFS integration
  pages/               Chat and coding workspaces
  services/            SSE transport
  types/               Agent event and artifact contracts
```

## Run locally

Requirements: Node.js 20+ and a compatible agent server running at `http://localhost:3002`.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
npm run preview
```

## Status

This repository is a product and interaction prototype. Its event contracts are coupled to the companion agent server, and the API base URL is currently defined in `src/services/sseClient.ts`.
