import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const mainContent = document.getElementById("main-content");
  if (user) {
    if (mainContent) {
      mainContent.style.display = "block";
      
      // Le damos 100ms al navegador para que el rectangulo deje de medir 0px
      setTimeout(() => {
        if (typeof window.triggerResize === "function") {
          window.triggerResize();
        }
      }, 100);
    }
  } else {
    window.location.href = "login.html";
  }
});

const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "login.html";
        });
    };
}



