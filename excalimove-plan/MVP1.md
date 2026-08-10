# Excalimove — MVP 1 Plan

Keyframe / timeline animation for Excalidraw elements (fork: **excalimove**).

---

## Goal

Let users animate the **position** (`x`, `y`) of canvas elements on a fixed timeline, authoring keyframes by scrubbing a playhead and editing the selected element on the canvas.

---

## Product decisions (locked for MVP 1)

### Timeline UI

- Animation bar is a **DOM** panel docked at the **extreme bottom** (not canvas).
- Bar is **retractable**; footer controls (zoom, undo/redo, help, etc.) **slide up/down** with it.
- Retract/expand toggle lives in the **footer-right** cluster (next to Help), via `FooterRight` tunnel.
- Panel content can stay an empty shell until timeline UI ships; layout/offset behavior already exists.

### What the bar shows

- **Only the currently selected element** lays out properties and keyframes.
- No selection / multi-select → empty state: _“Select an element to animate”_.
- Multi-select animation editing is **out of scope** for MVP 1.
- **Keyframe data is still stored per `elementId`** for every animated element (UI focus ≠ data scope).
- **Playback animates all elements that have keyframes**, not only the selected one.

### Timeline ruler

- **30 units** long.
- Each unit = **0.5 seconds** → **15 seconds** total duration.
- Internally store time as **`timeMs`** (`unitIndex * 500`); render the unit ruler in the UI.
- Fixed duration for MVP 1 (no extend / zoom / scroll yet).

### Properties (MVP 1)

| Property | In MVP 1 | Notes |
| --- | --- | --- |
| `x` | Yes | Element field |
| `y` | Yes | Element field |
| scale | No | Defer; Excalidraw uses `width`/`height`, not a single scale |
| rotation (`angle`) | No | Follow-up |
| opacity | No | Follow-up |

Each property row is a long timeline line (30 units) with keyframe markers.

### Transport

- Global **playhead** shared across the scene.
- **Play** / **Pause** controls.
- **Stop** → jump to `t = 0` and restore t=0 / rest pose (predictable).
- **Pause** → freeze at current time.
- Changing selection **keeps the playhead** where it is; show the newly selected element’s interpolated pose at that time.

### Keyframe authoring rules

Implicit keyframes: **move playhead + change a property of the selected element ⇒ upsert keyframe**.

| Situation | Create / update keyframe? |
| --- | --- |
| Playhead at `t > 0`, user changes `x`/`y` (drag or otherwise) | **Yes** — upsert at playhead for changed props |
| Playhead at `t = 0`, user repositions | **Update base / t=0 keyframe**, do not add a new keyframe elsewhere |
| Scrubbing playhead (preview interpolation) | **No** |
| Playback running | **No** (ignore writes; ideally treat as scrubbing) |
| Remote / collab / undo-apply / programmatic restore | **No** |
| Always | Keep a **t=0 keyframe (or rest pose)** for tracked properties once an element is animated |

Additional rules:

- **One keyframe per property per time** (upsert if playhead lands on an existing keyframe).
- **Interpolation:** linear between neighboring keyframes; clamp/hold to endpoints outside the range.
- Seed t=0 from current `x`,`y` when the element first gets animation data (on first qualifying edit, or explicitly when user starts animating).

### Rest pose vs preview pose

- During scrub/play, temporarily overwrite element `x`/`y` on the canvas.
- Source of truth for persistence = **keyframe store** (+ rest / t=0), not mid-scrub canvas state.
- Playback / scrub updates use `captureUpdate: NEVER` (no undo spam).
- Structural keyframe edits (add/move/delete keyframe data) should be undoable where practical (app-level or scene-linked later).

### Persistence (MVP 1)

- Prefer **app-layer storage** first (e.g. local key alongside scene), keyed by scene/element ids.
- Embed-in-scene-JSON / collab sync of timelines = **later**.

### Explicitly out of scope (MVP 1)

- Scale / rotation / opacity / color tracks
- Multi-select track editing
- Timeline zoom, scroll, or custom duration
- Path morphing (`points` on lines/arrows)
- Binding-aware motion edge cases (keep simple shapes honest; document limits)
- GIF/WebM export / bake
- Collab-synced animation data
- Full dope-sheet of all elements at once

---

## Architecture (MVP 1)

```
excalimove-app/
├── animation/           # engine, types, interpolate, atoms, storage
└── components/
    └── AnimationBar.*   # shell + timeline UI + footer toggle

packages/excalimove/     # minimal: FooterRight tunnel, --animation-bar-offset CSS
```

### Data sketch

```ts
type AnimatableProperty = "x" | "y";

type Keyframe = {
  timeMs: number;
  value: number;
};

type ElementTrack = {
  elementId: string;
  properties: {
    x: Keyframe[];
    y: Keyframe[];
  };
};

// UI state (Jotai / app store)
// - tracksByElementId
// - currentTimeMs
// - playing
// - selected element read from Excalidraw API
```

### Playback

- Drive with existing `AnimationController` (RAF).
- Each tick: advance `currentTimeMs`, interpolate all tracks, `updateScene` with `captureUpdate: NEVER`.

### Authoring hook

- Watch selection + element `x`/`y` changes via `useExcalidrawAPI` / `onChange`.
- Gate writes with: `!playing && !scrubbing` and user-driven mutation heuristics.
- At `t === 0` → update t=0 keyframes; at `t > 0` → upsert at playhead.

---

## Layout status (already done / in progress)

- [x] Retractable bottom `AnimationBar` DOM shell
- [x] Footer / nearby UI offset via `--animation-bar-offset`
- [x] Footer-right toggle (`FooterRight` tunnel) to expand/collapse bar
- [x] Timeline chrome inside the panel (ruler, tracks; playhead/transport later)

---

## MVP 1 to-do list

### A. Foundation

- [x] Add `excalimove-app/animation/` module
  - [x] `types.ts` — `Keyframe`, `ElementTrack`, timeline constants (`UNIT_MS = 500`, `UNIT_COUNT = 30`, `DURATION_MS = 15000`)
  - [x] `interpolate.ts` — linear lerp for `x`/`y` at `timeMs`
  - [ ] `atoms.ts` (or equivalent) — tracks map, `currentTimeMs`, `playing`, `scrubbing`
  - [x] `applyTracks.ts` — apply interpolated poses to elements via API
  - [x] `recordKeyframe.ts` — upsert/gate keyframe writes per rules above
  - [ ] `storage.ts` — load/save tracks in app local persistence (best-effort for MVP 1)
- [x] Wire `AnimationBar` to Excalidraw API (selection → single-element timeline UI)

### B. Timeline UI (selected element only)

- [x] Empty state when nothing selected / multi-select
- [x] Transport controls: Play, Pause (Stop later)
- [x] Time ruler: 30 units, 0.5s labels (or tick marks)
- [x] Playhead (draggable scrubber) synced to `currentTimeMs`
- [x] For **single selected element**:
  - [x] Collapsible property section (default expanded for selection)
  - [x] Property rows: `x`, `y`
  - [x] Each row: 30-unit track line + keyframe markers (markers render when data exists; empty for now)
- [x] Clicking playhead / scrub updates canvas preview for **all** tracked elements; UI still only lists selection
- [x] Basic styling consistent with Excalidraw islands / theme CSS variables

### C. Authoring

- [x] On first animating edit of an element, seed t=0 `x`/`y` keyframes from previous pose
- [x] Implement keyframe upsert rules (table above)
- [x] Dragging selected element at `t > 0` writes/updates keyframes at playhead
- [x] Editing at `t === 0` updates base keyframes only
- [x] No keyframe writes while playing or scrubbing
- [x] Selection change keeps playhead; refresh visible rows for new selection
- [x] Select keyframe + delete (button / Delete key); t=0 locked while later keys exist

### D. Playback

- [x] Start/stop playhead loop from Play/Pause
- [x] Interpolate and apply all element tracks each frame (`captureUpdate: NEVER`)
- [ ] Stop → `currentTimeMs = 0`, restore t=0 poses
- [x] Pause → leave playhead and poses as-is
- [ ] Looping optional (default **off** for MVP 1)

### E. Lifecycle & polish

- [ ] Drop / ignore tracks for deleted elements
- [x] Don’t crash if selected element has no track yet (show rows, empty keyframes until first edit)
- [ ] Persist tracks across refresh (local)
- [x] Ensure retractable bar + footer offset still work with populated timeline
- [ ] Manual test checklist (below)

### F. Explicit non-goals checklist (do not do in MVP 1)

- [ ] ~~All-elements dope sheet~~
- [ ] ~~Scale / rotation / opacity~~
- [ ] ~~Timeline zoom / variable duration~~
- [ ] ~~Export GIF/WebM~~
- [ ] ~~Collab timeline sync~~

---

## Manual test checklist (MVP 1 exit)

- [ ] Select a rectangle → `x`/`y` rows appear; deselect → empty state
- [ ] At t=0, move shape → only t=0 keyframes change
- [ ] Scrub to unit 10, move shape → keyframes appear at that time for changed axes
- [ ] Scrub between keyframes → smooth linear motion preview
- [ ] Play → playhead advances; shape(s) animate; no extra keyframes created
- [ ] Pause freezes; Stop returns to start pose
- [ ] Two elements with keyframes: both move on Play; UI only shows the selected one’s rows
- [ ] Collapse animation bar → footer returns down; expand → footer slides up
- [ ] Reload page → keyframes restored from local persistence (if storage shipped)

---

## Suggested implementation order

1. **Types + atoms + interpolate** (no UI beyond stubs)
2. **Ruler + playhead + transport** (preview apply poses)
3. **Selected-element property rows + keyframe markers**
4. **Record keyframes from canvas edits** (gated rules)
5. **Playback loop**
6. **Local persistence + deletion cleanup**
7. **Polish + test checklist**

---

## Open questions (can defer)

- Exact visual for keyframe diamonds / selected keyframe
- Whether first keyframe seed happens on first edit only, or also via an “Add keyframe” button
- Undo stack for keyframe graph edits (app-local undo vs scene history)
- Whether arrows/bound text are supported or explicitly unsupported in MVP 1 copy

---

## References in repo

| Area | Path |
| --- | --- |
| Animation bar shell | `excalimove-app/components/AnimationBar.tsx` |
| Bar styles | `excalimove-app/components/AnimationBar.scss` |
| Footer-right tunnel | `packages/excalimove/components/footer/FooterRight.tsx` |
| Bottom offset CSS var | `--animation-bar-offset` on `.excalidraw` |
| RAF helper | `packages/excalimove/renderer/animation.ts` (`AnimationController`) |
| Element model | `packages/element/src/types.ts` |
