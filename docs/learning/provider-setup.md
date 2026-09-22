# Provider setup without secrets

Credentials remain in provider-managed browser flows or the OS keyring. The extension receives only normalized states such as signed_out, ready, limited or error.

## Codex

1. Inspect the installed Codex and app-server versions.
2. Start app-server locally.
3. Use its account and login protocol.
4. Wait for the documented completion event.
5. Confirm the exact model slug gpt-5.6-luna.
6. Never copy OAuth tokens, cookies or account email into the project.

Source: https://developers.openai.com/codex/app-server/

## Antigravity

1. Verify agy version and sign in through an interactive provider flow.
2. Query the model inventory and require gemini-3.7-flash-high.
3. Use JSON or stream-json for programmatic work.
4. Parse terminal status, stderr and tool events; exit code alone is insufficient.
5. Keep review enabled and use narrow allow rules.
6. Never use dangerously-skip-permissions.

Source: https://antigravity.google/docs/cli/headless/

## Receipt

The receipt records provider, CLI version, requested model, observed model, whether authentication is ready, and confirms that credentials were not captured.
