import { app } from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    // IMPORTANTE: El ID "main-content" debe existir en el body de index.html
    document.getElementById("main-content").style.display = "block";
  } else {
    window.location.href = "login.html";
  }
});

document.getElementById("logout").onclick = (e) => {
    e.preventDefault();
    const auth = getAuth(app);
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
};
