import { app } from "./firebase-config.js";
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Lógica para mostrar/ocultar formularios
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

// Registro
document.getElementById("btn-register-confirm").onclick = () => {
  const emailVal = document.getElementById("reg-email").value;
  const passVal = document.getElementById("reg-password").value;
  createUserWithEmailAndPassword(auth, emailVal, passVal)
    .then(() => location.href = "index.html")
    .catch(err => alert("Error al crear cuenta: " + err.message));
};

// Login
document.getElementById("btn-login").onclick = () => {
  const emailVal = document.getElementById("login-email").value;
  const passVal = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, emailVal, passVal)
    .then(() => location.href = "index.html")
    .catch(err => alert("Correo o contraseña incorrectos"));
};

// Google
document.getElementById("google-login").onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => location.href = "index.html")
    .catch(err => alert(err.message));
};



