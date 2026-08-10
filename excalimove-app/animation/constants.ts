/** Half a second per timeline unit. */
export const TIMELINE_UNIT_MS = 500;

/** Fixed MVP 1 duration: 30 units × 0.5s = 15s. */
export const TIMELINE_UNIT_COUNT = 30;

export const TIMELINE_DURATION_MS = TIMELINE_UNIT_COUNT * TIMELINE_UNIT_MS;

export const unitIndexToTimeMs = (unitIndex: number) =>
  unitIndex * TIMELINE_UNIT_MS;

export const timeMsToUnitIndex = (timeMs: number) => timeMs / TIMELINE_UNIT_MS;

/** Compact chrome: header + resize handle. */
export const ANIMATION_BAR_MIN_HEIGHT_PX = 72;

/** Soft ceiling; also clamped to a fraction of the viewport. */
export const ANIMATION_BAR_MAX_HEIGHT_PX = 560;

export const ANIMATION_BAR_DEFAULT_HEIGHT_PX = 240;

export const ANIMATION_BAR_MAX_VIEWPORT_RATIO = 0.55;

export const clampAnimationBarHeight = (
  heightPx: number,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
) => {
  const maxHeight = Math.min(
    ANIMATION_BAR_MAX_HEIGHT_PX,
    Math.floor(viewportHeight * ANIMATION_BAR_MAX_VIEWPORT_RATIO),
  );
  return Math.min(
    maxHeight,
    Math.max(ANIMATION_BAR_MIN_HEIGHT_PX, Math.round(heightPx)),
  );
};
