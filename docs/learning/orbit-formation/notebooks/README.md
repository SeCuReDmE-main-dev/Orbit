# Huit activités Colab — sources préparées

Chaque `module-N.ipynb` est une activité de 30 minutes : prédire 5 minutes, modifier et observer 15 minutes, expliquer et exporter 10 minutes. Elle termine les deux heures d’apprentissage guidé; trente minutes de bilan suivent. Le webinaire d’une heure reprend ensuite le travail. Le total reste **10 heures accompagnées + 30 heures solo = 40 heures**.

Les corrigés sont exclusivement dans `instructor/`. Ne les distribuez pas comme des traces élève. Leur explication est une piste, pas une mesure obtenue.

Les notebooks fonctionnent sans installation Python, API, GPU ou modèle obligatoire. La troisième activité charge Three.js 0.181.2 dans le navigateur depuis un CDN; une liste HTML reste disponible en cas de refus réseau ou de WebGL indisponible. Les aperçus ne sont pas des compilations Astro et les traces préparées ne sont pas des appels WebMCP réels.

La cellule `student_files` contient le code lisible et modifiable. Le même contenu passe à l’aperçu puis au ZIP. Celui-ci conserve la brique, le bilan sélectionné, une copie rejouable du code de notebook, les instructions et les empreintes. Une empreinte identifie une copie; elle ne prouve pas l’exécution ni la compréhension. Les sorties de navigateur ne sont pas capturées comme preuves indépendantes.

Dans le Module 8, l’élève découvre l’assemblage fourni et charge ses huit exports. Aucun corrigé caché ne comble une absence. Les premiers notebooks présentent les productions comme conservables et réutilisables sans révéler cette démonstration.

Les carnets sont à copier dans le Drive personnel de l’élève. Code, texte et sorties peuvent être partagés avec le carnet. Aucune écriture Sanity, autorisation globale Drive, télémetrie ou conversation privée n’est exportée automatiquement.

## Vérifications requises avant qualification

Les sources ont été générées avec `python tools/prepare_learning_notebooks.py`; cette commande ne valide pas les activités. Dans Kaggle, exécuter les tests de briques `tests/learning-notebooks-bricks.test.ts` et `python tests/learning-notebooks-test.py`, puis compiler l’assemblage des vrais ZIP avec Astro. Examiner aussi le navigateur cible avec E2B.

Dans Colab gratuit, reprendre chacun depuis une copie neuve : lancer le CPU, poser une prédiction, modifier la cellule de code, observer, exporter, redémarrer, rejouer la copie et télécharger. La dépendance CDN, les widgets, la remise et les temps de trente minutes requièrent une observation humaine; des tests logiciels seuls ne les prouvent pas.

État initial de livraison : **préparé, non exécuté dans Colab**. Les résultats Kaggle et les observations Colab doivent être ajoutés au rapport technique par l’orchestrateur, avec versions et limites réelles.
