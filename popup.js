document.getElementById("create-party").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = new URL(tab.url);

    // Check if we're on Rezka video page (basic check)
    if (
      !url.hostname.includes("rezka.ag") ||
      !url.pathname.includes("/films/")
    ) {
      alert("Please open a Rezka movie or TV show page first.");
      return;
    }

    const roomId = Math.random().toString(36).substring(2, 8);

    url.hash = `party=${roomId}`;
    const partyLink = url.toString();

    // Copy and update tab
    navigator.clipboard
      .writeText(partyLink)
      .then(() => {
        chrome.tabs.update(tab.id, { url: partyLink });
      })
      .catch(() => {
        alert("Failed to copy link. Please copy it manually:\n" + partyLink);
        chrome.tabs.update(tab.id, { url: partyLink });
      });
  });
});
