// auth.js
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function clean(v) { return v ? v.trim() : ""; }

// REGISTER
document.getElementById("registerBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("registerMessage");
  msg.innerHTML = ""; msg.className = "";

  const firstName = clean(document.getElementById("regFirstName")?.value);
  const lastName = clean(document.getElementById("regLastName")?.value);
  const email = clean(document.getElementById("regEmail")?.value);
  const pass = document.getElementById("regPassword")?.value;
  const confirm = document.getElementById("regConfirmPassword")?.value;
  const birthdate = document.getElementById("regBirthdate")?.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  if (!firstName || !lastName || !email || !pass || !confirm || !birthdate || !gender) {
    return msg.textContent = "Пополни ги сите полиња.", msg.className = "error";
  }
  if (pass !== confirm) return msg.textContent = "Лозинките не се совпаѓаат.", msg.className = "error";
  if (pass.length < 6) return msg.textContent = "Лозинката мора да има барем 6 знаци.", msg.className = "error";

  try {
    msg.innerHTML = "Се регистрираш...";
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    // Прати верификационен мејл
    await sendEmailVerification(user);

    // Зачувај ги сите податоци
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      firstName,
      lastName,
      email,
      birthdate,
      gender,
      fullName: `${firstName} ${lastName}`,
      photos: [],
      mainPhoto: null,
      emailVerified: false,
      createdAt: serverTimestamp()
    });

    msg.innerHTML = `
      <div style="color:#86efac;">
        Успешно се регистрира!<br><br>
        <strong>Провери го мејлот</strong> (и Spam) и кликни на линкот за да го активираш профилот.
      </div>
    `;

  } catch (err) {
    const txt = err.code === "auth/email-already-in-use" ? "Овој email е веќе во употреба." :
                err.code === "auth/invalid-email" ? "Невалиден email." : "Грешка при регистрација.";
    msg.textContent = txt; msg.className = "error";
  }
});

// LOGIN + Проверка за верификација
document.getElementById("loginBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("loginMessage");
  msg.textContent = ""; msg.className = "";

  const email = clean(document.getElementById("loginEmail")?.value);
  const pass = document.getElementById("loginPassword")?.value;

  if (!email || !pass) return msg.textContent = "Внеси email и лозинка.", msg.className = "error";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    if (!user.emailVerified) {
      msg.innerHTML = "Мејлот не е верификуван. Провери го мејлот и кликни на линкот.";
      msg.className = "error";
      await signOut(auth);
      return;
    }

    location.href = "home.html";

  } catch (err) {
    msg.textContent = "Погрешни податоци или мејлот не е верификуван.";
    msg.className = "error";
  }
});

// Авто редирект
onAuthStateChanged(auth, async (user) => {
  if (user && location.pathname.includes("index.html")) {
    if (user.emailVerified) {
      location.href = "home.html";
    }
  }
});
