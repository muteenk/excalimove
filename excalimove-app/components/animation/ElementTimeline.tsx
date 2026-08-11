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
  createEmptyProperties,
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

import { PropertyTrack, type SelectedKeyframe } from "./PropertyTrack";

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
  keyframesByProperty = createEmptyProperties(),
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
            Edit properties on canvas to keyframe at the playhead · Delete
            removes selected
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
