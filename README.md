![InstaBulk banner](images/instabulk-banner.png)

# InstaBulk Profile Downloader

Browser extension for downloading Instagram profile content.

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue">
  <img src="https://img.shields.io/badge/Chrome-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome">
  <img src="https://img.shields.io/badge/Firefox-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox">
  <img src="https://img.shields.io/github/license/nubet/InstaBulk-PostDownloader?style=flat-square" alt="MIT">
</p>

---

> [!NOTE]
>
> ## Getting started
>
> ```bash
> pnpm install
> pnpm dev          # Chrome (HMR on localhost:3303)
> pnpm dev-firefox  # Firefox (HMR on localhost:3303)
> ```
>
> Load `extension-chromium/` or `extension-firefox/` as an unpacked extension.

---

> [!TIP]
>
> ## Build
>
> Each browser builds to its own directory.
>
> | Command | Target | Output |
> |---|---|---|
> | `pnpm build:chromium` | Chrome | `extension-chromium/` |
> | `pnpm build:firefox` | Firefox | `extension-firefox/` |
> | `pnpm build:all` | Both | both directories |
>
> ### Package
>
> ```bash
> pnpm pack:zip       # Chrome Web Store
> pnpm pack:xpi       # Firefox Add-ons
> pnpm package:all    # both at once
> ```

---

> [!IMPORTANT]
>
> ## Release
>
> ```bash
> pnpm version patch|minor|major
> pnpm release:tag
> git push && git push --tags
> ```
>
> What happens next:
>
> 1. The local `pre-push` hook validates that any pushed `v*` tag matches `package.json` version.
> 2. GitHub Actions runs on tag push, verifies the tag again, then runs `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
> 3. The workflow builds browser artifacts and publishes a GitHub Release with semantic filenames under `release/`.
>
> Produced artifacts:
>
> ```text
> instabulk-profile-downloader-<version>-chromium.zip
> instabulk-profile-downloader-<version>-firefox.xpi
> ```
>
> ### Checks
>
> ```bash
> pnpm typecheck
> pnpm lint
> pnpm test
> ```

---

## License

MIT. This project is based on the `vitesse-webext` template by Anthony Fu. The original MIT copyright notice is preserved in `LICENSE`.
