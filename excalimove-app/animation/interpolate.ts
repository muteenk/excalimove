import {
  ANIMATABLE_PROPERTIES,
  type ElementTrack,
  type Keyframe,
} from "./types";

import { sortKeyframes, type ElementPose } from "./keyframes";

/**
 * Linear interpolation between neighboring keyframes.
 * Holds first/last value outside the keyed range.
 * Returns undefined when there are no keyframes.
 */
export const interpolateProperty = (
  keyframes: readonly Keyframe[],
  timeMs: number,
): number | undefined => {
  if (keyframes.length === 0) {
    return undefined;
  }

  const sorted = sortKeyframes(keyframes);
  const first = sorted[0];
  const last = sorted.at(-1)!;

  if (timeMs <= first.timeMs) {
    return first.value;
  }
  if (timeMs >= last.timeMs) {
    return last.value;
  }

  for (let index = 0; index < sorted.length - 1; index++) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (timeMs < left.timeMs || timeMs > right.timeMs) {
      continue;
    }
    if (right.timeMs === left.timeMs) {
      return right.value;
    }
    const t = (timeMs - left.timeMs) / (right.timeMs - left.timeMs);
    return left.value + (right.value - left.value) * t;
  }

  return last.value;
};

export const interpolatePose = (
  track: ElementTrack,
  timeMs: number,
): Partial<ElementPose> => {
  const pose: Partial<ElementPose> = {};

  for (const property of ANIMATABLE_PROPERTIES) {
    const value = interpolateProperty(track.properties[property], timeMs);
    if (value !== undefined) {
      pose[property] = value;
    }
  }

  return pose;
};
