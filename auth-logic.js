import { app } from "./firebase-config.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInWithPopup, GoogleAuthProvider, FacebookAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Intercambio de formularios
const loginDiv = document.getElementById('login-form');
const registerDiv = document.getElementById('register-form');

document.getElementById('go-to-register').onclick = () => { loginDiv.style.display = 'none'; registerDiv.style.display = 'block'; };
document.getElementById('go-to-login').onclick = () => { registerDiv.style.display = 'none'; loginDiv.style.display = 'block'; };

// --- CREAR CUENTA NUEVA ---
document.getElementById('btn-register-confirm').onclick = async () => {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        window.location.href = "index.html"; // Al crearse, entra directo
    } catch (error) { alert("Error: " + error.message); }
};

// --- INICIAR SESIÓN EXISTENTE ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "index.html";
    } catch (error) { alert("Usuario o contraseña incorrectos"); }
};

// --- REDES SOCIALES ---
document.getElementById('google-login').onclick = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        window.location.href = "index.html";
    } catch (error) { console.error(error); }
};