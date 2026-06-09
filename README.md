![InstaBulk banner](images/instabulk-banner.png)

# InstaBulk Profile Downloader

Browser extension for downloading Instagram profile content.

## Development

Install dependencies:

```bash
pnpm install
```

Run Chromium development build:

```bash
pnpm dev
```

Load the `extension/` directory as an unpacked extension.

Run Firefox development build:

```bash
pnpm dev-firefox
```

Build Chromium production artifacts:

```bash
pnpm build
```

Build Firefox production artifacts:

```bash
pnpm build:firefox
```

For temporary Firefox installation, build with `pnpm build:firefox` first, then load the `extension/` directory.

Run checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## License

MIT. This project is based on the `vitesse-webext` template by Anthony Fu. The original MIT copyright notice is preserved in `LICENSE`.
