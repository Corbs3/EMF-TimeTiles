// Open the side panel when the toolbar icon is clicked
function setBehaviour() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('TimeTiles: side panel setup failed', err));
}
chrome.runtime.onInstalled.addListener(setBehaviour);
chrome.runtime.onStartup.addListener(setBehaviour);
