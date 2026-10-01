# Audit des alertes Sanity Context — 27 septembre 2026

## Résultat observé

Base : kb5CHIYGXCMJ, Orbit Companion — Sanity & Deep Research.

- Interface : **Pending (0), No pending issues.** Capture : SANITY_PENDING_ZERO.png.
- API : openIssueCount=0, instructionCount=0, isBuilding=false, hasPendingChanges=false.
- Jean-Sébastien confirme ensuite que l’interface est propre.
- Les défauts ciblés ont été relus par le coordinateur et par un second agent en lecture seule.

## Ce qui expliquait les cinq alertes

Le compteur cumulait trois conflits de versions précédentes et deux nouveaux constats. Une construction réussie ne clôture pas systématiquement les diagnostics historiques.

| Signalement | Vérification et traitement |
|---|---|
| Gemini background / zéro stockage | L’ancienne omission a été corrigée dans la source comparative et la synthèse; store=True et incompatibilité avec une exigence stricte de zéro stockage sont explicites. Ancien diagnostic clôturé après relecture. |
| Google 30 jours / OpenAI 30 jours | Produits et catégories distincts; faux conflit réfuté. |
| Captures Firecrawl 24 h / absence de durée dans Sanity | Le silence d’un autre produit ne contredit pas Firecrawl; faux conflit réfuté. |
| OpenAlex >327 millions / >320 millions | L’instantané 327 124 722 satisfait simultanément les deux bornes; faux conflit réfuté. |
| Vertex AI présenté trop largement comme solution ZDR | Défaut réel : ajout d’un extrait primaire Google Cloud, reconstruction et relecture. Developer API et Cloud sont distingués; Google Search Grounding conserve des données dans les deux offres; Web Grounding for Enterprise et les conditions propres aux fonctions sont explicités. |

Un diagnostic ultérieur inversait la relation entre background et store=True. Le texte final ne contenait pas l’affirmation conditionnelle que le vérificateur lui attribuait : diagnostic réfuté après comparaison des deux entrées.

**Les rejets utilisent Dismiss, qui ne répare aucun texte.** Ils clôturent des constats démontrés faux ou devenus obsolètes après correction. Les défauts réels ont été traités dans les sources et les textes générés avant clôture. Les motifs, anciennes versions et preuves restent dans VERIFIED_FINDING_DISPOSITIONS.json et FINAL_FINDING_DISPOSITIONS.json. Aucune instruction permanente n’a été ajoutée dans cette réparation.

## Construction et correction du contenu

1. Le job terminé par 1790535142832 a échoué à arrange : thin_leaves, un nœud restant après trois cycles. Le diagnostic ne nommait pas le nœud.
2. La reprise officielle, sans changement de corpus, a réussi : job terminé par 1790535651881, révision 71925d92-e2d1-4c2f-9c30-03d2e95a4aef. La convergence a pris un cycle. La cause interne n’est pas connue.
3. Le build avec l’extrait primaire Google Cloud a réussi : job terminé par 1790536332576, révision c78eba9e-ada6-4ff4-b6c6-e680d311b356.
4. Une réécriture ciblée a corrigé deux raccourcis de la synthèse de confidentialité : le contexte fourni est conservé avec les requêtes dérivées; Live API n’est plus déclaré exclusif au Developer API. Révision 61fb984c-2775-42a0-8f5e-1ccaf67d1b43, une entrée réécrite.

Le SDK a retourné 20 corps d’entrées, conservés dans VERIFIED_ENTRY_SNAPSHOT.json. Le résumé du build annonce entryCount=30; ces deux compteurs sont conservés tels quels, sans les présenter comme identiques.

Sources de rétention :
- https://ai.google.dev/gemini-api/docs/zdr
- https://ai.google.dev/gemini-api/docs/deep-research
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention
- https://developers.openai.com/api/docs/guides/deep-research

## Conservation du corpus et sens des compteurs

| Mesure | Résultat |
|---|---:|
| Imports affichés dans Sources | 30 |
| Imports de sites web | 25 |
| Documents web extraits | 29 |
| Fiches méthodologiques originales présentes | 50 / 50 |
| Références correctives supplémentaires | 3 |
| Documents extraits au total | 82 |
| Unités internes du dernier build | 97 |
| Unités citées dans ce build | 93 |
| Unités écartées par le build | 4 |

P01.md représente une fiche; orbit-methodology-other-49.zip en représente 49. Ces 50 documents sont des notes originales Orbit reliées à leurs publications, **pas les textes intégraux de 50 publications**. Aucun de leurs identifiants n’a disparu. L’empreinte du ZIP correspond au manifeste original : 39827d303209870d390f0eda8e541547329561e2091ee1814d18c0f742a5b4f9.

Les corrections ont remplacé uniquement deux références dérivées après sauvegarde et vérification du remplacement. Les sources d’origine ont été conservées.

## Limites de validation

Zéro Pending décrit le compteur des alertes présentées dans l’interface. L’API garde aussi 28 diagnostics historiques de type gap que l’interface ne comptabilise pas. Le dernier build signale 101 noms couverts sur 112; onze formes nominales ne sont pas reconnues explicitement. La lecture ciblée les retrouve au niveau des concepts, alias ou citations; cela ne démontre pas encore la réussite d’une recherche par chaque nom exact. Ces diagnostics ne sont ni effacés ni assimilés à onze concepts nécessairement absents.

Les contrôles exécutés portent sur les API officielles jobs.get, entries.list/get/rebuild, sources.list/content, issues.list/dismiss, instructions.list; la conservation des identifiants; le SHA-256 du ZIP; les corps et citations; et la lecture de l’interface Chrome. **Aucun test de comportement d’Orbit ou benchmark d’agent n’a été lancé**, conformément à la demande de reporter ces essais.

## Périmètre et suite

Dépôt : Orbit / DEV-Sanity, branche master, HEAD 3c6806b9cb77b81b5bea2e3debb7146f5ee0b821. Modifications locales limitées aux documents de recherche et reçus; travaux préexistants conservés. Aucun commit, push ou changement de code applicatif.

État validé conservé. Le prochain chantier demandé reste l’interface du compagnon; les essais d’utilisation de la base auront lieu ultérieurement. Aucune reconstruction supplémentaire n’est programmée.
