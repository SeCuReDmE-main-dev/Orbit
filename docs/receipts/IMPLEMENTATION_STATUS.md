# Implementation status — updated 2026-09-22

## Repository truth

- Root: repository root (`dev.to-challenge`)
- Git branch: `master`
- Baseline HEAD: `e3326986451d366bc25ddc01220a288c1e9fc14a`
- Git roots below target: one (`.git` at the repository root)
- No push, deployment, publication, payment or remote dataset mutation performed
- The audited Newtonian/broker/WebMCP changes remain in the working tree; see `ORBIT-LOCAL-RELEASE-AUDIT-2026-09-22.md`

## Verified locally

| Area | Evidence | Status |
|---|---|---|
| Contracts | isolated TypeScript typecheck and contract smoke checks | PASS |
| Unit tests | fresh `npm test`: 8 Vitest files / 18 tests plus 5 policy-guard tests | PASS |
| Root build | fresh `npm run build`: contracts/core/providers/broker, Astro and Sanity Studio | PASS |
| Astro build | one static page and six MV3 output files | PASS |
| Sanity schema | local schema extraction produced `docs/receipts/sanity-schema.json` | PASS |
| Sanity Studio build | `npm run build --workspace @orbit/studio` after clean dependency reconstruction | PASS |
| MV3 shape | manifest has `side_panel`, minimal permissions, local worker and extension CSP | PASS by static inspection |
| MV3 artifact | two consecutive package runs matched: six entries, 134,287 bytes, SHA-256 `3d1cd1e8d44199daa2dd1dbaf309d043fa79abdfb93f5e76a31e0ecd390ca073` | PASS_LOCAL |
| Broker persistence | loopback health, token-protected mission/source/point mutations and bounded readback | PASS_LOCAL |
| Broker migrations | v1/v2/v3 application, pre-change backup, rollback and legacy adoption | PASS |
| Research receipts | source, proof and decision repositories with foreign-key checks | PASS |
| Offline planner | deterministic call/depth bound and URL normalization/deduplication | PASS |
| Policy guard | loopback/extension origin, tool allowlist, JSON bounds, quota and untrusted-content bounds | PASS |
| Orbital model | fixed-step Newtonian two-body velocity-Verlet; circular reference, bounded orbit, energy drift, display-frame independence, collision and escape tests | PASS_LOCAL |
| Orbital UI | altitude/speed controls, pause/reset, SI telemetry, text alternative, reduced-motion startup and best-effort versioned snapshot | PASS_LOCAL / durability partial |
| Provider behavior | unconfigured adapters return `BLOCKED_EXTERNAL` without fallback | PASS |
| Sibling boundary | three files inventoried and hashed; no writes made by this implementation | PASS |

## Partial or blocked

| Area | Observed result | Status |
|---|---|---|
| Sanity remote project | CLI initialization did not complete an interactive authentication exchange | BLOCKED_EXTERNAL |
| Knowledge Base / Context MCP | no authenticated live test | BLOCKED_EXTERNAL |
| Exa OAuth/MCP | no authenticated live test | BLOCKED_EXTERNAL |
| Codex app-server | contract only; exact model and streaming bridge not tested | NOT_IMPLEMENTED |
| Antigravity `agy` | contract only; exact model and NDJSON process not tested | NOT_IMPLEMENTED |
| WebMCP | five tools register locally; mission, point and source tools use bounded loopback broker reads; current extension-hosted discovery is not observed | PASS_LOCAL / browser proof pending |
| Chrome side panel | package has a valid side-panel entry; exact extension-origin parsing and CORS read access are tested, while unpacked-load/browser behavior remains unobserved | PARTIAL |
| Visual preview | an earlier angular build was inspected; the current Newtonian build has not been re-inspected in a real extension | REVALIDATION_REQUIRED |
| Full research workflow | budgets and DTOs exist; 39-point UI, scheduler, Exa adapter and coverage ledger are not complete | NOT_IMPLEMENTED |
| CCP runtime | versioned contract and offline handoff constructor exist; crash/F5/provider-switch E2E does not | PARTIAL |
| Orbital physics | educational Newtonian implementation is local and tested; formal tolerance governance and independent scientific qualification remain open | PARTIAL |
| Release | artifact exists, but no clean-machine E2E, browser observation or human G10 approval | BLOCKED |
| Dependency audit | Astro was moved to `7.3.3` and Tailwind to the supported Vite integration, removing the earlier Astro critical advisories. `npm audit --omit=dev --audit-level=high` still reports high-severity transitive advisories in the standalone Sanity CLI/build graph. | BLOCKED_UPSTREAM |

## Dependency reconstruction details

The first workspace install was inconsistent because the interactive creator was interrupted. Its lock recorded some dependency edges without installing the packages. The broken trees were moved outside the repository. A clean install with npm `10.9.4`, `--ignore-scripts` and `--legacy-peer-deps` produced a complete dependency tree; schema extraction and Studio build then passed. The system npm remains `11.16.0`, but the repository pins the installer that produced the verified lock.

On 2026-09-22, the invalid empty `web/node_modules/three` entry and extraneous root copy were moved to the external recovery quarantine rather than deleted. The lock and dependency tree were reconstructed with pinned npm `10.9.4`. A fresh `npm ls --depth=0 --workspaces` now passes, as do the root tests and full build. The system npm remains `11.16.0`; future installs should continue using the pinned package manager.

## Next evidence-producing step

Load the exact `web/dist` represented by the packaged SHA-256 in Chrome and record side-panel/WebMCP evidence. Rebuild reproducibly with `python tools/package_mv3.py`. Authenticated work remains a later human-controlled gate. For Sanity, run:

```powershell
npm run dev --workspace @orbit/studio
```

Then load `web/dist` manually in Chrome and record side-panel and WebMCP discovery evidence before beginning authenticated provider work.
