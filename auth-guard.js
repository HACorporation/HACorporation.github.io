import { app } from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Si inició sesión, mostramos el contenido
    document.getElementById("main-content").style.display = "block";
  } else {
    // Si no, lo mandamos al login de inmediato
    window.location.href = "login.html";
  }
});
