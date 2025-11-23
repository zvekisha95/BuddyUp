// auth.js – РЕГИСТРАЦИЈА БЕЗ СЛИКИ
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function clean(v) { return v ? v.trim() : ""; }

// REGISTER
document.getElementById("registerBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("registerMessage");
  msg.textContent = ""; msg.className = "";

  const email = clean(document.getElementById("regEmail")?.value);
  const pass = document.getElementById("regPassword")?.value;
  const confirm = document.getElementById("regConfirmPassword")?.value;
  const birth = document.getElementById("regBirthdate")?.value;

  if (!email || !pass || !confirm || !birth) return msg.textContent = "Пополни сè.", msg.className = "error";
  if (pass !== confirm) return msg.textContent = "Лозинките не се совпаѓаат.", msg.className = "error";
  if (pass.length < 6) return msg.textContent = "Лозинка мин. 6 знаци.", msg.className = "error";

  const age = (() => {
    const t = new Date(); const b = new Date(birth);
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  })();
  if (age < 18) return msg.textContent = "Мора да имаш 18+ години.", msg.className = "error";

  try {
    msg.textContent = "Се регистрираш..."; msg.className = "info";
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid, email, birthdate: birth, age,
      name: "", country: "", bio: "", gender: "", interests: [], photos: [], mainPhoto: null,
      instagram: null, discord: null, platforms: null, relationshipGoal: null,
      createdAt: serverTimestamp()
    });

    msg.textContent = "Успешно! Пренасочување..."; msg.className = "success";
    setTimeout(() => location.href = "home.html", 1200);
  } catch (err) {
    console.error(err);
    const txt = err.code === "auth/email-already-in-use" ? "Email-от е зафатен." :
                err.code === "auth/invalid-email" ? "Невалиден email." : "Грешка при регистрација.";
    msg.textContent = txt; msg.className = "error";
  }
});

// LOGIN
document.getElementById("loginBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("loginMessage");
  msg.textContent = ""; msg.className = "";

  const email = clean(document.getElementById("loginEmail")?.value);
  const pass = document.getElementById("loginPassword")?.value;
  if (!email || !pass) return msg.textContent = "Внеси email и лозинка.", msg.className = "error";

  try {
    msg.textContent = "Се логираш..."; msg.className = "info";
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) { await signOut(auth); return msg.textContent = "Немаш профил.", msg.className = "error"; }

    msg.textContent = "Успешно!"; msg.className = "success";
    setTimeout(() => location.href = "home.html", 800);
  } catch (err) {
    msg.textContent = "Погрешни податоци."; msg.className = "error";
  }
});

// Авто редирект
onAuthStateChanged(auth, async (user) => {
  if (user && location.pathname.includes("index.html")) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) location.href = "home.html";
  }
});
