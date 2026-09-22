# Phase state

| Phase | State | Evidence | Next condition |
|---|---|---|---|
| Singularity | PASS | `memory.md` | keep one mission output |
| Stack boundary | PASS | dependency-free TypeScript contracts | runtime package typecheck |
| Bake-In | PASS_WITH_EXTERNAL_BLOCKS | `bake-in-review.md` | provider-specific review after selection |
| Architecture | PASS | `docs/architecture/` | integration feedback |
| Contracts | PASS | `packages/contracts/`; isolated typecheck and smoke checks passed | keep compatibility tests green |
| Local vertical slice | PASS_LOCAL | 23 passing checks, full workspace build, loopback broker boundaries, deterministic MV3 package | browser extension observation |
| Sanity Studio | PASS_LOCAL | config, extracted schema and local build pass | human-controlled Studio authentication and remote readback |
| Provider integration | BLOCKED_EXTERNAL | `docs/architecture/external-dependencies.md` | named approved provider |
| Deployment | BLOCKED_EXTERNAL | no target or authority | human deployment decision |
| Release | BLOCKED_EXTERNAL | G10 not granted | exact artifact and target approval |

Architecture work may proceed with external blocks because contracts explicitly represent them. The local physics model is educational and unqualified. External execution or release may not proceed.
