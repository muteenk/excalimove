export type AnimatableProperty = "x" | "y";

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
] as const;

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: "X",
  y: "Y",
};
