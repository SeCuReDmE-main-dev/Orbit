# Assemblage fourni — huit exports réels

Ce squelette appartient à la fin du Module 8. Il ne fournit pas de copies cachées des briques : `src/learning/` est volontairement absent. Les ZIP de l’élève y apportent les huit dossiers. Le raccordement `src/student-frontend.js` est du code fourni, distinct du travail de l’élève.

Dans le notebook 8, le raccordement suit **charger → examiner → assembler**, pendant les 25 minutes de construction du webinaire :

1. La cellule 13 ouvre le sélecteur officiel `files.upload()`. Choisissez exactement un ZIP de votre version par module. Une annulation permet de relancer le chargement.
2. Si ce dialogue reste indisponible, téléversez les mêmes huit ZIP par le panneau **Fichiers** de Colab. Activez explicitement `USE_RUNTIME_FILE_SELECTION` et renseignez les huit noms dans `RUNTIME_SELECTED_EXPORT_FILENAMES`. Aucun fichier n'est découvert ni téléchargé automatiquement ; seuls les noms déclarés dans `/content` sont lus.
3. La cellule 14 affiche les modules, noms, tentatives, formats déclarés, tailles et empreintes. Vérifiez que ces lignes désignent les versions voulues. Les manifestes, chemins et contenus sont contrôlés ; un défaut garde un refus explicite.
4. Copiez l'empreinte de cette sélection dans `ASSEMBLY_REVIEWED_SELECTION_SHA256`, cellule 15. L'assemblage produit `orbit-mon-frontend-<empreinte12>.zip` uniquement après cette confirmation. Une nouvelle sélection nécessite un nouvel examen.

Le résultat reste `ASSEMBLED_NOT_BUILT` jusqu'à une compilation distincte. Une empreinte vérifie une copie ; elle ne certifie pas l'apprentissage. Colab stocke les fichiers du runtime temporairement : conservez vos ZIP originaux et téléchargez l'assemblage avant la fermeture de la session.

Dans un environnement Node compatible, décompressez le projet, puis utilisez `npm install --ignore-scripts --no-audit --no-fund`, `npm run build`, puis `npm run dev`. Les dépendances directes sont fixées. Le lockfile généré dans la validation Kaggle doit être conservé pour rejouer aussi les versions transitives. Ne présentez pas un aperçu Colab comme une compilation Astro.

Vérifiez déplacement, relâchement, annulation, clavier, redimensionnement, mouvement figé, particules désactivées, retour navigateur et nettoyage. Pour WebMCP, autorisez explicitement l’aperçu puis enregistrez la capacité ; tout changement de révision demande un nouvel enregistrement. Une API absente conserve le parcours humain.

Le projet n’appelle aucun modèle et ne calcule aucun moteur Python. Les expériences de preuves restent dans le paquet TypeScript partagé d’Orbit. Aucun composant de ce projet ne modifie le landing.
