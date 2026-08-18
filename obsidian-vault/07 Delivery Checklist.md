---
tags: [plan, checklist]
---

# Delivery Checklist

## Architecture Understanding
- [ ] Shared contracts reviewed (schemas, events, position)
- [ ] API module boundaries documented
- [ ] Realtime room model and event flow documented
- [ ] Data ownership and role matrix documented

## Quality Gates
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Manual smoke test on login, board, task, comment, notifications

## Realtime Verification
- [ ] Multi-user board updates synchronize correctly
- [ ] Originating client does not double-apply emitted events
- [ ] Presence updates are accurate on join/leave/disconnect
- [ ] Reconnect performs state resync as expected

## Security and Access
- [ ] Unauthorized project access returns non-disclosing response
- [ ] Role escalation paths are blocked
- [ ] Cookie and token behavior verified in production settings

## Release Readiness
- [ ] Env variables validated
- [ ] Health endpoint monitored
- [ ] Rollback plan confirmed
- [ ] Post-release validation script executed

Backlinks: [[00 Home]], [[06 Engineering Plan]]
