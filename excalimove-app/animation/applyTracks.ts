import { CaptureUpdateAction } from "@excalimove/excalimove";
import {
  isElbowArrow,
  isFreeDrawElement,
  isLinearElement,
  isTextElement,
  newElementWith,
  rescalePointsInElement,
} from "@excalimove/element";

import { interpolatePose } from "./interpolate";
import { trackHasKeyframes } from "./types";

import type { LocalPoint, Radians } from "@excalimove/math";

import type { NonDeletedExcalidrawElement } from "@excalimove/element/types";
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

type ElementUpdates = {
  x?: number;
  y?: number;
  opacity?: number;
  angle?: Radians;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fontSize?: number;
  points?: readonly LocalPoint[];
};

/**
 * Lines/arrows/freedraw store geometry in `points`. Setting width/height alone
 * desyncs the bbox from the path and corrupts the element. Text needs font
 * scaling when width changes. Elbow arrows must keep angle at 0.
 */
const finalizeUpdatesForElementType = (
  element: NonDeletedExcalidrawElement,
  updates: ElementUpdates,
): ElementUpdates => {
  const next: ElementUpdates = { ...updates };

  if (isElbowArrow(element) && next.angle !== undefined) {
    delete next.angle;
  }

  const nextWidth = next.width ?? element.width;
  const nextHeight = next.height ?? element.height;
  const widthChanged = next.width !== undefined && next.width !== element.width;
  const heightChanged =
    next.height !== undefined && next.height !== element.height;

  if (
    (isLinearElement(element) || isFreeDrawElement(element)) &&
    (widthChanged || heightChanged)
  ) {
    Object.assign(
      next,
      rescalePointsInElement(element, nextWidth, nextHeight, false),
    );
  }

  if (isTextElement(element) && widthChanged && element.width > 0) {
    const scale = nextWidth / element.width;
    next.fontSize = Math.max(1, element.fontSize * scale);
    if (!heightChanged) {
      next.height = Math.max(1, element.height * scale);
    }
  }

  return next;
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
    const updates: ElementUpdates = {};

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

    const finalized = finalizeUpdatesForElementType(
      element as NonDeletedExcalidrawElement,
      updates,
    );
    if (Object.keys(finalized).length === 0) {
      return element;
    }

    changed = true;
    return newElementWith(element, finalized);
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
