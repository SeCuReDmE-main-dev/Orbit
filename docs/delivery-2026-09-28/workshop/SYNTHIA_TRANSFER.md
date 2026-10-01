# Conservation du travail précédent

L’atelier de recherche remplace la vue principale d’Orbit. Le landing et ses assets conservent leur identité.

Une sauvegarde vérifiée a précédé les modifications : `.orbit/backups/research-workshop-20260928T173606Z/`, contenant `source.zip` et son manifeste de 420 fichiers. Les secrets et données runtime ignorés n’appartiennent pas à cette archive source. Aucun reset, stash, commit ou déplacement de branche n’a été effectué.

Les ensembles suivants restent présents pour un transfert ultérieur vers Synthia :

| Ensemble | Chemins conservés | État |
| --- | --- | --- |
| Moteur de personnage | `packages/synthia-presence`, assets de présence | Conservé, pas utilisé par l’atelier |
| Voix et compagnon | `web/src/lib/companion-*`, composants associés | Conservé |
| Ancienne coque et comptes | `web/src/lib/app-shell.ts`, `private-workspace.ts`, `services/account-api` | Conservé ; la passerelle Sanity reste utilisée |
| Laboratoire et scènes de revue | `OrbitLab`, `orbital-lab`, routes de présence | Conservés, secondaires |
| Extension | paquet MV3 et ancienne route `/panel/` | Conservés ; l’extension propre n’est pas requise par l’atelier |
| Ancienne page principale | copie exacte dans la sauvegarde source | Restaurable |

Il s’agit d’un inventaire de conservation, pas d’une intégration déjà réalisée dans Synthia. Aucun dépôt Education ou Synthia n’a été modifié. Aucun issue distant n’a été créé : son dépôt et sa destination devront être vérifiés avant publication. La préparation NASA demeure indépendante.
