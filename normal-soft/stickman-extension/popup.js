const btn = document.getElementById("toggleBtn")
const status = document.getElementById("status")

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.tabs.sendMessage(tab.id, { type: "getState" }, (r) => {
    setState(!!r?.active)
  })
})

function setState(on) {
  if (on) {
    btn.textContent = "ABORT MISSION"
    btn.classList.add("active")
    status.textContent = "ACTIVE"
    status.className = "status on"
  } else {
    btn.textContent = "BOOT SEQUENCE"
    btn.classList.remove("active")
    status.textContent = "STANDBY"
    status.className = "status"
  }
}

btn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { type: "toggle" }, (r) => {
      setState(!!r?.active)
    })
  })
})
