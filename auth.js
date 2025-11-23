// Upload photos (со catch за грешки)
const photoURLs = [];
if (photosInput.files.length > 0) {
  const files = Array.from(photosInput.files);

  for (const file of files) {
    try {
      const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      photoURLs.push(url);
    } catch (err) {
      console.warn("Не succeeding upload на една слика:", err);
      // Продолжуваме и без таа слика – подобро отколку ништо
    }
  }
}

// СЕКОГАШ креирај го профилот, дури и ако нема слики
try {
  const interests = interestsRaw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  await setDoc(doc(db, "users", uid), {
    uid,
    name,
    age: Number(age),
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

  msg.textContent = "Успешно креиран профил!";
  msg.className = "success";
  setTimeout(() => window.location.href = "home.html", 800);

} catch (err) {
  console.error("Грешка при креирање на профил во Firestore:", err);
  msg.textContent = "Грешка при зачувување на профилот.";
  msg.className = "error";
}
