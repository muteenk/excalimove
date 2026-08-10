import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import {
  collapseDownIcon,
  collapseUpIcon,
  playerPlayIcon,
  TrashIcon,
} from "@excalimove/excalimove/components/icons";
import { Tooltip } from "@excalimove/excalimove/components/Tooltip";

import {
  ANIMATABLE_PROPERTIES,
  PROPERTY_LABELS,
  type AnimatableProperty,
  type Keyframe,
} from "../../animation/types";

import {
  TIMELINE_DURATION_MS,
  TIMELINE_UNIT_COUNT,
  TIMELINE_UNIT_MS,
} from "../../animation/constants";

import { canDeleteKeyframe } from "../../animation/keyframes";

import { TimelinePlayhead } from "./TimelinePlayhead";

import type { ExcalidrawElement } from "@excalimove/element/types";

const pauseIcon = (
  <svg
    aria-hidden
    focusable="false"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
  >
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
  </svg>
);

const formatTime = (timeMs: number) => {
  const clamped = Math.min(TIMELINE_DURATION_MS, Math.max(0, timeMs));
  const totalSeconds = clamped / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
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

const TimelineRuler = () => {
  const labels = useMemo(() => {
    const items: { unit: number; label: string }[] = [];
    for (let unit = 0; unit <= TIMELINE_UNIT_COUNT; unit += 2) {
      const seconds = (unit * TIMELINE_UNIT_MS) / 1000;
      items.push({
        unit,
        label: `${seconds}s`,
      });
    }
    return items;
  }, []);

  return (
    <div className="animation-timeline__ruler" aria-hidden>
      <div className="animation-timeline__ruler-spacer" />
      <div
        className="animation-timeline__ruler-track"
        style={{
          gridTemplateColumns: `repeat(${TIMELINE_UNIT_COUNT}, 1fr)`,
        }}
      >
        {Array.from({ length: TIMELINE_UNIT_COUNT }, (_, unit) => (
          <span
            key={unit}
            className={clsx("animation-timeline__tick", {
              "animation-timeline__tick--major": unit % 2 === 0,
            })}
          />
        ))}
        {labels.map(({ unit, label }) => (
          <span
            key={`label-${unit}`}
            className="animation-timeline__ruler-label"
            style={{
              left: `${(unit / TIMELINE_UNIT_COUNT) * 100}%`,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export type SelectedKeyframe = {
  property: AnimatableProperty;
  timeMs: number;
};

const PropertyTrack = ({
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
              ).toFixed(1)}s = ${Math.round(keyframe.value)}${
                !deletable ? " (base keyframe)" : ""
              }`}
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

const getElementLabel = (element: ExcalidrawElement) => {
  const shortId = element.id.slice(0, 6);
  return `${element.type} · ${shortId}`;
};

export const ElementTimeline = ({
  element,
  currentTimeMs,
  isPlaying,
  onPlayPause,
  onSeek,
  onScrubbingChange,
  keyframesByProperty = { x: [], y: [] },
  selectedKeyframe,
  onSelectKeyframe,
  onDeleteSelectedKeyframe,
}: {
  element: ExcalidrawElement;
  currentTimeMs: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (timeMs: number) => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
  keyframesByProperty?: Record<AnimatableProperty, readonly Keyframe[]>;
  selectedKeyframe: SelectedKeyframe | null;
  onSelectKeyframe: (selection: SelectedKeyframe | null) => void;
  onDeleteSelectedKeyframe: () => void;
}) => {
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  const canDeleteSelected = useMemo(() => {
    if (!selectedKeyframe) {
      return false;
    }
    return canDeleteKeyframe(
      keyframesByProperty[selectedKeyframe.property],
      selectedKeyframe.timeMs,
    );
  }, [keyframesByProperty, selectedKeyframe]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!canDeleteSelected) {
        return;
      }
      event.preventDefault();
      onDeleteSelectedKeyframe();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canDeleteSelected, onDeleteSelectedKeyframe]);

  return (
    <div className="animation-timeline">
      <div className="animation-timeline__header">
        <button
          type="button"
          className="animation-timeline__transport"
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          onClick={onPlayPause}
        >
          {isPlaying ? pauseIcon : playerPlayIcon}
        </button>
        <button
          type="button"
          className="animation-timeline__collapse"
          aria-expanded={propertiesOpen}
          aria-label={
            propertiesOpen ? "Collapse properties" : "Expand properties"
          }
          onClick={() => setPropertiesOpen((open) => !open)}
        >
          {propertiesOpen ? collapseDownIcon : collapseUpIcon}
        </button>
        <div className="animation-timeline__element-meta">
          <span className="animation-timeline__element-name">
            {getElementLabel(element)}
          </span>
          <span className="animation-timeline__element-hint">
            Move element to add a keyframe at the playhead · Delete removes
            selected
          </span>
        </div>
        <Tooltip label="Delete selected keyframe">
          <button
            type="button"
            className="animation-timeline__delete"
            aria-label="Delete selected keyframe"
            disabled={!canDeleteSelected}
            onClick={onDeleteSelectedKeyframe}
          >
            {TrashIcon}
          </button>
        </Tooltip>
        <div className="animation-timeline__time" aria-live="polite">
          {formatTime(currentTimeMs)}
          <span className="animation-timeline__time-separator">/</span>
          {formatTime(TIMELINE_DURATION_MS)}
        </div>
      </div>

      {propertiesOpen && (
        <div className="animation-timeline__body">
          <TimelineRuler />
          {ANIMATABLE_PROPERTIES.map((property) => (
            <PropertyTrack
              key={property}
              property={property}
              keyframes={keyframesByProperty[property]}
              selectedKeyframe={selectedKeyframe}
              onSelectKeyframe={onSelectKeyframe}
              onSeek={onSeek}
            />
          ))}
          <TimelinePlayhead
            currentTimeMs={currentTimeMs}
            onSeek={onSeek}
            onScrubbingChange={onScrubbingChange}
          />
        </div>
      )}
    </div>
  );
};
