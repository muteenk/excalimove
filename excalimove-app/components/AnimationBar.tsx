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
  ANIMATION_BAR_DEFAULT_HEIGHT_PX,
  ANIMATION_BAR_MIN_HEIGHT_PX,
  clampAnimationBarHeight,
  TIMELINE_DURATION_MS,
} from "../animation/constants";
import { useAtom } from "../app-jotai";
import { animationTracksAtom } from "../animation/atoms";
import { applyTracksToScene } from "../animation/applyTracks";
import {
  recordPoseEdit,
  readElementPose,
  removeKeyframeFromTrack,
  type ElementPose,
} from "../animation/keyframes";
import { createEmptyProperties } from "../animation/types";

import { ElementTimeline } from "./animation/ElementTimeline";

import type { SelectedKeyframe } from "./animation/PropertyTrack";

import "./AnimationBar.scss";

const AnimationBar = () => {
  const [heightPx, setHeightPx] = useState(() =>
    clampAnimationBarHeight(ANIMATION_BAR_DEFAULT_HEIGHT_PX),
  );
  const [isResizing, setIsResizing] = useState(false);
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
  const poseSnapshotRef = useRef<Map<string, ElementPose>>(new Map());
  const tracksRef = useRef(tracks);
  const heightPxRef = useRef(heightPx);
  const restoredHeightRef = useRef(
    clampAnimationBarHeight(ANIMATION_BAR_DEFAULT_HEIGHT_PX),
  );

  const excalidrawAPI = useExcalidrawAPI();
  const selectedElementIds = useExcalidrawStateValue("selectedElementIds");

  currentTimeMsRef.current = currentTimeMs;
  isPlayingRef.current = isPlaying;
  isScrubbingRef.current = isScrubbing;
  tracksRef.current = tracks;
  heightPxRef.current = heightPx;

  const isCompact = heightPx <= ANIMATION_BAR_MIN_HEIGHT_PX + 1;

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

  // Keep height valid when the viewport changes.
  useEffect(() => {
    const onResize = () => {
      setHeightPx((current) => clampAnimationBarHeight(current));
      restoredHeightRef.current = clampAnimationBarHeight(
        restoredHeightRef.current,
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      const next = new Map<string, ElementPose>();
      for (const element of excalidrawAPI.getSceneElements()) {
        next.set(element.id, readElementPose(element));
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
      const next = readElementPose(element);

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

  const onToggleCompact = useCallback(() => {
    setHeightPx((current) => {
      if (current <= ANIMATION_BAR_MIN_HEIGHT_PX + 1) {
        return clampAnimationBarHeight(restoredHeightRef.current);
      }
      restoredHeightRef.current = current;
      return ANIMATION_BAR_MIN_HEIGHT_PX;
    });
  }, []);

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const startY = event.clientY;
      const startHeight = heightPxRef.current;

      handle.setPointerCapture(pointerId);
      setIsResizing(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        // Dragging up increases height (bar grows from the bottom).
        const nextHeight = clampAnimationBarHeight(
          startHeight + (startY - moveEvent.clientY),
        );
        setHeightPx(nextHeight);
        if (nextHeight > ANIMATION_BAR_MIN_HEIGHT_PX + 1) {
          restoredHeightRef.current = nextHeight;
        }
      };

      const onPointerUp = () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
        handle.removeEventListener("pointercancel", onPointerUp);
        setIsResizing(false);
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    },
    [],
  );

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

    excalidraw.style.setProperty("--animation-bar-offset", `${heightPx}px`);
    if (isResizing) {
      excalidraw.style.setProperty("--animation-bar-offset-transition", "none");
    } else {
      excalidraw.style.removeProperty("--animation-bar-offset-transition");
    }

    return () => {
      excalidraw.style.removeProperty("--animation-bar-offset");
      excalidraw.style.removeProperty("--animation-bar-offset-transition");
    };
  }, [heightPx, isResizing]);

  const keyframesByProperty = selectedElement
    ? tracks[selectedElement.id]?.properties ?? createEmptyProperties()
    : createEmptyProperties();

  return (
    <>
      <FooterRight>
        <Tooltip
          label={isCompact ? "Expand animation bar" : "Compact animation bar"}
        >
          <button
            type="button"
            className="animation-bar__toggle help-icon"
            aria-expanded={!isCompact}
            aria-label={
              isCompact ? "Expand animation bar" : "Compact animation bar"
            }
            onClick={onToggleCompact}
          >
            {isCompact ? collapseUpIcon : collapseDownIcon}
          </button>
        </Tooltip>
      </FooterRight>
      <div
        ref={rootRef}
        className={clsx("animation-bar", {
          "animation-bar--resizing": isResizing,
        })}
        style={{ height: heightPx }}
        data-viewport-ui="bottom"
      >
        <div
          className="animation-bar__resize-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-valuemin={ANIMATION_BAR_MIN_HEIGHT_PX}
          aria-valuenow={heightPx}
          aria-label="Resize animation bar"
          onPointerDown={onResizePointerDown}
        />
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
