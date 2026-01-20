import { app } from "./firebase-config.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Referencias a los cuadros de texto
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// 🔹 Registro (Crear cuenta) - CORREGIDO
document.getElementById("register").onclick = () => {
  const emailVal = emailInput.value;
  const passwordVal = passwordInput.value;

  createUserWithEmailAndPassword(auth, emailVal, passwordVal)
    .then(() => location.href = "index.html")
    .catch(err => alert("Error al crear cuenta: " + err.message));
};

// 🔹 Login (Entrar) - CORREGIDO
document.getElementById("loginEmail").onclick = () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(() => location.href = "index.html")
    .catch(err => alert("Usuario o contraseña incorrectos"));
};

// 🔹 Google
document.getElementById("google").onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => location.href = "index.html")
    .catch(err => alert(err.message));
};
