# Orbit cloud campaign — verified checkpoint

Repository: master / 3c6806b9cb77b81b5bea2e3debb7146f5ee0b821. Existing dirty work preserved.

The user-supplied results.zip was archived intact: SHA256 63a6d9d8667e3568be80b52b405f26c7db573bed23be5ecf326f813226c86b98. All 24 Suite D v1 tasks failed before inference on a missing source status field. A fallback preserving unknown access was applied.

Kaggle software validation: 59 passed, 0 failed. Deterministic controlled cases: 108 decisions and 324 invariants passed. Model campaign: 37/60 completed; Context latest: 0/24; WebMCP: 1/144. These are execution counts, not scientific accuracy. SDK ten-round ceiling and a Pro quota refusal are observed; remaining error diagnoses and semantic review are pending.

Prepared changes (not validated as a complete new campaign): 4096-token cap, 22 SDK rounds within the existing twenty-call gate, positive revision fixture for W09, final error tail preservation, one ZIP of browser observations to avoid Kaggle's export file cap.

Security: eight temporary mission accesses revoked and denied with HTTP401 by Kaggle; credential-free notebook Quick Save observed. Local expired token files removed. Eight owned browser microVM stopped; control expired. E2B account environment unchanged and never embedded. No account token deletion was falsely claimed.

Deployment succeeded with backup .backup-7e6df7c73fc931106dc1b618. Public benchmark now separates current Kaggle results from historical pilots. Zero-inference public readback in Kaggle run354227625 passed all eight routes including Context outline and exact releaseId orbit-cloud-20260930T190323Z.

Next action: obtain full raw exports, audit the failed tasks and current Kaggle quota, then rerun the frozen matched conditions with the declared bounded harness version. No automatic model substitution, no selected engine winner, no editorials, no local tests. Real annotations remain pending human review.

```json
{
  "observedAt": "2026-09-30T19:21:16.6276500Z",
  "repositoryHead": "3c6806b9cb77b81b5bea2e3debb7146f5ee0b821",
  "branch": "master",
  "workingTree": "existing changes preserved",
  "validation": {
    "host": "Kaggle",
    "url": "https://www.kaggle.com/code/celebrum/orbit-cloud-software-validation",
    "runId": "354209018",
    "tests": 59,
    "passed": 59,
    "failed": 0,
    "sourceSha256": "6fffe43efaaffbbae23c39962bb27db1381526c841292cb4169803fe46a0ed58",
    "engineSha256": "8c0a16a08fec3ea7b23213e4951cfb8cffdfdde1c37e1d8ddb69a3e849f1688d",
    "evidence": "UI readback; raw output download pending"
  },
  "deterministic": {
    "host": "Kaggle",
    "runId": "354204770",
    "evaluations": 108,
    "correct": 108,
    "invariants": 324,
    "invariantsPassed": 324,
    "realPendingArbitration": 24
  },
  "campaignC": {
    "state": "partial; 37 completed, 23 errored, of 60",
    "url": "https://www.kaggle.com/code/celebrum/orbit-three-engines-kaggle-campaign"
  },
  "campaignD": {
    "state": "V1 field error; V2 SDK round ceiling; V3 run354223310 0 completed / 24 errors",
    "url": "https://www.kaggle.com/code/celebrum/orbit-live-sanity-context-comparison",
    "planned": 24
  },
  "nativePreflight": {
    "host": "Kaggle",
    "browserHost": "E2B",
    "chromeMajor": 154,
    "native": true,
    "tools": 15,
    "passed": true,
    "durationSeconds": 7.655487537384033,
    "firstAttempt": "CHROME_DEBUGGING_UNAVAILABLE, retained failure",
    "noSandboxBypass": true
  },
  "deployment": {
    "status": "success; results page updated",
    "planId": "7e6df7c73fc931106dc1b618",
    "releaseId": "orbit-cloud-20260930T190323Z",
    "packageSha256": "e0b73da95fd0f5044c2837e773aff3e5e5d076e3e0a4357227342ebba98b9265",
    "backup": "/home/xacm7978/orbit.securedme.ca.backup-7e6df7c73fc931106dc1b618",
    "publicCloudReadback": "Kaggle run354227625 passed: eight HTTP200 routes, exact releaseId, zero model calls"
  },
  "campaignE": {
    "state": "run354216830 partial; 1 completed, 143 errored; eight native workers passed preflight",
    "planned": 144,
    "workers": 8,
    "notebookSource": "private, ephemeral mission credentials; remove after verified retirement"
  },
  "limits": [
    "No superiority established.",
    "All real gold labels remain provisional or absent.",
    "No editorials created.",
    "No local software tests or model benchmark calls."
  ],
  "retirement": {
    "temporaryCredentials": 8,
    "denial": "HTTP 401 observed in Kaggle log",
    "accountE2BKeyEmbedded": false,
    "notebook": "credential-free Quick Save verified",
    "browserWorkers": "eight owned workers stopped"
  }
}

```
