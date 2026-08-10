# Excalimove

Excalimove is a whiteboard with **keyframe / timeline animation** for canvas elements. It is a proprietary fork of [Excalidraw](https://github.com/excalidraw/excalidraw).

## Features

- Infinite canvas whiteboard (hand-drawn style)
- Local-first autosave
- Timeline animation for element position (`x` / `y`) — playhead, keyframes, interpolation
- Compatible with `.excalidraw` / `.excalidrawlib` files and shape libraries

## Development

Requires [Bun](https://bun.sh) `1.3+`.

```bash
bun install
bun start
```

Useful scripts:

```bash
bun run test:typecheck
bun run build
```

## License

Proprietary — see [LICENSE](./LICENSE). Upstream Excalidraw portions remain MIT; see [NOTICE](./NOTICE). Not an official Excalidraw product.

## Plan

Product/MVP notes live in [`excalimove-plan/`](./excalimove-plan/).
