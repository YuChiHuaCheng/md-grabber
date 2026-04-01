// Content script — local extraction via Readability + Turndown
import './content.css';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

console.log('页面抓取 content script loaded (hybrid mode).');

const BLOCKED_PATTERNS = [
  { pattern: /环境异常|去验证|完成验证后即可继续访问|安全验证|请完成验证/i, reason: '当前页面是验证页' },
  { pattern: /log in|login|sign up|sign in|join x today|don[’']?t miss what'?s happening/i, reason: '当前页面更像登录页' },
  { pattern: /verify you are human|captcha|access denied|security check/i, reason: '当前页面需要额外验证' }
];

function showToast(message) {
  if (!document.body) return;

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

function notifyPopup(message) {
  chrome.runtime.sendMessage({ target: 'popup', status: 'progress', message }).catch(() => {});
}

function normalizeText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function analyzeContent(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body;
  const text = normalizeText(root.textContent || '');
  const linkText = normalizeText(
    Array.from(root.querySelectorAll('a'))
      .map((link) => link.textContent || '')
      .join(' ')
  );

  return {
    text,
    paragraphCount: root.querySelectorAll('p').length,
    headingCount: root.querySelectorAll('h1, h2, h3, h4').length,
    imageCount: root.querySelectorAll('img').length,
    blockCount: root.querySelectorAll('p, li, blockquote, pre').length,
    linkDensity: text.length > 0 ? linkText.length / text.length : 0
  };
}

function detectProblemPage(title, text) {
  const sample = normalizeText(`${title} ${text}`);
  if (!sample) {
    return { blocked: true, reason: '当前页面几乎没有可提取内容' };
  }

  for (const entry of BLOCKED_PATTERNS) {
    if (entry.pattern.test(sample)) {
      return { blocked: true, reason: entry.reason };
    }
  }

  return { blocked: false, reason: '' };
}

function scoreCandidate(candidate) {
  return (
    candidate.analysis.text.length +
    candidate.analysis.paragraphCount * 80 +
    candidate.analysis.headingCount * 40 +
    candidate.analysis.imageCount * 20 -
    candidate.analysis.linkDensity * 200
  );
}

function buildMarkdown(title, html) {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*'
  });
  turndown.use(gfm);

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
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  markdown += `> Source: ${window.location.href}\n\n---\n\n`;
  markdown += turndown.turndown(html);
  return markdown;
}

function createCandidate(title, html, source) {
  if (!html) return null;

  const analysis = analyzeContent(html);
  if (!analysis.text && analysis.imageCount === 0) return null;

  return {
    title,
    source,
    analysis,
    markdown: buildMarkdown(title, html)
  };
}

function isUsableCandidate(candidate) {
  const { analysis, title } = candidate;
  const problem = detectProblemPage(title, analysis.text);
  if (problem.blocked) {
    return { valid: false, reason: problem.reason };
  }

  if (!analysis.text && analysis.imageCount === 0) {
    return { valid: false, reason: '本地未提取到正文' };
  }

  if (analysis.linkDensity > 0.65 && analysis.text.length < 400 && analysis.paragraphCount === 0) {
    return { valid: false, reason: '本地提取结果更像导航页' };
  }

  if (
    analysis.text.length < 24 &&
    analysis.paragraphCount === 0 &&
    analysis.headingCount === 0 &&
    analysis.imageCount === 0
  ) {
    return { valid: false, reason: '本地提取结果过短' };
  }

  return { valid: true };
}

function buildMainContentCandidate() {
  const element = document.querySelector('article, main, [role="main"]');
  if (!element) return null;

  const cloned = element.cloneNode(true);
  return createCandidate(document.title, cloned.innerHTML, 'main');
}

function extractMarkdown() {
  notifyPopup('本地提取中...');
  showToast('正在进行本地提取...');

  try {
    const candidates = [];
    const pageText = normalizeText(document.body?.innerText || '');
    const pageProblem = detectProblemPage(document.title, pageText);

    if (!pageProblem.blocked || pageText.length > 240) {
      const docClone = document.cloneNode(true);
      const reader = new Readability(docClone, { charThreshold: 0 });
      const article = reader.parse();

      if (article?.content) {
        candidates.push(
          createCandidate(article.title || document.title, article.content, 'readability')
        );
      }

      const mainCandidate = buildMainContentCandidate();
      if (mainCandidate) {
        candidates.push(mainCandidate);
      }
    }

    const reviewedCandidates = candidates
      .filter(Boolean)
      .map((candidate) => ({ candidate, verdict: isUsableCandidate(candidate) }))
      .sort((left, right) => scoreCandidate(right.candidate) - scoreCandidate(left.candidate));

    const usableCandidates = reviewedCandidates
      .filter((entry) => entry.verdict.valid);

    if (usableCandidates.length > 0) {
      const best = usableCandidates[0].candidate;
      return { markdown: best.markdown, title: best.title, source: best.source };
    }

    const readerable = isProbablyReaderable(document);
    const fallbackReason =
      pageProblem.reason ||
      reviewedCandidates.find((entry) => !entry.verdict.valid)?.verdict.reason ||
      (readerable ? '本地提取结果不可用' : '当前页面不适合本地提取');

    showToast(`${fallbackReason}，切换云端补全...`);
    notifyPopup(`${fallbackReason}，切换云端补全...`);
    return { fallback: true, title: document.title, reason: fallbackReason };
  } catch (err) {
    console.error('Extraction error:', err);
    const message = '本地提取失败，切换云端补全...';
    showToast(message);
    notifyPopup(message);
    return { fallback: true, title: document.title, reason: err.message };
  }
}

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadMarkdown') {
    const result = extractMarkdown();

    if (result && result.fallback) {
      showToast('本地不可用，正在请求云端补全...');
      chrome.runtime.sendMessage({
        type: 'fetch-jina-api',
        url: window.location.href,
        title: result.title
      });
      sendResponse({ status: 'started' });
    } else if (result && result.markdown) {
      const statusText =
        result.source === 'main'
          ? '已用页面主内容提取，正在下载...'
          : '本地提取成功，正在下载...';
      showToast(statusText);
      notifyPopup('正在下载...');
      chrome.runtime.sendMessage({
        type: 'download-markdown',
        markdown: result.markdown,
        url: window.location.href,
        title: result.title
      });
      sendResponse({ status: 'started' });
    } else {
      sendResponse({ status: 'error', message: '提取失败，请重试。' });
    }
  } else if (request.action === 'toast') {
    showToast(request.message);
    sendResponse({ status: 'ok' });
  }
  return true;
});
