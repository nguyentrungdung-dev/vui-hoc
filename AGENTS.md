<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product identity — user-approved, persistent

Before changing UI, logo, favicon or subject icons, read `docs/BRAND.md`. The smiling yellow star on an irregular purple tile is the official logo approved 29 October 2026. Use `public/brand/vui-hoc-logo.svg` through `BrandLogo`; do not replace it or use generic/system emoji. Keep each subject icon consistent with the mapping in `docs/BRAND.md`.

## Question content — user-approved requirements

Before changing extraction, question generation, answer fields or learning UI, read `docs/QUESTION_CONTENT_POLICY.md`. Repeat evidenced task instructions for every detached question; join page continuations only with source evidence; render each independent sentence immediately above its own answer field. Preserve continuous passages and existing answer IDs. Never hide real uncertainty or silently regrade old attempts.

## Clean up verification outputs — user-approved, persistent

After each verification run, remove the disposable build directories created for that run (including custom `.next-*` output), once all processes using them have stopped. Preserve the active app's build directory, source files, configuration, credentials, uploads, database/local application data, and reusable acceptance fixtures or diagnostic evidence. Inspect references and running processes before cleaning older outputs; do not blindly delete `.test-data`, `.data`, or every `.next*` directory. Avoid accumulating a separate build directory for each feature. Cleanup must not change application behavior or business workflows.
