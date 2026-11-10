# DVYS — identité existante conservée

Référence : archive `dyvs-main.zip` fournie par l'utilisateur. Aucune refonte visuelle ou fonctionnelle.

## Style
- Conserver les pages HTML et leurs CSS, polices, espacements et animations.
- Catalogue : fond bleu nuit `#000a14`, accent cyan `#00c8ff`, textes blancs, police Inter existante.
- Administration : présentation claire et mode sombre d'origine.
- Jeux : identités propres à chaque page conservées.
- Point d'entrée React plein écran, sans bordures ou marges ajoutées.

## Pages
- `/` : catalogue `/jeux/index.html`.
- `/admin` : panneau `/admin.html`.
- `/stats` : page `/stats.html`.
- `/predictions` : accès `/predictions.html`.
- `/jeux/*` : pages et ressources d'origine.

## Architecture
- Bun/Vite/React/Hono sur le port assigné Runable.
- Couche de compatibilité des handlers Vercel existants ; PostgreSQL Neon pour les tables originales.
- Pages et assets uniquement dans `packages/web/public/`.
- Secrets uniquement dans le `.env` racine ; ne pas publier les archives, skills ou exports.
