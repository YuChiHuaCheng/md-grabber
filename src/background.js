chrome.runtime.onInstalled.addListener(() => {
  console.log('Jina MD Grabber installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'fetch-jina-markdown') {
    handleFetchMarkdown(request.url, request.tabId);
    sendResponse({ status: 'processing' });
  }
  return true;
});

async function handleFetchMarkdown(pageUrl, tabId) {
  const notify = (status, message) => {
    chrome.runtime.sendMessage({ target: 'popup', status, message }).catch(() => {});
  };

  try {
    notify('progress', 'Fetching from r.jina.ai...');

    const jinaUrl = 'https://r.jina.ai/' + pageUrl;
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' }
    });

    if (!response.ok) {
      throw new Error(`Jina API returned ${response.status}: ${response.statusText}`);
    }

    notify('progress', 'Received Markdown, preparing download...');

    const markdown = await response.text();

    // Build a meaningful filename from the URL
    let filename = 'page.md';
    try {
      const u = new URL(pageUrl);
      const pathPart = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || u.hostname;
      filename = (pathPart.length > 60 ? pathPart.substring(0, 60) : pathPart) + '.md';
      // Sanitize
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
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
          notify('error', 'Download failed: ' + chrome.runtime.lastError.message);
        } else {
          notify('done', 'Download started!');
        }
      });
    };

    reader.readAsDataURL(blob);

  } catch (err) {
    console.error('Jina fetch error:', err);
    notify('error', err.message);
  }
}
