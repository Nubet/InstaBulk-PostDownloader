# Releases

Use semantic tags: `vX.Y.Z`.

Example:

```bash
pnpm version patch
pnpm release:tag
git push
git push --tags
```

What each command does:

- `pnpm version patch` updates `package.json` and creates a Git tag.
- `pnpm release:tag` creates the release tag only if it does not already exist.
- `git push` pushes commits.
- `git push --tags` pushes tags and starts GitHub Release workflow.

Important:

- If `pnpm version patch` already created the tag, `pnpm release:tag` will fail with `Git tag vX.Y.Z already exists.` This is expected. In that case, just use `git push` and `git push --tags`.
- The tag must match the version in `package.json`.
- Release files appear only if GitHub Actions passes.

Artifacts:

```text
instabulk-profile-downloader-<version>-chromium.zip
instabulk-profile-downloader-<version>-firefox.xpi
instabulk-profile-downloader-<version>-chromium.crx
```

Notes:

- `.crx` needs the `CHROME_EXTENSION_KEY` GitHub secret.
- You can open the workflow run in the `Actions` tab if a release is missing.
