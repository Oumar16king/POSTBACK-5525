# DVYS sur Runable

## Version préparée

Le projet existant a été intégré au template Runable sans refonte des pages ou de la logique métier. Les handlers Vercel sont exécutés via une couche de compatibilité Hono ; les pages sont conservées dans `packages/web/public/`.

### Pages
- `/` : catalogue des 12 jeux.
- `/admin` : panneau d'administration, avec le mot de passe fourni dans le formulaire sécurisé.
- `/stats` : statistiques.
- `/predictions` : vérification de l'identifiant 1Win.
- `/jeux/*` : pages de jeux originales.

### Base de données
- PostgreSQL Neon : base isolée `dvys_runable` dans le projet `soft-frost-01478617`.
- Tables originales initialisées et 12 jeux d'origine ajoutés avec leurs fichiers et images présents dans l'archive.
- Aucun ancien utilisateur, dépôt ou historique n'a été importé : l'archive ne contient pas de sauvegarde de ces données.
- La base existante `neondb` n'a pas été modifiée.
- La connexion et les secrets sont conservés uniquement dans le fichier `.env` racine.

## Publication et activation

1. Utiliser l'option de publication dans l'aperçu Runable pour obtenir une adresse publique stable.
2. Configurer le webhook du bot `Vantix_223_bot` sur `https://ADRESSE-PUBLIEE/api/webhook`. Aucun webhook n'a été activé pendant les tests.
3. Faire pointer les postbacks d'affiliation 1Win vers `/api/postback-register`, `/api/postback-deposit` et `/api/postback-gaming` sur ce même domaine. Le suivi des dépôts nécessite cette configuration côté 1Win.
4. Les relances et diffusions automatiques restent disponibles dans `/api/cron`, mais le planificateur Vercel de l'archive n'est pas actif sur Runable. Leur activation nécessite une configuration de planification séparée.
5. Le bot de notification administrateur est optionnel et n'a pas été fourni (`NOTIF_BOT_TOKEN`, `NOTIF_ADMIN_CHAT_ID`). Les paramètres d'affiliation, de canal, de dépôt minimum et les textes gardent les valeurs du projet original.

## Vérifications réalisées
- Correction du blocage de publication `Cannot find module './lib/runtime.cjs'` : les handlers et le contexte d'origine sont désormais importés statiquement et inclus dans le bundle serveur. Seule la syntaxe de modules des fichiers importés a été convertie de CommonJS vers ES modules ; la logique métier et les pages restent conservées.
- Bundle serveur exécuté hors du projet, sans `node_modules` ni fichiers handlers séparés, avec Bun **1.3.14 Linux x64 baseline**, identique au runtime signalé dans les logs de publication : démarrage, santé, 12 jeux via PostgreSQL, authentification admin, pages et assets validés. Le test force uniquement l'écoute sur localhost pour éviter le proxy réseau du sandbox ; cette adaptation n'est pas utilisée en publication.
- Test reproductible : `scripts/publication-smoke.py`, avec un dossier contenant `src/__server.js` compilé et `dist/`, et le chemin du binaire Bun. Arrêter l'aperçu avant de l'exécuter, puis redémarrer `bun run dev`.
- `bun run build` : réussi.
- `bun run lint` : réussi. Les avertissements de variables inutilisées du code importé sont neutralisés par fichier sans modifier sa logique.
- PostgreSQL : connexion réussie ; tables initialisées.
- Telegram `getMe` : token valide.
- API : santé, catalogue, statistiques, administration, refus d'accès admin sans mot de passe et redirection claim testés.
- Navigateur : catalogue des 12 jeux, connexion admin, affichage mobile sans débordement horizontal, pages stats/prédictions et navigation vers les jeux vérifiés.
- Aucun message Telegram, dépôt réel, diffusion ou suppression n'a été déclenché pendant ces tests.

La publication publique doit être relancée depuis l'interface Runable. Le succès des tests du bundle ne constitue pas une confirmation que la nouvelle version est déjà publiée.

## Limites conservées

Les failles et la génération aléatoire de certains signaux/statistiques signalées lors de l'audit restent présentes, conformément à la demande de conserver l'application actuelle. La disponibilité des services de jeux externes et des liens de session intégrés n'est pas garantie par ces tests.