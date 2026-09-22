# ActionCard ledger policy

The operational ledger is append-only and uses `ActionCardLedgerEntry` from `@orbit/contracts`. No operational mission was executed in this architecture milestone, so no fabricated ledger entries or hashes are stored here.

For each entry, the runtime must:

1. allocate a strictly increasing sequence within a mission;
2. validate the state transition with `canTransition`;
3. record actor, reason, timestamp and evidence references;
4. set `previousHash` to the preceding canonical entry digest or `null` for sequence 1;
5. compute `hash` from canonical JSON using SHA-256;
6. append durably before exposing the new state;
7. include a bounded ledger tail in each CCPPackage.

Corrections append a new transition or superseding ActionCard. Deletion, reordering and in-place edits are contract violations. A runtime that cannot verify the chain must fail G6.
