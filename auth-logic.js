import { auth } from "./firebase-config.js"; 

import {
  signInWithPopup,
  FacebookAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


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

// Lógica para Facebook
document.getElementById("facebook-login").onclick = () => {
  const provider = new FacebookAuthProvider();
  
  // Opcional: Esto ayuda a pedir permisos específicos si fuera necesario
  provider.addScope('email');

  signInWithPopup(auth, provider)
    .then((result) => {
        console.log("Usuario entró con Facebook:", result.user);
        window.location.href = "index.html";
    })
    .catch((error) => {
        console.error("Error con Facebook:", error.code);
        alert("Error al conectar con Facebook: " + error.message);
    });
};





