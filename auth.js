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

    // Валидација
    if (!photosInput.files.length) {
      msg.textContent = "Качи барем една слика.";
      msg.className = "error";
      return;
    }
    if (!name || !age || !gender || !country || !bio || !interestsRaw || !email || !password) {
      msg.textContent = "Пополни ги сите полиња.";
      msg.className = "error";
      return;
    }
    if (age < 18 || age > 99) {
      msg.textContent = "Мора да имаш 18–99 години.";
      msg.className = "error";
      return;
    }
    if (password.length < 6) {
      msg.textContent = "Лозинката мора да има барем 6 знаци.";
      msg.className = "error";
      return;
    }

    try {
      msg.textContent = "Креирам акаунт...";
      msg.className = "info";

      // 1. Креирај корисник во Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // 2. Качување на слики (со толеранција на грешки)
      const photoURLs = [];
      const files = Array.from(photosInput.files);

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          console.warn("Сликата е преголема:", file.name);
          continue;
        }
        try {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
          const storageRef = ref(storage, `profilePhotos/${uid}/${fileName}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          photoURLs.push(url);
        } catch (err) {
          console.warn("Неуспешно качување на слика:", file.name, err);
        }
      }

      if (photoURLs.length === 0) {
        msg.textContent = "Сликите не се качија, но профилот се креира...";
        msg.className = "warning";
      }

      // 3. Секогаш зачувај во Firestore
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
        instagram: null,
        discord: null,
        platforms: null,
        relationshipGoal: null,
        createdAt: serverTimestamp()
      });

      msg.textContent = "Успешно креиран профил! Се пренасочуваш...";
      msg.className = "success";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);

    } catch (err) {
      console.error("Грешка при регистрација:", err);
      let errorText = "Грешка при регистрација.";

      switch (err.code) {
        case "auth/email-already-in-use":
          errorText = "Овој email е веќе во употреба.";
          break;
        case "auth/weak-password":
          errorText = "Лозинката е преслаба (мин. 6 знаци).";
          break;
        case "auth/invalid-email":
          errorText = "Невалиден email.";
          break;
        default:
          errorText = "Грешка при регистрација. Обиди се повторно.";
      }

      msg.textContent = errorText;
      msg.className = "error";
    }
  });
}
