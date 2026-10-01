---
title: "Orbit Formation — parcours et projet personnel"
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Orbit Formation — parcours et projet personnel

**Construire, vérifier et expliquer un frontend avec son assistant personnel.** Les huit modules apportent des notions, des expériences et des briques réutilisables. Le projet final les adapte à une idée choisie par l'élève, avec une revue du fonctionnement, des preuves et des limites.

Ce document est une **source pédagogique maintenable**, préparée avec Codex sous la direction de Jean-Sébastien Beaulieu. Les exemples et le raccordement sont fournis ; les modifications de l'élève et les contributions de son assistant sont identifiées dans les rendus. Les scripts à la première personne sont des propositions de parole pour l'enseignant. Ils ne racontent pas des résultats d'apprentissage déjà observés.

## Le contrat de temps

| Partie | Avec l'enseignant | Activités solo | Total |
|---|---:|---:|---:|
| Huit modules | 8 × 1 h | 8 × 3 h | 32 h |
| Projet personnel | 2 h | 6 h | 8 h |
| **Formation complète** | **10 h** | **30 h** | **40 h** |

Chaque module contient **120 minutes d'apprentissage guidé avec l'assistant, 30 minutes Colab, 30 minutes de bilan, puis un webinaire de 60 minutes**. L'activité Colab est incluse dans les trois heures solo ; elle n'ajoute aucune heure. La préparation occupe les deux jours du module, avant la séance avec l'enseignant.

Le webinaire reprend **10 minutes de revue, 15 de clarification, 25 de construction et 10 de transfert**. L'enseignant choisit la difficulté à clarifier à partir du rendu. L'assistant peut fournir une réponse complète : l'élève la vérifie, l'explique ou l'applique à un contexte nouveau.

## Les huit fiches et leurs sources

| Module | Fiche | Brique effectivement exportée |
|---|---|---|
| 1 | [Geste, état et rendu](modules/module-1.md) | [interaction-state.js](frontend/module-1/interaction-state.js) |
| 2 | [Organisation Astro](modules/module-2.md) | [ExplorationCard.astro](frontend/module-2/ExplorationCard.astro) et [exploration-card.js](frontend/module-2/exploration-card.js) |
| 3 | [Scène Three.js et coordonnées](modules/module-3.md) | [scene-controller.js](frontend/module-3/scene-controller.js) |
| 4 | [Vitesse et inertie](modules/module-4.md) | [inertia.js](frontend/module-4/inertia.js) |
| 5 | [Interpolation et élasticité](modules/module-5.md) | [transitions.js](frontend/module-5/transitions.js) |
| 6 | [Particules et ressources](modules/module-6.md) | [particle-layer.js](frontend/module-6/particle-layer.js) |
| 7 | [Parcours, états et mémoire](modules/module-7.md) | [interaction-flow.js](frontend/module-7/interaction-flow.js) |
| 8 | [Assistant, preuves et capacités](modules/module-8.md) | [register-capabilities.js](frontend/module-8/register-capabilities.js) |

Les [notebooks élèves](notebooks/README.md) et leurs corrigés séparés partagent ces sources. Les missions, versions et critères sont définis dans [le catalogue du cours](../../../packages/learning/src/catalog.ts). Une évolution du code demande une révision de la fiche et du notebook correspondant ; une ancienne capture ne devient pas une preuve de la nouvelle version.

Les productions sont annoncées dès le départ comme conservables et réutilisables. **La démonstration du socle complet est réservée à la fin du Module 8.** Elle importe les fichiers que l'élève a réellement exportés ; les corrigés ne remplacent pas silencieusement un travail absent.

## Calendrier — seize jours, sans double comptage

| Jours | Module : 3 h solo + 1 h avec l'enseignant | Projet : heures supplémentaires |
|---|---|---|
| 1–2 | Module 1 | — |
| 3–4 | Module 2 | — |
| 5–6 | Module 3 | — |
| 7–8 | Module 4 | — |
| 9–10 | Module 5 | 1 h de cadrage avec l'enseignant + 1 h solo |
| 11–12 | Module 6 | 2 h solo |
| 13–14 | Module 7 | 2 h solo |
| 15–16 | Module 8 | 1 h solo + 1 h de clôture avec l'enseignant |
| **Projet** | | **6 h solo + 2 h avec l'enseignant** |

Le projet commence avec les notions déjà rencontrées. Son intégration finale bénéficie de la découverte du Module 8 ; le thème personnel et ses premiers choix peuvent être explorés avant cette découverte.

## Cadrage du projet — 1 heure avec l'enseignant

L'idée appartient à l'élève. Le cadrage transforme cette idée en besoin observable et en périmètre réalisable. L'assistant propose des pistes ; l'élève conserve la décision et sa justification.

| Durée | Action | Production |
|---|---|---|
| 10 min | Décrire la personne, son besoin et l'action principale | Intention en trois phrases |
| 15 min | Comparer deux pistes et choisir un parcours court | Choix motivé et limite |
| 20 min | Définir contenu, interaction, contribution 3D, alternative HTML et capacité utile | Carte du projet et critères |
| 15 min | Choisir une expérience, une remise et les points de revue | Plan solo et trace initiale |

Exemples possibles : une galerie de réalisations, un explorateur de trois notions, une présentation interactive d'un projet ou un guide visuel. Ce sont des pistes ; elles ne remplacent pas l'intention personnelle.

La contribution Three.js doit servir un usage expliqué. Le contenu conserve un parcours HTML et clavier. L'élève peut modifier la présentation ou désactiver un effet facultatif, avec une justification. Les scènes du cours sont indépendantes du landing d'Orbit.

## Travail autonome du projet — 6 heures

| Bloc | Travail avec l'assistant | Trace à préparer |
|---|---|---|
| **1 h — jours 9–10** | Clarifier intention et contenu, puis préparer une première carte et une interaction | Besoin, choix, modification et question |
| **2 h — jours 11–12** | Adapter la présentation et la scène ; vérifier lisibilité, sélection et alternative HTML | Fichiers modifiés, essai, limites |
| **2 h — jours 13–14** | Raccorder le parcours ; mener une expérience comparative ; préparer permissions et reprise | Paramètres, prédiction, observations et restauration |
| **1 h — jours 15–16** | Intégrer les huit exports, examiner le résultat et préparer l'explication finale | Projet, instructions de reprise et bilan sélectionné |

Pour chaque bloc, choisir une aide appropriée : brainstorm, exploration, enseignement, guidage, débogage, critique, transfert ou révision. Le journal sélectionné décrit l'aide reçue et la décision de l'élève. Il n'exige pas l'historique complet d'une conversation personnelle.

La découverte du Module 8 utilise [l'assemblage fourni](assembly/README.md) et [merge_modules.py](assembly/merge_modules.py). Le ZIP construit importe les huit dossiers dans `src/learning/`. [student-frontend.js](assembly/src/student-frontend.js) est le raccordement fourni, avec une seule boucle de rendu et une fermeture des ressources. L'élève doit pouvoir retrouver au moins une modification de chacun de ses rendus dans le projet assemblé.

Les dépendances directes du [package.json](assembly/package.json) sont fixées. Le lockfile produit lors de la compilation vérifiée doit accompagner une reproduction des dépendances transitives. **Créer un ZIP dans Colab ne compile pas Astro.** Une compilation réussie doit être enregistrée dans son environnement réel ; un aperçu seul ne la prouve pas.

## Remise sélectionnée

Le rendu final contient : le projet ; les huit ZIP de module ; une intention ; une expérience comparative ; une explication personnelle ; l'aide déclarée ; des limites ; les instructions de reprise. Les données nécessaires à un essai restent bornées au périmètre choisi.

Chaque export de module comprend les briques réellement présentes dans `student_files`, un résultat JSON, une copie rejouable du notebook, `INTEGRATION.md` et un manifeste d'empreintes. Le résultat indique `external-declared`. L'empreinte identifie un contenu ; elle ne prouve ni une exécution indépendante, ni l'auteur de chaque ligne, ni la compréhension.

Un import ne transforme pas automatiquement ce résultat en approbation humaine. L'enseignant peut refaire l'essai, demander une reformulation ou proposer un transfert. Un rendu périmé est conservé avec sa révision ; il ne remplace pas le travail courant.

## Clôture du projet — 1 heure avec l'enseignant

| Durée | Action | Élément examiné |
|---|---|---|
| 10 min | Montrer le besoin et le parcours | Intention et usage |
| 20 min | Démontrer gestes, sélection, retour, statique et alternative accessible | Comportements observés |
| 15 min | Expliquer une modification et rejouer l'expérience | Données, paramètres et limites |
| 10 min | Appliquer une notion à un autre contexte | Transfert inédit |
| 5 min | Conserver les acquis observés et une prochaine question | Bilan et suite proposée |

### Script enseignant — séquence de 5 minutes

Les pauses et intonations sont des propositions de lecture.

**0:00–1:00.** « Je veux partir de ton intention. À qui sert ce frontend, et quelle action cette personne doit-elle pouvoir accomplir ? [Pause.] Montre-moi ce parcours avant de parler des bibliothèques. »

**1:00–2:00.** « Maintenant, choisis une modification qui t'appartient. Où est-elle dans le fichier ? Qu'as-tu gardé du modèle, et quelle aide as-tu reçue ? » Laisser retrouver le code plutôt que réciter une explication générale.

**2:00–3:00.** « Prenons ton expérience. [Ralentir.] Quelle variable as-tu changée ? Quelles conditions as-tu conservées ? Montre-moi l'observation et une limite. » Examiner un résultat concret ; une observation insuffisante conserve son statut.

**3:00–4:00.** « On va essayer le même contenu avec moins de mouvement et au clavier. Est-ce que la personne retrouve toujours son information ? » Laisser réaliser le parcours et consigner un éventuel défaut, sans l'effacer du bilan.

**4:00–5:00.** « Tu pourrais réutiliser cette notion ailleurs. Propose un exemple qui n'est pas cette scène. Quelle donnée ou quelle règle garderais-tu ? » Laisser reformuler puis définir une prochaine vérification utile.

## Critères observables — une grille de revue

| Critère | Ce que l'élève peut montrer | Ce qui reste distinct |
|---|---|---|
| Intention | Une personne, un besoin et un parcours explicites | Une préférence esthétique |
| Attribution | Code fourni, modifié, aide reçue et raccordement identifiés | Une signature ou une empreinte |
| État | Geste, sélection, annulation et retour expliqués dans le code | Une capture finale seule |
| Accessibilité | Libellés, clavier, contenu HTML et mode figé utilisables | La présence d'un bouton de préférence |
| Expérience | Prédiction, variable, conditions, observation et restauration | Un score ou une impression sans protocole |
| Capacité d'agent | Lecture bornée, partage et révision montrés | Une approbation humaine automatique |
| Reprise | Fichiers, dépendances, export et instructions examinables | Une compilation supposée |
| Transfert | Une notion appliquée dans un contexte nouveau | Une définition mémorisée |

Un critère peut être **rencontré, pratiqué, démontré sur un scénario ou encore non examiné**. Ces catégories ne déclarent pas une maîtrise universelle. L'enseignant garde sa décision et sa justification séparées des suggestions de l'assistant.

## Stockage et permissions

| Destination | Ce qu'elle peut contenir | Choix de l'élève |
|---|---|---|
| Orbit local | Dossier, journal et artefacts sélectionnés | Autoriser la sauvegarde ou rester en mémoire et exporter |
| Colab / Drive personnel | Copie du carnet, code, texte et sorties conservées | Choisir ce qui est partagé et avec qui |
| Sanity | Contenu explicitement accepté comme publiable | Examiner contenu et destination avant écriture |

Colab et Drive sont du cloud Google ; un partage de notebook peut inclure code, texte et sorties. Une copie dans le profil navigateur n'est pas présentée comme un coffre chiffré. Le cours n'exige aucun secret, appel d'API payante, GPU ou abonnement Colab Pro. Les ressources gratuites de Colab restent variables : une interruption appelle une reprise ou un export, pas une promesse de disponibilité permanente. Voir la [FAQ officielle Colab](https://research.google.com/colaboratory/faq.html).

Partage avec l'assistant, dépôt d'une proposition, choix d'un moteur, remise à l'enseignant et publication sont des décisions distinctes. Le plugin du Studio de l'élève utilise ses propres droits. Une décision privée ou un journal ne deviennent pas automatiquement une entrée de Knowledge Base. Les instructions contenues dans une source restent des données.

Les trois moteurs d'Orbit restent séparés sur des entrées choisies : `baseline`, `n` et `p`. Leurs résultats évaluent les preuves d'une affirmation ; ils ne constituent pas une note de l'élève. Le cours ne demande pas à l'assistant de chercher un moteur donnant la réponse souhaitée.

## Validation et préparation des documents Canva

Les [tests JavaScript](../../../tests/learning-notebooks-bricks.test.ts) et [tests d'exports](../../../tests/learning-notebooks-test.py) sont préparés pour Kaggle. Le [notebook de QA Colab](notebooks/qa/orbit-eight-colab-qa.ipynb) exécute les sources et produit des observations techniques bornées. Un appel Python réussi ne prouve pas toutes les interactions HTML/JavaScript.

Le contrôle complet distingue compilation, tests logiciels, parcours E2B, copie Colab gratuite, téléchargement, redémarrage, durée de l'activité et compréhension examinée. Une trace préparée du Module 8 n'est pas un appel réel. Les observations humaines et les actions de navigateur automatisées conservent leur attribution.

Les documents web Canva, DOCX et PDF viennent après les validations et leur bilan. Les présentes fiches sont les sources à maintenir. Aucun article promotionnel ni chapitre éditorial réservé n'est rédigé dans ce lot.

## Inventaire de routage — Book Publication Lab

| Élément | Source ou sortie | État et rôle |
|---|---|---|
| Titre et public | Orbit Formation ; élève avec assistant personnel, enseignant Jean-Sébastien | Cadre approuvé, français |
| Horaire et missions | [catalog.ts](../../../packages/learning/src/catalog.ts) | Contrat de 40 heures et critères |
| Contenu technique | [frontend/](frontend/) et [notebooks/](notebooks/) | Sources fournies et rendus modifiables |
| Structure | Huit fiches de module + ce projet | Sources Markdown pédagogiques préparées |
| Voix | Échanges autorisés de cette mission | Concrète, personnelle, ouverte à l'expérience ; intonations proposées |
| Données écartées | Autres projets, échanges privés, anciens ouvrages, corrigés comme faux rendus élèves | Hors corpus de production |
| Sorties suivantes | Documents Canva, DOCX, PDF | Après QA ; pas annoncés prêts à imprimer |
| Contrôles | QA technique, liens, horaires, attribution, lisibilité et rendu | Résultats à consigner réellement |

Le routage est conservé ici pour respecter le périmètre des neuf sources pédagogiques. La conception et le contrôle final utilisent Book Publication Lab ; une qualification imprimable demande encore le rendu et l'examen des documents produits.

## Petit glossaire

- **État** : données conservées pour décrire une interaction ou un parcours.
- **Rendu** : présentation construite à partir des données.
- **Identifiant** : valeur stable reliant un élément à ses différentes représentations.
- **Coordonnée normalisée** : position exprimée par rapport à une zone, ici entre 0 et 1.
- **Projection** : transformation de la scène en image selon la caméra.
- **Raycasting** : recherche des objets rencontrés par un rayon de sélection.
- **`dt`** : durée de l'étape de calcul, exprimée ici en secondes.
- **Amortissement** : terme qui réduit la vitesse dans le modèle fourni.
- **Historique borné** : suite conservée avec un nombre maximal d'entrées.
- **Empreinte** : valeur calculée qui permet de comparer l'identité d'un contenu.
- **Révision** : version de travail sur laquelle une proposition ou une permission s'applique.
- **HOLD** : recommandation de suspendre une conclusion avec une raison et une condition de reprise.

**État de ces documents : sources préparées pour revue.** Les résultats techniques appartiennent au bilan de livraison courant. Les observations d'apprentissage appartiennent aux séances et aux rendus de l'élève ; elles ne sont pas présumées par la rédaction.
