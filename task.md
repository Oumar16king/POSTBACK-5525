 # DVYS — migration minimale Runable

## Demande et décisions
- Mettre le projet existant en ligne sur Runable, sans refonte visuelle ou fonctionnelle.
- Conserver les pages HTML, les chemins `/api/*`, les handlers et PostgreSQL.
- Intégrer une couche de compatibilité Hono et un point d'entrée React ; ne pas modifier les fichiers gérés par le template.
- Ne pas publier les archives, les secrets, les exports de dépôt ou les skills fournis.
- Ne pas modifier le webhook du bot existant, envoyer de messages ou déclencher de campagnes pendant les tests.
- La publication publique et le domaine se font dans l'interface Runable, pas via un outil sandbox.

## État
- [x] Projet téléchargé et audité.
- [x] Template Runable créé.
- [x] DATABASE_URL, BOT_TOKEN et ADMIN_PASSWORD fournis par formulaire sécurisé.
- [x] Copier les pages et assets utiles et adapter les handlers.
- [x] Vérifier PostgreSQL et Telegram sans effets de bord.
- [x] Compiler et tester les parcours web (build, lint, API, navigateur desktop/mobile).
- [x] Livrer l'application avec les limites et étapes d'activation.
- [x] Diagnostiquer l'échec de publication : chargement dynamique des modules CommonJS absents du bundle.
- [x] Remplacer ce chargement par des imports statiques et convertir uniquement la syntaxe des modules en ES modules.
- [x] Vérifier un bundle isolé avec Bun 1.3.14 Linux x64 baseline : démarrage, santé, PostgreSQL, 12 jeux, admin et fichiers publics.
- [x] Revalider l'aperçu Vite : API 200, 12 cartes, connexion admin et mobile sans débordement ; build et lint réussis.
- [ ] Relivrer la correction pour nouvelle tentative de publication depuis l'interface Runable.
- [ ] Confirmer le succès de la publication publique après cette nouvelle tentative.

## Configuration validée
- Neon ne permet pas la création d'un projet dans cette organisation gérée par Vercel.
- Base isolée `dvys_runable` créée dans `soft-frost-01478617`, branche `br-misty-mountain-b74clr3o` ; la base existante `neondb` n'est pas modifiée.
- PostgreSQL connecté, tables d'origine initialisées, 12 jeux présents dans l'archive ajoutés.
- BOT_USERNAME = Vantix_223_bot, token validé avec getMe ; webhook non configuré.
- Serveur Vite dans la session tmux `dvys-web`, port web assigné 4200.
- Documentation d'activation dans `DEPLOYMENT.md`.

## Limites connues
- Les failles recensées dans le projet original restent présentes à la demande de l'utilisateur.
- Le planificateur Vercel ne se transpose pas automatiquement à Runable : ne pas démarrer de diffusions automatiquement.
- La nouvelle base ne contient aucun ancien utilisateur, dépôt ou historique.
- L'activation des postbacks 1Win, du webhook Telegram et des tâches planifiées attend l'adresse publique et la configuration des fournisseurs externes.