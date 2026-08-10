import { CaptureUpdateAction, newElementWith } from "@excalimove/excalimove";

import { interpolatePose } from "./interpolate";

import type { ExcalidrawImperativeAPI } from "@excalimove/excalimove/types";

import type { TracksByElementId } from "./atoms";

/**
 * Writes interpolated x/y from all tracks onto the scene at timeMs.
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

  const trackList = Object.values(tracks).filter(
    (track) => track.properties.x.length > 0 || track.properties.y.length > 0,
  );

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
    if (pose.x === undefined && pose.y === undefined) {
      return element;
    }

    const nextX = pose.x ?? element.x;
    const nextY = pose.y ?? element.y;
    if (nextX === element.x && nextY === element.y) {
      return element;
    }

    changed = true;
    return newElementWith(element, {
      ...(pose.x !== undefined ? { x: pose.x } : null),
      ...(pose.y !== undefined ? { y: pose.y } : null),
    });
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
