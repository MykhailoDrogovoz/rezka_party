chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.runtime
      .sendMessage({
        type: "tabUrlChanged",
        tabId,
        url: changeInfo.url,
      })
      .catch((error) => {
        console.warn(
          "[RezkaParty] No receiving end for message:",
          error.message
        );
      });
  }
});
