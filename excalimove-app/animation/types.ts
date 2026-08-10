export type AnimatableProperty =
  | "x"
  | "y"
  | "opacity"
  | "angle"
  | "width"
  | "height"
  | "strokeWidth";

export type Keyframe = {
  timeMs: number;
  value: number;
};

export type ElementTrack = {
  elementId: string;
  properties: Record<AnimatableProperty, Keyframe[]>;
};

export const ANIMATABLE_PROPERTIES: readonly AnimatableProperty[] = [
  "x",
  "y",
  "opacity",
  "angle",
  "width",
  "height",
  "strokeWidth",
] as const;

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: "X",
  y: "Y",
  opacity: "Opacity",
  angle: "Angle",
  width: "Width",
  height: "Height",
  strokeWidth: "Stroke",
};

export const createEmptyProperties = (): ElementTrack["properties"] => ({
  x: [],
  y: [],
  opacity: [],
  angle: [],
  width: [],
  height: [],
  strokeWidth: [],
});

export const trackHasKeyframes = (track: ElementTrack): boolean =>
  ANIMATABLE_PROPERTIES.some(
    (property) => track.properties[property].length > 0,
  );
