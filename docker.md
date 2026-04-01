## Why `npm ci` instead of `npm install`?
`ci` is short for "clean install" — it installs exactly what's in `package-lock.json` with no surprises. Always use it in Docker and CI pipelines.

## Why copy `package*.json` before the rest of the source?**
Docker builds in layers. Each instruction is a cached layer. If you copy everything at once, any source file change invalidates the `npm ci` layer and reinstalls all dependencies from scratch. Copying package files first means `npm ci` only re-runs when dependencies actually change.
