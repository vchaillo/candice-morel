// Firebase Authentication: configure these public values after creating your Firebase web app.
// The Firebase config is public; never put service-account keys or passwords here.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};
// Copy the UID of Candice's Firebase Authentication account here.
// Only this UID may access the Studio UI.
const allowedAdminUid = "";
if (firebaseConfig.apiKey && allowedAdminUid) {
  const [{ initializeApp }, { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js")
  ]);
  const auth = getAuth(initializeApp(firebaseConfig));
  window.firebaseSignIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user.uid !== allowedAdminUid) {
      await signOut(auth);
      throw new Error("Unauthorized user");
    }
  };
  window.firebaseSignOut = () => signOut(auth);
  onAuthStateChanged(auth, async user => {
    if (user && user.uid !== allowedAdminUid) {
      await signOut(auth);
      return;
    }
    window.onFirebaseUser?.(user);
  });
}
