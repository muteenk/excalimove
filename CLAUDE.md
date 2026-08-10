# CLAUDE.md

## Project Structure

Excalimove is a **monorepo** (fork of Excalidraw) with a clear separation between the core library and the application:

- **`packages/excalimove/`** - Main React component library (`@excalimove/excalimove`)
- **`excalimove-app/`** - Full-featured web application with timeline animation
- **`packages/`** - Core packages: `@excalimove/common`, `@excalimove/element`, `@excalimove/math`, `@excalimove/utils`
- **`excalimove-plan/`** - Product / MVP planning docs

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `excalimove-app/` for app-specific features
3. **Testing**: Always run `bun run test:update` before committing
4. **Type Safety**: Use `bun run test:typecheck` to verify TypeScript

## Development Commands

```bash
bun run test:typecheck  # TypeScript type checking
bun run test:update     # Run all tests (with snapshot updates)
bun run fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses Bun workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration

### License

MIT — see `LICENSE` and `NOTICE`. Retain Excalidraw copyright attribution.
