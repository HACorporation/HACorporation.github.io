import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const mainContent = document.getElementById("main-content");
  if (user) {
    if (mainContent) mainContent.style.display = "block";
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

