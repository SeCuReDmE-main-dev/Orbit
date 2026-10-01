# Orbit challenge work timeline and provenance

Receipt prepared on **October 1, 2026**. This record separates local Git metadata, independently checked contest dates, the current coordinated validation session, and older reports. It does not certify contest eligibility or replace a contest submission.

## Official entry periods

The official contest rules were read on October 1, 2026:

| Challenge | Entry period stated in the official rules | Source |
|---|---|---|
| Sanity | September 18, 2026, 9:00 AM PDT through October 4, 2026, 11:59 PM PDT | [Sanity Challenge Contest Rules](https://dev.to/page/sanity-challenge-v26-09-16-contest-rules) |
| Kaggle Benchmarking | September 23, 2026, 9:00 AM PDT through October 11, 2026, 11:59 PM PDT | [Kaggle Benchmarking Challenge Contest Rules](https://dev.to/page/kaggle-2026-09-23-contest-rules) |

These are the entry periods from the rules pages, rather than dates inferred from challenge URL slugs, screenshots, or an interface status badge. Eligibility remains governed by the complete official rules.

## Preserved local history

The local repository inspection returned branch `master` and the following two existing commits. Their author and committer dates matched in that inspection.

| Local date, including UTC offset | Commit | Recorded subject |
|---|---|---|
| `2026-09-22T13:23:32-04:00` | `e3326986451d366bc25ddc01220a288c1e9fc14a` | `chore: establish recoverable Orbit Companion baseline` |
| `2026-09-22T15:51:56-04:00` | `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821` | `feat: complete local Orbit Companion vertical slice` |

These commits are preserved under their original object IDs. The publication work does not rewrite their dates or manufacture earlier commits for later development. Subsequent changes belong in new commits with their actual publication history.

The September 22 Orbit baseline falls within the Sanity entry period, which began on September 18. **The Kaggle challenge began on September 23. Orbit already existed; the Kaggle announcement inspired its use for the subsequent benchmark work.** The existing Orbit foundation and the later benchmarks are separate parts of the chronology. The September 22 commits do not imply that the benchmarks began before the Kaggle challenge. This account of the motivation and sequence was clarified directly by the author on October 1.

Git author and committer dates are locally supplied metadata. They are useful for tracing the repository, but they are **not independent third-party timestamps** proving when the work happened. A commit subject also does not establish that its described behavior was deployed or validated.

## October 1 public repository

The GitHub API inspection confirmed that [SeCuReDmE-main-dev/Orbit](https://github.com/SeCuReDmE-main-dev/Orbit) is public and has a repository creation timestamp of `2026-10-01T09:44:18Z`.

This is a new public repository created on October 1. Its creation timestamp must not be presented as the date of the September 22 development. Conversely, publishing the preserved September 22 Git objects on October 1 does not imply that GitHub hosted them on September 22.

At the inspection used for this receipt, the remote existed, the local `origin` pointed to it, and the API reported repository size `0`. A later push needs its own readback: branch, published commit ID, and accessible source files. This receipt does not claim that the complete workspace was already pushed at that inspection.

## Current formation software validation

During the current coordinated work session on October 1, the coordinator observed the formation validation notebook output showing **117/117 passing checks** and the Python validation command completing with **exit code 0**.

| Item | Recorded value |
|---|---|
| Execution surface | Kaggle |
| Notebook | [Orbit formation software validation](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation/edit) |
| Payload SHA-256 | `0c2dd93d1378bbfb41fa62dd811d76d17a74cd4124c037e7c1095ec78f77931f` |
| Observed result | `117/117` checks passed; Python exit code `0` |
| Provenance | Live output observed by the coordinator in this session; not an independent rerun performed while writing this receipt |

The fingerprint identifies the prepared test payload. The result applies to that payload and its executed assertions. It does not automatically cover files changed afterward, an arbitrary checkout of the September 22 commit, every device, or an entire model benchmark campaign.

The notebook URL is an execution reference. Its `/edit` route alone does not establish anonymous public access, a saved immutable run, or the availability of downloaded result files. Those properties need separate readback before they are claimed in a submission.

## Older reports and limits of this receipt

Earlier delivery folders, receipts, and benchmark records are retained as historical material. Their reported results have **not been rerun or reverified as current results by this timeline work**. A date in a filename, a release label, or an earlier report is not a substitute for the original run output and the version it exercised.

Use the following provenance labels when extending this record:

| Label | Meaning |
|---|---|
| `OBSERVED_CURRENT` | A current command, service readback, or execution output was actually inspected; identify the observer and version. |
| `REPORTED_HISTORICAL` | An earlier report states a result; its original execution has not been freshly reverified here. |
| `IMPLEMENTED_NOT_VALIDATED` | Source or an artifact exists, but the intended runtime behavior has not yet been demonstrated. |
| `PENDING_VALIDATION` | A defined verification remains to be performed; no success is implied. |

In particular, the recorded Kaggle software result does not establish any of the following:

- execution of all eight learner notebooks in a fresh free Colab session;
- completion of a student's learning activities, understanding, or human teaching review;
- installation and successful operation of the portable plugin in a second independent Sanity Studio;
- successful native WebMCP agent missions merely because tool-contract tests pass;
- deployment or successful public readback of the formation routes on `orbit.securedme.ca`;
- completion of the full Gemini/model benchmark campaign or superiority of any of the three engines;
- publication of a DEV article or acceptance of a challenge submission.

Each remaining validation should append its own actual execution date, environment, source or payload fingerprint, command or mission, result, and evidence link. Failures and incomplete runs stay visible. A planned action must not be promoted to `OBSERVED_CURRENT` until its output has been inspected.

## Reproduction of the history inspection

The following read-only commands expose the local metadata used above:

```sh
git branch --show-current
git rev-parse HEAD
git log -2 --format='%H%n%aI%n%cI%n%s'
git remote -v
```

The GitHub repository metadata was read through `gh api repos/SeCuReDmE-main-dev/Orbit`, selecting only the repository identity, visibility, creation/push timestamps, default branch, and size. Credentials were not printed or included in this receipt.
