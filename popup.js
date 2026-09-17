// Netfie Screen Recorder Popup Handler
document.addEventListener('DOMContentLoaded', () => {
  const btnOpenStudio = document.getElementById('btnOpenStudio');
  if (btnOpenStudio) {
    btnOpenStudio.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_STUDIO' }, () => {
        window.close();
      });
    });
  }

  // Theme support
  const btnPopupTheme = document.getElementById('btnPopupTheme');
  const popupIconSun = document.getElementById('popupIconSun');
  const popupIconMoon = document.getElementById('popupIconMoon');
  const savedTheme = localStorage.getItem('netfie_theme') || 'dark';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (popupIconSun) popupIconSun.style.display = 'none';
      if (popupIconMoon) popupIconMoon.style.display = 'inline-block';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (popupIconSun) popupIconSun.style.display = 'inline-block';
      if (popupIconMoon) popupIconMoon.style.display = 'none';
    }
    localStorage.setItem('netfie_theme', theme);
  }

  applyTheme(savedTheme);

  if (btnPopupTheme) {
    btnPopupTheme.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
});

