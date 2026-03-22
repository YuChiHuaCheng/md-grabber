// Lightweight content script — only for optional toast notifications
import './content.css';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toast') {
    showToast(request.message);
    sendResponse({ status: 'ok' });
  }
  return true;
});

function showToast(message) {
  let toast = document.getElementById('jina-md-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'jina-md-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  // Trigger reflow
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
