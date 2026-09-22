# Orbit gates G0-G10

Gates are executable policy boundaries, not progress labels. Every result is `PASS`, `FAIL`, `BLOCKED_EXTERNAL` or `NOT_APPLICABLE` with timestamp, criteria, evidence and unresolved items. Missing evidence cannot produce `PASS`.

| Gate | Question | Required before |
|---|---|---|
| G0 | Is repository and runtime truth captured? | planning |
| G1 | Is the mission bounded and measurable? | card creation |
| G2 | Are contracts and schemas compatible? | integration |
| G3 | Is authority sufficient and exact? | any execution |
| G4 | Is knowledge grounded and allowed? | provider invocation |
| G5 | Are resource and spend budgets enforceable? | provider invocation |
| G6 | Is continuity and retention safe? | checkpoint/resume |
| G7 | Do threat controls hold? | execution |
| G8 | Does the candidate pass targeted verification? | release review |
| G9 | Is the evidence package complete and reproducible? | final audit |
| G10 | Has a human accepted the exact release action? | publish/submit/deploy |

G0-G7 must pass for execution. G8 and G9 must pass for a release candidate. G10 can only be passed by a human for one exact artifact and target. Current work does not grant G10.

The full criteria and evidence contracts are in [G0-G10.md](G0-G10.md). Use [final-audit-template.md](final-audit-template.md) for the closing review.
