import { useEffect, useRef } from "react";

import { TIMELINE_DURATION_MS } from "excalimove-app/animation/constants";

import { canDeleteKeyframe } from "excalimove-app/animation/keyframes";

import {
  type AnimatableProperty,
  type Keyframe,
  PROPERTY_LABELS,
} from "excalimove-app/animation/types";

import { KeyframeDot } from "./KeyframeDot";

export type SelectedKeyframe = {
  property: AnimatableProperty;
  timeMs: number;
};

export type CopiedKeyframe = {
  property: AnimatableProperty;
  value: number;
};

const timeMsFromClientX = (
  clientX: number,
  trackElement: HTMLElement,
): number => {
  const rect = trackElement.getBoundingClientRect();
  if (rect.width <= 0) {
    return 0;
  }
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return ratio * TIMELINE_DURATION_MS;
};

const getKeyframeLeftPercent = (keyframe: Keyframe) => {
  return Math.min(
    100,
    Math.max(0, (keyframe.timeMs / TIMELINE_DURATION_MS) * 100),
  );
};

const timeMsFromPointerEvent = (
  event: React.PointerEvent<HTMLLIElement>,
): number => {
  // `event.currentTarget` is the <li> keyframe element (very small), but the
  // time mapping should be based on the full-width track (<ul>).
  const trackElement = event.currentTarget.closest(
    ".animation-timeline__track",
  ) as HTMLElement | null;
  if (!trackElement) {
    return 0;
  }

  return Math.min(
    TIMELINE_DURATION_MS,
    Math.max(0, timeMsFromClientX(event.clientX, trackElement)),
  );
};

export const PropertyTrack = ({
  property,
  keyframes,
  selectedKeyframe,
  onSelectKeyframe,
  onSeek,
  onMoveKeyframe,
}: {
  property: AnimatableProperty;
  keyframes: readonly Keyframe[];
  selectedKeyframe: SelectedKeyframe | null;
  onSelectKeyframe: (selection: SelectedKeyframe | null) => void;
  onSeek: (timeMs: number) => void;
  onMoveKeyframe: (args: {
    property: SelectedKeyframe["property"];
    fromTimeMs: number;
    toTimeMs: number;
    value: number;
  }) => void;
}) => {
  // Tracks the active pointer for drag-to-move interactions.
  // Pointer capture lets us keep receiving move events even when the pointer
  // leaves the keyframe element.
  const draggingPointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const draggingFromTimeMsRef = useRef<number | null>(null);
  const draggingValueRef = useRef<number | null>(null);

  useEffect(() => {
    const clearIfActive = () => {
      if (draggingPointerIdRef.current != null) {
        draggingPointerIdRef.current = null;
        isDraggingRef.current = false;
        draggingFromTimeMsRef.current = null;
        draggingValueRef.current = null;
      }
    };

    window.addEventListener("pointerup", clearIfActive);
    window.addEventListener("pointercancel", clearIfActive);
    return () => {
      window.removeEventListener("pointerup", clearIfActive);
      window.removeEventListener("pointercancel", clearIfActive);
    };
  }, []);

  return (
    <div className="animation-timeline__property">
      <div className="animation-timeline__property-label">
        {PROPERTY_LABELS[property]}
      </div>
      <ul
        className="animation-timeline__track"
        aria-label={`${PROPERTY_LABELS[property]} keyframes`}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest(".animation-timeline__keyframe")) {
            return;
          }
          onSelectKeyframe(null);
          onSeek(timeMsFromClientX(event.clientX, event.currentTarget));
        }}
      >
        <li className="animation-timeline__track-line" aria-hidden />
        {keyframes.map((keyframe, index) => {
          const leftPercent = getKeyframeLeftPercent(keyframe);
          const isSelected =
            selectedKeyframe?.property === property &&
            selectedKeyframe.timeMs === keyframe.timeMs;
          const deletable = canDeleteKeyframe(keyframes, keyframe.timeMs);
          let valueLabel: string;
          if (property === "angle") {
            valueLabel = `${Math.round((keyframe.value * 180) / Math.PI)}°`;
          } else if (property === "opacity") {
            valueLabel = `${Math.round(keyframe.value)}%`;
          } else {
            valueLabel = `${Math.round(keyframe.value * 100) / 100}`;
          }

          const title = `${PROPERTY_LABELS[property]} @ ${(
            keyframe.timeMs / 1000
          ).toFixed(1)}s = ${valueLabel}${
            !deletable ? " (base keyframe)" : ""
          }`;

          return (
            <KeyframeDot
              // Stable key keeps drag-to-move refs valid across time updates.
              key={index}
              leftPercent={leftPercent}
              isSelected={isSelected}
              deletable={deletable}
              title={title}
              dataSelected={isSelected ? "true" : undefined}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectKeyframe({
                  property,
                  timeMs: Math.max(0, Math.round(keyframe.timeMs)),
                });

                if (!deletable) {
                  // Base/locked keyframes can be selected, but should not be moved.
                  draggingPointerIdRef.current = null;
                  isDraggingRef.current = false;
                  draggingFromTimeMsRef.current = null;
                  draggingValueRef.current = null;
                  return;
                }

                draggingPointerIdRef.current = event.pointerId;
                isDraggingRef.current = true;
                draggingFromTimeMsRef.current = Math.max(
                  0,
                  Math.round(keyframe.timeMs),
                );
                draggingValueRef.current = keyframe.value;
                event.currentTarget.setPointerCapture(event.pointerId);
                event.preventDefault();
              }}
              onPointerMove={(event) => {
                if (draggingPointerIdRef.current !== event.pointerId) {
                  return;
                }
                if (!isDraggingRef.current) {
                  return;
                }
                event.stopPropagation();
                event.preventDefault();
                const toTimeMs = timeMsFromPointerEvent(event);
                const toNormalized = Math.max(0, Math.round(toTimeMs));

                const fromNormalized = draggingFromTimeMsRef.current;
                const value = draggingValueRef.current;
                if (fromNormalized == null || value == null) {
                  return;
                }

                onMoveKeyframe({
                  property,
                  fromTimeMs: fromNormalized,
                  toTimeMs: toNormalized,
                  value,
                });
                draggingFromTimeMsRef.current = toNormalized;
                onSeek(toNormalized);
              }}
              onPointerUp={(event) => {
                if (draggingPointerIdRef.current === event.pointerId) {
                  draggingPointerIdRef.current = null;
                  isDraggingRef.current = false;
                  draggingFromTimeMsRef.current = null;
                  draggingValueRef.current = null;
                }
              }}
              onPointerCancel={(event) => {
                if (draggingPointerIdRef.current === event.pointerId) {
                  draggingPointerIdRef.current = null;
                  isDraggingRef.current = false;
                  draggingFromTimeMsRef.current = null;
                  draggingValueRef.current = null;
                }
              }}
            />
          );
        })}
      </ul>
    </div>
  );
};
