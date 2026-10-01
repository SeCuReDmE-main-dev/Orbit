# Orbit / Synthia implementation — 27 September 2026

Status: in progress. This is the accepted redesign, not a release receipt.

Current continuation: [visual/account/WebMCP checkpoint](ORBIT_VISUAL_AND_AUTH_CHECKPOINT.md). It supersedes the historical ownership and availability observations below without removing their provenance.

Baseline: master, HEAD 3c6806b9cb77b81b5bea2e3debb7146f5ee0b821. Existing dirty files preserved. Verified source backup: sibling `orbit-private-backups/synthia-redesign-20260927-165507` (270 files, zip and individual SHA-256 verified). Private environment and runtime data remain untouched in place.

## Boundaries and ownership

- Orbit only. Education/Synthia assets are read-only references; no NASA or Sanity corpus mutations.
- No commits, pushes, spending or public release of an unvalidated login.
- Coordinator: contracts, dependencies/lockfiles, backend, data integration, verification and delivery records.
- Frontend agent: Astro pages/layouts/styles and new landing/app-shell modules. Excludes HologramCompanion.astro, hologram-companion.ts, presence-lab.astro and existing data/voice/WebMCP controllers.
- Presence agent: packages/synthia-presence, avatar creation tools, copied/derived avatar assets, HologramCompanion.astro, hologram-companion.ts, presence-lab.astro. No shared manifest edits.
- Maximum two concurrent writers. Shared manifests and migrations edited in series. Agents report tests and limitations separately.

## Fixed integration contract

Public `/` has interactive scene + auth dialog; protected `/app/` uses views via `?view=companion|research|library|report|settings|lab`. Dedicated `/panel/` for MV3. Tutorial is optional and replayable.

Same-origin backend:
- GET /api/v1/session -> {user: null | {id,name,email}, csrfToken, storageConsent:{local:boolean}, capabilities:{google:boolean,github:boolean,email:boolean}}. Failure is unavailable, never authenticated.
- POST /api/v1/auth/email/request {email}; POST /api/v1/auth/email/verify {email,code}.
- GET /auth/google/redirect and /auth/github/redirect; callback handled server-side.
- POST /api/v1/logout. Mutations send X-CSRF-TOKEN from session and same-origin credentials.
- PUT /api/v1/storage-consent {local:boolean}.
- GET /api/v1/workspaces -> {items: WorkspaceDocument[]}; PUT /api/v1/workspaces/{id} {operationId,baseRevision,document}; 409 conflict preserves both versions, retries idempotent.

WorkspaceDocument: {id,revision,title,question,context,requestId,axes,sources,report,checkpoints,updatedAt}. Owner is derived from server session, never trusted from the document. Bounds/validation required. Private research never enters Sanity. Provider credentials never enter workspace documents.

Local database is opt-in IndexedDB per account. Login alone may create an essential session cookie, not a persistent research database. Declining local storage leaves cloud usable. Existing anonymous drafts are imported only after explicit consent and are not removed before verified import. Broker SQLite remains loopback execution storage.

## Acceptance gates

1. Preserve existing work and update architecture requirements for public identity, private sync and reusable avatar.
2. Review real landing/app and real 3D asset visually; no image mockup represented as working application or finished 3D.
3. Verify login/expiry/logout/CSRF/ownership, consent, restore and conflicts before public release.
4. Preserve consent-gated voice/WebMCP/research and offer visible unavailable states for external dependencies.
5. Verify responsive/keyboard/reduced-motion/WebGL fallback, build and relevant regressions. Preserve public rollback.

Known external dependencies: cPanel access last returned URLError; PHP8.3+/MySQL/SMTP and OAuth app configuration need actual verification. Blender absent at inventory; obtain official free portable tooling for asset production. No paid fallback.
