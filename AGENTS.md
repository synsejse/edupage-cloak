# Repository Guidelines

## Project Structure & Module Organization
`src/` holds the authored code. Use `src/pages/` and `src/components/` for the Astro UI, and `src/scripts/` for extension runtime code such as `content.ts`, `inject.ts`, and shared helpers in `src/scripts/internal/`. Static extension files live in `public/`, including `manifest.json`, CSS, and icon assets under `public/assets/`. Build and packaging utilities are in `build-tools/`. Tests live in `tests/`. Generated output goes to `dist/`, and release zips are written at the repository root.

## Build, Test, and Development Commands
Run `bun install` to install dependencies. Use `bun run dev` or `bun run start` for the Astro dev server. `bun run build` performs the full extension build: Astro output, inline extraction, Bun bundling, and zip packaging. `bun run test` runs the Bun test suite. `bun run test:compat` runs the live EduPage compatibility check only. `bun run format` applies Prettier to JS, TS, JSON, and Markdown files. `bun run icons` regenerates extension icons.

## Coding Style & Naming Conventions
This repo uses TypeScript with Astro and Bun. Follow the existing style: 2-space indentation, semicolons, single quotes, and small focused modules. Keep filenames lowercase with hyphens for multiword script files such as `blocked-events.ts`; use PascalCase only for Astro components like `Placeholder.astro`. Prefer explicit exports and keep extension-specific constants centralized in `src/scripts/config.ts`. Format changes with Prettier before opening a PR.

## Testing Guidelines
Tests use `bun test`. Place new tests in `tests/` and name them `*.test.ts`. Keep unit tests deterministic when possible. `tests/etestPlayer.compat.test.ts` makes live network requests to EduPage, so expect it to fail when the upstream script changes; update checksums or blocked events deliberately, not casually.

## Commit & Pull Request Guidelines
Match the existing history: short imperative commit subjects such as `Add live checksum compatibility checks` or `Bump version to 0.6.0`. Keep unrelated changes out of the same commit. PRs should include a brief summary, testing notes (`bun run test`, `bun run build`), and screenshots when UI or extension-visible behavior changes. Call out manifest, permissions, or version updates explicitly.

## Security & Configuration Tips
Treat `public/manifest.json`, injected scripts, and event-blocking logic as sensitive surfaces. Review permission changes carefully, and verify packaged output in `dist/` before publishing a new zip.
