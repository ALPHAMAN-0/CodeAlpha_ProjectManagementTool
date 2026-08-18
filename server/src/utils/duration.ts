const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses "7d" / "12h" / "30m" / "45s" (or a bare number of seconds) to ms, so
 * the auth cookie's lifetime is derived from JWT_EXPIRES_IN rather than being a
 * second constant that can silently drift out of sync with the token.
 */
export function durationToMs(value: string, fallbackMs = 7 * UNITS.d!): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  return amount * (UNITS[unit] ?? 1000);
}
