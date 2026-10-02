# Orbit Kaggle v2 — actual state and resumption

This dossier separates preparation, deterministic software QA, native browser qualification and model observations. Tests/provider calls run in Kaggle; isolated native browsers run in E2B. No engine winner is selected.

## Actual October 1 state

| Suite | Planned | Observed | Status |
|---|---|---|---|
| B | 60 questions × 3 engines | 180 decisions; 108/108 synthetic references; 540/540 invariants | Verified in Kaggle; 72 real-source decisions unscored |
| C | 60 extractions; 240 comparative productions | 57 extractions; 221 productions; 55 complete packet comparisons | Partial; privately backed up and analysed |
| D | 24 matched Context/textual trajectories | 0 | Blocked by actual 2/2 Knowledge Bases |
| E | 144 agent trajectories | 0 | Native/scheduler boundaries qualified; model campaign not dispatched |

The real aggregate analysis is `c-sdkparams2-independent-analysis.json`. It was performed in Kaggle with zero new model calls. The 24 real questions remain pending human arbitration. Missing conditions/pairs remain explicit. Costs include observed failed attempts and preserve unknown values: the known subtotal is not a complete total.

C stopped before a new dispatch at the **local conservative 85% quota threshold**. The actual quota UI was $8.53/$10 daily and $18.29/$100 monthly. No provider quota-exhaustion refusal was observed. Reset times and catalogue price fields were unavailable. Do not rename this local policy as a provider capacity failure. An earlier HTTP 429 explicitly reported heavy load; the old frozen runner classified it as terminal. That observation remains under its original identity.

A single later **Refresh Quota** at October 2, 00:11:25 UTC showed the same daily and monthly usage. [Fresh quota readback](quota-final-readback.json). No renewal or reset time was observed; crossing midnight UTC is not a reset signal. No new model lot or worker generation was dispatched during that read.

## Evidence and immutable identities

- `c-sdkparams2-actual-progress.json` preserves the earlier observation at approximately 22:50 UTC.
- `c-sdkparams2-backup-analysis-receipt.json` records the later actual private archive recovery, matching byte hashes, private notebook visibility and removal of the temporary export output.
- `frozen-c-sdkparams2/` contains the exact source-only runner, payload and manifest that produced C. It contains no corpus, answer key, credentials or model outputs. Do not regenerate this historical runner using current helpers.
- `software-validation-gate-sdkparams2.json` records QA16 and B under C's original source identity.
- `sdk-output-bound-incident.json` and `sdk-cache-identity-incident.json` preserve earlier SDK incidents separately. Historical generations are not pooled into C's counts.
- `failure-classification-qualification-receipt.json` records four actual Kaggle tests with synthetic callbacks and zero provider calls. The new checkpoint classifies explicit heavy-load 429 as transient, preserves quota priority, leaves unknown 429 terminal and bounds retries to two. It does not change or rerun frozen C.
- `e-nativebounds1-qualification-receipt.json` records the prior E native/parallel qualification. Its harness differs from the later checkpoint correction. A changed source fingerprint requires its own reviewed identity before dispatch.
- `analysis-qualification-receipt.json` qualifies the independent analyzer. Its 300-generation synthetic fixture is not 300 actual campaign generations.

## Private inputs and rights

The private input dataset is [Orbit Kaggle v2 private inputs](https://www.kaggle.com/datasets/celebrum/orbit-kaggle-v2-private-inputs), mounted at `/kaggle/input/datasets/celebrum/orbit-kaggle-v2-private-inputs`. Its 91 files include 48 real-source snapshots, 37 retrieved raw responses, selected windows and separate references. The model receives the selected corpus view, never the answer key.

`real-source-public-inventory.json` exposes only URLs, spans, fingerprints and review status. Private snapshots and real model responses can contain unlicensed quotations and remain excluded from Git. A hash does not establish redistribution rights or correctness. Only 36 synthetic questions have independently fixed scoring references.

Every selected document is bounded to 12,000 characters; each twelve-document packet to 144,000. Span maps preserve source offsets, context windows and omitted ranges. Quotations crossing omitted ranges are ineligible. Missing selected text does not prove absence from the original.

## E boundaries and cleanup

E remains 96 central trajectories (four missions × two models × four configurations × three repetitions) plus 48 additional trajectories (eight missions × two models × three engines). The page registers fifteen actual tools; original-ten exposes its allowed ten. Twenty total agent tool attempts include discovery, invalid arguments and refusals. Controller start/role/stop are separate. Native dispatches and discovery attempts stay distinct. Duration is 480 seconds; at most two HOLD requests are dispatched.

SDK 0.6.1 qualified eight actor/thread slots with distinct parameter/model/chat assignments and worker locks. This qualification sent no provider requests. Native browser concurrency during the model campaign remains unobserved.

Generation `34d2e884-037a-4c9e-930d-3797d2b0151d` was retired after C's private archive was recovered. `e-owned-pool-retirement-receipt.json` records eight HTTP 200 retirements followed by mission and control HTTP 401 refusals in Kaggle. `e-owned-pool-cleanup-receipt.json` records official SDK inventory: nine owned sandboxes before cleanup, zero afterward. Local mission credential files were removed. The E2B account key was not revoked.

The stored Kaggle Secret `ORBIT_WORKER_POOL_JSON` is no longer available to the notebook. Its stored value was permanently deleted after the specific human confirmation; the later Secrets-manager readback showed no pool row and the five Context rows unchanged. `ORBIT_NATIVE_STUDIO_BRIDGE_CONFIG` appeared after the pool row was removed: the initial six-row display was not an exhaustive absence check. Desktop access to the notebook was deselected, but its stored secret was not deleted. No Desktop-secret deletion is claimed. Other Context mission secrets have a separate cleanup owner.

Future E requires a fresh owned generation and new mission/control tokens. Never reuse the retired generation or credentials.

## Resumption requirements

1. Preserve historical C and its private archive. Source/SDK/prompt/corpus/budget changes create a distinct identity; previous observations are never relabelled.
2. Reobserve exact hosted models and real free quota. No paid top-up, personal provider key or Codex/Antigravity model fallback. Unknown price/reset fields remain unknown.
3. Review the local 85% policy against official provider limits before changing it. Updating operational quota metadata does not permit editing frozen experimental inputs.
4. For matching-identity C restoration, mount the private ZIP and declare its exact SHA under `resumeArchives`/`resumeDatasetDir`. The old heavy-load technical error remains terminal in the historical runner; corrected resumption must disclose a distinct source identity.
5. D needs genuine same-source Context parity. Production KB outlines are not equivalent to twelve selected originals. The 24 proposed sources fit 126/150 safety budget, but the actual 2/2 KB cap prevents creating the matched contexts. No production KB was modified and no biased trajectory was counted.
6. E needs current release/browser/source pins, qualification of the changed checkpoint, fresh quota and a fresh pool. `manifest-e-nativebounds1.json` remains unfrozen/non-executable after correction and cleanup.

Preparation authors artifacts only, without tests or model calls:

~~~powershell
python tools/prepare_kaggle_campaign_v2.py --suite E --manifest .benchmark/benchmarks/dev-to-challenge-orbit-classification-engines-and-public-measure-scoped-evidence-decisions-and-provenance-c-discrete-pli/current/campaign-v2/manifest-e-nativebounds1.json --allow-unfrozen-preparation
~~~

Only one campaign notebook runs at a time. C generations remain serial. E may use its qualified bounded eight-slot schedule inside one notebook after current preflight. Every generation/role checkpoint precedes parsing or the next dispatch. Failed attempts and refusals remain archived.

This delivery is partial. Preparation, deterministic QA and native qualification do not substitute for unexecuted D/E model trajectories or human review of learning and real-source evidence.

## Retained preparations and superseded manifests

The following files preserve the actual progression. Their old quota snapshots, `frozen` flags, source hashes and preparation status are historical metadata, **not a current dispatch authorization or preflight**. The original files are retained without rewriting experimental identities. Current E is the separately labelled non-executable `manifest-e-nativebounds1.json`; frozen C's exact tested source is in `frozen-c-sdkparams2/`.

| File | Retained purpose |
|---|---|
| `c-initial-dispatch-receipt.json` | Initial SDKparams1 extraction; zero comparative productions, incomplete generation |
| `handoff-20261001T193900Z.md` | Historical handoff before subsequent SDK and native-boundary corrections |
| `manifest.json` | Initial unfrozen preparation |
| `manifest-c.json` | Historical C QA13 configuration; its old authoring flag does not supersede the attached QA receipt |
| `manifest-c-sdkparams1.json` | Historical SDKparams1 configuration |
| `manifest-c-sdkparams2.json` | Historical C configuration, equivalent to the immutable C runner's manifest |
| `manifest-e-provision.json` | Historical resource preparation; its `frozen` flag is not current E qualification |
| `manifest-e-sdkparams1.json` | Historical E SDKparams1/native preparation |
| `manifest-e-sdkparams2.json` | Historical E SDKparams2/native preparation |
| `software-validation-preparation.json` | Prepared notebook identity, not an execution |
| `software-validation-kaggle-reported.json` | Earlier QA13 report and its explicitly partial fingerprint scope |
| `preparation-receipt.json` | Latest E authoring receipt: non-executable, no embedded credentials/corpus/gold, no model call |

Private source-review inventories, internal provenance notes, original snapshots, answer keys, model responses and operational access files are excluded from Git. Provisional document renders are preserved locally, while the reviewed final publication has its own inventory. [Final runtime cleanup](../../../../../docs/receipts/formation/closure-runtime-cleanup-20261002.json) records the two cancelled Kaggle interactive sessions after result recovery.
