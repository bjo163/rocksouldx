# ROCKSOUL DX Desktop

The ROCKSOUL DX desktop shell is built with Electron and inherits its underlying desktop runtime from the OpenCode codebase. The ROCKSOUL theme and desktop identity are documented in the [brand and desktop UI contract](../../docs/branding/ROCKSOUL-DX.md).

This package README is a developer guide for the existing desktop package. It does not imply that a public ROCKSOUL DX installer or release channel has been published.

## Development

From the repository root:

~~~bash
bun install
bun run dev:desktop
~~~

Or from this package directory after installing dependencies at the repository root:

~~~bash
bun dev
~~~

## Build

Run these commands from this package directory:

~~~bash
bun run build
bun run pack
~~~

The build prepares resources (icons, metadata and the bundled CLI) and builds the app into out/. The pack command then creates an unsigned platform package under dist/desktop/ at the repository root: a .app tarball on macOS, the unpacked app on Windows, or AppImage/deb/rpm on Linux. The release workflow is responsible for signing and notarization.

Both commands read the same environment as every other release package:

| Variable | Meaning |
| --- | --- |
| OPENCODE_CHANNEL | dev (default), beta, or latest/prod. Selects the upstream-compatible app identity, assets, bundled CLI, and update channel. |
| OPENCODE_VERSION | Version stamped into the app and its packages. |
| OPENCODE_TARGET | darwin-arm64, darwin-x64, windows-arm64, windows-x64, linux-x64, or linux-arm64. Defaults to the host. |

The CLI is placed outside app.asar in the application's resources directory, and packaging fails if it is missing.

The build uses packages/cli/dist when that contains the target CLI. Otherwise, dev (and local, unset or unrecognized) downloads the published dev CLI, beta downloads the beta CLI, and prod/latest fail.

## Development versus packaging

bun dev is separate from packaging. It uses local renderer/server mode, the development app identity, and the CLI source by default. bun dev --download-server <version> instead downloads that CLI version for local development.

Do not change application identifiers, signing, updater channels, or release metadata as part of a visual-only branding change. Any future ROCKSOUL-specific distribution channel requires a separate release and update architecture decision.

## Beta channel inherited from upstream

The inherited beta branch workflow publishes the upstream-compatible OpenCode Beta app identity and update channel. It is not a ROCKSOUL DX distribution channel.

Each beta build compiles in its commit and the feat, fix, and perf commits among its newest 200. The desktop app can show the corresponding beta release notes after an update.

## Startup benchmark

The package includes a startup benchmark that compares launch time across builds in isolated user homes. See perf/startup.bench.ts and packages/app/perf/README.md for supported cases and measurement details.
