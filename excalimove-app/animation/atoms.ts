import { atom } from "../app-jotai";

import type { ElementTrack } from "./types";

export type TracksByElementId = Record<string, ElementTrack>;

export const animationTracksAtom = atom<TracksByElementId>({});
