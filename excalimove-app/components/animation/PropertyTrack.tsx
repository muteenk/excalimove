import clsx from "clsx";

import { TIMELINE_DURATION_MS } from "excalimove-app/animation/constants";

import { canDeleteKeyframe } from "excalimove-app/animation/keyframes";

import {
  type AnimatableProperty,
  type Keyframe,
  PROPERTY_LABELS,
} from "excalimove-app/animation/types";

export type SelectedKeyframe = {
  property: AnimatableProperty;
  timeMs: number;
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

export const PropertyTrack = ({
  property,
  keyframes,
  selectedKeyframe,
  onSelectKeyframe,
  onSeek,
}: {
  property: AnimatableProperty;
  keyframes: readonly Keyframe[];
  selectedKeyframe: SelectedKeyframe | null;
  onSelectKeyframe: (selection: SelectedKeyframe | null) => void;
  onSeek: (timeMs: number) => void;
}) => {
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
        {keyframes.map((keyframe) => {
          const leftPercent = Math.min(
            100,
            Math.max(0, (keyframe.timeMs / TIMELINE_DURATION_MS) * 100),
          );
          const isSelected =
            selectedKeyframe?.property === property &&
            selectedKeyframe.timeMs === keyframe.timeMs;
          const deletable = canDeleteKeyframe(keyframes, keyframe.timeMs);

          return (
            <li
              key={`${property}-${keyframe.timeMs}`}
              className={clsx("animation-timeline__keyframe", {
                "animation-timeline__keyframe--selected": isSelected,
                "animation-timeline__keyframe--locked": !deletable,
              })}
              title={`${PROPERTY_LABELS[property]} @ ${(
                keyframe.timeMs / 1000
              ).toFixed(1)}s = ${
                property === "angle"
                  ? `${Math.round((keyframe.value * 180) / Math.PI)}°`
                  : property === "opacity"
                  ? `${Math.round(keyframe.value)}%`
                  : Math.round(keyframe.value * 100) / 100
              }${!deletable ? " (base keyframe)" : ""}`}
              style={{ left: `${leftPercent}%` }}
              data-selected={isSelected ? "true" : undefined}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectKeyframe({ property, timeMs: keyframe.timeMs });
              }}
            />
          );
        })}
      </ul>
    </div>
  );
};
