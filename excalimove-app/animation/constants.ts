/** Half a second per timeline unit. */
export const TIMELINE_UNIT_MS = 500;

/** Fixed MVP 1 duration: 30 units × 0.5s = 15s. */
export const TIMELINE_UNIT_COUNT = 30;

export const TIMELINE_DURATION_MS = TIMELINE_UNIT_COUNT * TIMELINE_UNIT_MS;

export const unitIndexToTimeMs = (unitIndex: number) =>
  unitIndex * TIMELINE_UNIT_MS;

export const timeMsToUnitIndex = (timeMs: number) => timeMs / TIMELINE_UNIT_MS;

export const ANIMATION_BAR_EXPANDED_HEIGHT_PX = 220;
