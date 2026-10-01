# Provider-specific research storage: Gemini Developer API, Vertex AI and OpenAI

Document status: Orbit's dated comparison of official sources, verified 2026-09-27. This derivative reference is evidence synthesis, not a provider policy or an agent instruction. Product, API feature and retention category identify the scope of each fact below.

## Gemini Developer API

Primary source: https://ai.google.dev/gemini-api/docs/zdr

The Gemini Developer API distinguishes training restrictions from retention. For Paid Services, the no-training commitment does not remove every storage mechanism. The Interactions API requires `store=false` to avoid its default conversation-state retention. Grounding with Google Search retains prompts, context and generated output for 30 days, with no switch to disable that storage. File API uploads remain stored until deletion or expiry. Live API session resumption may retain state for up to 24 hours. Explicit context caches have their own expiry; the page distinguishes in-memory caching from storage at rest.

The page's recommendation to consider Vertex AI concerns enterprise requirements and abuse-monitoring arrangements. It is not a guarantee that every Vertex AI feature has zero retention.

## Gemini Developer API Deep Research agent

Primary source: https://ai.google.dev/gemini-api/docs/deep-research

The documented Deep Research agent uses background interactions; background execution requires `store=True`. Combined with the preceding Interactions API condition, this agent path does not meet a strict zero-data-footprint requirement. This conclusion concerns the documented agent and storage route, not every Gemini invocation or the whole Google platform.

## Vertex AI / Gemini Enterprise Agent Platform

Primary source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention

The former Vertex AI zero-retention URL redirects to this page. Zero retention remains conditional on the feature and configuration. Google Search Grounding on this platform may retain derived queries and supplied context for up to three days; that storage cannot be disabled. The page recommends the separately named Web Grounding for Enterprise when zero retention is required. It also distinguishes abuse-monitoring exceptions, optional request-response logging, and Interactions API storage (`store=false` needed).

Thus switching platforms alone does not guarantee ZDR, and the enterprise alternative does not remove the Gemini Developer API Deep Research agent's documented `store=True` requirement. The 30-day Developer API grounding period and the up-to-three-day enterprise-platform grounding period refer to different product scopes.

## OpenAI Responses API Deep Research

Primary source: https://developers.openai.com/api/docs/guides/deep-research

OpenAI's guide describes temporary background polling storage of roughly ten minutes and incompatibility with strict ZDR. Its security discussion separately describes request/MCP logging under `store=true` and a 30-day period unless ZDR applies. These are OpenAI API statements, not policies for Google Search Grounding. Similar durations across providers do not make the data categories or controls equivalent.
