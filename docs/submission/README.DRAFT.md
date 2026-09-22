# Orbit Companion

Status: local prototype. External Sanity, provider, Exa and WebMCP integrations require their explicit validation receipts.

Orbit Companion is a Chrome side-panel research and learning companion. It turns a NASA page and a question into a bounded, cited mission, then connects the evidence to a small orbital-physics exercise.

## Architecture

- Astro and TypeScript for the side-panel interface
- Three.js for an optional local 3D view
- Local Node broker and SQLite for private continuity
- Standalone Sanity Studio for structured public content
- Provider adapters that fail closed until authenticated
- Context Continuity Protocol for handoffs
- WebMCP only where browser support is observed

## Scientific boundary

The laboratory uses a fixed spherical Earth and a point satellite. It is educational software, not flight software or a scientific validation result.

## Privacy

Mission history stays local by default. Credentials remain in provider-managed authentication. Public Sanity content is selected explicitly.

## Sources

See docs/research/primary-sources.md and docs/research/attribution-and-licenses.md.

Publication and challenge submission require Jean-Sébastien’s explicit approval.
