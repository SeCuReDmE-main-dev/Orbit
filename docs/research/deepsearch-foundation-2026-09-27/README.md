# Orbit — 25 sources pour la recherche approfondie

Date : 2026-09-27. Périmètre : Orbit / DEV-Sanity. Recherche NASA séparée.

## Résultat et statut

25 URL uniques de documentation officielle ou de travaux originaux ont été consultées via Exa et, lorsque nécessaire, le navigateur ou les outils web. La consultation est bornée : elle ne constitue pas une lecture exhaustive de chaque documentation ou article. Ce dossier ne prouve ni leur ingestion dans Sanity ni une intégration logicielle. Ajouter des documents apporte un contexte documentaire; cela n’entraîne pas automatiquement un modèle et ne valide pas les compétences du compagnon.

## Lire et utiliser ce dossier

- URLS.txt : 25 liens, un par ligne, pour préparer l’import.
- SOURCES.json : usage, limite, catégorie, priorité et statut de chaque source.
- Ce rapport : choix et parcours recommandé.
- VALIDATION.json : contrôle structurel local, sans prétendre tester les API.

## Sélection

### DS01 — OpenAI — Deep research

Source : https://developers.openai.com/api/docs/guides/deep-research

Catégorie : Planification. Usage Orbit : Clarification, recherche longue, outils et budgets.

Limite : API distincte de l’abonnement Codex; compatibilité MCP à vérifier.

### DS02 — Anthropic — Multi-agent research system

Source : https://www.anthropic.com/engineering/multi-agent-research-system

Catégorie : Planification. Usage Orbit : Délégations bornées, coordination et reprise.

Limite : Plus d’agents ne garantit ni meilleure qualité ni moindre coût.

### DS03 — ReAct — article original

Source : https://arxiv.org/abs/2210.03629

Catégorie : Planification. Usage Orbit : Boucle action, observation et révision du plan.

Limite : Les résultats du papier ne sont pas des résultats Orbit.

### DS04 — STORM — article original

Source : https://arxiv.org/abs/2402.14207

Catégorie : Planification. Usage Orbit : Explorer plusieurs perspectives avant de construire le plan.

Limite : Les neuf axes doivent être distincts et pertinents, pas un remplissage.

### DS05 — Google — Deep Research agent

Source : https://ai.google.dev/gemini-api/docs/deep-research

Catégorie : Planification. Usage Orbit : Plan de recherche, exécution longue et rapport sourcé.

Limite : API et disponibilité distinctes d’Antigravity.

### DS06 — Exa — Search

Source : https://exa.ai/docs/reference/search

Catégorie : Découverte. Usage Orbit : Requêtes, filtres, dates et domaines.

Limite : Une URL trouvée n’est pas une page lue.

### DS07 — Exa — Contents

Source : https://exa.ai/docs/reference/contents

Catégorie : Découverte. Usage Orbit : Récupérer texte, extraits et statut par URL.

Limite : Distinguer texte intégral, résumé et extrait.

### DS08 — Exa — Search API guide for coding agents

Source : https://exa.ai/docs/reference/search-api-guide-for-coding-agents

Catégorie : Découverte. Usage Orbit : Choisir le mode de recherche et borner le contexte.

Limite : Les modes plus profonds doivent être justifiés par la tâche et le budget.

### DS09 — Google — Search grounding

Source : https://ai.google.dev/gemini-api/docs/interactions/google-search

Catégorie : Découverte. Usage Orbit : Relier réponses, recherches et annotations de citation.

Limite : Ce service API n’est pas une recherche Google automatisée gratuitement par défaut.

### DS10 — Firecrawl — Map

Source : https://docs.firecrawl.dev/features/map

Catégorie : Découverte. Usage Orbit : Inventorier les URL avant de choisir lesquelles lire.

Limite : Une carte de site ne prouve pas une couverture exhaustive.

### DS11 — Firecrawl — Scrape

Source : https://docs.firecrawl.dev/features/scrape

Catégorie : Lecture et littérature. Usage Orbit : Extraire une page en contenu exploitable.

Limite : Les erreurs et transformations doivent rester visibles; intégration non démontrée dans Orbit.

### DS12 — Firecrawl — Crawl

Source : https://docs.firecrawl.dev/features/crawl

Catégorie : Lecture et littérature. Usage Orbit : Lecture multipage bornée par chemins, profondeur et nombre.

Limite : Ne pas utiliser les valeurs par défaut comme budget du projet.

### DS13 — Crossref — REST API

Source : https://www.crossref.org/documentation/retrieve-metadata/rest-api/

Catégorie : Lecture et littérature. Usage Orbit : Vérifier DOI, auteurs, dates et métadonnées.

Limite : Des métadonnées exactes ne prouvent pas la validité scientifique.

### DS14 — OpenAlex — Works

Source : https://developers.openalex.org/api-reference/works

Catégorie : Lecture et littérature. Usage Orbit : Découverte de travaux et déduplication par identifiants.

Limite : Le nombre de citations n’est pas un score de vérité.

### DS15 — Semantic Scholar — API

Source : https://www.semanticscholar.org/product/api

Catégorie : Lecture et littérature. Usage Orbit : Explorer références, citations et travaux connexes.

Limite : Vérifier limites et droits; une notice n’est pas le texte de l’article.

### DS16 — PRISMA 2020 — Flow diagram

Source : https://www.prisma-statement.org/prisma-2020-flow-diagram

Catégorie : Preuves et contrôle. Usage Orbit : Compter découvertes, doublons, exclusions et lectures retenues.

Limite : S’en inspirer ne suffit pas à qualifier Orbit de revue systématique conforme.

### DS17 — W3C — PROV-DM

Source : https://www.w3.org/TR/prov-dm/

Catégorie : Preuves et contrôle. Usage Orbit : Tracer source, extraction, affirmation, auteur et transformation.

Limite : Réutiliser les concepts sans imposer un moteur RDF.

### DS18 — OWASP — Prompt Injection Prevention

Source : https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

Catégorie : Preuves et contrôle. Usage Orbit : Traiter pages et sorties d’outils comme données non fiables.

Limite : Aucune défense isolée ne garantit l’absence d’injection.

### DS19 — RFC 9309 — Robots Exclusion Protocol

Source : https://www.rfc-editor.org/rfc/rfc9309.html

Catégorie : Preuves et contrôle. Usage Orbit : Respecter les règles de parcours des sites.

Limite : robots.txt n’est ni une licence de redistribution ni une autorisation d’accès.

### DS20 — Sanity — Resolve Knowledge Base issues

Source : https://www.sanity.io/docs/ai/sanity-context-resolve-issues

Catégorie : Preuves et contrôle. Usage Orbit : Conserver et résoudre les contradictions avec leurs sources.

Limite : Corriger la source si les propositions sont toutes deux erronées.

### DS21 — Sanity — Maintain Knowledge Base

Source : https://www.sanity.io/docs/ai/sanity-context-maintain-knowledge-base

Catégorie : Évaluation et continuité. Usage Orbit : Gérer rafraîchissement, reconstruction et fraîcheur du contexte.

Limite : Un rafraîchissement n’équivaut pas automatiquement à un rebuild.

### DS22 — RAGAS — Context precision

Source : https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/

Catégorie : Évaluation et continuité. Usage Orbit : Évaluer la pertinence des éléments récupérés et leur classement.

Limite : La précision ne mesure pas les informations manquantes.

### DS23 — RAGAS — Context recall

Source : https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/

Catégorie : Évaluation et continuité. Usage Orbit : Mesurer la couverture contre une référence connue.

Limite : Impossible d’affirmer une couverture totale du Web sans référence.

### DS24 — RAGAS — Faithfulness

Source : https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/

Catégorie : Évaluation et continuité. Usage Orbit : Vérifier si les affirmations sont soutenues par le contexte.

Limite : Une réponse fidèle à une source fausse peut rester fausse.

### DS25 — ALCE — Enabling Large Language Models to Generate Text with Citations

Source : https://aclanthology.org/2023.emnlp-main.398/

Catégorie : Évaluation et continuité. Usage Orbit : Évaluer exactitude et complétude des citations.

Limite : La présence d’une citation ne prouve pas qu’elle soutient l’affirmation.

## Application proposée

Question → périmètre explicite → axes distincts → requêtes bornées → URL candidates → lecture et déduplication → affirmations liées aux preuves → contradictions et inconnues → rapport cité → évaluation et checkpoint CCP.

Les neuf axes et trente URL restent une structure cible. Ils ne doivent pas conduire à ajouter des axes redondants ou des sources faibles pour remplir un compteur. Le registre doit distinguer discovered, read, used, inaccessible et out_of_scope.

Commencer par STORM, Exa Search/Contents, le registre de sélection inspiré de PRISMA, la provenance et la prévention des injections. Tester ensuite la qualité avec précision, rappel, fidélité et exactitude des citations. Conserver une référence simple sur les mêmes questions avant toute orchestration multi-agent plus coûteuse.

## Vérifications proposées avant de parler de deep research démontré

1. Une question produit des axes distincts et des critères d’inclusion explicites.
2. Chaque URL utilisée possède un état de lecture réel et un extrait justificatif.
3. Les doublons et pages inaccessibles ne deviennent pas des sources lues.
4. Chaque affirmation importante est liée à une preuve; les contradictions restent visibles.
5. Un corpus de référence mesure aussi ce qui a été oublié, pas seulement la qualité des sources retenues.
6. Une interruption conserve sources, décisions, budgets et prochaine action.

## Limites et coûts

Aucune activation payante ni nouvelle clé n’est réalisée par cette recherche. Les API OpenAI, Google et Firecrawl ne deviennent pas incluses dans des abonnements Codex ou Antigravity. Les tarifs, quotas et versions devront être vérifiés lors d’une intégration. Les résultats de publications externes ne sont pas des benchmarks Orbit.

## État Sanity à ne pas confondre

La Knowledge Base Orbit Companion — Sanity Foundation (kb5CHIYGXCMJ) existe. Des sources de fondation ont été ajoutées précédemment, mais l’import des présentes 25 références et le build final ne sont pas vérifiés dans ce dossier. Le plafond annoncé de 150 documents ne signifie pas 150 sites complets; une URL parcourue récursivement peut produire plusieurs documents. Vérifier le compteur et limiter le parcours avant l’ingestion.
