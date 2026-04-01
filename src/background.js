import { loadDefaultFolderHandle } from './downloadFolderStore';

chrome.runtime.onInstalled.addListener(() => {
  console.log('页面抓取 installed (hybrid mode)');
});

const DOWNLOAD_SETTINGS_DEFAULTS = {
  askEveryTime: true,
  defaultFolderName: ''
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'download-markdown') {
    handleDownload(request.markdown, request.url, request.title, sender.tab?.id);
    sendResponse({ status: 'processing' });
  } else if (request.type === 'fetch-jina-api') {
    fetchJinaApi(request.url, request.title, sender.tab?.id);
    sendResponse({ status: 'processing' });
  }
  return true;
});

function notify(status, message) {
  chrome.runtime.sendMessage({ target: 'popup', status, message }).catch(() => {});
}

async function fetchJinaApi(url, title, tabId) {
  try {
    notify('progress', '本地不可用，切换云端补全...');
    const response = await fetch('https://r.jina.ai/' + url, {
      headers: { 'Accept': 'text/plain' }
    });

    if (!response.ok) {
      throw new Error(`Jina API failed: ${response.status}`);
    }

    const markdown = await response.text();
    const finalMarkdown = normalizeCloudMarkdown(markdown, title, url);
    notify('progress', '云端补全成功，正在下载...');
    await handleDownload(finalMarkdown, url, title, tabId);
  } catch (err) {
    console.error('Jina API Fetch Error:', err);
    notify('error', '云端提取失败: ' + err.message);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action: 'toast', message: '云端提取失败: ' + err.message }).catch(() => {});
    }
  }
}

function normalizeCloudMarkdown(markdown, title, url) {
  const trimmed = (markdown || '').trim();
  if (!trimmed) {
    throw new Error('Jina 返回空内容');
  }

  const safeTitle = title || 'Document';
  const hasHeading = /^#\s+/m.test(trimmed);
  const hasSource = /^> Source:\s+/m.test(trimmed);

  if (hasHeading && hasSource) {
    return trimmed;
  }

  let normalized = trimmed;

  if (!hasHeading) {
    normalized = `# ${safeTitle}\n\n${normalized}`;
  }

  if (!hasSource) {
    if (/^#\s+.+/m.test(normalized)) {
      normalized = normalized.replace(/^#\s+.+$/m, (heading) => `${heading}\n\n> Source: ${url}\n\n---`);
    } else {
      normalized = `> Source: ${url}\n\n---\n\n${normalized}`;
    }
  }

  return normalized.trim();
}

function optimizeMarkdown(markdown) {
  let out = (markdown || '').replace(/\r\n?/g, '\n');
  out = out.replace(/[ \t]+$/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n');

  const lines = out.split('\n');
  const seenSources = new Set();
  const cleaned = [];

  for (let i = 0; i < lines.length; i += 1) {
    const sourceMatch = lines[i].match(/^> Source:\s*(.+)\s*$/);
    if (!sourceMatch) {
      cleaned.push(lines[i]);
      continue;
    }

    const sourceKey = sourceMatch[1];
    if (!seenSources.has(sourceKey)) {
      seenSources.add(sourceKey);
      cleaned.push(lines[i]);
      continue;
    }

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j += 1;
    if (j < lines.length && /^-{3,}$/.test(lines[j].trim())) {
      j += 1;
      while (j < lines.length && lines[j].trim() === '') j += 1;
    }
    i = j - 1;
  }

  out = cleaned.join('\n');
  out = out.replace(/\n-{3,}\n\n-{3,}\n/g, '\n---\n');
  out = out.replace(/\n{3,}/g, '\n\n');

  return `${out.trim()}\n`;
}

function getDownloadSettings() {
  return new Promise((resolve) => {
    if (!chrome.storage?.sync) {
      resolve(DOWNLOAD_SETTINGS_DEFAULTS);
      return;
    }

    chrome.storage.sync.get(DOWNLOAD_SETTINGS_DEFAULTS, (stored) => {
      if (chrome.runtime.lastError) {
        console.warn('读取下载设置失败，回退默认值:', chrome.runtime.lastError.message);
        resolve(DOWNLOAD_SETTINGS_DEFAULTS);
        return;
      }
      resolve({
        askEveryTime: stored.askEveryTime !== false,
        defaultFolderName: typeof stored.defaultFolderName === 'string' ? stored.defaultFolderName : ''
      });
    });
  });
}

async function saveToDefaultFolder(markdown, filename) {
  const directoryHandle = await loadDefaultFolderHandle().catch(() => null);
  if (!directoryHandle) {
    throw new Error('默认文件夹不存在，请重新选择');
  }

  if (directoryHandle.queryPermission) {
    const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('默认文件夹写入权限已失效，请重新选择');
    }
  }

  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(markdown);
  await writable.close();
}

async function handleDownload(markdown, pageUrl, pageTitle, tabId) {
  try {
    notify('progress', '正在准备下载文件...');

    const settings = await getDownloadSettings();
    let filename = 'page.md';
    try {
      if (pageTitle) {
        let safeTitle = pageTitle
          .replace(/[\\/:*?"<>|~]/g, '_')
          .replace(/[\x00-\x1f\x7f]/g, '')
          .replace(/\s+/g, '_')
          .replace(/^[.\-_]+/, '')
          .replace(/[.\-_]+$/, '');

        if (!safeTitle) safeTitle = 'document';
        filename = safeTitle.substring(0, 60) + '.md';
      } else {
        const u = new URL(pageUrl);
        let pathPart = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || u.hostname;
        pathPart = pathPart.replace(/[\\/:*?"<>|~]/g, '_').replace(/^[.\-_]+/, '');
        if (!pathPart) pathPart = 'document';
        filename = pathPart.substring(0, 60) + '.md';
      }
    } catch (_) {}

    notify('progress', '正在优化 Markdown 格式...');
    const optimizedMarkdown = optimizeMarkdown(markdown);

    if (!settings.askEveryTime) {
      try {
        notify('progress', '正在保存到默认文件夹...');
        await saveToDefaultFolder(optimizedMarkdown, filename);
        notify('done', `已保存到默认文件夹：${settings.defaultFolderName || '已选目录'}`);
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'toast', message: 'Markdown 已保存到默认文件夹 ✅' }).catch(() => {});
        }
        return;
      } catch (err) {
        notify('progress', `默认文件夹不可用，回退浏览器下载：${err.message}`);
      }
    }

    const blob = new Blob([optimizedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const reader = new FileReader();

    reader.onloadend = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: filename,
        saveAs: settings.askEveryTime
      }, () => {
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
