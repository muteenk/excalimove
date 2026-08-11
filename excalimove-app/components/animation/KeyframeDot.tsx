import clsx from "clsx";
import React from "react";

export type KeyframeDotProps = {
  leftPercent: number;
  isSelected: boolean;
  deletable: boolean;
  title: string;
  dataSelected?: string;

  onPointerDown: (event: React.PointerEvent<HTMLLIElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLLIElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLLIElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLLIElement>) => void;
};

export const KeyframeDot = ({
  leftPercent,
  isSelected,
  deletable,
  title,
  dataSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: KeyframeDotProps) => {
  return (
    <li
      className={clsx("animation-timeline__keyframe", {
        "animation-timeline__keyframe--selected": isSelected,
        "animation-timeline__keyframe--locked": !deletable,
      })}
      style={{ left: `${leftPercent}%` }}
      title={title}
      data-selected={dataSelected}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
};
