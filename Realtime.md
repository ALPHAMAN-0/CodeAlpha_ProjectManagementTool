---
tags: [component, CodeAlpha_ProjectManagementTool]
---
- Path: server/src/realtime/ (io.ts, emit.ts)
- Role: Socket.IO layer — handshake auth, room membership (`user:id`, `project:id`), presence, broadcast-only emit after a REST write
- Talks to: [[Client]], [[Database]]
- Back: [[ARCHITECTURE]]
