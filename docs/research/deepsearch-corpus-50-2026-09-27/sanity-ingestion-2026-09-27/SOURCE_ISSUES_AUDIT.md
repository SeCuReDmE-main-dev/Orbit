# Sanity Context source-issue audit — 2026-09-27

Knowledge base: `kb5CHIYGXCMJ` (Orbit Companion — Sanity & Deep Research).

## Source behavior observed before the repair build

- The previous build succeeded with 28 entries and two pending issues. The `Prompt Injection & LLM Security` entry drew on only two source documents after Context's verdicts. The entry cited OWASP passages heavily; the 50 imported methodology notes were present, but their presence did not make them independently cited evidence for that entry.
- The ingested Gemini Deep Research page contained `background=True` and `store=True`, but did not contain a Zero Data Retention statement. Context turned the absence of that statement into an apparent claim of ZDR compatibility. Absence of a statement does not establish compatibility.
- The official Google ZDR page says the Interactions API needs `store=false` to avoid state retention. The official Gemini Deep Research page says background execution requires `store=true`. This is a real limitation for a strict zero-storage requirement, even though the original page did not state it explicitly.
- The OpenAI Deep Research guide calls its background mode incompatible with strict ZDR because polling requires temporary storage. Other OpenAI data-controls documentation describes how such background requests are handled on ZDR projects; these are different policy/implementation statements and should be kept source-scoped.

## Actions and boundaries

- A conflict was prematurely resolved into a standing instruction and one entry update was started. After the user's correction, the issue was reopened. The Instructions view was verified to contain **zero active rules**. Do not recreate an instruction to repair source coverage.
- A merge suggestion for the security entry was prematurely dismissed. Sanity did not permit reopening this `merge_entry` issue through its supported issue method. Its historical status is not evidence of correctness; the *current generated entry* must be checked instead.
- Three primary web pages were added to the 22 existing web imports, reaching 25 web imports. All three jobs completed; extracted bodies were read back, nonempty and relevant. The original 50-file lot was not replaced.
- First repair build job: `ctx-build-a22131ab-85c8-4887-8467-b657d3d3c3dd-1790529881686`, succeeded at revision `f45551a0-f56d-49fa-9052-a8ed72ab32f0`. It produced a security entry citing seven distinct source IDs, but its Deep Research entry still omitted the Google ZDR condition. The imported Google ZDR page was cited by the separate Google Search Grounding entry instead.
- A short, explicitly labeled **source comparison**, `GOOGLE_DEEP_RESEARCH_ZDR_SOURCE_COMPARISON.md`, was therefore imported as one additional file document. It puts two official Google requirements side by side, with URLs and product scope; it is not an instruction and not an independent primary source. The extracted document was checked for both `store=True` and `store=false`.
- Second repair build job: `ctx-build-a22131ab-85c8-4887-8467-b657d3d3c3dd-1790530775548`, succeeded at revision `399ba269-0c48-4228-8718-30b8b493218c`. It produced 30 entries from 95 source documents. The current `deep_research/models` entry cites the comparison source and states that this Gemini Developer API Deep Research path requires `store=True`, conflicting with the `store=false` zero-data-footprint condition. The current `security/prompt_injection` entry cites seven distinct sources, above the three-document floor.
- The latest build still has five open review issues. Four concern named-entity coverage. The fifth compares the Gemini Deep Research storage requirement with the Google Search Grounding entry's suggestion to consider Vertex AI for another zero-retention route. This is a **scope distinction, not proof that the Deep Research agent can run with zero-data footprint**. No issue was dismissed or resolved in the latest revision; there are still review issues to assess. Historical issues from prior revisions also remain visible in the API.

## What the source behavior showed

Adding a document does not guarantee that Context will use it in the intended entry. On the first repair build, the official Google ZDR document was included in the corpus but cited in `search_and_retrieval/google_grounding`, while `deep_research/apis_and_models` still lacked the cross-document comparison. The bounded comparison document made the relationship available at the same topic scope; only then did the rebuilt Deep Research entry cite and explain it. This is an observed behavior of these two builds, not a guarantee for future builds or queries.

## Primary references

- Google Gemini Deep Research: https://ai.google.dev/gemini-api/docs/deep-research
- Google Gemini API ZDR: https://ai.google.dev/gemini-api/docs/zdr
- OpenAI Deep Research: https://developers.openai.com/api/docs/guides/deep-research
- OpenAI background mode: https://developers.openai.com/api/docs/guides/background
- OpenAI agent prompt-injection defenses: https://openai.com/index/designing-agents-to-resist-prompt-injection/
- Anthropic browser-agent prompt-injection defenses: https://www.anthropic.com/research/prompt-injection-defenses
- OWASP prompt-injection prevention: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

No Orbit behavior or UI test was run as part of this source repair.
