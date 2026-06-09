![InstaBulk banner](images/instabulk-banner.png)

# InstaBulk Profile Downloader

Browser extension for downloading Instagram profile content.

## Build

Each browser builds to its own directory.

| Command | Builds for | Output |
|---|---|---|
| `pnpm build:chromium` | Chrome | `extension-chromium/` |
| `pnpm build:firefox` | Firefox | `extension-firefox/` |
| `pnpm build:all` | Both | both directories |

## Development

```bash
pnpm install
pnpm dev          # Chrome (HMR on localhost:3303)
pnpm dev-firefox  # Firefox (HMR on localhost:3303)
```

Load the respective directory (`extension-chromium/` or `extension-firefox/`) as an unpacked extension in the browser.

## Run

```bash
pnpm start:chromium  # build + launch Chrome via web-ext
pnpm start:firefox   # build + launch Firefox via web-ext
```

## Package for store

```bash
pnpm package:all
pnpm pack:zip   # Chrome Web Store (.zip from extension-chromium/)
pnpm pack:xpi   # Firefox Add-ons (.xpi from extension-firefox/)
```

## Release

GitHub release publishing is tag-driven and uses semantic version tags in the `vX.Y.Z` format.

```bash
pnpm version patch|minor|major
pnpm release:tag
git push
git push --tags
```

What happens next:

1. The local `pre-push` hook validates that any pushed `v*` tag matches `package.json` version.
2. GitHub Actions runs on tag push, verifies the tag again, then runs `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
3. The workflow builds browser artifacts and publishes a GitHub Release with semantic filenames under `release/`.

Produced artifacts:

```text
instabulk-profile-downloader-<version>-chromium.zip
instabulk-profile-downloader-<version>-firefox.xpi
```

Optional:

- if `CHROME_EXTENSION_KEY` exists, the workflow also publishes `instabulk-profile-downloader-<version>-chromium.crx`
- if the secret does not exist, CRX is skipped and the release still succeeds

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## License

MIT. This project is based on the `vitesse-webext` template by Anthony Fu. The original MIT copyright notice is preserved in `LICENSE`.
