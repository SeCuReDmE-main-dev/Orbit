# Frozen publication inputs

`formation-delivery-status-before-final-document.md` preserves the exact LF bytes of the delivery-status document read before the final documentary export. Its SHA-256 is `4252565d5c929ce4a1cf18aedb81a6c6fed27e374b775ad0ff1ec6e7ccd56eb6`.

Its original location is `docs/receipts/FORMATION_DELIVERY_STATUS.md`. Relative links inside the immutable snapshot retain that original base; they were not rewritten to its archive location. The source map records both locations.

The current delivery-status document identifies the final reviewed PDF and DOCX. Separating the snapshot avoids a circular identity in which a document input would itself declare the digest of the PDF produced from that input. The snapshot is historical input evidence, not a new or current execution result.
