chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-game") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "toggle" })
      }
    })
  }
})
