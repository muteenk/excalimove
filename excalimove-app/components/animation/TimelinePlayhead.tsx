import React, { useCallback, useRef } from "react";

import { TIMELINE_DURATION_MS } from "../../animation/constants";

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

export const TimelinePlayhead = ({
  currentTimeMs,
  onSeek,
  onScrubbingChange,
}: {
  currentTimeMs: number;
  onSeek: (timeMs: number) => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
}) => {
  const playheadTrackRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  const playheadPercent = Math.min(
    100,
    Math.max(0, (currentTimeMs / TIMELINE_DURATION_MS) * 100),
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = playheadTrackRef.current;
      if (!track) {
        return;
      }
      onSeek(timeMsFromClientX(clientX, track));
    },
    [onSeek],
  );

  const endScrub = (event: React.PointerEvent<HTMLElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }
    isScrubbingRef.current = false;
    onScrubbingChange?.(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onHandlePointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isScrubbingRef.current = true;
    onScrubbingChange?.(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const onHandlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }
    seekFromClientX(event.clientX);
  };

  return (
    <div className="animation-timeline__playhead-layer" aria-hidden>
      <div className="animation-timeline__playhead-spacer" />
      <div
        ref={playheadTrackRef}
        className="animation-timeline__playhead-track"
      >
        <div
          className="animation-timeline__playhead"
          style={{ left: `${playheadPercent}%` }}
        >
          <span
            className="animation-timeline__playhead-handle"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
          />
        </div>
      </div>
    </div>
  );
};
