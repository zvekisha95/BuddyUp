// profile.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
const profilePage = document.getElementById("profilePage");

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProfile(currentUid) {
  const targetUid = getQueryId();
  if (!targetUid) {
    profilePage.innerHTML = `<p style="color:#fca5a5;">Profile not found.</p>`;
    return;
  }

  if (targetUid === currentUid) {
    profilePage.innerHTML = `<p style="color:#9ca3af;">This is your own profile. We can later add "Edit profile" here.</p>`;
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", targetUid));
    if (!snap.exists()) {
      profilePage.innerHTML = `<p style="color:#fca5a5;">Profile does not exist.</p>`;
      return;
    }

    const u = snap.data();
    const name = escapeHtml(u.name || "Unknown");
    const age = u.age ? `${u.age}` : "";
    const country = escapeHtml(u.country || "");
    const bio = escapeHtml(u.bio || "");
    const interests = Array.isArray(u.interests) ? u.interests : [];
    const photos = Array.isArray(u.photos) && u.photos.length ? u.photos : [];

    const mainPhoto = photos[0] || "";

    profilePage.innerHTML = `
      <section class="profile-photos">
        ${mainPhoto
          ? `<img src="${mainPhoto}" alt="${name}" id="mainPhoto" class="profile-main-photo" />`
          : `<div style="height:260px;border-radius:20px;background:#111827;border:1px dashed #4b5563;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#9ca3af;">
               No photos
             </div>`
        }
        ${
          photos.length > 1
            ? `<div class="thumbs-row">
                ${photos
                  .map(
                    (p, i) => `
                  <img src="${p}"
                       data-index="${i}"
                       class="${i === 0 ? "active" : ""}"
                       />
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </section>

      <section class="profile-info-card">
        <div class="profile-name-row">
          <h1>${name}${age ? ", " + age : ""}</h1>
        </div>
        <div class="profile-country">${country}</div>

        <p class="profile-bio">${bio}</p>

        <div class="profile-tags">
          ${interests
            .map((i) => `<span class="profile-tag">${escapeHtml(i)}</span>`)
            .join("")}
        </div>

        <div class="profile-actions">
          <button class="btn-pass" id="passBtn">✕ Pass</button>
          <button class="btn-like" id="likeBtn">♥ Like</button>
          <button class="btn-chat" id="chatBtn">💬 Open Chat</button>
        </div>

        <div class="profile-status" id="profileStatus">
          Decide if you want to Like or Pass. If both press Like, it's a match and you can chat.
        </div>
      </section>
    `;

    // Photo thumbs logic
    const mainPhotoEl = document.getElementById("mainPhoto");
    const thumbs = document.querySelectorAll(".thumbs-row img");
    thumbs.forEach((img) => {
      img.addEventListener("click", () => {
        const idx = Number(img.getAttribute("data-index") || 0);
        if (photos[idx] && mainPhotoEl) {
          mainPhotoEl.src = photos[idx];
          thumbs.forEach((t) => t.classList.remove("active"));
          img.classList.add("active");
        }
      });
    });

    const status = document.getElementById("profileStatus");
    const likeBtn = document.getElementById("likeBtn");
    const passBtn = document.getElementById("passBtn");
    const chatBtn = document.getElementById("chatBtn");

    if (passBtn) {
      passBtn.addEventListener("click", () => {
        status.textContent = "You passed on this profile.";
      });
    }

    if (chatBtn) {
      chatBtn.addEventListener("click", () => {
        // Chat ќе работи без match, но идеално да е после Like + match
        window.location.href = `chat.html?with=${encodeURIComponent(targetUid)}`;
      });
    }

    if (likeBtn) {
      likeBtn.addEventListener("click", async () => {
        status.textContent = "Sending like...";
        likeBtn.disabled = true;
        try {
          const forwardId = `${currentUid}_${targetUid}`;
          const backwardId = `${targetUid}_${currentUid}`;

          // Save like
          await setDoc(doc(db, "likes", forwardId), {
            from: currentUid,
            to: targetUid,
            createdAt: serverTimestamp()
          });

          // Check if they already liked you
          const backwardSnap = await getDoc(doc(db, "likes", backwardId));
          if (backwardSnap.exists()) {
            const matchId = [currentUid, targetUid].sort().join("_");
            await setDoc(doc(db, "matches", matchId), {
              users: [currentUid, targetUid],
              createdAt: serverTimestamp(),
              lastMessageAt: null
            });

            status.textContent = "It's a match! You can now chat.";
          } else {
            status.textContent = "Like sent. If they like you back, it's a match.";
          }
        } catch (err) {
          console.error(err);
          status.textContent = "Error sending like.";
          likeBtn.disabled = false;
        }
      });
    }
  } catch (err) {
    console.error(err);
    profilePage.innerHTML = `<p style="color:#fca5a5;">Error loading profile.</p>`;
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  loadProfile(user.uid);
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
