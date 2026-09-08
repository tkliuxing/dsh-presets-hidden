# dsh-presets-hidden

[中文版 README](README.md)

A browser-side DeepSeek Harness plugin for controlling agent-preset visibility and ordering. It adds search, visibility filtering, per-preset toggles, and reordering under **Settings -> Preset Visibility**, and replaces the Agent preset selector on the new-session page with the filtered list.

> **Compatibility**: This plugin is developed against and compatible with deepseek-harness versions tagged `dsh-v0.1.2-*`. Newer versions may or may not work and are not guaranteed.

## Behavior boundaries

- Both built-in and custom presets can be hidden and reordered.
- On loopback pages, the visibility list and ordering are persisted to the `preset-visibility` section of `$DSH_HOME/settings.yaml`. On non-loopback pages, the current browser’s `localStorage` is still used, with the key `dsh.presets-hidden.visibility.v1`.
- When first launched on a loopback page with an empty Host section, the plugin automatically migrates legacy `localStorage` data into `settings.yaml`.
- Move-up and move-down operate on the full list; when search or visibility filtering is active, the reorder buttons are disabled to avoid ambiguous moves across invisible items.
- Newly created custom presets are appended to the end of the existing order; **Restore default order** reverts to the Host roster order.
- Only the new-session page preset selector is affected. The official **Agent Presets** management page, session titles, old-session recovery, direct API calls, and plugin diagnostics still use the full list.
- When the currently selected preset of an empty session is hidden, the plugin switches to the first visible preset via the official selection API.
- When all presets are hidden, the new-session page hides the preset control; the Host default preset still applies.

## Install

After publishing to npm, install via the DSH plugin mechanism:

```sh
dsh plugin --profile web add dsh-presets-hidden
```

## Development

Build and test:

```sh
pnpm install
pnpm run check
```

If you want to develop against a local deepseek-harness checkout, override the relevant `@deepseek-ai/*` dependencies to local paths via `.npmrc` or `pnpm.overrides` in `package.json` instead of the default registry versions.

## Install as a local bundle (Web profile)

Build first, then add the current directory as a local bundle:

```sh
pnpm run build
dsh plugin --profile web add /Users/baihaoran/Code/github.com/tkliuxing/dsh-presets-hidden
```

When using the CLI from the DSH source checkout, change the second command to:

```sh
pnpm dsh plugin --profile web add /Users/baihaoran/Code/github.com/tkliuxing/dsh-presets-hidden
```

## Release

- CI: `.github/workflows/ci.yml` runs `pnpm run check` on push/PR.
- Release: After creating a Release on GitHub, `.github/workflows/release.yml` automatically builds, tests, and publishes to npm with provenance. npm is configured to use **Trusted Publisher**, so no `NPM_TOKEN` secret is required on the GitHub side; the workflow only needs the `npm-publish` environment and `id-token: write` permission.

The package declares `dsh.bundle` and `dsh.client`. The Host entry registers the `preset-visibility` settings namespace, allowing loopback-page preferences to be persisted to `$DSH_HOME/settings.yaml`.
