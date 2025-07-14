import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";

// Your Firebase config - replace with your actual config

(async function () {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
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

  function isFullScreen() {
    return document.fullscreenElement !== null;
  }

  function makeDraggable(element) {
    let offsetX = 0,
      offsetY = 0,
      isDragging = false;

    element.addEventListener("mousedown", (e) => {
      if (isFullScreen()) return; // Don't drag in fullscreen
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      element.style.left = e.clientX - offsetX + "px";
      element.style.top = e.clientY - offsetY + "px";
      element.style.right = "auto";
      element.style.bottom = "auto";
      element.style.position = "fixed";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

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

  const chatHeader = document.createElement("div");
  chatHeader.classList.add("chat-header");
  chatBox.appendChild(chatHeader);

  const chatHeading = document.createElement("h3");
  chatHeading.textContent = "Chat";
  chatHeader.appendChild(chatHeading);

  const closeChat = document.createElement("p");
  closeChat.classList.add("close-chat");
  closeChat.textContent = "close";
  chatHeader.appendChild(closeChat);

  // Close chat logic
  closeChat.addEventListener("click", () => {
    chatBox.style.display = "none";
    reopenBtn.style.display = "block";
  });

  // Chat messages container
  const messagesDiv = document.createElement("div");
  messagesDiv.classList.add("rezka-messages");
  chatBox.appendChild(messagesDiv);

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

  chatBox.appendChild(emojiPanel);

  const videoParent = video.parentElement || document.body;
  console.log(video.parentElement);

  videoParent.style.position = "relative";
  videoParent.style.zIndex = "0";
  videoParent.style.width = "80vw";

  // Emoji container for floating effects
  const emojiiDiv = document.createElement("div");
  emojiiDiv.classList.add("emojii-container");
  videoParent.appendChild(emojiiDiv);

  // Input field
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your message...";
  input.classList.add("rezka-chat-input");
  chatBox.appendChild(input);
  makeDraggable(chatBox);
  makeDraggable(reopenBtn);

  const oframecdnplayer = document.querySelector("#oframecdnplayer");
  document.body.appendChild(chatBox);
  chatBox.style.pointerEvents = "auto";
  video.style.pointerEvents = "auto";

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

  document.addEventListener("fullscreenchange", () => {
    const fullscreenElement = document.fullscreenElement;

    if (fullscreenElement && fullscreenElement.contains(video)) {
      // Fullscreen entered
      fullscreenElement.appendChild(chatBox);
      fullscreenElement.appendChild(reopenBtn);
      fullscreenElement.appendChild(emojiiDiv);

      chatBox.style.position = "fixed";
      chatBox.style.right = "20px";
      chatBox.style.bottom = "70px";

      reopenBtn.style.position = "fixed";
      reopenBtn.style.right = "20px";
      reopenBtn.style.bottom = "70px";

      console.log("[RezkaParty] Chat moved to fullscreen container.");
    } else {
      // Fullscreen exited — return chat to body
      document.body.appendChild(chatBox);
      document.body.appendChild(reopenBtn);
      videoParent.appendChild(emojiiDiv);

      chatBox.style.position = "fixed";
      chatBox.style.right = "20px";
      chatBox.style.bottom = "10px";

      reopenBtn.style.position = "fixed";
      reopenBtn.style.right = "20px";
      reopenBtn.style.bottom = "70px";

      console.log("[RezkaParty] Chat returned to normal view.");
    }
  });
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "partyCreated") {
    console.log("[RezkaParty] Party created, reloading state...");
    location.reload();
  }

  if (message.type === "partyDisconnected") {
    console.log("[RezkaParty] Party disconnected, cleaning up...");
    setTimeout(() => {
      location.reload();
    }, 300);
  }
});
