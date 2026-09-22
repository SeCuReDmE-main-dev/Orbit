# Orbit Companion

Orbit Companion is a local-first research-companion experiment for the DEV/Sanity challenge. The current repository implements a verified vertical slice: versioned contracts, a loopback mission broker backed by SQLite, a static Astro side panel, a fixed-step orbital simulation, a standalone Sanity Studio configuration, bounded read-only WebMCP discovery, and evidence-oriented project documentation.

It is not yet a release candidate. Codex, Antigravity, Exa, Sanity Knowledge Base and live WebMCP client invocation remain explicit external integration work. No deployment or challenge submission has been performed.

## Repository layout

- `studio/` — standalone Sanity Studio for project `pzscx4w8`, dataset `production`
- `web/` — Astro static site, Three.js orbital lab and Chrome MV3 side-panel package
- `services/broker/` — loopback-only Node broker and SQLite mission checkpoints
- `packages/contracts/` — shared mission, provider, budget, ActionCard and CCP contracts
- `packages/core/` — deterministic mission and budget logic
- `packages/providers/` — fail-closed provider boundary and CCP handoff constructor
- `fixtures/` — public offline corpus and adversarial research fixtures
- `docs/` — architecture, learning, research, gates, receipts and submission drafts

## Local verification

Prerequisites observed on 2026-09-21: Node `24.18.1`, system npm `11.16.0`, Git `2.51.0.windows.1`. The reproducible lock was generated with npm `10.9.4`; the repository pins that version and enables legacy peer resolution because the current Sanity and Vitest peer graphs otherwise trigger an npm Arborist failure.

```powershell
npx --yes npm@10.9.4 install --legacy-peer-deps
npm test
npm run build --workspace @orbit/web
python tools/package_mv3.py
npm audit --omit=dev --audit-level=high
```

Tests and builds pass locally. The dependency audit still fails on high-severity transitive advisories in the standalone Sanity CLI/build graph, so this tree is not release-ready. Astro is pinned to `7.3.3` and Tailwind uses the supported Vite integration; the earlier Astro critical advisories no longer appear in the current audit.

The broker listens only on `http://127.0.0.1:47831`. Its basic health endpoint is `GET /health`. Browser requests are denied until Chrome's exact unpacked-extension origin is allowlisted. After loading `web/dist`, copy the 32-character extension ID from Chrome and start the broker from PowerShell with:

```powershell
$env:ORBIT_ALLOWED_EXTENSION_ORIGINS = 'chrome-extension://<32-character-extension-id>'
npm run broker
```

The broker validates this value strictly, echoes CORS only for the exact allowed origin, and continues to require its process-scoped bearer token for mutations. Requests without a browser `Origin` remain available to loopback command-line clients.

To load the side panel locally, build `@orbit/web`, run `python tools/package_mv3.py` to create the reproducible package, open Chrome's extension management page, enable developer mode, and load `web/dist` as an unpacked extension. This is a manual browser action; it has not yet been counted as a verified integration in this repository.

A reviewable snapshot is available at `artifacts/orbit-companion-mv3-unpacked-build.zip`; verify it against `artifacts/SHA256SUMS.txt`. It is an unpacked-development artifact, not a signed Chrome Web Store package.

## Sanity status

`studio/sanity.config.ts` references the existing project `pzscx4w8` and dataset `production`. Six local schema types are present. Schema extraction and the local Studio build pass with the pinned dependency procedure. Authentication, remote content, Knowledge Base and Context MCP remain unverified external work. No remote Sanity content was changed.

## Safety and scope

- Web content, model output and tool output are untrusted by default.
- The browser bundle contains no cloud key.
- External adapters fail closed with `BLOCKED_EXTERNAL`.
- The physics experience is educational and is not a flight-dynamics model.
- Publishing, deployment, legal acceptance, spending and challenge submission remain human decisions.

See [HUMAN.md](HUMAN.md) for the continuation path and [the gate model](docs/gates/README.md) for evidence requirements.
