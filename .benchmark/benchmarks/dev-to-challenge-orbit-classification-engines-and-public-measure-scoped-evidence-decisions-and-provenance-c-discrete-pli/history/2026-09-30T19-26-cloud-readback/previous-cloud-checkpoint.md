# Orbit cloud campaign — 2026-09-30

This checkpoint supersedes the old local/Antigravity campaign for the current delivery.

{
  "observedAt": "2026-09-30T18:15:00Z",
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
    "state": "running-observed",
    "url": "https://www.kaggle.com/code/celebrum/orbit-three-engines-kaggle-campaign"
  },
  "campaignD": {
    "state": "submitted; result not yet verified",
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
    "status": "success",
    "planId": "66153c6a0385f54d69dc45c8",
    "releaseId": "orbit-cloud-20260930T175210Z",
    "packageSha256": "445bbfd53b8a54c8b8dba14e241a4c161e05b8764f1f6acb3f6a512d5c800bbb",
    "backup": "/home/xacm7978/orbit.securedme.ca.backup-66153c6a0385f54d69dc45c8",
    "publicCloudReadback": "pending Suite E preflight"
  },
  "campaignE": {
    "state": "prepared-not-run",
    "planned": 144,
    "workers": 8,
    "notebookSource": "private, ephemeral mission credentials; remove after verified retirement"
  },
  "limits": [
    "No superiority established.",
    "All real gold labels remain provisional or absent.",
    "No editorials created.",
    "No local software tests or model benchmark calls."
  ]
}

Full delivery remains in progress. See tools/kaggle_webmcp_campaign.py for explicit automated-fixture and credential-retirement semantics.
