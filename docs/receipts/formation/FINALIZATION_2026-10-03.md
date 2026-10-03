# Orbit V3 — finalization in progress, October 3, 2026

This is a working register, not a full-mission completion receipt. Starting repository: `master`, `f2313b27a586bbe98e53869d6753315935b91b52`. Landing V3 and atom mechanism 2.1.7 remain separate identities.

| Requirement | Current state | Evidence or next gate |
|---|---|---|
| Guide V3, five entrances and formation in FR/EN/ES | Built in Kaggle and deployed | [Software and build receipt](studio-software-qa-20261003.json), [public HTTP readback](final-public-readback-20261003.json). Release `orbit-v3-final-20261003T142300Z`; native interaction replay remains separate |
| Studio exact publication identity, response verification, replay and stale response handling | Targeted checks passed in Kaggle | 36 publication/registry/transport checks, 8 packaging checks and targeted TypeScript check on the identified source snapshot |
| Exact Studio archive and second-host build | Static builds passed in Kaggle | Corrected 202-file bundle; portable version 1.0.1 and exact-archive host. Native authenticated runtime remains separate |
| Campaign C historical identity plus separate complement | Production coverage reaches 240 across two identities | [C resumption](c-resumption-20261003.json): 60 extractions, 236 productions, 59 packets; [C4](c4-complement-20261003.json): four productions, one packet, zero new extractions. Both downloaded archives verified; original overload preserved |
| Campaign D | Provider lot 12/12 executed, full mission 12/24 | [Execution audit](d-provider-20261003.json): nine trajectories met the reading criterion; three Pro Context-condition outputs did not read Context. Same twelve originals in both conditions. Sanity lot and semantic arbitration remain incomplete |
| Campaign E | New generation resources being prepared; 0/144 model trajectories | Resource preparation does not qualify native workers or model trajectories; fresh native preflight remains required |
| Path One article | Complete EN and FR drafts; review ongoing | `docs/submission/orbit-v3-path-one/`; exact six official headings, two reserved editorial angles |
| Explanatory video | Author reports production in progress | Approximately four minutes about the tool, produced with NotebookLM; link not yet supplied |
| Deployment and public Git push | Release deployed; Git push remains separate | [Deployment receipt](final-static-deploy-20261003.json) and [public HTTP readback](final-public-readback-20261003.json) identify the release and separate research/course outlines. No new Git commit or push is inferred from deployment |

## Observed C startup incidents

The Kaggle editor initially executed the final call before its definition had been selected. That call raised `NameError` without model execution. The definition was then executed explicitly.

The first resume wrapper used `/kaggle/temp`. The frozen checkpoint ledger correctly rejected it with `RESUME_INPUT_MUST_BE_KAGGLE_DATASET`, again before any model call. The wrapper was corrected to mount the actual private dataset `celebrum/orbit-c-private-checkpoints-20261003`. The original ledger and campaign identity were preserved. The checkpoint bytes are stored with a `.zip.bin` suffix to prevent automatic archive expansion by dataset upload; ZIP parsing and the SHA-256 check remain unchanged.

Restored checkpoint SHA-256: `c5e88b5321b716b8070f0e5604138223d0fb5b9937b73317dcca144e415a1ebc`.

Historical C configuration SHA-256: `0d433497a1e6fa7810c68a51709e821d204f3241707e39850e45b2ce6283ad85`.

Kaggle preflight observed SDK `0.6.1` and both pinned models. It made zero model calls. The resumption reached the historical admissible ceiling of 60 extractions and 236 productions. The downloaded archive SHA-256 is `55276f8c2d772d1c87caec867e0678a7d16d9eec2b97e09beea1ba471c0f3116`. Its 911 members were checked for unsafe paths. One packet's first condition had a historical heavy-load HTTP 429 technical error; the next three conditions were not executed under that identity.

The separately identified [C4 complement](c4-complement-20261003.json) then produced four comparative outputs using the exact common extraction, in order `baseline → n → p → none`. Its downloaded archive SHA-256 is `3d5ae48fb3900fe04eab8b2a625fee49301adf4d787a9f3079c2ec485ee8326b`; 21 safe members contain nine distinct completed checkpoints. Coverage is 236 historical plus 4 complementary = 240 productions across two identities, with zero new extractions and no historical error rewrite. Structured-output completion is separate from semantic accuracy and human arbitration.

## First cloud software validation, October 3

Run `orbit-v3-studio-final-9c27dc9d6f61-1791035367945961583` verified the exact source bundle, unchanged root lock and fresh dependencies in Kaggle. All 36 targeted tests, eight packaging checks and the publication TypeScript check passed. Astro then failed to resolve `web/public/benchmark/suite-a-development.json`, which the preparation bundle had omitted even though `web/src/pages/benchmark.astro` imports it. The run remains `FAILED`; its retained logs do not qualify a deployment. The next bundle must include the existing imported asset and receive a new source identity.

The second run, `orbit-v3-studio-final-2ccfa1632c14-1791036029220880567`, preserved the original 195 sources and added seven existing public benchmark assets. It passed the same 36 tests, eight guards, typing and all four build/package stages in Kaggle. The build archive SHA-256 is `c884d96e89dd4c9bafbcb319f390b2487d0419a8e51e7e1e18a74166e676b5a9`. The actual build archive was recovered and its SHA-256 verified; the public [software/build receipt](studio-software-qa-20261003.json) records that recovery. The [deployment receipt](final-static-deploy-20261003.json) and [public readback](final-public-readback-20261003.json) identify the delivered release. Its markup and visual/physics dependencies were preserved apart from normalized asset references caused by the authorized WebMCP metadata update. A fresh native interaction replay and authenticated Studio validation remain separate gates.

## Fresh notebook bootstrap incidents

C4 initially stopped before model dispatch because its fresh image had loaded Protobuf 5.29.5 while the SDK's generated code required 5.29.6. Its preparation now pins `kaggle-benchmarks==0.6.1` and `protobuf==5.29.6`, and requires a session restart when an older runtime is already loaded. No Protobuf compatibility check was disabled.

C4 and D then reported an empty model registry in standard notebook mode. The native Kaggle setting `File → Set as Benchmark Task` was enabled before rerunning preflight. An empty registry from that mode is not evidence that the pinned models were withdrawn. No model call occurred during these rejected preflights.

## Validation boundaries

Local targeted checks are not Kaggle results. A prepared notebook is not a completed run. A completed build is not a deployment. Software fixtures do not certify learner understanding. The article is prepared for author review and has not been submitted to DEV. The Origin Trial form remains under the author's control.
