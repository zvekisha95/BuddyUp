// my-profile.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById("myProfileContainer");
const logoutBtn = document.getElementById("logoutBtn");

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showStatus(text) {
  if (!container) return;
  container.innerHTML = `
    <section class="glass-card">
      <div class="glass-inner" style="font-size:0.9rem;color:#9ca3af;">
        ${escapeHtml(text)}
      </div>
    </section>
  `;
}

async function loadMyProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      showStatus("Your profile is not created yet. Try signing up again.");
      return;
    }

    const u = snap.data();
    const name = escapeHtml(u.name || "Unknown");
    const age = u.age ? `${u.age}` : "";
    const country = escapeHtml(u.country || "");
    const bio = escapeHtml(u.bio || "");
    const interests = Array.isArray(u.interests) ? u.interests : [];
    const photos = Array.isArray(u.photos) && u.photos.length ? u.photos : [];
    const mainPhoto = u.mainPhoto || photos[0] || "";

    const instagram = escapeHtml(u.instagram || "");
    const discord = escapeHtml(u.discord || "");
    const platforms = escapeHtml(u.platforms || "");
    const relationshipGoal = escapeHtml(u.relationshipGoal || "");
    const email = escapeHtml(auth.currentUser?.email || "");

    container.innerHTML = `
      <section class="glass-card">
        <div class="glass-inner">
          ${
            mainPhoto
              ? `<img src="${mainPhoto}" alt="${name}" id="myMainPhoto" class="my-main-photo" />`
              : `<div style="height:260px;border-radius:20px;background:#111827;border:1px dashed #4b5563;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#9ca3af;">
                   You don't have a profile photo yet.
                 </div>`
          }

          ${
            photos.length > 1
              ? `<div class="my-thumbs">
                  ${photos
                    .map(
                      (p, i) => `
                    <img src="${p}" data-index="${i}" class="${
                        i === 0 ? "active" : ""
                      }" />
                  `
                    )
                    .join("")}
                 </div>`
              : ""
          }
        </div>
      </section>

      <section class="glass-card">
        <div class="glass-inner">
          <div class="my-name-row">
            <h1>${name}${age ? ", " + age : ""}</h1>
          </div>
          <div class="my-meta">${country}</div>

          <p class="my-bio">${bio}</p>

          <div class="my-tags">
            ${interests.map((i) => `<span class="my-tag">${escapeHtml(i)}</span>`).join("")}
          </div>

          <div class="my-extra-fields">
            <div><strong>Email:</strong> ${email || "—"}</div>
            <div><strong>Instagram:</strong> ${instagram || "—"}</div>
            <div><strong>Discord:</strong> ${discord || "—"}</div>
            <div><strong>Platforms:</strong> ${platforms || "—"}</div>
            <div><strong>Relationship goal:</strong> ${relationshipGoal || "—"}</div>
          </div>

          <div class="my-profile-actions">
            <button class="btn-edit-profile" id="editProfileBtn">✎ Edit Profile</button>
          </div>

          <div class="my-profile-status" id="myProfileStatus">
            This is how other people will see your profile.
          </div>
        </div>
      </section>
    `;

    // Photo switching
    const mainPhotoEl = document.getElementById("myMainPhoto");
    const thumbs = document.querySelectorAll(".my-thumbs img");
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

    const editBtn = document.getElementById("editProfileBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        window.location.href = "edit-profile.html";
      });
    }
  } catch (err) {
    console.error(err);
    showStatus("Error loading your profile.");
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  loadMyProfile(user.uid);
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
