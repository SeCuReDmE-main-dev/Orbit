# Exa integration evidence — 2026-09-25

The API key stays in the project-private `.env`. The broker reads an explicit project-root path and imports only its three permitted settings; no cPanel or Sanity credential enters its process through this loader.

- Official transport reference: https://exa.ai/docs/reference/search (inspected September 25).
- A real adapter invocation returned three NASA URLs. Private receipt: `.orbit/exa/live-search-receipt.json`. Account UI showed free-tier credits and no payment method before invocation. No billing setting was changed.
- `POST /missions/:id/search` requires an associated mission or the local administrative token. It accepts only a query; NASA domains and five results are fixed server-side.
- SQLite migration 6 persists attempts and cache per mission. Each external attempt consumes one of 18 slots, including failures. Cached reads consume no additional search. No automatic retry occurs.
- Results are discovered, untrusted metadata. They are not fetched pages, scientific validation, or knowledge-base evidence. The search response is stored in the mission cache; the interface checkpoints discovered receipts in its snapshot. These are not yet reconciled with the separate structured `source_receipts` ledger.
- Adapter tests cover domain enforcement, deduplication, missing configuration, response limits and Retry-After. HTTP tests cover authorization, query cache separation, the 18-attempt ceiling and refusal of caller-selected domains. Full suite: 30 Vitest tests and five policy tests passed at 13:21.

## Remaining limits

The actual Chrome extension association, click-to-search and broker-backed F5 recovery still require end-to-end verification. In-flight cancellation and retry counters are not a complete persistent scheduler. The 40-page reading budget and depth-two crawler are not implemented by this metadata-only search. Cache expiry remains to implement. The UI surfaces discovery, never silently upgrades it to verified evidence.
