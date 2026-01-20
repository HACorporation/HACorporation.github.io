// 1. Importamos 'auth' ya inicializado desde tu config
import { auth } from "./firebase-config.js"; 

// 2. Importamos las funciones necesarias de la librería
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- NO PONGAS getAuth(app) AQUÍ, ya tenemos 'auth' arriba ---

// Lógica para cambiar entre formularios (Login / Registro)
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

// Registro de nuevos usuarios
document.getElementById("btn-register-confirm").onclick = () => {
  const emailVal = document.getElementById("reg-email").value;
  const passVal = document.getElementById("reg-password").value;
  
  createUserWithEmailAndPassword(auth, emailVal, passVal)
    .then(() => {
        window.location.href = "index.html";
    })
    .catch(err => alert("Error al crear cuenta: " + err.message));
};

// Inicio de sesión con correo
document.getElementById("btn-login").onclick = () => {
  const emailVal = document.getElementById("login-email").value;
  const passVal = document.getElementById("login-password").value;
  
  signInWithEmailAndPassword(auth, emailVal, passVal)
    .then(() => {
        window.location.href = "index.html";
    })
    .catch(err => alert("Correo o contraseña incorrectos"));
};

// Inicio de sesión con Google
document.getElementById("google-login").onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => {
        window.location.href = "index.html";
    })
    .catch(err => alert("Error con Google: " + err.message));
};




