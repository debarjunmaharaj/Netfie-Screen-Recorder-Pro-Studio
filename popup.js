// Recordly Extension Popup Handler
document.addEventListener('DOMContentLoaded', () => {
  const btnOpenStudio = document.getElementById('btnOpenStudio');
  btnOpenStudio.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_STUDIO' }, () => {
      window.close();
    });
  });
});
