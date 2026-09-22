# Human continuation guide

The verified local slice is safe to inspect without signing in to a provider.

1. Run `npm test` from the repository root.
2. Run `npm run build --workspace @orbit/web`.
3. Load `web/dist` as an unpacked Chrome extension, then copy the 32-character extension ID assigned by Chrome.
4. In the same PowerShell session that will run the broker, allowlist that exact origin and start the broker:

   ```powershell
   $env:ORBIT_ALLOWED_EXTENSION_ORIGINS = 'chrome-extension://<32-character-extension-id>'
   npm run broker
   ```

5. Verify `http://127.0.0.1:47831/health` returns `status: ok`, then inspect the side panel. The broker accepts browser reads only from the exact allowlisted extension origin; mutation routes additionally require the process-scoped bearer token printed when the broker starts.
6. Treat the displayed provider states as truthful: they stay `BLOCKED_EXTERNAL` until a live integration is tested.

Interactive actions that remain yours:

- Sanity, Exa, Codex or Antigravity sign-in and MFA;
- permission changes or paid-plan activation;
- dataset publication or deployment;
- DEV publication and challenge submission.

Before any live provider work, read `docs/architecture/authority-retention.md`, `docs/architecture/threat-model.md` and `.architecte-zero/bake-in-review.md`. Record commands and results in `docs/receipts/` and update the action status without turning a simulation into integration evidence.

The separate sibling folder `satellite-learning` is an educational source. Do not move it into this app or modify it as part of Orbit Companion.
