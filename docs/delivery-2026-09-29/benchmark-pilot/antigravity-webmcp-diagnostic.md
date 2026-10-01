# Antigravity → native Orbit WebMCP: unresolved integration diagnostic

Observed 29 September 2026, Toronto. Official CLI 1.2.13; Chrome 154; native WebMCP testing API. Public origin: `https://orbit.securedme.ca`. No paid API key or persistent tool-approval change.

## Verified boundary

`python tools/test_webmcp_transport.py` launches an isolated public Orbit page and exercises the same stdio adapter used for the agent. It observes fifteen real tools, `READY` capabilities and `CONSENT_REQUIRED` for an unshared question. This is a scripted transport test, not an autonomous mission.

`tools/webmcp-stdio.ts` is a bounded JSON-RPC adapter. It executes the native tools in the page rather than imitating their callbacks. Its connection has an eight-minute lifetime and a twenty-call maximum. Idle setup and operator interaction consume that lifetime; a future fix must preserve explicit bounds while making the actual mission timing inspectable.

## Observed agent attempts

- Headless Flash attempts 1 and 2: no successful native tool call. An empty final response is not scored as success.
- First interactive attempt: the model uses unrelated web-search tools despite the mission restriction; the URL fetch is denied once and the session is stopped. This is a mission failure.
- Reloaded interactive Flash: the manager lists Orbit tools; the model calls capabilities after more than seven minutes of connection age. The adapter records `BROWSER_CALL_TIMEOUT`. The session exceeds its configured lifetime and the following request fails to load the server (`exit status 13`). The timeout's precise cause remains unresolved.
- Fresh Flash session: the model still lacks the Orbit definitions, then reports a provider filter block. No Orbit execution is observed.
- Pro with `--new-project`: the model reports Orbit unavailable and stops with unknown permissions. The native trace contains a session/discovery record only, with no agent call. Requested project creation is not proof of isolated effective context.

The CLI's `/mcp` reload also reports failures stopping existing instances. The global CLI `mcp list`, the interactive manager and the tools actually exposed to the model are separate observations. Workspace `.agents/mcp_config.json` was not reliably sufficient in this environment. The temporary global `orbit_benchmark` connection was removed after testing; Tiger and the existing memory plugins were preserved.

## Next repair, with a bounded acceptance test

### Later observation: external JSON planner, separate from native CLI MCP

An external, bounded JSON tool planner now uses the official Antigravity account and executes the model's choices through the real page adapter. Flash selects capabilities and private-question reads; both execute, and the owner-page refusal is preserved. Its final answer overgeneralizes that refusal to public Context access, so passing core fields is not a complete interpretation pass. Pro executes capabilities, then the page-generation guard refuses the private-question request after navigation. The exact navigation cause is unresolved. A fresh scripted lifecycle check stays stable and passes; that does not erase the agent failure.

The prototype's model-effort mismatch and single-object parser failures remain saved. Protocol v2 accepts a bounded batch of tool requests and refuses a final answer bundled with unexecuted requests. These runs are not pooled as identical repetitions. Temporary planner definitions allow no configured built-in tools and are removed after the run; no persistent approval policy is changed. The native Antigravity MCP injection issue described above remains unresolved.

The product capabilities and guide now distinguish public corpus reads from private dossier consent. This is a description of the existing boundary, not a permission expansion. The original model outputs remain intact in `.orbit/benchmark-results/w01-json-loop-*/result.json` and the public interpretation audit is `web/public/benchmark/agent-mission-observations.json`.

1. Establish how CLI 1.2.13 injects newly registered MCP tools into a fresh model context, using official CLI documentation and an isolated test directory.
2. Respond to MCP initialization promptly; independently measure page startup, discovery, first call and connection expiry. Do not replace unknown transport extensions with guessed response schemas.
3. Keep the owner-page consent checks and default single-call approval. Do not use `--dangerously-skip-permissions`, a global allow rule, unrelated connectors or paid API keys as workarounds.
4. Run W01 with the same prompt in Flash and Pro after tool exposure is verified. The agent chooses minimal calls. Record the final output, actual page calls and durations; exclude internal model reasoning.
5. Accept W01 only when actual capabilities are returned, the private question is denied by Orbit, and the model correctly preserves that refusal. Success in a script alone does not satisfy this gate.

## Safe artifacts

The canonical `.benchmark/last-task.json` points to the report, raw safe outputs and immutable history. Native traces live under `.orbit/antigravity-missions/`. The new-project Pro final observation is `w01-fresh-session/pro-new-project-result.json`. No credential value, private conversation or internal model reasoning is included in this diagnostic.

References: [official Antigravity MCP configuration](https://antigravity.google/docs/mcp?tab=cli), [Chrome native WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).
