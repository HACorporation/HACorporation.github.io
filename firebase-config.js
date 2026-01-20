import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDgL66IxKgHYFm6r6Uo20g5TWcta6Rq-3k",
    authDomain: "login-15534.firebaseapp.com",
    projectId: "login-15534",
    storageBucket: "login-15534.firebasestorage.app",
    messagingSenderId: "706532564485",
    appId: "1:706532564485:web:d098e34458c889ee13866c"
};

// Inicializamos la App
const app = initializeApp(firebaseConfig);

// Inicializamos y exportamos Auth directamente desde aquí para evitar el error de registro
export const auth = getAuth(app);
