// chat.js
import { auth, db, storage } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const logoutBtn = document.getElementById("logoutBtn");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const chatStatus = document.getElementById("chatStatus");
const chatAvatar = document.getElementById("chatAvatar");
const chatName = document.getElementById("chatName");
const chatSub = document.getElementById("chatSub");

let currentUser = null;
let otherUser = null;
let convId = null;

let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;

function getOtherUid() {
  const params = new URLSearchParams(window.location.search);
  return params.get("with");
}

function conversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
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

function renderMessage(msg, myUid) {
  const isMe = msg.from === myUid;
  const row = document.createElement("div");
  row.className = "msg-row " + (isMe ? "msg-me" : "msg-other");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + (isMe ? "me" : "other");

  if (msg.type === "text") {
    bubble.innerHTML = escapeHtml(msg.text || "");
  } else if (msg.type === "image") {
    bubble.innerHTML = escapeHtml(msg.text || "");
    if (msg.imageUrl) {
      const img = document.createElement("img");
      img.src = msg.imageUrl;
      img.className = "msg-image";
      bubble.appendChild(img);
    }
  } else if (msg.type === "audio") {
    bubble.innerHTML = escapeHtml(msg.text || "Voice message");
    if (msg.audioUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.audioUrl;
      audio.className = "msg-audio";
      bubble.appendChild(audio);
    }
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = msg.from === myUid ? "You" : "Them";

  bubble.appendChild(meta);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage(type, extra = {}) {
  if (!currentUser || !otherUser || !convId) return;

  const text = (messageInput.value || "").trim();
  if (type === "text" && !text) return;

  const msg = {
    from: currentUser.uid,
    to: otherUser.uid,
    type,
    text: type === "text" ? text : (extra.text || ""),
    imageUrl: extra.imageUrl || null,
    audioUrl: extra.audioUrl || null,
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "conversations", convId, "messages"), msg);
  if (type === "text") {
    messageInput.value = "";
  }
}

async function handleImageSend(file) {
  if (!file || !currentUser || !otherUser || !convId) return;
  chatStatus.textContent = "Uploading image...";

  const storageRef = ref(storage, `chatImages/${convId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await sendMessage("image", { text: "", imageUrl: url });

  chatStatus.textContent = "";
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    chatStatus.textContent = "Voice messages are not supported in this browser.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    recordingStartTime = Date.now();
    chatStatus.textContent = "Recording... (max 60s)";

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const durationMs = Date.now() - recordingStartTime;
      if (durationMs < 500) {
        chatStatus.textContent = "Recording too short.";
        return;
      }
      if (durationMs > 60000) {
        chatStatus.textContent = "Recording trimmed to 60s.";
      } else {
        chatStatus.textContent = "Uploading voice message...";
      }

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const fileName = `voice_${Date.now()}.webm`;
      const storageRef = ref(storage, `voiceMessages/${convId}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await sendMessage("audio", { audioUrl: url, text: "" });
      chatStatus.textContent = "";
    };

    mediaRecorder.start();

    // Auto stop after 60 sec
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 60000);

  } catch (err) {
    console.error(err);
    chatStatus.textContent = "Microphone access denied.";
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    mediaRecorder = null;
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

  const otherUid = getOtherUid();
  if (!otherUid) {
    chatStatus.textContent = "No user selected to chat with.";
    return;
  }

  convId = conversationId(currentUser.uid, otherUid);

  // Load other user info
  const otherSnap = await getDoc(doc(db, "users", otherUid));
  if (!otherSnap.exists()) {
    chatStatus.textContent = "User not found.";
    return;
  }
  otherUser = otherSnap.data();

  chatName.textContent = otherUser.name || "Buddy";
  chatSub.textContent = otherUser.country || "Online";

  if (otherUser.mainPhoto || (otherUser.photos && otherUser.photos[0])) {
    const img = document.createElement("img");
    img.src = otherUser.mainPhoto || otherUser.photos[0];
    chatAvatar.innerHTML = "";
    chatAvatar.appendChild(img);
  } else {
    chatAvatar.textContent = "";
  }

  // Listen for messages
  const q = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, (snap) => {
    messagesEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const msg = docSnap.data();
      renderMessage(msg, currentUser.uid);
    });
  });
});

// Send text
if (sendBtn) {
  sendBtn.addEventListener("click", async () => {
    await sendMessage("text");
  });
}

// Enter key send
if (messageInput) {
  messageInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await sendMessage("text");
    }
  });
}

// Image send
if (imageInput) {
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    imageInput.value = "";
    if (file) {
      await handleImageSend(file);
    }
  });
}

// Voice button toggles record / stop
if (voiceBtn) {
  let recording = false;
  voiceBtn.addEventListener("click", () => {
    if (!recording) {
      recording = true;
      voiceBtn.textContent = "⏹ Stop";
      startVoiceRecording();
    } else {
      recording = false;
      voiceBtn.textContent = "🎙 Voice";
      stopVoiceRecording();
    }
  });
}
