// Content script — local extraction via Readability + Turndown
import './content.css';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

console.log("页面抓取 content script loaded (local mode).");

function showToast(message) {
  let toast = document.getElementById('jina-md-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'jina-md-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function extractMarkdown() {
  showToast('正在提取页面内容...');

  try {
    // Clone the document so Readability doesn't mutate the live DOM
    const docClone = document.cloneNode(true);
    const reader = new Readability(docClone, {
      charThreshold: 0 // extract even short articles
    });
    const article = reader.parse();

    if (!article || !article.content) {
      // Fallback: grab the body HTML directly
      showToast('Readability 未能提取正文，使用页面全文...');
      const fallbackHTML = document.body.innerHTML;
      return htmlToMarkdown(fallbackHTML, document.title);
    }

    showToast('正在转换为 Markdown...');
    return htmlToMarkdown(article.content, article.title || document.title);

  } catch (err) {
    console.error('Extraction error:', err);
    showToast('提取失败: ' + err.message);
    return null;
  }
}

function htmlToMarkdown(html, title) {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*'
  });

  // Keep images with alt text
  turndown.addRule('images', {
    filter: 'img',
    replacement: (content, node) => {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      if (!src) return '';
      return `![${alt}](${src})`;
    }
  });

  let markdown = '';

  // Add title as H1
  if (title) {
    markdown += `# ${title}\n\n`;
  }

  // Add source URL
  markdown += `> Source: ${window.location.href}\n\n---\n\n`;

  // Convert HTML to Markdown
  markdown += turndown.turndown(html);

  return markdown;
}

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadMarkdown') {
    const markdown = extractMarkdown();

    if (markdown) {
      showToast('正在下载...');
      // Send the markdown to background for downloading
      chrome.runtime.sendMessage({
        type: 'download-markdown',
        markdown: markdown,
        url: window.location.href,
        title: document.title
      });
      sendResponse({ status: 'started' });
    } else {
      sendResponse({ status: 'error', message: 'Extraction failed' });
    }
  } else if (request.action === 'toast') {
    showToast(request.message);
    sendResponse({ status: 'ok' });
  }
  return true;
});
