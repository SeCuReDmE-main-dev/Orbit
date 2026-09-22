# Orbit Companion local release audit — 2026-09-22

## Scope and repository state

- Repository: `dev.to-challenge`
- Branch: `master`
- Baseline HEAD: `e3326986451d366bc25ddc01220a288c1e9fc14a`
- Remote publication: not attempted
- External authentication, model invocation, deployment and paid services: not attempted
- Starting working tree: 13 modified tracked files covering the regenerated lockfile, broker/SQLite/WebMCP boundaries, orbital simulation/UI and their tests; no untracked files
- User and earlier-agent work was preserved; no stash, reset, clean or destructive deletion was used

## Environment observed

- Node.js: `v24.18.1`
- npm executable on PATH: `11.16.0`
- Project lockfile was generated previously with the pinned npm `10.9.4`
- Git: `2.51.0.windows.1`

## Commands and observed results

1. `npm.cmd test`
   - PASS after the audit correction
   - Vitest: 8 files, 18 tests passed
   - Node policy guard: 5 tests passed
   - Total: 23 passing checks, zero failed/cancelled/skipped/todo
2. `npm.cmd run build`
   - PASS after the audit correction
   - `@orbit/core`, `@orbit/providers` and `@orbit/broker`: TypeScript builds passed
   - `@orbit/web`: static Astro/MV3 build passed; one route generated
   - `@orbit/studio`: Sanity Studio build passed
3. `npm.cmd ls --depth=0 --workspaces`
   - PASS; all six workspaces resolved without missing or extraneous top-level packages
4. `git diff --check`
   - PASS; no whitespace errors
   - Git reported only expected Windows LF-to-CRLF notices
5. MV3 static inspection
   - `web/dist/manifest.json` parsed successfully
   - manifest version 3; permissions limited to `sidePanel`, `activeTab`, `storage`
   - host permission limited to `http://127.0.0.1/*`
   - extension CSP: local scripts/objects plus loopback connect only
   - output: 6 files, 520,699 bytes
   - manifest SHA-256: `64D69A139D143F08CDB6FBB4D8F8043B32CBDC6516F8732D03661DF7959AED52`
6. Diff scan
   - no personal absolute path, private-key marker or likely hard-coded credential was found
   - the literal `test-token` occurs only in the HTTP boundary test
7. Dependency security review
   - Astro was upgraded from the vulnerable 5.x line to `7.3.3`
   - Tailwind was migrated from the Astro integration with an incompatible peer range to `@tailwindcss/vite` and Tailwind `4.3.3`
   - Sanity Studio is pinned to `6.16.0`
   - the five distributed/runtime workspaces (`web`, `broker`, `core`, `providers`, `contracts`) pass `npm audit --omit=dev --audit-level=high` with zero findings
   - the full monorepo audit still reports 10 moderate and 3 high findings, all in the standalone Sanity CLI/build dependency graph (`adm-zip`, `js-yaml`, `smol-toml`); the unresolved advisories keep Studio deployment readiness blocked

## Audit correction

`restoreOrbitState()` previously accepted finite but impossible state such as an `ORBITING` satellite at the coordinate origin or a negative elapsed time. Such a corrupted local snapshot could pass parsing and then fail when the integrator computed gravity. The restore boundary now rejects:

- negative elapsed time;
- zero-radius states;
- `ORBITING` states at or below the Earth radius;
- `ESCAPED` states below the declared escape radius.

Regression expectations cover the zero-radius and negative-time cases. The full test and build suites pass after this correction.

## Observed local capabilities

- The broker remains loopback-only.
- Browser-origin reads require an explicitly configured, strictly validated `chrome-extension://<32-character-id>` origin; the real HTTP boundary accepts that exact origin, echoes CORS for it and rejects a remote origin in regression tests.
- Mutations require a process-scoped bearer token and pass the common policy guard.
- Research points and source records have bounded, paginated read routes.
- All five WebMCP tools register in the unit harness; mission, point and source tools now read from the local broker.
- The orbital lab uses a fixed-step Newtonian two-body velocity-Verlet model with explicit SI constants, controls, telemetry, collision/escape states, reduced-motion behavior and a numerical/text alternative.
- Terminal collision/escape states clear queued simulation time, and a hidden document performs neither physics updates nor Three.js rendering; focused regression tests cover terminal stopping and visibility resume timing.

## Limits and open gates

- No unpacked-extension browser run was performed in this audit; extension-hosted WebMCP discovery remains unverified.
- The package is reproducibly generated from the current build, but it has not been loaded and observed in Chrome.
- Sanity remote state, Knowledge Base, Context MCP, Exa, Codex model execution and Antigravity remain unverified or externally blocked.
- The standalone Sanity development/build dependency graph still carries unresolved upstream high-severity advisories. No public Studio deployment should proceed until that graph is updated or isolated with a validated mitigation.
- The generated local write token is intentionally printed only to the broker terminal. No secure extension provisioning flow exists yet, so browser mutations remain out of scope.
- The local experiment snapshot is best effort on `pagehide`; full mission recovery after crash and provider switching is not demonstrated.
- Formal numerical tolerance governance and independent scientific qualification remain open; the UI continues to label the simulator educational and non-operational.
- This receipt is local evidence. It is not evidence of deployment, challenge submission, provider interoperability or release readiness.

## Post-audit reproducible package

After the Astro/Tailwind migration and visibility/terminal-state corrections, two consecutive runs of `python tools/package_mv3.py` produced the same six-entry, 134,287-byte archive with SHA-256 `3d1cd1e8d44199daa2dd1dbaf309d043fa79abdfb93f5e76a31e0ecd390ca073`. `artifacts/SHA256SUMS.txt` matches the archive. This proves deterministic local packaging; it does not prove installation or browser behavior.
