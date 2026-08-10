import {
  ANIMATABLE_PROPERTIES,
  type AnimatableProperty,
  type ElementTrack,
  type Keyframe,
} from "./types";

export const createEmptyTrack = (elementId: string): ElementTrack => ({
  elementId,
  properties: {
    x: [],
    y: [],
  },
});

export const sortKeyframes = (keyframes: readonly Keyframe[]): Keyframe[] =>
  [...keyframes].sort((a, b) => a.timeMs - b.timeMs);

/** Upsert a keyframe at timeMs (one keyframe per property per time). */
export const upsertKeyframe = (
  keyframes: readonly Keyframe[],
  timeMs: number,
  value: number,
): Keyframe[] => {
  const normalizedTime = Math.max(0, Math.round(timeMs));
  const without = keyframes.filter(
    (keyframe) => keyframe.timeMs !== normalizedTime,
  );
  return sortKeyframes([...without, { timeMs: normalizedTime, value }]);
};

export const deleteKeyframeAtTime = (
  keyframes: readonly Keyframe[],
  timeMs: number,
): Keyframe[] => {
  const normalizedTime = Math.max(0, Math.round(timeMs));
  return keyframes.filter((keyframe) => keyframe.timeMs !== normalizedTime);
};

/**
 * Whether a keyframe may be deleted.
 * Keeps t=0 while later keyframes exist (MVP rule: always retain a base pose).
 */
export const canDeleteKeyframe = (
  keyframes: readonly Keyframe[],
  timeMs: number,
): boolean => {
  const normalizedTime = Math.max(0, Math.round(timeMs));
  const exists = keyframes.some(
    (keyframe) => keyframe.timeMs === normalizedTime,
  );
  if (!exists) {
    return false;
  }
  if (normalizedTime === 0 && keyframes.length > 1) {
    return false;
  }
  return true;
};

export type Pose2D = { x: number; y: number };

/**
 * Apply a user-driven x/y edit at the playhead.
 * Seeds t=0 from the previous pose when animation data is first created.
 */
export const recordPoseEdit = ({
  track,
  elementId,
  timeMs,
  prev,
  next,
}: {
  track: ElementTrack | undefined;
  elementId: string;
  timeMs: number;
  prev: Pose2D;
  next: Pose2D;
}): ElementTrack | null => {
  const changed = ANIMATABLE_PROPERTIES.filter(
    (property) => prev[property] !== next[property],
  );

  if (changed.length === 0) {
    return null;
  }

  const normalizedTime = Math.max(0, Math.round(timeMs));
  let properties: ElementTrack["properties"] = track
    ? {
        x: [...track.properties.x],
        y: [...track.properties.y],
      }
    : { x: [], y: [] };

  const isFirstAnimation =
    properties.x.length === 0 && properties.y.length === 0;

  if (isFirstAnimation) {
    // Seed base pose from values before this edit.
    properties = {
      x: [{ timeMs: 0, value: prev.x }],
      y: [{ timeMs: 0, value: prev.y }],
    };
  }

  for (const property of changed) {
    if (properties[property].length === 0) {
      properties[property] = [{ timeMs: 0, value: prev[property] }];
    }
    properties[property] = upsertKeyframe(
      properties[property],
      normalizedTime,
      next[property],
    );
  }

  return { elementId, properties };
};

export const removeKeyframeFromTrack = (
  track: ElementTrack,
  property: AnimatableProperty,
  timeMs: number,
): ElementTrack | null => {
  const keyframes = track.properties[property];
  if (!canDeleteKeyframe(keyframes, timeMs)) {
    return null;
  }

  const nextKeyframes = deleteKeyframeAtTime(keyframes, timeMs);
  const properties = {
    ...track.properties,
    [property]: nextKeyframes,
  };

  const hasAny = ANIMATABLE_PROPERTIES.some(
    (prop) => properties[prop].length > 0,
  );

  if (!hasAny) {
    return createEmptyTrack(track.elementId);
  }

  return { elementId: track.elementId, properties };
};
