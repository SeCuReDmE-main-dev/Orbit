# Context Continuity Protocol and CCPPackage versioning

## Naming

- Mechanism: **Context Continuity Protocol**.
- Artifact: **CCPPackage**.
- Current schema: `1.0.0`.
- Media type reserved for a future transport binding: `application/vnd.orbit.ccp+json;version=1`.

## Compatibility rules

The schema follows semantic versioning. A patch adds clarifications without changing valid data. A minor version may add optional fields. A major version may change meaning or required fields and must never be accepted without a named migration.

Readers must reject an unknown major version, unknown package kind, invalid integrity digest, future timestamp outside configured clock skew, or package whose mission identifier differs from the active mission. Readers may preserve unknown optional fields during a same-major round trip but cannot interpret them as authority.

## Checkpoint rules

A package is emitted after mission creation, an authority decision, any terminal or `BLOCKED_EXTERNAL` transition, and before an authorized handoff. `previousPackageDigest` forms a chain. The package holds the bounded ledger tail plus evidence references. Long-lived evidence remains in the evidence store and is addressed by digest.

## Migration protocol

1. Validate the source package against its original schema.
2. Select an explicit `CCPMigration<From, To>` by exact source and target version.
3. Migrate without adding authority, approvals or evidence.
4. Recompute the digest and retain the old digest as provenance.
5. Record a ledger entry naming migration code version and test evidence.
6. Run G2 and G6 before using the migrated package.

There is no best-effort migration. Failure preserves the source package and produces `BLOCKED_EXTERNAL` when a compatible implementation is unavailable.
