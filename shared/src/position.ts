import { MIN_POSITION_GAP, POSITION_STEP } from './constants.js';

/**
 * Sparse float ordering, shared by both sides.
 *
 * The server is authoritative - it recomputes from the neighbours' current
 * positions at write time. The client uses the same function to predict the
 * result for its optimistic update, so a dragged card lands where it will end up
 * rather than jumping when the response arrives.
 */
export function calcPosition(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return POSITION_STEP;
  if (prev === null) return next! / 2;
  if (next === null) return prev + POSITION_STEP;
  return (prev + next) / 2;
}

/**
 * Repeated midpoints halve the gap, so after ~25 drops into the same spot floats
 * run out of room. Past that the column is rewritten to clean multiples.
 */
export function needsRenormalize(prev: number | null, next: number | null): boolean {
  if (prev === null || next === null) return false;
  return next - prev < MIN_POSITION_GAP;
}
