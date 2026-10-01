# Orbit — visual, account and WebMCP checkpoint

Date: 27 September 2026. Branch: `master`. Baseline HEAD: `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`.
This is a local implementation receipt, not a public release or complete research-pipeline acceptance.
Existing tracked and untracked work remains in place. No commit, push or deployment was made.

## Current ownership and boundaries

The user requested personal implementation by Codex. No subagent was used for this continuation; the earlier delegation table is historical.
Orbit is the visible product name. Synthia remains an internal source identity and package name for provenance and reuse.
Education and its source assets were read-only. NASA, Sanity corpus contents and Knowledge Base builds were not changed.
The accepted atom landing is preserved. The side-panel redesign remains deferred.

## Observed changes

- `tools/refine_orbit_presence.py` derives a rigged GLB from the preserved v7 Blender source, using the canonical face as a frontal texture projection baked into an embedded UV atlas. The jaw edge, neck tendons, armor contours and mirrored face winding were refined.
- `web/public/presence-review/orbit-study.glb`: 11,925,404 bytes; SHA-256 `bdb21c1d62d21d92f1e0d5de3db3883cae947b3f356600275140209bfbaf1e94`. The previous GLB remains available for recovery. Manifest retains anatomical attribution and source hashes.
- `packages/synthia-presence/src/index.ts`: shared cyan/violet lighting, projection rings, camera presets and aspect-aware framing. Renderer stays independent of accounts, microphones, AI and Sanity.
- `web/src/pages/presence-lab.astro`: full-window Orbit atelier, matching landing/atom palette, real camera and animation controls, reduced motion, no portrait card. Application hosts load the same new GLB.
- Visible component/page labels use Orbit. Internal source names are retained to avoid losing attribution or breaking imports.
- GitHub OAuth app creation was performed by the human. The secret was entered by the human into the private account-service `.env` and was not printed. Real OAuth return reached the protected application and its storage-choice dialog.
- The initial OAuth failure was reproduced as PHP/Guzzle certificate verification error 60. A curl/Mozilla CA bundle was downloaded over validated HTTPS and its published SHA-256 checked. `tools/start_account_api.ps1` uses a project-local PHP configuration with CA verification enabled, listens only on `127.0.0.1:8788`, and retains HTTP logs privately under `.orbit`.
- The account test for unavailable providers now sets its own empty provider configuration; it no longer depends on whether the developer has configured real credentials. Its rejection assertions remain unchanged.

## Validation actually executed

| Check | Result |
| --- | --- |
| `npm test -- --maxWorkers=1` | 58 Vitest tests + 5 Node policy tests passed. The suffix is forwarded to the final Node command by this script; it does not configure Vitest workers. |
| `vitest run tests/codex-connection.test.ts --maxWorkers=1` | 5 passed after an earlier full run had 4 short transport timeouts while Blender was rendering. No timeout or assertion was weakened. |
| `vitest run tests/synthia-presence.test.ts tests/webmcp.test.ts tests/companion-state.test.ts tests/companion-response-ownership.test.ts` | 14 passed against the new GLB and WebMCP contract. |
| `tsc --noEmit -p web/tsconfig.json` | Passed. |
| `npm run build --workspace @orbit/web` | Passed, eight Astro routes. Existing warning: a minified chunk exceeds 500 kB. |
| Account service: `php -c ../../.orbit/php.ini artisan test --compact` | 11 tests / 53 assertions passed with an in-memory database. First run exposed the environment-dependent provider test; second passed after isolation fix. |
| Account service: `php vendor/bin/pint --dirty --format agent` | Completed; formatter applied conventions to the new account-service files. |
| Real browser | GLB loaded with no captured console errors. Face/three-quarter control and reduced-motion checkbox exercised. Small-screen layout measured at 390 CSS px, no horizontal overflow. |
| Real GitHub OAuth | Human authorization followed by successful callback to `/app/` and storage-consent dialog. This does not validate production deployment, Google, email login or an AI subscription. |

Visual evidence is private under `.orbit/orbit-lab-v12-desktop.png`, `.orbit/orbit-lab-v12-mobile.png` and `.orbit/github-login-success.png`.
The character remains a visual study: frontal projection does not establish a faithful multi-view reconstruction; profile seams, mechanical density and facial expression quality still need art review. No claim of lip synchronization or finished production-quality character.

## WebMCP: implemented contract versus live integration

`web/src/lib/webmcp.ts` now registers exactly ten v2 tools: capabilities, research protocol, Sanity outline, Sanity entries, shared question, mission summary, research points, saved-source search, saved-source record and consent-gated presentation.
Registration invokes no network, internal provider or voice. Presentation has distinct write consent; revocation and account/workspace changes invalidate in-flight private reads. External report presentation does not start text-to-speech.

**Sanity retrieval is not connected end-to-end.** The two frontend tools request `/api/v1/knowledge/outline` and `/api/v1/knowledge/entries`. The dedicated backend gateway is now implemented and fixture-tested; the endpoint name and organization Context Viewer credential remain unconfigured. The tools return `UNAVAILABLE`, without substituting the project Content Lake corpus. `NOT_CHECKED` in capabilities is not proof of retrieval.
The 9-axis/30-source research protocol is a draft, not a trained model or validated research-quality result. Human approval and external-agent budgets cannot be enforced by this website in a separate agent's conversation.

The human supplied a first external browser-agent summary: it recognized the ten-tool surface, clarification/plan/research/report sequence, shared-workspace consent and agent-owned search. Evidence status: **reported**. No tool trace or actual Sanity entry was supplied, so the summary is not recorded as an observed successful Sanity retrieval.

## Accounts and AI are separate

GitHub login creates an Orbit account; GitHub Pro or Copilot is not required. It does not supply an AI model.
The user's desired research engines remain ChatGPT/Codex and Google/Gemini. Google OAuth is not configured. Codex's current application path still depends on the associated extension/local broker; a complete standalone website transport and Gemini route have not been demonstrated.
No paid API key, subscription replacement or silent model fallback was introduced.

## Next handoff, without asking the human to debug

1. The human accepted the basic character and requested an interactive particle presence. Retain the accepted landing and palette; review the new working surface visually without claiming artistic acceptance from technical tests.
2. Connect the bounded Sanity Context gateway using dedicated organization read credentials and verify one real outline plus one cited entry. Do not reuse a project Editor key or browser-agent credentials as an implicit replacement.
3. Complete and verify the user's Codex/Gemini route with explicit permissions and model availability before offering a complete research test.
4. Build the requested Sphinx/Read the Docs documentation using the same palette. Sphinx is installed, but the documentation site and public hosting are not delivered yet.
5. Only then invite the human to a short, named end-to-end test with clear expected results. The human explicitly prefers to be notified when a function is ready, rather than being asked to diagnose incomplete integration.

Technical references: [PHP cURL configuration](https://www.php.net/manual/en/curl.configuration.php), [curl CA bundle provenance](https://curl.se/docs/caextract.html), [Sanity Context tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools), [Sanity Context security](https://www.sanity.io/docs/ai/sanity-context-security).

## Continuation — continuous scene and movable reading surface

Local work, 27 September 2026, approximately 20:45 America/Toronto. Same branch and baseline HEAD. No deployment, commit, paid call, Knowledge Base rebuild or Education change.

- The existing GLB is unchanged. `packages/synthia-presence/src/particles.ts` samples its transformed geometry deterministically (32,000 points in high quality, 10,000 in low quality). A translucent version of the original mesh preserves facial volume. The particle layer uses the rest surface; it is not a skinned facial/lip animation.
- Orbit can be dragged, rotated, dispersed/reformed and reset. A bounded decorative field reacts to pointer and character motion. Motion reduction, offscreen suspension and disposal remain in the renderer. No model/provider/microphone is owned by that package.
- `web/src/styles/presence-space.css` replaces the separate rectangular working panel with a continuous curved background. `workspace-surface.ts` provides the real draggable reading surface, keyboard positioning, reset and a connector to the selected Orbit point. No data is mutated by these gestures.
- Navigation uses the actual companion/research/library/report views and preserves URLs. On mobile, the reading view has priority; the covered 3D host is hidden to suspend rendering.
- `EvidenceLibrary.astro` shows one public Content Lake reference at a time, with working previous/next controls, provenance and direct original links. It retains all links without JavaScript. The private source list now explicitly reports an empty mission.
- Component-scoped Astro styles had overridden equal-specificity palette rules. The final app-specific selectors fix the green blocks and retain violet/cyan/gold throughout the conversation and voice controls.
- Dragging cannot activate voice, and a background tap is excluded by a geometry hit test. A deliberate character tap, Enter or the explicit voice button retains the voice flow.
- During browser QA, a pre-existing orbital-lab exception was observed when a visibility callback's timestamp exceeded the queued animation frame timestamp. The adapter now preserves a monotonic frame clock; the regression test exercises that exact ordering. Physics assertions remain unchanged.

Validation for this continuation:

| Check | Observed result |
| --- | --- |
| `npm test` | 61 Vitest tests and 5 Node policy tests passed. |
| `npx tsc --noEmit -p web/tsconfig.json` | Passed. |
| `npm run build --workspace @orbit/web` | Eight routes built; existing >500 kB chunk warning remains. |
| `php -c ../../.orbit/php.ini artisan test --compact` | 18 tests, 84 assertions passed. |
| `php -c ../../.orbit/php.ini vendor/bin/pint --dirty --format agent` | Passed; imports normalized in new gateway route/tests. |
| Browser, actual authenticated account | Sources opened from the Orbit node; public pagination changed 01/04 → 02/04 → 01/04; no private mission content fabricated. |
| Pointer and keyboard | Real drag moved Orbit's projected center from 50% to about 60%; microphone remained stopped. Reading surface and curved background both translated -160 px with the handle. ArrowLeft moved the surface -24 px; Home restored it. E dispersed, R reformed/recentered. |
| Responsive and reduced motion | 390 CSS px viewport: no horizontal page overflow; library close returned to central Orbit. With reduced motion emulated, Shift+ArrowRight still moved Orbit without voice. Emulation and viewport override were reset. |

The new Sanity gateway is restricted to the selected Knowledge Base and two read tools. It bounds entry paths, response bytes, timeouts, per-client requests and the hourly upstream count (serialized budget check); it retains citations, refuses redirects and returns no secrets or synthetic fallback. Seven feature tests cover JSON/SSE, scope, caching, foreign origin, malformed paths, missing configuration, failure, oversized output and exhausted budget. These are **fixture tests**, not real Sanity retrieval evidence. Configuration placeholders are in the account service `.env.example`; no credential was copied or created.

The final **5%** is reserved for the human + external browser-agent research/report test, superseding the older PDF/editorial reserve. Latest checked quota during this continuation: 67% used / 33% remaining, shared across the account. No reset or credit purchase used.

Final local visual evidence: `.orbit/orbit-curved-workspace-2026-09-27.png`. The authenticated review tab was left open. Its captured error log was empty. A real background pointer click left voice stopped; no microphone permission was requested during QA. Final Astro build completed at 20:51 local time after the layout and guide changes. The browser extension's floating AI widget can overlap page controls; it was dismissed temporarily during mobile QA, without changing extension permissions.
