// Public Firebase web configuration; never store passwords or service account keys here.
const firebaseConfig = {
  apiKey: "AIzaSyAacPZBD_EhHfbPjhaU9vIRJVFzv7ZSu7U",
  authDomain: "candice-morel.firebaseapp.com",
  projectId: "candice-morel",
  storageBucket: "candice-morel.firebasestorage.app",
  messagingSenderId: "755634623005",
  appId: "1:755634623005:web:e516ad21721b16569fecf4"
};
const ADMIN_UIDS = new Set(["9VuRSJuuEKc7fOQAjywrSIVB8Ql2", "DcTMZFM3YhO5os0GSnVs1FIFW272"]);
const [{ initializeApp }, { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged }] = await Promise.all([
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js")
]);
const auth = getAuth(initializeApp(firebaseConfig));
const assertAdmin = async user => {
  if (!user || !ADMIN_UIDS.has(user.uid)) {
    await signOut(auth);
    throw new Error("unauthorized");
  }
};
window.firebaseSignIn = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await assertAdmin(user);
};
window.firebaseGoogleSignIn = async () => {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  await assertAdmin(user);
};
window.firebaseSignOut = () => signOut(auth);
onAuthStateChanged(auth, async user => {
  if (user && !ADMIN_UIDS.has(user.uid)) {
    await signOut(auth);
    return;
  }
  window.onFirebaseUser?.(user);
});
