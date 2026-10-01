# Contrôle de publication — Orbit Formation

État courant : sources composées, exports DOCX/PDF provisoires construits, pages Canva non produites. Les rapports dans `qa/` identifient les contrôles exécutés et la copie examinée ; cette liste définit les critères et ne vaut pas résultat d'exécution.

## Contenu et preuves

- Relier les huit modules, les notebooks et le projet à la carte `source-map.json`.
- Contrôler les empreintes du notebook M4 corrigé et de sa copie enseignant ; conserver le reçu de l'ancien incident clavier et rattacher le retest de la nouvelle source.
- Vérifier les consignes M4 : flèches bornées sans élan, lancer au pointeur, Espace pour gel/reprise et fin de geste actif sans lancement.
- Contrôler l'aperçu M7 corrigé : au moins deux identifiants sélectionnables au clavier, sélection conservée lors du changement de vue, cinq changements comparables et budget 32/4 inchangé.
- Reporter dans `QUALIFICATION.md` la version et le payload des nouveaux reçus ; conserver les précédents comme historiques.
- Vérifier **10 h accompagnées + 30 h solo = 40 h** ; chaque module **120 + 30 + 30 + 60 min** ; projet **60 + 360 + 60 min**.
- Réserver la démonstration d'assemblage complet aux 25 minutes de construction du webinaire du Module 8 ; elle n'ajoute aucune heure.
- Conserver le run partiel Kaggle 354391847 et son échec `ETARGET` comme historiques distincts de la reprise par `npm ci`. Qualifier séparément le nouveau graphe, le transport GET/CORS, les contrôles serveur et le second Studio authentifié.
- Relier `TOOLCHAIN_AND_VERSIONS.md` aux sources et reçus ; distinguer version déclarée, version réellement observée et relevé de précontrôle des outils d'export.
- Conserver les registres distincts : 25 outils sur le contexte pédagogique d'Orbit, capacité du projet élève, registre réel des autres pages ; vérifier le propriétaire de montage et les nettoyages tardifs.
- Qualifier séparément le transport public GET `/api/v1/course-context/{outline,entries}` et les droits de la vraie session Sanity.
- Conserver l'admission Context en `HOLD` : références mixtes, Module 8 non cité et protocole sauté. Aucune entrée publique ni revue humaine fabriquée ; transport désactivé jusqu'à qualification réelle.
- Garder `deliveryReady: false` et `fullMissionComplete: false` tant que Context, les documents Canva et les autres critères ouverts ne satisfont pas leur définition de fin.
- Distinguer aperçu HTML/compilation Astro, trace préparée/appel natif, empreinte/exécution, proposition/revue humaine, test logiciel/compréhension et mesure Canvas/coût GPU.
- Vérifier code fourni, modification de l'élève, aide reçue et raccordement attribués.
- Conserver les métriques indisponibles comme indisponibles ; examiner reformulation et transfert lors des vraies séances.

## Voix, autorité et confidentialité

- Une seule déclaration canonique de partenaire de recherche dans le front matter du manuel, fidèle à l'autorité de l'auteur.
- Scripts à la première personne identifiés comme propositions de parole ; intonations proposées.
- Relever les constructions négatives et leurs emplacements. Réviser les répétitions rhétoriques. Conserver et justifier les distinctions techniques, juridiques, de sécurité, de statut et les identifiants exacts.
- Garder corrigés et fiches enseignant séparés des documents web élève.
- Écarter credentials, identités de comptes, conversations privées, chemins d'exploitation privés et journaux non sélectionnés.
- Préserver le landing, l'identité `Orbit.` et les éditoriaux réservés.
- Garder la revue graphique commune et le prochain tutoriel dans leurs missions ultérieures ; le retour utilisateur sur les boutons demeure un constat borné.

## Canva — Module 1 pilote, puis neuf documents

- Préserver le prototype ; vérifier le pilote avant généralisation.
- Examiner chaque bouton vers le notebook, Colab et les pages réelles ; un lien écrit dans un brief n'est pas une route vérifiée.
- Joindre le contenu des références du dépôt ; afficher leurs chemins comme code et réserver les boutons aux URL web contrôlées.
- Contrôler focus, clavier, petite largeur, contraste, alternatives textuelles et lecture des tableaux.
- Afficher la permission et la destination des travaux ; aucune interface décorative ne simule une exécution.
- Conserver les mêmes objectifs, paramètres et horaires que le manuel source.

## DOCX et PDF

- Précontrôler Pandoc, LaTeX et les polices depuis l'inventaire actuel ; résoudre les chemins du rapport privé sans les exporter. Arial et Consolas sont observées comme fichiers installés, avec rendu encore à examiner.
- DOCX : métadonnées, styles, sommaire, tableaux, extraits, liens et modification possible.
- PDF LaTeX : nombre de pages lisible, métadonnées, caractères français, figures, marges, retours du code, liens et sauts de page.
- Rendre et examiner les pages : début, fin et toutes les pages à code/table/figure, puis contrôler l'ensemble des débordements.
- Les liens locaux vers le dépôt demandent une copie correspondante du cours. Les liens web sont utilisables indépendamment ; ne convertir aucun chemin local en adresse publique supposée.
- Conserver les empreintes, logs et échecs. Qualifier `review-ready` pour la revue ; qualifier `print-ready` seulement après rendu et QA complets.

Le workflow `Publication QA Gate` peut examiner `outputs/` avec le script du plugin `qa_publication_package.py`. Ses avertissements de podcast ou EPUB sont hors formats demandés ; ils ne remplacent pas les contrôles de ce manuel. Son rapport automatique doit être complété par la revue de contenu, la politique de voix, les liens et l'examen visuel.
