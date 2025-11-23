// auth.js
import { auth, db, storage } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// small helper
function clean(v) {
  return v ? v.trim() : "";
}

// ================= REGISTER =================

const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("registerMessage");
    msg.textContent = "";
    msg.className = "";

    const photosInput = document.getElementById("regPhotos");
    const name = clean(document.getElementById("regName").value);
    const age = Number(document.getElementById("regAge").value);
    const gender = clean(document.getElementById("regGender").value);
    const country = clean(document.getElementById("regCountry").value);
    const bio = clean(document.getElementById("regBio").value);
    const interestsRaw = clean(document.getElementById("regInterests").value);
    const email = clean(document.getElementById("regEmail").value);
    const password = document.getElementById("regPassword").value;

    if (!photosInput.files.length) {
      msg.textContent = "Please upload at least one photo.";
      msg.className = "error";
      return;
    }

    if (!name || !age || !gender || !country || !bio || !interestsRaw || !email || !password) {
      msg.textContent = "Please fill in all fields.";
      msg.className = "error";
      return;
    }

    if (age < 18) {
      msg.textContent = "You must be 18+.";
      msg.className = "error";
      return;
    }

    try {
      msg.textContent = "Creating account...";

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Upload photos
      const files = Array.from(photosInput.files);
      const photoURLs = [];

      for (const file of files) {
        const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoURLs.push(url);
      }

      const interests = interestsRaw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        age,
        gender,
        country,
        bio,
        interests,
        photos: photoURLs,
        mainPhoto: photoURLs[0] || null,
        createdAt: serverTimestamp()
      });

      msg.textContent = "Account created! Redirecting...";
      msg.className = "success";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);

    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Error creating account.";
      msg.className = "error";
    }
  });
}

// ================= LOGIN =================

const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("loginMessage");
    msg.textContent = "";
    msg.className = "";

    const email = clean(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      msg.textContent = "Enter email & password.";
      msg.className = "error";
      return;
    }

    try {
      msg.textContent = "Signing in...";
      await signInWithEmailAndPassword(auth, email, password);
      msg.textContent = "Success!";
      msg.className = "success";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);

    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Login failed.";
      msg.className = "error";
    }
  });
}

// auto redirect
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("index.html")) {
    window.location.href = "home.html";
  }
});
