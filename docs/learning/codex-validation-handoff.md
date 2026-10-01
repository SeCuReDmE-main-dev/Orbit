# Validation and handoff worksheet

Adapted for Orbit Companion from [OpenAI Academy's Get Started with Codex, lesson 1.5](https://academy.openai.com/learn/get-started-with-codex-zy8qn/lessons). This worksheet is a review aid, not evidence that the checks below have been run.

Start with the [bounded task brief](codex-task-scope.md). Record a safe pre-change baseline when it matters, then fill in actual results rather than expected results.

| Question | Record for this task |
|---|---|
| Requested behavior and protected nearby behavior | What should work, and what must remain unchanged? |
| Focused tests | Exact command, relevant case, outcome and failure analysis. |
| Quality checks | Exact lint, type-check, build or other applicable commands and outcomes. |
| Manual validation | Browser/side-panel steps, environment, observed result and anything not exercised. |
| Diff review | Correctness, scope, fit with existing code, coverage, security and unresolved assumptions. |
| Decision | Accept, revise or insufficient evidence, with the reason. |

For a handoff, report the goal, changed files, commands actually executed and their results, manual checks, review findings and resolutions, unverified items, remaining risks and next permitted action. Keep the receipt in the existing `docs/receipts/` process when performing real work.

Do not equate an offline fixture or successful build with a live Codex, Antigravity, Exa, Sanity Knowledge Base or WebMCP client integration. Describe a blocked external step as blocked, with the reason and the evidence still needed.
