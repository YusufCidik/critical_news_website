<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# INTELMATRIX contributor guidance

- Work on a separate branch and keep production deployment and merge under explicit approval.
- Read `docs/architecture-audit.md` and the domain document for the part of the pipeline being changed.
- Keep RSS normalization, topic classification, consequence assessment and event grouping independently testable. Preserve publisher links and chronology.
- Treat publisher text and browser-supplied context as untrusted data. Source briefings may select original passages. Keep optional provider credentials server-side.
- Preserve compatibility for older IndexedDB records and local bookmarks. Keep relevance and saved preferences separate from objective scores.
- For pipeline changes, run `npm test`, `npm run evaluate:classification -- --check`, `npm run typecheck`, `npm run lint`, and `npm run build`. Run the Playwright suite against the production build when changing public UI or routes. Document mocked and live checks separately.

- For classification, impact or clustering changes, run `npm run evaluate:v31 -- --check`. Use `--live` for a separate publisher RSS observation and record its timestamp. Preserve frozen editorial labels, report uncertainty and distinguish code regression tests from provider checks.
- Before an approved release, record the production alias and rollback deployment, verify CI and the exact-commit preview, then verify the deployment SHA and public endpoint after the existing Git integration runs. Inspect secret names and targets without retrieving values.
