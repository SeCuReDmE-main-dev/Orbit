# Orbit — Sanity Context research handoff (2026-09-28)

## Result actually observed

Orbit now has a reproducible, bounded **Codex agent → Sanity Context MCP → pending dossier proposal** path. The local gateway returned `READY` for `initial_context` and three `knowledge_base_read` calls. The official local Codex account reported connected with the requested `gpt-5.6-luna` model. The agent produced a plan with nine axes, nine screening criteria, three Context entry digests and a provisional method note. It remains **pending human review**. No primary-source report, baseline comparison or superiority claim has been completed.

The case question is: “Under which documented conditions can background deep research coexist with zero-data-retention requirements across OpenAI and Google API surfaces?” Its retrieved paths were `data_retention_and_privacy`, `deep_research/models_and_apis` and `search_apis/google_grounding`. The Context entries supply *method and provider-policy context*. They are not a substitute for reading the official original documents referenced in those entries.

## Files and repeatable run

- `CONTEXT_DEMO_INPUT.json`: question and objective, without a private account or token.
- `CONTEXT_DEMO_PLAN_PENDING.json`: importable Orbit dossier, revision 0, one pending plan proposal.
- `CONTEXT_DEMO_PLAN_PENDING.json.trace.json`: tool names, states, selected paths, model, and SHA-256 entry digests.
- `tools/context-agent.ts`: bounded agent logic, path allowlist from the actual outline, exact-quote checks and changed-entry refusal.
- `tools/run-context-agent.ts`: CLI runner through the local account API gateway; no token goes to the model or browser.

Run from the repository root with the local account API on `127.0.0.1:8788` and an authenticated official Codex client:

```powershell
npx tsx tools/run-context-agent.ts plan docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_INPUT.json path/to/new-plan-output.json
```

The output path **must be new**; the CLI will not overwrite the input or an existing output. The generated plan is a proposal, not an approval. After a person reviews and approves the exact plan in Orbit, export that dossier and run:

```powershell
npx tsx tools/run-context-agent.ts report path/to/approved-dossier.json path/to/new-report-output.json
```

The report command refuses a dossier without an approved plan, a changed Context entry, missing structured claims, unmatched source quotes or missing structured citations. The result still requires source admission and claim-by-claim human review. A Context entry is represented as a **Knowledge Base entry**, not as if its underlying source documents had been read.

## Comparison protocol for the challenge

1. Freeze the question, the 20-entry KB outline, the indexed-document count, the source documents, the Codex model, the prompt budget and the date.
2. Run Orbit's Context selection and a simple keyword baseline over the **same documents**. Save the selected entries and text for both methods.
3. Generate candidate answers under the same model and budget. Require both to distinguish provider, product surface, background execution, storage default, retention, exceptions and unknowns.
4. Review each material claim against the **original policy page and exact passage**, not merely the KB summary. Record correct distinction, unsupported generalization, missing qualification and citation validity.
5. Publish both traces, unresolved cases and reviewer decisions. Claim a structural advantage only if the measured differences support it.

This protocol is not a completed evaluation. The last reported “97 indexed documents” was not remeasured in this run; the live indexed-document count must be recorded before a challenge submission.

## Public state and release gate

At this check, `https://orbit.securedme.ca/` returned the older Orbit Companion page (`200`); `/app/` and `/api/v1/knowledge/outline` returned `404`. The cPanel domain inventory and diagnostic tools returned `CPANEL_OPERATION_FAILED` without mutation or secret disclosure, although the settings broker reported configured credentials. The new static app should not replace the public page while its Sanity gateway route is absent. A release requires a verified backend route, a recoverable remote backup, a public artifact manifest and a smoke test from the public URL.

No public deployment, DEV submission, account migration or Knowledge Base rebuild occurred in this run.

## Validation receipts

- `npm test`: 27 Vitest files, 87 tests passed; 5 policy guard tests passed.
- `npm run build`: core, providers, broker, Astro Web and Sanity Studio built successfully; Astro Web was rebuilt successfully after the final UI/dossier adjustments. The Astro build reported a large chunk warning, not a build failure.
- `npx tsc --noEmit --project web/tsconfig.json`: passed after the dossier changes.
- `npx tsc --noEmit --module nodenext --target es2022 --moduleResolution nodenext --skipLibCheck tools/context-agent.ts tools/run-context-agent.ts`: passed for the CLI modules.
- Local browser: `/app/` opened, the synthetic example was visibly labeled, and the Preuves and Vérification views plus source detail and admission buttons were reachable. This is not a real research report validation.
