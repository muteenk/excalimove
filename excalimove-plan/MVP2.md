# Excalimove — MVP Phase 2 (animation properties backlog)

Follow-ups after MVP 1 scalar tracks (`x`, `y`, `opacity`, `angle`, `width`, `height`, `strokeWidth`).

---

## Medium (same keyframe model, extra rules)

- [ ] **Uniform scale** — derived from `width`/`height`; keep visual center / pivot
- [ ] **Fill color / stroke color** — color interpolation (hex → rgb), not plain numbers
- [ ] **Angle unwrapping** — full spins without taking the short arc the wrong way
- [ ] **Groups / bound text** — parent vs child updates; keep bindings consistent on resize/rotate
- [ ] **Roughness** (and other simple numeric style fields) if product wants them

## Hard (new systems or discrete behavior)

- [ ] **Points / freehand / elbow arrows** — multi-point geometry tracks
- [ ] **Text content / font size reflow** — layout, wrapping, container resize
- [ ] **Image crop / file identity** — not a smooth tween
- [ ] **Visibility / locked / deleted** — discrete jumps
- [ ] **z-index / layer order** — discrete scene order
- [ ] **Arrow bindings to moving targets** — rebind or update each frame
- [ ] **Frames + children as one unit** — hierarchy-aware apply
- [ ] **Easing / curves / motion paths** — beyond linear A→B between keyframes
- [ ] **Timeline UX** — scrollable/zoomable duration, property filtering, multi-select edit

## Notes

- Prefer shipping one medium item at a time (scale or colors next).
- Keep recording gated: no writes while playing/scrubbing; seed `t=0` from pre-edit pose.
- Playback/scrub still uses `captureUpdate: NEVER`.
