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

import {
  PropertyTrack,
  type CopiedKeyframe,
  type SelectedKeyframe,
} from "./PropertyTrack";

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
  onMoveKeyframe,
  copiedKeyframe,
  onCopyKeyframe,
  onPasteKeyframe,
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
  onMoveKeyframe: (args: {
    property: SelectedKeyframe["property"];
    fromTimeMs: number;
    toTimeMs: number;
    value: number;
  }) => void;
  copiedKeyframe: CopiedKeyframe | null;
  onCopyKeyframe: (args: {
    property: CopiedKeyframe["property"];
    value: number;
  }) => void;
  onPasteKeyframe: (property: CopiedKeyframe["property"]) => void;
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
    const isEditableTarget = (target: HTMLElement | null) =>
      !!target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    const getSelectedKeyframeValue = () => {
      if (!selectedKeyframe) {
        return null;
      }
      const keyframes = keyframesByProperty[selectedKeyframe.property];
      const timeMs = Math.max(0, Math.round(selectedKeyframe.timeMs));
      return (
        keyframes.find((keyframe) => keyframe.timeMs === timeMs)?.value ?? null
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target as HTMLElement | null)) {
        return;
      }

      // Only steal shortcuts while a keyframe is selected (or we have a
      // keyframe clipboard for paste). Excalidraw listens on `document` in
      // the bubble phase, so we must capture + stopPropagation first.
      const isMod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      const steal = () => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      if (isMod && key === "c") {
        const value = getSelectedKeyframeValue();
        if (value == null || !selectedKeyframe) {
          return;
        }
        steal();
        onCopyKeyframe({ property: selectedKeyframe.property, value });
        return;
      }

      if (isMod && key === "x") {
        if (!selectedKeyframe) {
          return;
        }
        const value = getSelectedKeyframeValue();
        if (value == null) {
          return;
        }
        // Always consume cut when a keyframe is selected so the canvas
        // element isn't cut instead.
        steal();
        onCopyKeyframe({ property: selectedKeyframe.property, value });
        if (canDeleteSelected) {
          onDeleteSelectedKeyframe();
        }
        return;
      }

      if (isMod && key === "v") {
        if (!copiedKeyframe) {
          return;
        }
        steal();
        onPasteKeyframe(copiedKeyframe.property);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedKeyframe) {
          return;
        }
        // Always consume delete/backspace when a keyframe is selected so the
        // canvas element isn't deleted instead.
        steal();
        if (canDeleteSelected) {
          onDeleteSelectedKeyframe();
        }
      }
    };

    // Capture phase so we run before Excalidraw's document bubble handler.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [
    canDeleteSelected,
    copiedKeyframe,
    keyframesByProperty,
    onCopyKeyframe,
    onDeleteSelectedKeyframe,
    onPasteKeyframe,
    selectedKeyframe,
  ]);

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
            Edit on canvas to keyframe · ⌘/Ctrl+C/X/V copy/cut/paste · Delete
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
              onMoveKeyframe={onMoveKeyframe}
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
