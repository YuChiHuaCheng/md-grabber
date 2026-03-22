chrome.runtime.onInstalled.addListener(() => {
  console.log('页面抓取 installed (local mode)');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'download-markdown') {
    handleDownload(request.markdown, request.url, request.title, sender.tab?.id);
    sendResponse({ status: 'processing' });
  }
  return true;
});

function handleDownload(markdown, pageUrl, pageTitle, tabId) {
  const notify = (status, message) => {
    chrome.runtime.sendMessage({ target: 'popup', status, message }).catch(() => {});
  };

  try {
    // Build filename from title or URL
    let filename = 'page.md';
    try {
      if (pageTitle) {
        filename = pageTitle
          .replace(/[\\/:*?"<>|]/g, '_')  // Remove illegal chars
          .replace(/\s+/g, '_')
          .substring(0, 60) + '.md';
      } else {
        const u = new URL(pageUrl);
        const pathPart = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || u.hostname;
        filename = pathPart.substring(0, 60) + '.md';
      }
    } catch (_) {}

    // Convert to data URL for download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const reader = new FileReader();

    reader.onloadend = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          notify('error', '下载失败: ' + chrome.runtime.lastError.message);
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: 'toast', message: '下载失败: ' + chrome.runtime.lastError.message }).catch(() => {});
          }
        } else {
          notify('done', '下载成功！');
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: 'toast', message: 'Markdown 下载成功！ ✅' }).catch(() => {});
          }
        }
      });
    };

    reader.readAsDataURL(blob);

  } catch (err) {
    console.error('Download error:', err);
    notify('error', err.message);
  }
}
