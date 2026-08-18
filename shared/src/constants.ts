/** Project roles, ordered least to most privileged. */
export const ROLES = ['member', 'admin', 'owner'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Numeric ranks so authorization can be a single comparison instead of a
 * chain of equality checks. `requireProjectRole('admin')` == rank >= 2.
 */
export const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Labels are a fixed palette rather than a collection: a task stores label
 * keys, so there is no Label model, no per-project label CRUD, and no
 * dangling references when a label is deleted.
 */
export const LABEL_PALETTE = [
  { key: 'bug', name: 'Bug', color: '#ef4444' },
  { key: 'feature', name: 'Feature', color: '#3b82f6' },
  { key: 'design', name: 'Design', color: '#a855f7' },
  { key: 'docs', name: 'Docs', color: '#14b8a6' },
  { key: 'urgent', name: 'Urgent', color: '#f97316' },
  { key: 'blocked', name: 'Blocked', color: '#64748b' },
] as const;

export type LabelKey = (typeof LABEL_PALETTE)[number]['key'];
export const LABEL_KEYS = LABEL_PALETTE.map((l) => l.key) as readonly LabelKey[];
export const LABELS_BY_KEY: Record<string, { key: string; name: string; color: string }> =
  Object.fromEntries(LABEL_PALETTE.map((l) => [l.key, l]));

/** Gap between freshly appended items, and the gap below which we renormalize. */
export const POSITION_STEP = 1000;
export const MIN_POSITION_GAP = 0.0001;

/** Avatar background colors, picked deterministically from a user id. */
export const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
] as const;

/** Header carrying the originating socket id so the server can skip the actor. */
export const SOCKET_ID_HEADER = 'x-socket-id';

export const NOTIFICATION_PAGE_SIZE = 50;
