# Orbit — audit du parcours Sanity et du challenge

> Mise à jour du 28 septembre : un agent Codex local a maintenant effectué `initial_context` et trois lectures `knowledge_base_read`, puis déposé un plan **en attente**. Voir [CONTEXT_AGENT_STATUS.md](CONTEXT_AGENT_STATUS.md) pour la trace, les limites et le protocole de comparaison. Les lignes ci-dessous décrivent l'audit initial ; elles ne doivent pas être lues comme un état courant après cette mise à jour. Le plan d'implémentation accepté ensuite conserve l'accès direct à l'atelier, sans imposer une connexion Sanity au visiteur.

Date : 28 septembre 2026. Branche `master`, HEAD `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`, changements locaux nombreux préexistants et en cours. Pas de commit ni de publication DEV.

## Conclusion

Le projet possède un socle utilisable, mais la conformité complète à Path One et sa valeur comparative ne sont pas encore démontrées. Les outils WebMCP, un endpoint connecté et un beau rapport ne remplacent pas la preuve d'un agent exécutant une recherche réelle en utilisant la structure Sanity.

## Exigences et preuves

| Point | État vérifié | Ce qui manque |
|---|---|---|
| Agent construit pour le produit | Protocole spécialisé, dix outils WebMCP, contrats de proposition et contrôle humain ; exécution principale confiée à l'agent navigateur du visiteur | Agent/configuration reproductible livré, trace complète question → Context → preuves → rapport ; ne pas présenter l'agent extérieur générique comme une réalisation Orbit |
| Sanity Context MCP et Knowledge Base | Lecture réelle de `initial_context` et `knowledge_base_read`, KB `kb5CHIYGXCMJ`, reçus privés du 28 septembre | Démonstration depuis le parcours public final et raccordement au compte/projet choisi pour l'offre personnelle |
| Provenance | Sources, passages, relations et références exportables dans le dossier | Rapport réel dont les conclusions importantes ont été contrôlées contre les passages et leurs conditions |
| Valeur de la structure | Sommaire et entrées disponibles ; schémas affirmation/preuve/revue | Cas avec plusieurs contraintes et distinctions de version/périmètre ; comparaison avec une recherche textuelle simple sur le même corpus |
| Conflits et décisions | Sanity gère déjà les conflits de ses sources ; Orbit conserve des décisions dans ses dossiers locaux/exportés | Ne pas confondre une décision locale avec une instruction Sanity persistante entre builds ; aucune écriture de ce type n'est faite par Orbit |
| Budget documentaire | Dernier écran observé : 97 documents, 20 entrées ; plafond challenge 150 documents | Compter les documents indexés, pas seulement les URL de sources ; suivre les imports supplémentaires |
| Utilisabilité | Atelier local à cinq vues, navigation et plugin Studio vérifiés sur dossier synthétique | Site racine encore ancien ; parcours du nouvel utilisateur et recherche réelle à tester |
| Soumission | Projet existant `pzscx4w8` | Post DEV anglais, template Path One, tag requis, méthode de test pour juges, code/démonstration et limites déclarées |

## Ce que contient réellement notre Knowledge Base

Son but déclaré est la méthode de recherche et l'implémentation : Sanity, citations, provenance, évaluation, API, sécurité et confidentialité. Elle n'est pas un corpus scientifique NASA, ni une base contenant les preuves de toute question future.

Deux usages à distinguer : (1) apprendre au système comment conduire une recherche ; (2) fournir les faits structurés nécessaires pour répondre à une question de domaine. La démonstration doit prouver le second sur un sujet que notre corpus couvre, ou employer un corpus de domaine explicitement ajouté. Un rapport externe guidé seulement par des conseils de méthode risque de rendre Sanity accessoire.

Cas de démonstration proposé, à exécuter : comparer des architectures de deep research selon plusieurs contraintes documentées (authentification utilisateur/API, exécution différée, données privées, citations et restrictions propres au fournisseur). Il faut séparer les fournisseurs, produits, versions et conditions, puis justifier les options compatibles, incompatibles ou indéterminées. Aucun résultat n'est encore annoncé.

## Contribution proposée et limites de la nouveauté

Sanity fournit déjà Knowledge Bases, provenance, résolution des conflits, Content Agent et des workflows de revue. Nous ne revendiquons pas leur invention. NotebookLM fournit déjà découverte/recherche approfondie, collecte de sources et rapports : ces capacités définissent une référence d'expérience utilisateur.

La contribution défendable d'Orbit est un atelier de recherche et de contrôle des conclusions intégré à l'écosystème Sanity : dossier de preuves portable, liens conclusion → passage → source, distinctions de portée/version, propositions de correction, revue humaine et export d'un white paper accompagné de son audit.

État actuel : le plugin Studio importe un fichier choisi, permet la revue et exporte les décisions. Il ne sauvegarde pas encore ces recherches dans le Content Lake. Les contrôles déterministes détectent des défauts de structure/citation ; ils ne prouvent pas la vérité ni l'implication logique. La réévaluation automatique après une nouvelle version de la Knowledge Base n'est pas implémentée.

Cette combinaison est notre proposition de différenciation. L'inspection ciblée des documentations ne prouve pas qu'aucun produit ou plugin concurrent ne propose une fonction analogue. Aucune supériorité sur Gemini/ChatGPT n'a été mesurée.

## Nouveau parcours demandé le 28 septembre

`Landing atomique → connexion Sanity → choix de l'organisation/projet/dataset et Knowledge Base → espace Orbit de recherche`.

Cette demande remplace le précédent accès invité comme parcours principal. Elle ne doit pas être simulée par un lien vers notre Studio fixé à `pzscx4w8/production`. Une connexion Sanity ne crée pas à elle seule un projet, un dataset, un Studio ou une Knowledge Base et ne donne pas de droit sur les ressources d'un autre compte.

Voie à étudier avec les outils officiels : application Sanity App SDK pour la session et la sélection des ressources autorisées, puis module de recherche réutilisable. La documentation décrit le mode Dashboard et l'intégration Studio ; le passage exact depuis notre domaine et la distribution entre organisations restent à vérifier avant de promettre l'installation automatique pour tout visiteur. La création de ressources nécessite une étape explicite, les droits adéquats et le respect du budget. Aucun jeton administrateur commun ne doit donner accès aux données personnelles des visiteurs.

## Ordre de fermeture des écarts

1. Rétablir sur le domaine le landing réellement approuvé, avec sauvegarde et vérification du paquet public. Aujourd'hui, seul `/studio/` a été déployé ; `/` montre encore l'ancienne page.
2. Démontrer un agent Orbit/configuration reproductible qui résout un cas du corpus via Context MCP jusqu'au dossier et au rapport. Utiliser les mêmes sources pour le témoin textuel ; conserver les erreurs et les inconnues.
3. Réaliser le parcours Sanity personnel : authentification officielle, sélection des ressources autorisées, isolation, sauvegarde et reprise. Ne pas confondre cette fonction produit avec une exigence minimale du concours.
4. Finaliser le plugin de revue et les exports ; comparer un rapport réel à une référence avec les mêmes entrées. Pas de nouveau travail sur l'avatar ou l'extension pour fermer ces écarts.

## Sources primaires relues

- [Challenge et critères](https://dev.to/challenges/sanity-2026-09-16)
- [Knowledge Bases : entrées, conflits et instructions](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases)
- [Content Agent](https://www.sanity.io/docs/content-agent)
- [Workflows : exemples de revue et contrôles](https://www.sanity.io/docs/workflows/cookbook)
- [App SDK : authentification](https://www.sanity.io/docs/app-sdk/sdk-authentication)
- [App SDK : configuration](https://www.sanity.io/docs/app-sdk/sdk-configuration)
- [NotebookLM : Deep Research et sources](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-deep-research-file-types/)

Les conditions juridiques complètes du concours ne sont pas auditées ici. Cet audit porte sur le prompt technique, les critères et les consignes de soumission de sa page.
