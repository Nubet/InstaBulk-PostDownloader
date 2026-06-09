![InstaBulk banner](images/banner.png)

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
pnpm pack:crx   # Chrome CRX
pnpm pack:xpi   # Firefox Add-ons (.xpi from extension-firefox/)
```

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## License

MIT. This project is based on the `vitesse-webext` template by Anthony Fu. The original MIT copyright notice is preserved in `LICENSE`.
