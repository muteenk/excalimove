import { CaptureUpdateAction, newElementWith } from "@excalimove/excalimove";

import { interpolatePose } from "./interpolate";
import { trackHasKeyframes } from "./types";

import type { Radians } from "@excalimove/math";

import type { ExcalidrawImperativeAPI } from "@excalimove/excalimove/types";

import type { TracksByElementId } from "./atoms";
import type { AnimatableProperty } from "./types";

const clampAppliedValue = (
  property: AnimatableProperty,
  value: number,
): number => {
  switch (property) {
    case "opacity":
      return Math.min(100, Math.max(0, value));
    case "width":
    case "height":
      return Math.max(1, value);
    case "strokeWidth":
      return Math.max(0.1, value);
    default:
      return value;
  }
};

/**
 * Writes interpolated animatable properties from all tracks onto the scene.
 * Returns true when any element was updated.
 */
export const applyTracksToScene = ({
  api,
  tracks,
  timeMs,
}: {
  api: ExcalidrawImperativeAPI;
  tracks: TracksByElementId;
  timeMs: number;
}): boolean => {
  if (api.isDestroyed) {
    return false;
  }

  const trackList = Object.values(tracks).filter(trackHasKeyframes);

  if (trackList.length === 0) {
    return false;
  }

  const trackById = new Map(trackList.map((track) => [track.elementId, track]));
  let changed = false;

  const nextElements = api.getSceneElements().map((element) => {
    const track = trackById.get(element.id);
    if (!track) {
      return element;
    }

    const pose = interpolatePose(track, timeMs);
    const updates: {
      x?: number;
      y?: number;
      opacity?: number;
      angle?: Radians;
      width?: number;
      height?: number;
      strokeWidth?: number;
    } = {};

    for (const property of Object.keys(pose) as AnimatableProperty[]) {
      const raw = pose[property];
      if (raw === undefined) {
        continue;
      }
      const nextValue = clampAppliedValue(property, raw);
      if (element[property] === nextValue) {
        continue;
      }
      if (property === "angle") {
        updates.angle = nextValue as Radians;
      } else {
        updates[property] = nextValue;
      }
    }

    if (Object.keys(updates).length === 0) {
      return element;
    }

    changed = true;
    return newElementWith(element, updates);
  });

  if (!changed) {
    return false;
  }

  api.updateScene({
    elements: nextElements,
    captureUpdate: CaptureUpdateAction.NEVER,
  });

  return true;
};
