document.getElementById("btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.runtime.sendMessage({
            action: "show_alert",
            tabId: tabs[0].id
        });
    });
});