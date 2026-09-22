# Orbit final audit

Copy this file for a release candidate. Do not overwrite the template.

## Identity

- Audit timestamp:
- Auditor:
- Repository:
- Branch:
- Commit or `HEAD_UNBORN`:
- Dirty state:
- Artifact name and SHA-256 digest:
- Target environment/account:

## Claimed result

- Objective:
- Observable before/after behavior:
- Acceptance criteria:
- Non-goals:

## Gate evidence

| Gate | Verdict | Evidence IDs/paths | Unresolved owner and due date |
|---|---|---|---|
| G0 |  |  |  |
| G1 |  |  |  |
| G2 |  |  |  |
| G3 |  |  |  |
| G4 |  |  |  |
| G5 |  |  |  |
| G6 |  |  |  |
| G7 |  |  |  |
| G8 |  |  |  |
| G9 |  |  |  |
| G10 |  |  |  |

## Authority and external state

- Required authority:
- Granted authority:
- Approval receipt ID, card ID, target and expiry:
- External dependencies still `BLOCKED_EXTERNAL`:
- Spend authorized (currency and exact maximum):
- Spend observed:

## Validation actually executed

| Command/scenario | Environment/version | Result | Evidence location |
|---|---|---|---|
|  |  |  |  |

List proposed but unexecuted checks separately:

-

## Security and privacy

- Threat-model changes reviewed:
- Secret scan result:
- Data classes processed:
- Retention/deletion schedule:
- Prompt-injection and approval-replay tests:
- CCPPackage integrity and resume test:

## Diff and provenance review

- Intended paths:
- Unexpected paths:
- User/other-agent changes preserved:
- Sources and licenses verified:
- Simulated versus externally observed results labeled:

## Residual risk and rollback

| Risk | Severity | Owner | Trigger | Mitigation/rollback |
|---|---|---|---|---|
|  |  |  |  |  |

## Decision

- Verdict: `ACCEPT` / `REJECT` / `BLOCKED_EXTERNAL`
- Reason:
- Exact next action:
- Human signature/receipt for G10:

An accepted audit applies only to the artifact digest and target above. Any change reopens G9 and G10.
