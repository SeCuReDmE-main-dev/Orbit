# Orbit — utiliser l’atelier

Préversion locale : http://127.0.0.1:4321/app/ (serveurs locaux nécessaires).

Le landing reste la porte d’entrée. L’atelier s’ouvre sans compte et conserve un seul dossier central. Les cinq vues remplacent le contenu ; elles ne font pas défiler une page de présentation.

1. **Question** : écrire la question, le résultat attendu et les contraintes ; enregistrer.
2. **Partager avec mon agent** : autoriser la lecture, puis séparément les propositions. Copier la consigne dans son agent navigateur. Le protocole est disponible par `orbit_get_research_protocol`.
3. **Plan** : examiner les axes proposés, intégrer la proposition, puis approuver le plan. Neuf axes et trente sources sont des plafonds pour ce dossier, pas une raison de remplir avec des éléments faibles.
4. **Preuves / Vérification** : ouvrir une source, comparer le passage et le périmètre de l’affirmation. Une citation présente dans un extrait ne prouve pas sa vérité. Les décisions humaines demandent une justification et deviennent périmées si le contexte ou les preuves changent.
5. **Rapport** : relire, modifier et exporter. « White paper / PDF » télécharge un HTML autonome : l’ouvrir, puis Imprimer → Enregistrer au format PDF. Le JSON conserve séparément extraits, propositions, décisions et versions.

## Reprendre

Par défaut, le dossier reste en mémoire. « Conserver sur cet appareil » propose une copie IndexedDB explicite. Ce stockage appartient au profil du navigateur, sans compte Orbit. Le partage avec l’agent est désactivé après rechargement ou changement de dossier. Pour déplacer une recherche, exporter le JSON puis l’importer comme copie indépendante.

Une modification concurrente depuis un autre onglet bloque l’écrasement de la copie locale et demande un export. Une importation accepte au maximum 8 Mo. L’historique est borné à 60 versions ; exporter puis ouvrir un nouveau dossier avant saturation. Le format exporté n’est pas une signature d’identité ou de validation humaine.

## Sources et Drive

« Ajouter une source » enregistre une URL et un passage fourni ; cela ne télécharge pas automatiquement le site. Une proposition d’agent ne remplace pas le dossier approuvé.

La connexion Google dédiée est distincte de l’agent IA. Le sélecteur prévu utilise `drive.file`, qui porte sur les fichiers choisis et permet techniquement leur gestion ; le code Orbit effectue seulement des lectures. Formats actuellement pris en charge : Google Docs, texte et Markdown. Téléchargement borné à 2 Mo, extrait conservé à 12 000 caractères. Les PDF, images et tableaux n’ont pas encore de lecteur intégré. Aucun fichier n’est envoyé automatiquement dans Sanity.

Le client OAuth a été créé ; l’activation complète du sélecteur reste conditionnée à sa clé Picker restreinte, aux testeurs Google et au parcours réel d’autorisation. Une configuration absente doit produire un message, jamais une fausse connexion réussie.

## Sanity et les autres outils

Depuis Plan ou Réglages, « Consulter Sanity » lit le sommaire réel, puis une entrée choisie. Les secrets restent dans la passerelle serveur. La base contient des méthodes de recherche ; elle ne remplace pas les sources primaires du sujet étudié.

L’agent conserve ses connecteurs MCP et ses moteurs de recherche. Orbit ne configure pas automatiquement ces comptes et ne mesure pas leurs coûts externes. Les dix outils WebMCP ont été invoqués sur la préversion Chrome ; une recherche réelle de bout en bout avec l’utilisateur reste la prochaine validation.

Dans Studio, l’outil **Orbit Evidence** importe explicitement le même JSON. Il permet de relire et d’exporter une revue en session ; il n’écrit pas automatiquement dans la Knowledge Base.

## Exercice de cinq minutes

Ouvrir « Découvrir un exemple », comparer les deux durées et les catégories, puis examiner la reformulation. L’exemple est synthétique. Il permet d’apprendre les commandes sans le confondre avec une recherche scientifique réalisée.
