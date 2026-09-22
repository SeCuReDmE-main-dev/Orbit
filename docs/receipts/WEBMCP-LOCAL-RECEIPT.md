# WebMCP local receipt — 2026-09-21

Surface: local Astro preview at `http://127.0.0.1:4321/`  
Client: compatible Codex in-app browser  
Scope: local read-only validation; not a remote deployment and not the unpacked Chrome side panel

## Discovery

The client discovered all five registered tools:

1. `orbit_get_mission_summary`
2. `orbit_list_research_points`
3. `orbit_search_sources`
4. `orbit_read_source_record`
5. `orbit_get_physics_snapshot`

Every tool exposed a strict object schema with `additionalProperties: false`, `readOnlyHint: true` and `consequentialHint: false`. Source-returning tools also carry `untrustedContentHint: true`.

## Invocation

`orbit_get_physics_snapshot {}` returned:

```json
{"model":"fixed-step-angular-visual","newtonianGravity":false,"remoteCalls":0,"scientificQualification":false,"state":"READY"}
```

`orbit_list_research_points {"offset":0,"limit":10}` returned a bounded empty page with `state: NOT_IMPLEMENTED`, preserving an honest boundary while persistence is incomplete.

The first invocation exposed a client/spec compatibility issue: the client omitted the callback options object containing `AbortSignal`. The implementation now accepts an omitted options object while continuing to honor a supplied signal. The corrected invocation succeeded.

## Limits

- This proves page registration, client discovery and invocation on localhost.
- It does not prove discovery from the built Chrome side-panel extension.
- Mission summary needs a running broker and stored mission.
- Research-point and source backends remain incomplete; they return explicit `NOT_IMPLEMENTED` states.
