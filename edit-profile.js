// edit-profile.js
import { auth, db, storage } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const editPage = document.getElementById("editPage");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let currentPhotos = [];
let removedIndexes = new Set();

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderForm(profile) {
  const name = escapeHtml(profile.name || "");
  const age = profile.age || "";
  const gender = profile.gender || "";
  const country = escapeHtml(profile.country || "");
  const bio = escapeHtml(profile.bio || "");
  const interests = Array.isArray(profile.interests)
    ? profile.interests.join(", ")
    : "";
  const instagram = escapeHtml(profile.instagram || "");
  const discord = escapeHtml(profile.discord || "");
  const platforms = escapeHtml(profile.platforms || "");
  const relationshipGoal = escapeHtml(profile.relationshipGoal || "");
  const email = escapeHtml(auth.currentUser?.email || "");

  currentPhotos = Array.isArray(profile.photos) ? profile.photos : [];
  removedIndexes = new Set();

  const gallery = currentPhotos
    .map(
      (url, i) => `
      <div class="edit-thumb" data-index="${i}">
        <img src="${url}" alt="Photo ${i + 1}" />
        <div class="edit-thumb-badge">${i === 0 ? "Main photo" : "Tap to remove"}</div>
      </div>
    `
    )
    .join("");

  editPage.innerHTML = `
    <section class="edit-card">
      <div class="edit-inner">
        <h2>Profile details</h2>

        <label>Email (cannot be changed)</label>
        <input type="text" value="${email}" disabled />

        <label>Full Name</label>
        <input type="text" id="editName" value="${name}" />

        <label>Age</label>
        <input type="number" id="editAge" min="18" max="99" value="${age}" />

        <label>Gender</label>
        <select id="editGender">
          <option value="">Choose...</option>
          <option value="male"${gender === "male" ? " selected" : ""}>Male</option>
          <option value="female"${gender === "female" ? " selected" : ""}>Female</option>
          <option value="other"${gender === "other" ? " selected" : ""}>Other</option>
        </select>

        <label>Country</label>
        <input type="text" id="editCountry" value="${country}" />

        <label>Short Bio</label>
        <textarea id="editBio">${bio}</textarea>

        <label>Interests (comma separated)</label>
        <input type="text" id="editInterests" value="${interests}" />

        <label>Instagram (optional)</label>
        <input type="text" id="editInstagram" value="${instagram}" placeholder="@yourhandle" />

        <label>Discord (optional)</label>
        <input type="text" id="editDiscord" value="${discord}" placeholder="name#1234" />

        <label>Gaming platforms (optional)</label>
        <input type="text" id="editPlatforms" value="${platforms}" placeholder="PC, PS5, Xbox..." />

        <label>Relationship goal (optional)</label>
        <input type="text" id="editGoal" value="${relationshipGoal}" placeholder="serious, casual, friends..." />

        <button class="btn-save-profile" id="saveProfileBtn">Save changes</button>
        <div class="edit-status" id="editStatus"></div>
      </div>
    </section>

    <section class="edit-card">
      <div class="edit-inner">
        <h2>Photos</h2>

        <label>Current photos (tap to mark/unmark for removal)</label>
        <div class="edit-gallery" id="editGallery">
          ${gallery || '<div style="font-size:0.85rem;color:#9ca3af;">You have no photos yet.</div>'}
        </div>

        <label style="margin-top:10px;">Add new photos (you can upload more)</label>
        <input type="file" id="newPhotos" accept="image/*" multiple />

        <p style="font-size:0.78rem;color:#9ca3af;margin-top:6px;">
          First photo in your gallery is treated as your main profile photo.
        </p>
      </div>
    </section>
  `;

  // Gallery click events
  const galleryEl = document.getElementById("editGallery");
  if (galleryEl) {
    galleryEl.querySelectorAll(".edit-thumb").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-index") || 0);
        if (removedIndexes.has(idx)) {
          removedIndexes.delete(idx);
          el.classList.remove("removed");
          const badge = el.querySelector(".edit-thumb-badge");
          if (badge) {
            badge.textContent = idx === 0 ? "Main photo" : "Tap to remove";
          }
        } else {
          removedIndexes.add(idx);
          el.classList.add("removed");
          const badge = el.querySelector(".edit-thumb-badge");
          if (badge) {
            badge.textContent = "Will be removed";
          }
        }
      });
    });
  }

  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveProfileChanges);
  }
}

async function saveProfileChanges() {
  const statusEl = document.getElementById("editStatus");
  if (!currentUser || !statusEl) return;

  const name = document.getElementById("editName").value.trim();
  const age = Number(document.getElementById("editAge").value);
  const gender = document.getElementById("editGender").value;
  const country = document.getElementById("editCountry").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  const interestsRaw = document.getElementById("editInterests").value.trim();
  const instagram = document.getElementById("editInstagram").value.trim();
  const discord = document.getElementById("editDiscord").value.trim();
  const platforms = document.getElementById("editPlatforms").value.trim();
  const relationshipGoal = document.getElementById("editGoal").value.trim();
  const newPhotosInput = document.getElementById("newPhotos");

  if (!name || !age || !gender || !country || !bio || !interestsRaw) {
    statusEl.textContent = "Please fill in all required fields.";
    return;
  }

  if (age < 18) {
    statusEl.textContent = "You must be at least 18 years old.";
    return;
  }

  statusEl.textContent = "Saving changes...";

  try {
    // Remove photos marked for deletion (from the profile view, не мора да ги бришеме од Storage)
    const remainingPhotos = currentPhotos.filter((_, idx) => !removedIndexes.has(idx));

    // Upload new photos
    const addedUrls = [];
    if (newPhotosInput && newPhotosInput.files.length) {
      const files = Array.from(newPhotosInput.files);
      for (const file of files) {
        const storageRef = ref(
          storage,
          `profilePhotos/${currentUser.uid}/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        addedUrls.push(url);
      }
    }

    const finalPhotos = [...remainingPhotos, ...addedUrls];
    const interests = interestsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const mainPhoto = finalPhotos[0] || null;

    await updateDoc(doc(db, "users", currentUser.uid), {
      name,
      age,
      gender,
      country,
      bio,
      interests,
      instagram: instagram || null,
      discord: discord || null,
      platforms: platforms || null,
      relationshipGoal: relationshipGoal || null,
      photos: finalPhotos,
      mainPhoto
    });

    statusEl.textContent = "Profile updated successfully.";
    setTimeout(() => {
      window.location.href = "my-profile.html";
    }, 800);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error saving changes.";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  }

  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (!snap.exists()) {
      editPage.innerHTML = `
        <section class="edit-card">
          <div class="edit-inner" style="font-size:0.9rem;color:#9ca3af;">
            Your profile document does not exist. Try registering again.
          </div>
        </section>
      `;
      return;
    }
    renderForm(snap.data());
  } catch (err) {
    console.error(err);
    editPage.innerHTML = `
      <section class="edit-card">
        <div class="edit-inner" style="font-size:0.9rem;color:#fca5a5;">
          Error loading profile for editing.
        </div>
      </section>
    `;
  }
});
