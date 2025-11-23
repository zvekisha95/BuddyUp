// auth.js – ФИНАЛНА ВЕРЗИЈА (работи 100%)
import { auth, db, storage } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

function clean(v) {
  return v ? v.trim() : "";
}

// ================= REGISTER =================
document.getElementById("registerBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("registerMessage");
  msg.textContent = "";
  msg.className = "";

  const photosInput = document.getElementById("regPhotos");
  const name = clean(document.getElementById("regName")?.value);
  const age = Number(document.getElementById("regAge")?.value);
  const gender = clean(document.getElementById("regGender")?.value);
  const country = clean(document.getElementById("regCountry")?.value);
  const bio = clean(document.getElementById("regBio")?.value);
  const interestsRaw = clean(document.getElementById("regInterests")?.value);
  const email = clean(document.getElementById("regEmail")?.value);
  const password = document.getElementById("regPassword")?.value;

  // Валидација
  if (!photosInput?.files.length) return msg.textContent = "Качи барем една слика.", msg.className = "error";
  if (!name || isNaN(age) || !gender || !country || !bio || !interestsRaw || !email || !password) 
    return msg.textContent = "Пополни ги сите полиња.", msg.className = "error";
  if (age < 18 || age > 99) return msg.textContent = "Мора да имаш 18–99 години.", msg.className = "error";
  if (password.length < 6) return msg.textContent = "Лозинката мора да има барем 6 знаци.", msg.className = "error";

  try {
    msg.textContent = "Креирам акаунт...";
    msg.className = "info";

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Качување слики
    const photoURLs = [];
    for (const file of photosInput.files) {
      if (file.size > 15 * 1024 * 1024) continue;
      try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const storageRef = ref(storage, `profilePhotos/${uid}/${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoURLs.push(url);
      } catch (err) {
        console.warn("Грешка при качување слика:", err);
      }
    }

    // Секогаш зачувај во Firestore
    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      age,
      gender,
      country,
      bio,
      interests: interestsRaw.split(",").map(s => s.trim()).filter(Boolean),
      photos: photoURLs,
      mainPhoto: photoURLs[0] || null,
      instagram: null,
      discord: null,
      platforms: null,
      relationshipGoal: null,
      createdAt: serverTimestamp()
    });

    msg.textContent = "Успешно! Се пренасочуваш...";
    msg.className = "success";
    setTimeout(() => location.href = "home.html", 1200);

  } catch (err) {
    console.error(err);
    const txt = err.code === "auth/email-already-in-use" ? "Email-от е зафатен." :
                err.code === "auth/weak-password" ? "Лозинката е преслаба." :
                err.code === "auth/invalid-email" ? "Невалиден email." : "Грешка при регистрација.";
    msg.textContent = txt;
    msg.className = "error";
  }
});

// ================= LOGIN =================
document.getElementById("loginBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("loginMessage");
  msg.textContent = "";
  msg.className = "";

  const email = clean(document.getElementById("loginEmail")?.value);
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) return msg.textContent = "Внеси email и лозинка.", msg.className = "error";

  try {
    msg.textContent = "Се логираш...";
    msg.className = "info";

    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      return msg.textContent = "Немаш профил. Регистрирај се повторно.", msg.className = "error";
    }

    msg.textContent = "Успешно се логираше!";
    msg.className = "success";
    setTimeout(() => location.href = "home.html", 800);

  } catch (err) {
    console.error(err);
    const txt = (err.code === "auth/user-not-found" || err.code === "auth/wrong-password")
      ? "Погрешни податоци." : "Грешка при најава.";
    msg.textContent = txt;
    msg.className = "error";
  }
});

// Авто редирект ако си веќе логиран
onAuthStateChanged(auth, async (user) => {
  if (user && location.pathname.includes("index.html")) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) location.href = "home.html";
  }
});
