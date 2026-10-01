# Orbit — un point d'entrée pour reprendre

**Dernière livraison :** [Compagnon holographique — usage, tests et limites](HOLOGRAM_COMPANION_HANDOFF.md). Cette mise à jour remplace le parcours principal centré sur le globe décrit plus bas.

**Priorité de reprise :** lire [PRODUCT_INTENT_CORRECTION.md](PRODUCT_INTENT_CORRECTION.md). Le produit attendu est un compagnon conversationnel : neuf axes, trente sources visées, lecture et rapport sourcé, avec compagnon 3D et voix. La préversion ci-dessous ne constitue pas cette livraison. Les outils de recherche du site public ne sont pas démontrés fonctionnels dans cette surface.

## Ce que tu peux voir aujourd'hui

Ouvre https://orbit.securedme.ca : la préversion publique est maintenant déployée et vérifiée. Le laboratoire et le brouillon local fonctionnent ici; la recherche et le compagnon requièrent l'extension associée. L'aperçu http://127.0.0.1:4173 reste disponible tant que le serveur local tourne.

1. Clique **Explore an orbit**. Mets 600 dans Altitude : le reset montre environ 7561,7 m/s. Utilise Pause, Resume et Reset. La trace représente les positions calculées; le globe est illustratif.
2. Dans **Mission Control**, écris une question, clique **Set mission plan**, puis **Save checkpoint**. Recharge pour retrouver le brouillon. Ouvre le plan seulement quand tu veux voir les 39 points.
3. Dans **Evidence Library**, ouvre une source originale. Les quatre cartes viennent du corpus public Sanity. Découverte et lecture ne sont pas assimilées à une preuve.

## Ce qui demande l'extension

La page locale permet de voir la simulation et le brouillon. Le compagnon et Exa utilisent le service worker de l'extension pour joindre le broker privé.

- Le paquet est dans `artifacts/orbit-companion-mv3-unpacked-build.zip`.
- Le dossier déjà décompressé à charger dans Chrome est `web/dist` à la racine de ce dépôt.
- Chrome attribue un identifiant de 32 caractères. Cet identifiant doit être ajouté à l'allowlist locale avant la connexion; aucun accès universel n'est autorisé.
- Le broker fournit ensuite un code d'association à usage unique, valable cinq minutes. Ce code se saisit dans **Associate this browser**. Ne copie aucun secret API dans la page.
- Après association et checkpoint : **Search NASA sources with Exa** recherche; **Check my Codex connection** vérifie le compte; **Ask my companion** transmet seulement le contexte décrit par la case de consentement.

Codex a exécuté un échange réel côté serveur et conservé sa réponse. Ce parcours n'a pas encore été validé dans l'extension chargée. Antigravity et Copilot ne sont pas annoncés fonctionnels.

## Si la prévisualisation est arrêtée

Depuis la racine du dépôt :

```powershell
.venv\Scripts\python.exe -m http.server 4173 --bind 127.0.0.1 --directory web/dist
```

Garde ce terminal ouvert. Les tests techniques ont déjà été exécutés par Codex; tu n'as pas à les refaire pour lire cette page.

## Prochain travail technique, dans l'ordre

1. Valider l'extension avec son identifiant réel et l'association, puis recherche/compagnon/checkpoint dans cette surface.
2. Conserver le déploiement HTTPS vérifié et corriger les adresses serveur des opérateurs : bishop.web-dns1.com, au lieu du précédent srv22.swhc.ca.
3. Terminer Knowledge Base/Context MCP et les fournisseurs manquants, puis les six transferts CCP.
4. Achever le crawler borné, les contrôles de release et la revue humaine du challenge.

Le plan maître reste le contrat; ce document décrit l'état réel, pas une réduction de son périmètre. Les cinq angles et la recherche NASA restent séparés et conservés.
