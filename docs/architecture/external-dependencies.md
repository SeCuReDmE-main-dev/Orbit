# External dependency register

All entries are `BLOCKED_EXTERNAL` as of 2026-09-21. This is deliberate evidence, not an implementation failure.

| ID | Dependency | Owner | Evidence required to unblock |
|---|---|---|---|
| EXT-001 | Model/provider selection and supported capability list | human | Named provider, current primary documentation, approved data classes and verified account access |
| EXT-002 | Provider credentials | human | Secret-store reference and successful least-privilege connectivity check; never the secret value |
| EXT-003 | Knowledge sources | human | Approved source registry, access scope, provenance and retention classification |
| EXT-004 | Hosting and deployment target | human | Named environment, owner, cost ceiling and explicit deployment authorization |
| EXT-005 | Observability sink | human | Approved data fields, endpoint, retention and access controls |
| EXT-006 | External write action | human | Approval receipt bound to the exact ActionCard and target |
| EXT-007 | Publication or challenge submission | human | Final artifact review and action-time submission authorization |
| EXT-008 | Paid API or purchase | human | Exact amount, account, purpose and action-time spending authorization |

Implementations must expose these states to the user. They must not fabricate provider outputs, placeholder receipts or successful readback evidence.
