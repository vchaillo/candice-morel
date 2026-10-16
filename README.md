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
