import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";

// Your Firebase config - replace with your actual config

(async function () {
  const firebaseConfig = {
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    databaseURL: process.env.databaseURL,
    projectId: process.env.projectId,
    storageBucket: process.env.storageBucket,
    messagingSenderId: process.env.messagingSenderId,
    appId: process.env.appId,
    measurementId: process.env.measurementId,
  };

  // Initialize Firebase app and database
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Get party room ID from URL parameter
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const roomId = hashParams.get("party");

  if (!roomId) {
    console.log("[RezkaParty] No party ID found in URL. Skipping sync.");
    return;
  }

  const video = document.querySelector("video");
  if (!video) {
    console.error("[RezkaParty] No video element found on page.");
    return;
  }

  const syncRef = ref(db, `rooms/${roomId}/syncEvent`);
  const messagesRef = ref(db, `rooms/${roomId}/messages`);
  const emojiiRef = ref(db, `rooms/${roomId}/emojiis`);

  let isUpdating = false; // To avoid feedback loops when syncing

  // Listen for remote sync events and apply to local video
  onValue(syncRef, (snapshot) => {
    const event = snapshot.val();
    if (!event || isUpdating) return;

    if (Math.abs(video.currentTime - event.time) > 1) {
      video.currentTime = event.time;
    }

    switch (event.type) {
      case "play":
        if (video.paused) video.play();
        break;
      case "pause":
        if (!video.paused) video.pause();
        break;
      case "seek":
        // You can optionally handle seek events here
        break;
    }
  });

  // Send local video events to Firebase for syncing
  function sendState(type) {
    isUpdating = true;
    set(syncRef, {
      type,
      time: video.currentTime,
    }).finally(() => {
      setTimeout(() => {
        isUpdating = false;
      }, 500);
    });
  }

  video.addEventListener("play", () => sendState("play"));
  video.addEventListener("pause", () => sendState("pause"));
  video.addEventListener("seeked", () => sendState("seek"));

  // Chat UI overlay creation
  const chatBox = document.createElement("div");
  chatBox.classList.add("rezka-chat-box");

  // Create reopen button first so it's available when needed
  const reopenBtn = document.createElement("button");
  reopenBtn.textContent = "Open Chat";
  reopenBtn.classList.add("reopen-chat-btn");
  reopenBtn.style.display = "none"; // hidden by default
  document.body.appendChild(reopenBtn);

  // Reopen chat on button click
  reopenBtn.addEventListener("click", () => {
    chatBox.style.display = "flex";
    reopenBtn.style.display = "none";
  });

  // Close button inside chat box
  const closeChat = document.createElement("p");
  closeChat.classList.add("close-chat");
  closeChat.textContent = "close";
  chatBox.appendChild(closeChat);

  // Close chat logic
  closeChat.addEventListener("click", () => {
    chatBox.style.display = "none";
    reopenBtn.style.display = "block";
  });

  // Chat messages container
  const messagesDiv = document.createElement("div");
  messagesDiv.classList.add("rezka-messages");
  chatBox.appendChild(messagesDiv);

  // Input field
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your message...";
  input.classList.add("rezka-chat-input");
  chatBox.appendChild(input);

  // Add chat box to document
  document.body.appendChild(chatBox);

  // Send message on Enter
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      push(messagesRef, { message: input.value.trim() });
      input.value = "";
    }
  });

  // Listen for chat messages
  onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val() || {};
    messagesDiv.innerHTML = Object.values(messages)
      .map((msg) => `<div>${msg.message}</div>`)
      .join("");
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  const emojiPanel = document.createElement("div");
  emojiPanel.classList.add("emoji-panel");

  const emojis = ["🎉", "😂", "❤️", "👍", "😮", "😢"];
  emojis.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    btn.classList.add("emoji-btn");
    btn.addEventListener("click", () => {
      push(emojiiRef, { emojii: emoji });
    });
    emojiPanel.appendChild(btn);
  });

  document.body.appendChild(emojiPanel);

  // Emoji container for floating effects
  const emojiiDiv = document.createElement("div");
  emojiiDiv.classList.add("emojii-container");
  document.body.appendChild(emojiiDiv);

  // Show emoji briefly with animation
  onValue(emojiiRef, (snapshot) => {
    const emojiis = snapshot.val() || {};
    const lastEmoji = Object.values(emojiis).at(-1);
    if (lastEmoji) {
      const floating = document.createElement("div");
      floating.textContent = lastEmoji.emojii;
      floating.classList.add("floating-emoji");
      const containerWidth = emojiiDiv.offsetWidth;
      const margin = 50;

      const randomLeft =
        Math.floor(Math.random() * (containerWidth + 2 * margin)) - margin;

      floating.style.left = randomLeft + "px";
      emojiiDiv.appendChild(floating);

      setTimeout(() => {
        floating.classList.add("fade-out");
        setTimeout(() => floating.remove(), 1000);
      }, 2000);
    }
  });
})();
