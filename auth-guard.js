import { app } from "./firebase-config.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Protege la página
onAuthStateChanged(auth, (user) => {
  const mainContent = document.getElementById("main-content");
  if (user) {
    if (mainContent) mainContent.style.display = "block";
  } else {
    window.location.href = "login.html";
  }
});

// Configura el botón de cerrar sesión solo si existe en la página
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => console.error("Error al cerrar sesión:", error));
    };
}
