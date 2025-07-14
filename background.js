chrome.runtime.onInstalled.addListener(() => {
    console.log("La extensión se ha instalado.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "show_alert" && message.tabId) {
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            func: () => alert("¡Hola desde tu extensión!")
        });
    }
});
