---
tags: [architecture, flow]
---

# Request and Realtime Flows

## Mutation Flow (Authoritative)
```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant A as API
  participant D as Database
  participant R as Realtime

  U->>C: Drag card / edit task / comment
  C->>C: Apply optimistic update
  C->>A: HTTP mutation with x-socket-id
  A->>A: Validate + authorize
  A->>D: Persist change
  D-->>A: Success
  A->>R: Emit domain event except origin socket
  A-->>C: JSON response
  R-->>C: Update other viewers
```

## Realtime Presence Flow
```mermaid
sequenceDiagram
  participant C as Client Socket
  participant R as Socket.IO Server
  participant D as Database

  C->>R: Handshake with auth cookie
  R->>R: Verify token
  C->>R: project:join(projectId)
  R->>D: Check project membership
  D-->>R: Member confirmed
  R->>R: Join project room
  R-->>C: presence:update
```

## Why This Pattern Works
1. Single write path avoids duplicated authorization logic.
2. Optimistic UX remains fast while server keeps canonical state.
3. Shared contracts reduce client/server mismatch errors.

Related: [[01 System Overview]], [[03 Runtime Architecture]]
