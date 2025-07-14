function updateUIBasedOnUrl(url) {
  const createPartyBtn = document.getElementById("create-party");
  const linkDiv = document.getElementById("link");
  const disconnectBtn = document.getElementById("disconnect");

  const parsedUrl = new URL(url);

  if (
    (parsedUrl.hostname.includes("rezka.ag") ||
      parsedUrl.hostname.includes("rezka-ua.tv") ||
      parsedUrl.pathname.includes("/films/")) &&
    parsedUrl.hash.includes("party")
  ) {
    createPartyBtn.style.display = "none";
    linkDiv.style.display = "block";
    disconnectBtn.style.display = "block";
    linkDiv.textContent = url;
  } else {
    createPartyBtn.style.display = "block";
    linkDiv.style.display = "none";
    disconnectBtn.style.display = "none";
    linkDiv.textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const createPartyBtn = document.getElementById("create-party");
  const linkDiv = document.getElementById("link");
  const disconnectBtn = document.getElementById("disconnect");

  // Initial UI update
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    updateUIBasedOnUrl(tabs[0].url);
  });

  // Listen for URL change messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "tabUrlChanged") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length && tabs[0].id === message.tabId) {
          updateUIBasedOnUrl(message.url);
        }
      });
    }
  });

  // Create party button click
  createPartyBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);

      if (
        !(
          url.hostname.includes("rezka.ag") ||
          url.hostname.includes("rezka-ua.tv")
        ) ||
        !(url.pathname.includes("/films/") || url.pathname.includes("/series/"))
      ) {
        alert(url.hostname.includes("rezka-ua.tv"));
        // alert("Please open a Rezka movie or TV show page first.");
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8);
      url.hash = `party=${roomId}`;
      const partyLink = url.toString();

      navigator.clipboard
        .writeText(partyLink)
        .then(() => {
          chrome.tabs.update(tab.id, { url: partyLink }, () => {
            chrome.tabs.sendMessage(tab.id, { type: "partyCreated" });
          });
        })
        .catch(() => {
          alert("Failed to copy link. Please copy it manually:\n" + partyLink);
          chrome.tabs.update(tab.id, { url: partyLink }, () => {
            chrome.tabs.sendMessage(tab.id, { type: "partyCreated" });
          });
        });
    });
  });

  // Disconnect button click
  disconnectBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);

      if (url.hash.includes("party")) {
        url.hash = "";
        chrome.tabs.update(tab.id, { url: url.toString() }, () => {
          chrome.tabs.sendMessage(tab.id, { type: "partyDisconnected" });
        });
      }
    });
  });

  // Clicking the party link copies it to clipboard and reloads tab
  linkDiv.addEventListener("click", () => {
    // Copy current link text (which is url)
    const partyLink = linkDiv.textContent;
    navigator.clipboard
      .writeText(partyLink)
      .then(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.update(tabs[0].id, { url: partyLink });
        });
      })
      .catch(() => {
        alert("Failed to copy link. Please copy it manually:\n" + partyLink);
      });
  });
});
