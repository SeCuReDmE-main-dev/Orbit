# Human continuation guide

## Commencer ici — observatoire public du 29 septembre

Ouvrez [Orbit](https://orbit.securedme.ca/), puis choisissez **INTERFACE ORBIT**. L’animation atomique est une porte d’entrée manipulable ; elle ne lance ni recherche, ni microphone, ni connexion.

1. Dans **Question**, formulez la question, le résultat attendu et les contraintes. Le dossier vit en mémoire jusqu’à une sauvegarde locale volontaire.
2. Dans **Plan**, examinez les axes proposés et approuvez ou corrigez le plan. Une proposition d’agent n’est jamais une décision humaine.
3. Dans **Preuves**, ouvrez les sources, les extraits et leur provenance. Une URL enregistrée ne vaut pas preuve de lecture.
4. Dans **Vérification**, comparez une affirmation à ses passages, à ses conditions et à sa date ou version. Distinguez *soutenue*, *contestée* et *indéterminée*.
5. Dans **Rapport**, relisez la réponse et exportez le dossier d’audit. Une bonne présentation ne remplace pas la vérification des preuves.

Les outils WebMCP publics sont enregistrés sur le landing et l’atelier. Ils donnent à un agent navigateur ses propres points d’accès à Orbit, sans démarrer un fournisseur IA ni une recherche externe. **État actuel :** les dix outils sont visibles; le module `orbit_sanity_initial_context` répond encore que la passerelle serveur Context n’est pas disponible. Le token d’organisation Sanity reste donc hors du bundle public jusqu’au déploiement privé de cette passerelle.

Le Studio de l’équipe est disponible à [orbit.securedme.ca/studio/](https://orbit.securedme.ca/studio/). Il utilise la session Sanity et les droits accordés pour le projet Orbit `pzscx4w8`; il ne crée pas automatiquement un Studio personnel pour chaque visiteur.

Le reçu de livraison actuel est [LIVE_DEPLOYMENT_STATUS.md](docs/delivery-2026-09-29/observatory/LIVE_DEPLOYMENT_STATUS.md). Il sépare le site public vérifié de la passerelle Context encore à installer.

## Guides antérieurs — contexte historique

The verified local slice is safe to inspect without signing in to a provider.

For a future code change, fill in the [bounded task brief](docs/learning/codex-task-scope.md) so the goal, context, constraints and observable completion check stay visible during the work.
After a change, use the [validation and handoff worksheet](docs/learning/codex-validation-handoff.md) to separate executed checks from still-unverified integrations.

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

## Validated status — 25 September 2026

Read [the bounded validated status](docs/delivery-2026-09-25/VALIDATED_STATUS.md) before continuing. It records the fresh local evidence: 118-file backup, isolated operators, 13 public Sanity documents with four GROQ claims, three real Exa NASA results, the gpt-5.6-luna Codex receipt, broker/UI wiring with persistent attempts and cache, and the 30 Vitest plus 5 policy checks reported by the coordinator. The final test rerun remains pending.

Today’s human path is deliberately short: open `docs/learning/codex-validation-handoff.md`; run `npm test` and `npm run build --workspace @orbit/web`; load `web/dist` as an unpacked Chrome extension and give the coordinator the assigned 32-character extension ID. cPanel UAPI HTTP 403 still blocks deployment. Context MCP/Knowledge Base, `agy`, Copilot and six provider handoffs remain unverified; the plan is partial and must not be described as complete.


## Point de reprise visuel — 25 septembre, après finition locale

Commencer par [START_HERE_TODAY](docs/delivery-2026-09-25/START_HERE_TODAY.md). Ce guide distingue aperçu local, vraie extension et site public; il indique trois actions visibles et les blocages restants. Le [statut vérifié](docs/delivery-2026-09-25/VALIDATED_STATUS.md) fait autorité sur les anciens reçus.
