# 🌍 BuddyUp  
**Real People. Real Connections. Worldwide.**

BuddyUp is a modern web platform designed for meeting new people, making friends, and building real connections.  
Inspired by the best elements of Tinder, Bumble, and Instagram, BuddyUp provides a clean, dark-modern UI and smooth user experience powered by Firebase.

---

## 🚀 Features

### 👤 User Profiles
Users can create detailed profiles including:
- Full Name  
- Age  
- Gender  
- Country  
- Short Bio  
- Interests (comma-separated)  
- Multiple profile photos (unlimited)  
- Automatic main profile photo  
- Profile editing page  

---

### 🔍 Explore (Grid Layout)
The “Explore” section provides:
- Grid-style profile cards (Instagram-like)
- Photo, name, age, country, bio, interests
- Click-through to full user profiles
- Automatic filtering (excluding your own profile)

---

### 💬 Chat System (Planned)
Upcoming features include:
- Real-time chat (Firestore)
- Sending photos in chat
- Voice messages up to 60 seconds
- Match-based chat access

---

## 🛠 Technologies Used

| Technology | Purpose |
|-----------|---------|
| **Firebase Authentication** | Login & registration |
| **Firebase Firestore** | User profiles, chat, matches |
| **Firebase Storage** | Profile photos, voice messages |
| **JavaScript (ES6 Modules)** | App logic & UI interactions |
| **HTML + CSS** | Dark Modern UI |
| **Vercel** | Deployment |

---

## 📁 Project Structure

```
buddyup/
│── index.html
│── home.html
│── my-profile.html
│── profile.html
│── edit-profile.html
│── chat.html
│── style.css
│── firebase.js
│── auth.js
│── home.js
│── my-profile.js
│── profile.js
│── edit-profile.js
│── chat.js
└── README.md
```

---

## 🔧 Firebase Configuration

### 1. Initialize Firebase
Create a Firebase project, then add a Web App. Copy your Firebase config into:

```
firebase.js
```

### 2. Enable Firebase Services
Inside Firebase Console:

#### ✔ Authentication
- Email/Password → **Enable**

#### ✔ Firestore
- Create Firestore DB (Production mode recommended)

#### ✔ Storage
- Enable storage bucket

#### ✔ Authorized Domains
Add your deployed domain:

```
your-project.vercel.app
```

---

## 🔥 Recommended Firestore Rules

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId;
    }

    // Chats
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }

    // Messages
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📦 Deployment (Vercel)

1. Push the project to GitHub  
2. Go to https://vercel.com/new  
3. Import your BuddyUp repository  
4. Deploy  
5. Add the Vercel domain to Firebase → Authentication → Authorized domains  
6. Refresh the site — everything will work immediately

---

## 🧭 Roadmap

- Swipe interactions (Left / Right)  
- Match system  
- Real-time chat  
- Block / report system  
- Online/offline status  
- Push notifications  
- Voice message recording  
- Premium features  

---

## 👑 Author
**BuddyUp – Created by Dragan “Zveki / Zvekisha” Gjorgjevikj**  
Designed with a Dark Modern aesthetic and built for real global social connections.

