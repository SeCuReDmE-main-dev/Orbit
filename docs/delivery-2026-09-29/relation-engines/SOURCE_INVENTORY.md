# Orbit Studio — inventaire des corpus et des sources

Date de mesure : 2026-09-29  
Projet / dataset : `pzscx4w8 / production`  
Branche / HEAD : `master / 3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`

## Frontières de l'inventaire

Le Content Lake et la Knowledge Base Context sont deux inventaires distincts :

- le **Content Lake** contient les documents structurés édités par Orbit Studio;
- la **Knowledge Base** lit ses propres sources et produit des entrées citées servies par Context MCP.

Les nombres ne doivent donc pas être additionnés ni utilisés comme preuve qu'une source du Content Lake est déjà indexée dans la Knowledge Base.

## État observé avant l'ajout des corpus

Le dataset contenait 26 documents :

| Type | Nombre |
|---|---:|
| `source` | 4 |
| `claim` | 4 |
| `concept` | 4 |
| `lesson` | 1 |
| documents système / autres | 13 |

Les quatre sources historiques avaient une URL et au moins une référence entrante. Elles ont été conservées. Aucun document existant n'a été supprimé ou remplacé.

## Mutation bornée appliquée

Le script `tools/seed_orbit_relation_corpora.mjs` utilise uniquement `createIfNotExists`. La mutation observée a créé 15 documents sans écraser les documents existants :

- 4 corpus logiques;
- 5 sources primaires;
- 5 affirmations contrôlées;
- 1 règle de relation candidate, laissée avec `approvedByHuman: false`.

Reçu : `.orbit/sanity/relation-corpora-receipt.json`  
Transaction : `1CKw9KNSHICrKlEvXqXCu5`  
Empreinte du lot : `ac4e8c46443398d657851c609f0ce5bf78a572882901a0d70d4be73eb87600aa`

## État actuel du Content Lake

La requête GROQ exécutée après la mutation retourne 41 documents :

| Type | Nombre |
|---|---:|
| `researchCorpus` | 4 |
| `source` | 9 |
| `claim` | 9 |
| `relationRule` | 1 |
| `concept` | 4 |
| `lesson` | 1 |
| documents système / autres | 13 |

Les neuf sources ont neuf URL distinctes. Aucune URL vide n'a été trouvée. Quatre sources historiques n'ont pas encore de champ `excerpt`; elles ne sont toutefois pas vides : elles possèdent un titre, une URL et des références entrantes. Elles restent conservées jusqu'à une revue de leur rôle.

| Corpus | État | Sources admises | Justification |
|---|---|---:|---|
| Références nettes | prêt | 1 | Référence Sanity Context MCP avec portée explicite. |
| Contradictions directes | incomplet | 0 | Aucune paire de même portée n'a été inventée pour remplir le corpus. |
| Ambiguïtés de portée | prêt | 2 | Les conditions `background=true` et `store=false` portent sur des modes distincts qu'il faut comparer explicitement. |
| Évolution | prêt | 2 | Le paquet `@sanity/context@1.0.0` est comparé à l'évolution documentée vers Context 2.0. |

Sources ajoutées :

1. Sanity Context MCP reference — <https://www.sanity.io/docs/ai/sanity-context-mcp>
2. Gemini Deep Research agent — limitations — <https://ai.google.dev/gemini-api/docs/deep-research>
3. Zero data retention in the Gemini Developer API — <https://ai.google.dev/gemini-api/docs/zdr>
4. `@sanity/context` 1.0.0 package documentation — <https://unpkg.com/@sanity/context@1.0.0/README.md>
5. Context 2.0 changelog — <https://www.sanity.io/docs/changelog/context-pkg-Mi4wLjA>

## État observé de la Knowledge Base

La page Sanity Context ouverte pour `kb5CHIYGXCMJ` indiquait :

- **30 sources**;
- **20 entries ready**;
- **Entries up to date**;
- plusieurs sources Web marquées `partial — Crawl page limit reached`, ce qui est un état d'ingestion à conserver dans l'audit et non une preuve que leur contenu complet a été lu.

Le registre `Issues` existe dans l'interface, mais son nombre d'éléments n'a pas été exposé sur la vue Sources consultée. Cet inventaire ne déclare donc pas un nombre d'issues non vérifié.

## Vérification Context MCP

L'endpoint existant `orbit-research` a répondu avec succès aux deux lectures serveur nécessaires :

- `initial_context` : HTTP 200, Knowledge Base `kb5CHIYGXCMJ` présente;
- `knowledge_base_read` sur `sanity/knowledge_bases` : HTTP 200, références et sources présentes.

Le jeton Context Viewer reste côté serveur. Aucun secret n'est intégré au paquet statique.

## Décisions de conservation

- Aucune source citée n'a été supprimée.
- Aucun ancien lien n'a été réécrit silencieusement.
- La règle de relation fournie demeure une proposition jusqu'à approbation humaine.
- Le corpus « Contradictions directes » reste incomplet tant qu'une incompatibilité de même sujet, propriété et portée n'est pas contrôlée passage par passage.
- Les sources partielles de la Knowledge Base doivent être signalées lors d'une conclusion qui dépend d'une portion non lue.

## État du déploiement public

Le paquet Web public contient le landing, l'application et le Studio. La passerelle Laravel reste physiquement séparée du document root et son jeton Context reste dans son environnement privé, mais son contrôleur frontal est maintenant livré sous `/api/`.

Le 29 septembre 2026, les contrôles publics ont confirmé :

- `/`, `/app/`, `/guide/` et `/studio/` répondent en HTTP 200;
- les six routes directes du Studio répondent en HTTP 200;
- `/api/v1/knowledge/outline` répond `READY` depuis `sanity-context-mcp` pour `kb5CHIYGXCMJ`;
- une origine étrangère reçoit HTTP 403;
- le paquet public ne contient aucune valeur de secret configurée contrôlée.

Le sélecteur PHP 8.4 du domaine est inclus dans le `.htaccess` livré, car le déploiement atomique remplace le document root et ne doit pas dépendre d'une directive laissée seulement dans la version précédente.
