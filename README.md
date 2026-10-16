# Candice Morel — portfolio

Static portfolio deployed on GitHub Pages via GitHub Actions. The Studio UI supports local demo project editing; Firebase-backed project persistence is **not yet implemented**.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Sign-in method → Email/Password**. Do not enable Google or anonymous sign-in.
3. Create exactly one user for Candice in **Authentication → Users** with her own email and a strong password.
4. Copy that user's **UID** into `allowedAdminUid` in `firebase-auth.js`.
5. Copy the public web app configuration into `firebaseConfig` in the same file.
6. In Authentication settings, add your GitHub Pages domain to **Authorized domains** if necessary.
7. For future Firestore use, create Firestore and deploy `firestore.rules` after replacing `REPLACE_WITH_CANDICE_UID`.

**Security:** Firebase client-side UID checks only hide the Studio interface. They do not protect data by themselves. Firestore/Storage security rules must enforce the same UID restriction. Do not allow public account creation in your app; note that enabling Email/Password in Firebase may still allow accounts to be created through the Auth API, but such accounts will have no admin rights under UID-based rules.

## Contact form

Uses `mailto:` to open the visitor's email app. It does not send emails directly; a serverless email endpoint can be added later.

## Images and credits

The homepage and Gazes artwork link to assets from Candice's existing Wix portfolio. Verify ownership and reuse permissions, and replace these external URLs with original optimized assets supplied by Candice. The Skewered project image is temporarily reused from Gazes, **not an authentic Skewered image**. Demo content can be reset in the Studio.

## Deployment

Settings → Pages → Source: GitHub Actions. Push to `main` to deploy.


## Développement et qualité

Application statique en JavaScript natif : aucun serveur Node.js n'est nécessaire pour la servir.
Node.js 22 est utilisé pour les outils de développement et les tests.

```bash
npm install
npm run check
npm run format
npm run format:check
```

- `index.html` : structure et styles du site public et du Studio (CSS historique à extraire).
- `app.js` : intégration navigateur, Firebase Authentication, Firestore et interactions (module historique en cours de découpage).
- `src/core.js` : logique pure, validation des formulaires, droits d'affichage, recadrage et helpers réutilisables.
- `tests/core.test.js` : tests unitaires avec `node:test`, sans connexion Firebase.
- `firestore.rules` : règles d'accès à publier dans Firebase Console.
- `.github/workflows/deploy.yml` : contrôle qualité obligatoire avant le déploiement GitHub Pages.

**Important :** les tests automatisés actuels couvrent les fonctions pures. Ils ne remplacent pas des tests d'intégration Firebase, des tests navigateur ou un audit de sécurité. Avant la production VPS, ajouter ces vérifications, un verrouillage des dépendances, la séparation complète CSS/JS et des en-têtes HTTP de sécurité.

## Préparation VPS (non déployée)

Le futur workflow VPS devra construire ou assembler un répertoire public contenant `index.html`, `app.js`, `src/core.js`, `favicon.svg` et les autres assets réellement utilisés, puis transférer cet ensemble via SSH/rsync vers Nginx. Ne pas exposer les tests, fichiers de configuration et fichiers Git dans la racine web.

Les paramètres Firebase utilisés par le client ne sont pas des secrets serveur. L'accès administrateur doit continuer d'être appliqué par les règles Firestore, indépendamment du contrôle d'interface. Prévoir la configuration du domaine VPS dans les domaines autorisés de Firebase Authentication.
