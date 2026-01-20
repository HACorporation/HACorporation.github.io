import { app } from "./firebase-config.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// --- 1. Lógica para cambiar entre Login y Registro ---
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

document.getElementById("go-to-register").onclick = (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
};

document.getElementById("go-to-login").onclick = (e) => {
    e.preventDefault();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
};

// --- 2. Lógica de Registro ---
document.getElementById("btn-register-confirm").onclick = () => {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => location.href = "index.html")
    .catch(err => alert("Error al crear cuenta: " + err.message));
};

// --- 3. Lógica de Login ---
document.getElementById("btn-login").onclick = () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => location.href = "index.html")
    .catch(err => alert("Usuario o contraseña incorrectos"));
};

// --- 4. Google ---
document.getElementById("google-login").onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => location.href = "index.html")
    .catch(err => alert(err.message));
};

