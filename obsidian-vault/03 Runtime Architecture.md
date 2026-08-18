---
tags: [architecture, runtime]
---

# Runtime Architecture

## Boot Sequence
1. Server starts and validates environment config.
2. Database connection is established.
3. Express app is created with middleware stack.
4. HTTP server starts listening.
5. Socket.IO attaches to the same HTTP server.
6. Client (in dev via Vite, in prod via static build) loads and authenticates.

## Deployment Shape
Single Node process serves:
- REST API under `/api`
- Socket.IO endpoint under `/socket.io`
- Static SPA assets in production

## Component Diagram
```mermaid
flowchart TB
  subgraph Browser
    SPA[React SPA]
    QC[TanStack Query Cache]
    SPA --> QC
  end

  subgraph NodeProcess[Node Process]
    API[Express API]
    RT[Socket.IO Realtime]
    STATIC[Static Client Files]
    API --> RT
  end

  DB[(MongoDB)]

  SPA -->|fetch /api/*| API
  SPA <-->|ws /socket.io| RT
  SPA -->|GET /| STATIC
  API --> DB
  RT -.member checks.-> DB
```

## Request Handling Pipeline
```mermaid
flowchart LR
  A[Incoming HTTP Request] --> B[helmet + parsers]
  B --> C[route match]
  C --> D[validate input]
  D --> E[auth and project role check]
  E --> F[module service and persistence]
  F --> G[optional notification side effects]
  G --> H[broadcast realtime event]
  H --> I[JSON response]
```

Related: [[05 Request and Realtime Flows]], [[04 Domain Model]]
