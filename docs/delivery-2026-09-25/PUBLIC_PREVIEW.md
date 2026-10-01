# Static public preview — 2026-09-25

Target: `https://orbit.securedme.ca/`. This note records package preparation, not a verified deployment.

Repository: `dev.to-challenge`, branch `master`, inspected HEAD `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`. Existing staged, unstaged and untracked work was preserved.

## Public scope

The orbital learning model, local mission question and plan, source ledger, browser-local checkpoints and JSON handoff preview are available in the static interface. Mission drafts use this browser's local storage.

Association, Exa search, broker checkpoints and the Codex companion require the Orbit extension panel and an associated local broker. Installing the extension does not connect the public HTTPS page: it has no external messaging bridge. The public preview notice makes this boundary explicit. The Sanity reference links in the inspected package were embedded at build time.

## Changes

- `web/src/pages/index.astro`: visible public preview notice; no CSS or interaction changes.
- `web/public/.htaccess`: Apache response headers for `nosniff`, referrer policy and CSP. Scripts and styles remain same-origin, without inline or eval allowances. The inspected build has an external stylesheet, and `orbital-lab.ts` calls `renderer.setSize(width, height, false)`, so canvas resizing does not inject styles. Framing is limited to the same origin. No forced HTTPS redirect or HSTS is added before certificate verification.

The MV3 manifest CSP applies only to extension pages. Public-site protection depends on Apache allowing this `.htaccess` and loading `mod_headers`; verify the actual response headers after upload.

## Evidence and remaining checks

Read-only package inspection found eight files, 560,391 bytes, all five HTML asset references present, no source maps or environment files, and no matches for the bounded checks for OpenAI/GitHub token formats, private-key headers, Windows user paths or email addresses. This is a targeted scan, not proof that every possible secret format is absent. No environment file was opened.

No network call, build or browser test was performed in this package-review subtask. The root task must rebuild once, include the hidden `.htaccess` in the upload, verify HTTPS and response headers, then smoke-test the orbit controls and local mission draft. Do not describe the hosted page as an operational public Codex/Exa integration.
