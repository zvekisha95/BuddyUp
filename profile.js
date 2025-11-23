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

function getTargetUid() {
  return new URLSearchParams(window.location.search).get("id");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c])
  );
}

async function loadProfile(currentUid) {
  const targetUid = getTargetUid();
  if (!targetUid) {
    profilePage.innerHTML = `<p style="color:#fca5a5;grid-column:1/-1;">Profile not found.</p>`;
    return;
  }

  // Ако е твој профил → префрли на my-profile
  if (targetUid === currentUid) {
    window.location.href = "my-profile.html";
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", targetUid));
    if (!userSnap.exists()) {
      profilePage.innerHTML = `<p style="color:#fca5a5;grid-column:1/-1;">User not found.</p>`;
      return;
    }

    const u = userSnap.data();
    const photos = Array.isArray(u.photos) ? u.photos : [];
    const mainPhoto = u.mainPhoto || photos[0] || "";

    const name = escapeHtml(u.name || "Unknown");
    const age = u.age ? `, ${u.age}` : "";
    const country = escapeHtml(u.country || "");
    const bio = escapeHtml(u.bio || "No bio yet.");
    const interests = Array.isArray(u.interests) ? u.interests : [];

    // Проверка дали веќе има лајк и дали е матч
    const likeId = `${currentUid}_${targetUid}`;
    const reverseLikeId = `${targetUid}_${currentUid}`;
    const matchId = [currentUid, targetUid].sort().join("_");

    const [myLikeSnap, theirLikeSnap, matchSnap] = await Promise.all([
      getDoc(doc(db, "likes", likeId)),
      getDoc(doc(db, "likes", reverseLikeId)),
      getDoc(doc(db, "matches", matchId))
    ]);

    const alreadyLiked = myLikeSnap.exists();
    const theyLikedMe = theirLikeSnap.exists();
    const isMatch = matchSnap.exists();

    profilePage.innerHTML = `
      <section class="profile-photos">
        ${mainPhoto
          ? `<img src="${mainPhoto}" alt="${name}" id="mainPhoto" class="profile-main-photo" />`
          : `<div style="height:300px;background:#111827;border-radius:20px;display:flex;align-items:center;justify-content:center;color:#64748b;">No photos yet</div>`
        }
        ${photos.length > 1 ? `
          <div class="thumbs-row">
            ${photos.map((url, i) => `
              <img src="${url}" data-index="${i}" class="${i===0 ? 'active' : ''}" />
            `).join("")}
          </div>` : ""
        }
      </section>

      <section class="profile-info-card">
        <div class="profile-name-row">
          <h1>${name}${age}</h1>
        </div>
        <div class="profile-country">${country}</div>
        <p class="profile-bio">${bio}</p>

        ${interests.length ? `
          <div class="profile-tags">
            ${interests.map(t => `<span class="profile-tag">${escapeHtml(t)}</span>`).join("")}
          </div>` : ""
        }

        <div class="profile-actions">
          ${isMatch || theyLikedMe
            ? `<button class="btn-chat" id="chatBtn">💬 Chat Now</button>`
            : alreadyLiked
              ? `<button class="btn-like" disabled>❤️ Like Sent</button>`
              : `<button class="btn-like" id="likeBtn">❤️ Like</button>`
          }
          <button class="btn-pass" id="passBtn">✕ Pass</button>
        </div>

        <div class="profile-status" id="status">
          ${isMatch ? "🎉 It's a match! You can chat!" :
           theyLikedMe ? "❤️ They liked you back! It's a match!" :
           alreadyLiked ? "❤️ You already liked this person." :
           "Like or Pass?"}
        </div>
      </section>
    `;

    // Photo switching
    document.querySelectorAll(".thumbs-row img").forEach(img => {
      img.addEventListener("click", () => {
        const src = img.src;
        const main = document.getElementById("mainPhoto");
        if (main) main.src = src;
        document.querySelectorAll(".thumbs-row img").forEach(t => t.classList.remove("active"));
        img.classList.add("active");
      });
    });

    // Buttons
    const statusEl = document.getElementById("status");

    document.getElementById("passBtn")?.addEventListener("click", () => {
      statusEl.textContent = "You passed on this profile.";
    });

    document.getElementById("chatBtn")?.addEventListener("click", () => {
      window.location.href = `chat.html?with=${targetUid}`;
    });

    document.getElementById("likeBtn")?.addEventListener("click", async () => {
      const likeBtn = document.getElementById("likeBtn");
      likeBtn.disabled = true;
      statusEl.textContent = "Sending like...";

      try {
        await setDoc(doc(db, "likes", likeId), {
          from: currentUid,
          to: targetUid,
          createdAt: serverTimestamp()
        });

        if (theyLikedMe) {
          await setDoc(doc(db, "matches", matchId), {
            users: [currentUid, targetUid],
            createdAt: serverTimestamp()
          });
          statusEl.textContent = "🎉 It's a match! You can now chat.";
          likeBtn.outerHTML = `<button class="btn-chat" id="chatBtn">💬 Chat Now</button>`;
          document.getElementById("chatBtn")?.addEventListener("click", () => {
            window.location.href = `chat.html?with=${targetUid}`;
          });
        } else {
          statusEl.textContent = "❤️ Like sent! Waiting for them to like you back...";
          likeBtn.textContent = "❤️ Like Sent";
          likeBtn.disabled = true;
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error sending like.";
        likeBtn.disabled = false;
      }
    });

  } catch (err) {
    console.error(err);
    profilePage.innerHTML = `<p style="color:#fca5a5;grid-column:1/-1;">Error loading profile.</p>`;
  }
}

// Auth
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  loadProfile(user.uid);
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
