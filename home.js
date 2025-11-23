// home.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById("profilesContainer");
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

function renderLoading(text = "Loading profiles...") {
  if (!container) return;
  container.innerHTML = `
    <div style="grid-column:1/-1;color:#9ca3af;font-size:0.9rem;padding:12px 0;">
      ${escapeHtml(text)}
    </div>
  `;
}

async function loadProfiles(currentUid) {
  renderLoading();

  try {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const cards = [];
    snap.forEach((docSnap) => {
      const u = docSnap.data();
      if (u.uid === currentUid) return; // skip self

      const name = escapeHtml(u.name || "Unknown");
      const age = u.age ? `${u.age}` : "";
      const country = escapeHtml(u.country || "");
      const bio = escapeHtml(u.bio || "");
      const mainPhoto = u.mainPhoto || (u.photos && u.photos[0]) || "";
      const interests = Array.isArray(u.interests) ? u.interests : [];

      cards.push(`
        <article class="profile-card" onclick="window.location.href='profile.html?id=${encodeURIComponent(u.uid)}'">
          <div class="profile-inner">
            ${mainPhoto ? `<img src="${mainPhoto}" alt="${name}" class="profile-photo" />` : ""}
            <h3>${name}${age ? ", " + age : ""}</h3>
            <div class="profile-meta">${country}</div>
            <p>${bio}</p>
            <div class="tags">
              ${interests.slice(0, 4).map(i => `<span>${escapeHtml(i)}</span>`).join("")}
            </div>
            <div class="profile-footer">
              <div class="status-pill">
                <span class="status-dot"></span>
                <span>Active recently</span>
              </div>
              <button class="profile-btn" type="button">
                View profile →
              </button>
            </div>
          </div>
        </article>
      `);
    });

    if (!cards.length) {
      renderLoading("No profiles yet. Be the first one!");
    } else {
      container.innerHTML = cards.join("");
    }
  } catch (err) {
    console.error(err);
    renderLoading("Error loading profiles.");
  }
}

// Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  loadProfiles(user.uid);
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
