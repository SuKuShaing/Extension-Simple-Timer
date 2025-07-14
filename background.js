chrome.runtime.onInstalled.addListener(() => {
    console.log("La extensión se ha instalado con éxito");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "show_alert" && message.tabId) {
        chrome.tabs.get(message.tabId, (tab) => {
            if (tab.url && (tab.url.startsWith('http') || tab.url.startsWith('file'))) {
                chrome.scripting.executeScript({
                    target: { tabId: message.tabId },
                    func: () => alert("¡Hola desde tu extensión!")
                });
            } else {
                console.log("No se puede ejecutar el script en esta URL:", tab.url);
            }
        });
    }
});
