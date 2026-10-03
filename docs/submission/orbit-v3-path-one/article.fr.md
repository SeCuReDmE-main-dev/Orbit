# Orbit V3 : du compagnon de recherche à une formation avec son assistant personnel

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

Par Jean-Sébastien Beaulieu · Version de référence pour relecture · 3 octobre 2026

> J’ai utilisé Codex au maximum de ses capacités comme partenaire de recherche — pour cartographier le code, comparer les sources, organiser les preuves, vérifier la cohérence, assurer le contrôle éditorial et préparer les livrables. J’ai formulé l’intention, défini le périmètre, interprété les résultats, arbitré les conclusions et conservé chaque décision publique. Cette collaboration élargit ma capacité d’investigation ; le jugement, la responsabilité, la qualité d’auteur et la signature finale restent sous mon autorité.

J’ai commencé avec un compagnon de recherche. Je voulais poser une question précise, examiner ses sources et comprendre comment un assistant arrivait à sa conclusion. Au fil des jours, cette question est devenue pédagogique : comment aider un élève à transformer la réponse de son assistant en quelque chose qu’il sait expliquer, tester et réutiliser ?

Orbit V3 relie ces deux intentions. Ses outils de recherche conservent les preuves ; sa formation leur donne un usage concret. L’élève construit un frontend avec son assistant personnel, et j’enseigne à partir du travail qu’il choisit de me remettre.

## What I Built

Orbit est un espace de recherche et d’apprentissage construit avec Astro, Three.js et Sanity. Il rassemble un atome manipulable, un dossier de recherche versionné, un laboratoire pédagogique, un espace de projets, huit activités Colab et un plugin Sanity Studio portable. Un assistant navigateur peut découvrir et utiliser des outils WebMCP bornés. L’élève contrôle l’accès à ses travaux personnels, et les décisions importantes restent examinables par une personne.

### Le premier plan, puis le changement de direction

La première réalisation se concentrait sur des missions bornées : un objectif, des actions proposées, des budgets, des permissions, un résultat conservé et un checkpoint pour reprendre le travail. L’historique Git local conservé commence le 22 septembre. Ce prototype comprenait un side panel et un petit laboratoire orbital. Je voulais pouvoir inspecter le travail tout en apprenant, et retrouver autre chose qu’une réponse perdue dans un historique de conversation.

Le 28 septembre, j’avais une démonstration concrète de Sanity Context : un agent lisait un corpus de méthodes de recherche et déposait un plan à examiner. La fondation devenait utile. Mais je sentais aussi que le produit revenait vers une interface de deep research familière. Le 29 septembre, j’ai changé de direction. J’ai conservé ce que nous avions construit pour lui donner un but plus concret.

Cette distinction appartient au récit. Orbit existait déjà lorsque l’annonce du challenge Kaggle a inspiré ses benchmarks, à partir du 23 septembre. Les deux commits du 22 ont été préservés lorsque j’ai publié le dépôt GitHub le 1er octobre. Les dates du développement, de l’accès public à GitHub et des exécutions de tests ont chacune leur [registre de provenance](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/CHALLENGE_WORK_TIMELINE.md).

![Trois étapes d’Orbit : le compagnon de recherche borné dans l’historique du 22 septembre, le dossier de preuves et une lecture réelle de Context les 28–29 septembre, puis huit modules et un corpus pédagogique séparé au checkpoint V3 du 1er octobre.](https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/master/docs/submission/orbit-v3-path-one/assets/evolution/diagram.svg)

*J’ai conservé le socle de recherche et lui ai donné un usage pédagogique. Les flèches représentent des décisions de produit ; les dates identifient les traces conservées.*

### Pourquoi on arrive devant un atome

Je voulais un accueil qui rende curieux : un fond sombre, quelques portes et un objet que l’on peut saisir. J’ai gardé peu de texte parce que presque chaque élément visible donne déjà quelque chose à faire.

L’atome a aussi été un exercice de patience. Au début, le relâchement pouvait ralentir le lancer. Le passage du pointeur sur sa trajectoire pouvait interrompre son élan. Un effet Écho ambiant faisait travailler la scène en permanence. Ces corrections m’ont obligé à rendre explicite l’état de vol et à distinguer une nouvelle prise de la simple proximité du pointeur.

L’interaction approuvée garde maintenant une petite progression. Après deux secondes de maintien, le vortex commence à aspirer la scène. À quatre secondes, le mot décoratif devient ASCII et rejoint l’effet. À six secondes, l’effondrement déclenche une explosion autonome, puis une reconstruction. Une fois ce seuil franchi, relâcher laisse la séquence se terminer. Le mode statique fige l’image actuelle et sa chronologie. Ce sont des interactions artistiques, accompagnées de leur [validation navigateur bornée](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/atom-five-navigation-live.json), plutôt qu’un modèle physique d’étoile à neutrons.

J’ai explicitement réservé cet angle pour l’article : pourquoi pratiquer autant des accueils beaux, simples, cliquables et manipulables, même si leur jeu est différent du travail de l’application ? Astro et Three.js m’ont donné un terrain concret. Next.js appartient à mes intérêts plus larges ; le frontend inspecté d’Orbit utilise Astro et Three.js.

Cet accueil est devenu une introduction vécue à la première leçon : un geste modifie une donnée, puis le rendu montre l’état obtenu. Il offre une expérience humaine pendant qu’un assistant peut utiliser les outils de la page concernée. Les choix de la personne et les permissions de cette page encadrent toujours cet usage.

Le landing affiche maintenant **VERSION V3**, et la version de l’application est **3.0.0**. Son mécanisme atomique approuvé conserve **2.1.7**. La cinquième porte, **Apprendre / Learn / Aprender**, relie cette curiosité initiale au cours. Ces [identités de version](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/v3-public-readback.json) restent distinctes.

### Une formation où une réponse devient un travail que l’élève peut expliquer

Le deuxième angle réservé était l’utilité de Sanity pour l’éducation. Je voulais enseigner à un élève accompagné de son propre assistant. Une réponse complète peut l’aider ; la suite consiste à la vérifier, à expliquer ce qu’il a retenu et à essayer la notion dans une autre situation.

La formation compte **40 heures** :

| Partie | Avec moi | Travail de l’élève | Total |
|---|---:|---:|---:|
| Huit modules | 8 × 1 h | 8 × 3 h | 32 h |
| Projet personnel final | 1 h de cadrage + 1 h de clôture | 6 h | 8 h |
| Formation complète | **10 h** | **30 h** | **40 h** |

La période solo de chaque module comprend deux heures de lecture guidée avec l’assistant, trente minutes d’activité Colab et trente minutes pour préparer une explication et une remise sélectionnée. Pendant le webinaire, j’examine ce travail, je clarifie une difficulté, je construis quelque chose de concret avec l’élève et je lui demande un transfert. Le projet final suit **une heure avec moi pour le cadrer → six heures solo → une heure avec moi pour le clore**.

Les huit modules produisent des éléments compatibles :

| Module | Ce que l’élève pratique | Production réutilisable |
|---|---|---|
| 1 | Geste, état et rendu | Interaction au pointeur et au clavier |
| 2 | Organisation Astro | Carte d’exploration accessible |
| 3 | Coordonnées et sélection Three.js | Scène reliée à une information HTML |
| 4 | Vitesse et inertie | Mouvement après relâchement |
| 5 | Interpolation et élasticité | Transitions contrôlées |
| 6 | Particules et ressources | Couche de particules bornée et facultative |
| 7 | Navigation, interruption et mémoire | Parcours que l’on peut restaurer |
| 8 | Capacités de l’assistant et preuves | Capacité WebMCP bornée et assemblage |

Les notebooks obligatoires sont conçus pour un compte Google gratuit et un runtime CPU. Les mécanismes frontend restent en JavaScript ou Astro ; Python prépare l’affichage et les exports. Chaque activité part d’un modèle suffisamment préparé pour permettre une modification utile en trente minutes.

Je présente les productions comme conservables et réutilisables. L’assemblage complet se découvre à la fin du Module 8 : les huit exports de l’élève forment déjà un socle de frontend. Le raccordement fourni importe ses véritables fichiers, avec une attribution pour le squelette. Un export manquant ou incompatible produit un résultat explicite à examiner. Le corrigé de l’enseignant reste séparé.

## Demo

Commencez sur [orbit.securedme.ca](https://orbit.securedme.ca/). Saisissez l’atome, déplacez-le et relâchez. Ouvrez **Apprendre**, ou accédez directement au [laboratoire pédagogique](https://orbit.securedme.ca/formation/lab/).

Pour un parcours court :

1. Lisez la mission du Module 1, ses ressources et ses critères de revue dans le laboratoire.
2. Préparez une expérience : formulez une prédiction, changez un paramètre et conservez une observation.
3. Ouvrez [Projets](https://orbit.securedme.ca/formation/projets/) pour examiner un export sélectionné, ses fichiers et sa provenance.
4. Essayez la langue, le texte agrandi, le contraste et le mode statique. Orbit garde son nom en FR, EN et ES ; les fichiers de l’élève conservent leur contenu original.
5. Avec un assistant navigateur compatible, commencez par `orbit_get_capabilities`. La découverte publique est disponible avant le partage d’un travail personnel. Accordez les permissions utiles à l’activité choisie.

Le [guide public](https://orbit.securedme.ca/guide/) relie l’atome, l’atelier de recherche et les parcours de formation. Le [support Canva du Module 1](https://orbit-formation-module-1.my.canva.site/) introduit l’activité pédagogique ; l’[index maintenu](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/publication/CANVA_DELIVERY.md) relie les huit modules et le projet final. Leurs commandes ouvrent les véritables missions et notebooks.

Le [Studio pédagogique de l’équipe](https://orbit.securedme.ca/formation/studio/orbit-learning-lab) utilise une session Sanity et les droits de ce compte. Le plugin portable est destiné à l’installation dans le Studio personnel de l’élève. Ce sont des destinations distinctes, avec des autorités distinctes.

## Code

[Dépôt public : SeCuReDmE-main-dev/Orbit](https://github.com/SeCuReDmE-main-dev/Orbit)

Le dépôt contient les sources du cours, les notebooks élèves et enseignants, les briques frontend, les instructions d’assemblage, le plugin Studio, les contrats d’outils et les reçus de validation. Le [contrat de formation](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/FORMATION_CONTRACT.md) explique les interfaces et le [guide d’installation Studio](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/STUDIO_INSTALLATION.md) décrit le paquet portable.

La [baseline du 22 septembre](https://github.com/SeCuReDmE-main-dev/Orbit/commit/e3326986451d366bc25ddc01220a288c1e9fc14a) et le [checkpoint de livraison du 1er octobre](https://github.com/SeCuReDmE-main-dev/Orbit/commit/f2313b27a586bbe98e53869d6753315935b91b52) conservent l’historique réel. Les évolutions suivantes gardent leurs dates et leurs preuves. Le [manuel français d’apprentissage et d’enseignement](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/publication/outputs/book.pdf) accompagne les sources Markdown maintenues et le DOCX modifiable.

## How I Used Sanity

### Des sources, des affirmations et un agent qui lit réellement Context

Mon problème de départ était un rapport de recherche bien présenté, mais insuffisamment soutenu. J’ai séparé les sources des affirmations pour examiner leurs portées, leurs versions, leurs passages exacts et les contradictions encore ouvertes. Sanity Context fournissait des méthodes de recherche navigables, avec des distinctions à conserver dans le plan.

La démonstration enregistrée du 28 septembre posait cette question :

> Dans quelles conditions documentées la recherche approfondie en arrière-plan peut-elle coexister avec les exigences de zéro rétention de données sur les différentes surfaces API d’OpenAI et de Google ?

L’agent utilisait la route Codex locale officielle et la Knowledge Base de recherche. Voici un extrait abrégé de sa [véritable trace d’outils](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json.trace.json) :

```json
[
  {"tool": "initial_context", "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["data_retention_and_privacy"], "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["deep_research/models_and_apis"], "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["search_apis/google_grounding"], "state": "READY"}
]
```

Il a produit un plan avec neuf axes de recherche, neuf critères de sélection et trois empreintes d’entrées. Le résultat était une proposition en attente de revue humaine. Les entrées consultées fournissaient un contexte de méthodes et de politiques fournisseurs ; l’étape de recherche suivante devait lire les documents primaires et contrôler les affirmations importantes. Le [relais technique](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_AGENT_STATUS.md) conserve cette portée.

En relisant cette trace, je vois comment le contenu retrouvé a changé le travail : l’agent a conservé les conditions de ma question dans un plan que je pouvais examiner. Je pouvais ensuite contrôler les entrées, revenir sur une citation et choisir un axe à approfondir. Ce plan examinable est devenu le lien avec le parcours pédagogique.

### Un corpus pédagogique dédié

Lorsque Orbit a pris une direction éducative, j’ai conservé le corpus de recherche et créé séparément **Orbit Formation — Frontend course**. Ses sources canoniques sont les huit fichiers de module et `PROJECT.md`. Elles décrivent les objectifs, les ressources, l’exercice, la trace sélectionnée et le protocole du projet final.

Cette séparation a servi dès la construction. Context a signalé une ambiguïté entre les trois heures solo du Module 8 et la dernière heure solo du projet, placées dans les mêmes deux jours du calendrier. J’ai clarifié les sources pour conserver deux comptes d’heures distincts. L’admission pédagogique exigeait ensuite une couverture réelle des neuf sources, une provenance examinée et une révision identifiée. Les anciens candidats incomplets ou mélangés restent archivés comme admissions refusées.

Le transport pédagogique déployé sert une projection auditée du contenu généré par Context. Ses profils fixes séparent recherche et cours ; les credentials restent côté serveur. La [relecture publique](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/course-context-live-transport.json) conserve des lectures `READY` de l’outline et des entrées pour la révision admise, tandis que le [reçu d’ingestion](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/course-context-ingestion.json) préserve les URL et les empreintes des sources.

L’assistant dispose ainsi de ressources de cours qu’il peut parcourir. L’usage pédagogique consiste à relier une explication à la bonne mission, à une ressource, à un critère et à une activité de transfert. Le journal privé appartient à l’espace de travail sélectionné par l’élève, à l’extérieur de ce corpus public.

### L’assistant propose ; la personne décide

Le landing conserve quinze outils de recherche. Les contextes pédagogiques exposent ces quinze outils et dix outils d’apprentissage. Par exemple, `orbit_get_learning_mission` retrouve la mission partagée, `orbit_prepare_experiment` prépare un protocole borné et `orbit_present_learning_work` dépose une proposition pour revue.

Le contrat explique où obtenir les identifiants et la révision courante. `expectedRevision` relie une proposition au travail réellement examiné par l’assistant. Une révocation ou un changement de révision ferme cet accès. Cela compte lorsqu’une personne a modifié son projet pendant que l’assistant préparait sa réponse.

La même distinction s’applique au stockage. L’élève peut rester en mémoire, autoriser une sauvegarde locale, exporter un paquet sélectionné ou partager un artefact. Colab et Drive sont des destinations cloud Google. Un envoi vers Sanity exige un aperçu exact, une destination et l’acceptation explicite du caractère publiable de la sélection. Le plugin portable utilise les droits de son Studio hôte.

![La personne choisit son travail sélectionné et ses permissions. Son assistant appelle les outils WebMCP pédagogiques, qui contrôlent le consentement et la révision, lisent le Context public de recherche ou de cours, puis déposent une proposition dans un dossier versionné pour revue humaine. La publication possède sa propre acceptation.](https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/master/docs/submission/orbit-v3-path-one/assets/authority-flow/diagram.svg)

*Je voulais garder ce trajet visible : la personne choisit, l’assistant lit et propose, puis une personne examine le résultat. Le journal personnel reste dans l’espace sélectionné par l’élève.*

Un test antérieur du Studio sur une deuxième origine a effectué une publication synthétique sélectionnée et une relecture authentifiée du document enregistré. Il a aussi vérifié la déconnexion native et le retrait des outils. La première relecture anonyme a échoué pour l’identifiant avec points ; la reprise a utilisé la session native authentifiée pour lire le document déjà écrit. Les deux tentatives restent dans le [registre de livraison](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/FINAL_DELIVERY_2026-10-01.md). Il s’agit d’une fixture technique, distincte de l’approbation d’un véritable travail d’élève par l’enseignant. Le plugin portable est maintenant en version **1.0.1** : ses nouvelles limites de publication et de ressources ont passé les contrôles logiciels ciblés ; une nouvelle exécution native authentifiée de ces octets précis reste à qualifier.

### Ce que les preuves permettent de dire aujourd’hui

J’ai conservé trois moteurs déterministes : `baseline`, `n` et `p`. Ils examinent les preuves selon différentes représentations, avec une sélection explicite et des sorties séparées. Ils ne choisissent pas automatiquement un moteur gagnant. T/I/F décrit les preuves d’une affirmation ; ce n’est ni une note de l’élève ni une probabilité de vérité.

Les contrôles logiciels et navigateur s’exécutent dans Kaggle avec des navigateurs E2B isolés ; les notebooks élèves sont également contrôlés dans leur environnement Colab cible. Un aperçu, une compilation Astro, un appel natif d’outil et la compréhension d’une personne gardent chacun leur statut.

Les preuves livrées comprennent 141 assertions Vitest et des suites Node, Python et PHP séparées, 72 contrôles navigateur de formation et 77 contrôles de l’atome et de sa navigation sur les versions enregistrées. L’assemblage des huit exports effectivement importés possède sa propre compilation statique réussie. Ces nombres décrivent des scénarios exercés, avec une portée précise selon les appareils. La [matrice maintenue](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/FORMATION_DELIVERY_STATUS.md) relie les entrées, les résultats et les incidents d’origine.

Le 3 octobre, j’ai récupéré l’archive privée de la reprise C. Son [reçu public](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/c-resumption-20261003.json) conserve **60/60 extractions, 236/240 productions et 59/60 paquets terminés**. Les quatre productions manquantes concernent un seul paquet : une surcharge HTTP 429 dans la première condition a été classée comme erreur technique, interrompant les trois conditions suivantes.

J’ai ensuite exécuté dans Kaggle un [complément identifié séparément](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/c4-complement-20261003.json), avec l’extraction exacte déjà conservée. Il a produit **quatre réponses comparatives supplémentaires**, dans l’ordre fixé `baseline → n → p → none`, sans nouvelle extraction. J’ai vérifié l’archive téléchargée contre l’empreinte annoncée par Kaggle. La couverture atteint **236 productions historiques + 4 complémentaires = 240 productions observées sous deux identités d’exécution**. L’incident initial reste dans les traces. Les sorties structurées et leur couverture demandent encore une interprétation avant de tirer des conclusions comparatives.

Le [lot D Provider](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/d-provider-20261003.json) a maintenant produit **12 des 24 trajectoires prévues pour la mission**. Les deux conditions donnaient accès aux mêmes douze sources originales. **Neuf trajectoires sur douze ont satisfait le critère de lecture** ; les trois exécutions Pro affectées à la condition Context ont répondu sans lire Context. J’ai conservé ce non-respect du protocole comme un résultat observé. Le corpus QA isolé et les conclusions sémantiques demandent encore une revue, et je n’ai choisi aucun modèle ou moteur gagnant. E reste à **0/144 trajectoires de modèles**. Les cas réels attendent aussi l’arbitrage humain. Ces traces me permettent de savoir quels mécanismes ont été exercés et quelles questions restent à trancher avant de comparer les moteurs ou d’examiner la valeur pédagogique du cours.

Le déploiement du 3 octobre, **`orbit-v3-final-20261003T142300Z`**, sert le guide actualisé, le laboratoire, l’espace de projets et la page du Studio. Sa [relecture HTTP publique](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/final-public-readback-20261003.json) conserve les réponses des routes et les outlines recherche et cours distincts à l’état `READY`. La comparaison du paquet conserve le markup et le code de la scène approuvée, en tenant compte des références d’assets modifiées par les métadonnées WebMCP. Les interactions navigateur, l’exécution native des outils et la publication authentifiée gardent chacune leur propre reçu de validation.

## Sanity Project Details

| Élément | Détail |
|---|---|
| Identifiant du projet Sanity | `pzscx4w8` |
| Dataset de l’équipe | `production` |
| Knowledge Base Context de recherche | `kb5CHIYGXCMJ` |
| Knowledge Base Context pédagogique dédiée | `kbbBvrClyweF` |
| Révision pédagogique auditée | `d2c6279c-4ded-44de-a45e-f5e8e63bdf94` |

La [configuration Studio](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/studio/sanity.config.ts) et l’[index des schémas](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/studio/schemaTypes/index.ts) montrent le modèle du projet Content Lake. Les Knowledge Bases Context constituent une surface distincte pour des connaissances navigables issues des sources. L’élève installe le plugin portable avec son projet, son dataset et sa session ; le projet indiqué ci-dessus reste la destination de l’équipe.

Ces paramètres donnent à l’équipe un corpus pédagogique public et une destination définie pour les artefacts sélectionnés. Les espaces des élèves gardent leur projet, leur session et leurs choix d’accès.

## Agent Session

Les [extraits de session sélectionnés](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/submission/orbit-v3-path-one/agent-session-excerpts.md) relient mes deux angles réservés, le pivot du 29 septembre et la trace Context enregistrée. La [trace publique originale](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json.trace.json) et le [dossier en attente](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json) conservent la véritable sortie de l’agent. Ce sont des preuves sélectionnées, distinctes d’un embed DEV Agent Session.

Je suis parti d’un assistant de recherche dont je voulais pouvoir examiner le travail. Cette même habitude guide maintenant le cours : l’élève retrouve ce qui a changé, explique un choix, rejoue une expérience et applique la notion à son projet personnel. Les supports sont livrés ; leur valeur pédagogique sera examinée avec de véritables élèves et leurs travaux sélectionnés. C’est la continuité que je souhaite pour Orbit.
