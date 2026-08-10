import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";

import {
  FooterRight,
  useExcalidrawAPI,
  useExcalidrawStateValue,
} from "@excalimove/excalimove";
import {
  collapseDownIcon,
  collapseUpIcon,
} from "@excalimove/excalimove/components/icons";
import { Tooltip } from "@excalimove/excalimove/components/Tooltip";

import {
  ANIMATION_BAR_EXPANDED_HEIGHT_PX,
  TIMELINE_DURATION_MS,
} from "../animation/constants";
import { useAtom } from "../app-jotai";
import { animationTracksAtom } from "../animation/atoms";
import { applyTracksToScene } from "../animation/applyTracks";
import {
  recordPoseEdit,
  removeKeyframeFromTrack,
  type Pose2D,
} from "../animation/keyframes";

import {
  ElementTimeline,
  type SelectedKeyframe,
} from "./animation/ElementTimeline";

import "./AnimationBar.scss";

const AnimationBar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [selectedKeyframe, setSelectedKeyframe] =
    useState<SelectedKeyframe | null>(null);
  const [tracks, setTracks] = useAtom(animationTracksAtom);

  const rootRef = useRef<HTMLDivElement>(null);
  const currentTimeMsRef = useRef(currentTimeMs);
  const isPlayingRef = useRef(isPlaying);
  const isScrubbingRef = useRef(isScrubbing);
  const isApplyingAnimationRef = useRef(false);
  const poseSnapshotRef = useRef<Map<string, Pose2D>>(new Map());
  const tracksRef = useRef(tracks);

  const excalidrawAPI = useExcalidrawAPI();
  const selectedElementIds = useExcalidrawStateValue("selectedElementIds");

  currentTimeMsRef.current = currentTimeMs;
  isPlayingRef.current = isPlaying;
  isScrubbingRef.current = isScrubbing;
  tracksRef.current = tracks;

  const offsetPx = isOpen ? ANIMATION_BAR_EXPANDED_HEIGHT_PX : 0;

  const selectedElement = useMemo(() => {
    const ids = Object.keys(selectedElementIds ?? {});
    if (ids.length !== 1 || !excalidrawAPI || excalidrawAPI.isDestroyed) {
      return null;
    }

    const selectedId = ids[0];
    return (
      excalidrawAPI
        .getSceneElements()
        .find((element) => element.id === selectedId) ?? null
    );
  }, [excalidrawAPI, selectedElementIds]);

  const selectionState: "none" | "single" | "multiple" = (() => {
    const count = Object.keys(selectedElementIds ?? {}).length;
    if (count === 0) {
      return "none";
    }
    if (count === 1 && selectedElement) {
      return "single";
    }
    if (count > 1) {
      return "multiple";
    }
    return "none";
  })();

  // Clear keyframe selection when the selected element changes.
  useEffect(() => {
    setSelectedKeyframe(null);
  }, [selectedElement?.id]);

  const applyAnimationAtTime = useCallback(
    (timeMs: number) => {
      if (!excalidrawAPI || excalidrawAPI.isDestroyed) {
        return;
      }

      isApplyingAnimationRef.current = true;
      applyTracksToScene({
        api: excalidrawAPI,
        tracks: tracksRef.current,
        timeMs,
      });
      // Defer clearing so sync onChange from updateScene still sees the flag.
      queueMicrotask(() => {
        isApplyingAnimationRef.current = false;
      });
    },
    [excalidrawAPI],
  );

  // Preview / playback: push interpolated poses whenever time or tracks change.
  useEffect(() => {
    applyAnimationAtTime(currentTimeMs);
  }, [applyAnimationAtTime, currentTimeMs, tracks]);

  // Keep a pose snapshot so the first keyframe at t>0 can seed t=0 from the
  // pre-edit values.
  useEffect(() => {
    if (!excalidrawAPI || excalidrawAPI.isDestroyed) {
      return;
    }

    const syncSnapshots = () => {
      const next = new Map<string, Pose2D>();
      for (const element of excalidrawAPI.getSceneElements()) {
        next.set(element.id, { x: element.x, y: element.y });
      }
      poseSnapshotRef.current = next;
    };

    syncSnapshots();
    return excalidrawAPI.onChange(() => {
      if (
        isApplyingAnimationRef.current ||
        isPlayingRef.current ||
        isScrubbingRef.current
      ) {
        // Refresh snapshots so the next user edit has a valid baseline,
        // but do not record keyframes during play/scrub/apply.
        syncSnapshots();
        return;
      }

      const selectedIds = Object.keys(
        excalidrawAPI.getAppState().selectedElementIds,
      );
      if (selectedIds.length !== 1) {
        syncSnapshots();
        return;
      }

      const elementId = selectedIds[0];
      const element = excalidrawAPI
        .getSceneElements()
        .find((el) => el.id === elementId);

      if (!element) {
        syncSnapshots();
        return;
      }

      const prev = poseSnapshotRef.current.get(elementId);
      const next: Pose2D = { x: element.x, y: element.y };

      if (prev) {
        setTracks((currentTracks) => {
          const updated = recordPoseEdit({
            track: currentTracks[elementId],
            elementId,
            timeMs: currentTimeMsRef.current,
            prev,
            next,
          });
          if (!updated) {
            return currentTracks;
          }
          return { ...currentTracks, [elementId]: updated };
        });
      }

      syncSnapshots();
    });
  }, [excalidrawAPI, setTracks]);

  const onSeek = useCallback((timeMs: number) => {
    setIsPlaying(false);
    setCurrentTimeMs(Math.min(TIMELINE_DURATION_MS, Math.max(0, timeMs)));
  }, []);

  const onPlayPause = useCallback(() => {
    setIsPlaying((playing) => {
      if (playing) {
        return false;
      }
      setCurrentTimeMs((timeMs) =>
        timeMs >= TIMELINE_DURATION_MS ? 0 : timeMs,
      );
      return true;
    });
  }, []);

  const onSelectKeyframe = useCallback((selection: SelectedKeyframe | null) => {
    setSelectedKeyframe(selection);
  }, []);

  const onDeleteSelectedKeyframe = useCallback(() => {
    if (!selectedElement || !selectedKeyframe) {
      return;
    }

    setTracks((currentTracks) => {
      const track = currentTracks[selectedElement.id];
      if (!track) {
        return currentTracks;
      }
      const updated = removeKeyframeFromTrack(
        track,
        selectedKeyframe.property,
        selectedKeyframe.timeMs,
      );
      if (!updated) {
        return currentTracks;
      }
      return { ...currentTracks, [selectedElement.id]: updated };
    });
    setSelectedKeyframe(null);
  }, [selectedElement, selectedKeyframe, setTracks]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      setCurrentTimeMs((timeMs) => {
        const next = timeMs + delta;
        if (next >= TIMELINE_DURATION_MS) {
          setIsPlaying(false);
          return TIMELINE_DURATION_MS;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  useLayoutEffect(() => {
    const excalidraw = rootRef.current?.closest(
      ".excalidraw",
    ) as HTMLElement | null;

    if (!excalidraw) {
      return;
    }

    excalidraw.style.setProperty("--animation-bar-offset", `${offsetPx}px`);

    return () => {
      excalidraw.style.removeProperty("--animation-bar-offset");
    };
  }, [offsetPx]);

  const keyframesByProperty = selectedElement
    ? tracks[selectedElement.id]?.properties ?? { x: [], y: [] }
    : { x: [], y: [] };

  return (
    <>
      <FooterRight>
        <Tooltip
          label={isOpen ? "Collapse animation bar" : "Expand animation bar"}
        >
          <button
            type="button"
            className="animation-bar__toggle help-icon"
            aria-expanded={isOpen}
            aria-label={
              isOpen ? "Collapse animation bar" : "Expand animation bar"
            }
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? collapseDownIcon : collapseUpIcon}
          </button>
        </Tooltip>
      </FooterRight>
      <div
        ref={rootRef}
        className={clsx("animation-bar", {
          "animation-bar--open": isOpen,
        })}
        style={{ height: offsetPx }}
        data-viewport-ui={isOpen ? "bottom" : undefined}
        aria-hidden={!isOpen}
      >
        <div className="animation-bar__panel">
          {selectionState === "single" && selectedElement ? (
            <ElementTimeline
              element={selectedElement}
              currentTimeMs={currentTimeMs}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSeek={onSeek}
              onScrubbingChange={setIsScrubbing}
              keyframesByProperty={keyframesByProperty}
              selectedKeyframe={selectedKeyframe}
              onSelectKeyframe={onSelectKeyframe}
              onDeleteSelectedKeyframe={onDeleteSelectedKeyframe}
            />
          ) : (
            <div className="animation-bar__empty">
              {selectionState === "multiple"
                ? "Select a single element to animate"
                : "Select an element to animate"}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AnimationBar;
