// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtHe4ecKhlwFZ8fyvb7NKdVpVTZfTlvEk",
  authDomain: "buddyup-78f9c.web.app",   // ✔ FIXED
  projectId: "buddyup-78f9c",
  storageBucket: "buddyup-78f9c.appspot.com", // ✔ CORRECT
  messagingSenderId: "329602566744",
  appId: "1:329602566744:web:ab4174964733773b4bd82d"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
