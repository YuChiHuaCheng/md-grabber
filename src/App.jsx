import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import './App.css';

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [status, setStatus] = useState(''); // '', 'loading', 'done', 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) setCurrentUrl(tabs[0].url);
      });
    }
  }, []);

  const handleDownload = () => {
    setErrorMsg('');
    setStatus('loading');
    setStatusMsg('正在提取页面内容...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        setStatus('error');
        setErrorMsg('无法在浏览器内部页面运行，请在正常网页上使用。');
        return;
      }

      // Send to content script for local extraction
      chrome.tabs.sendMessage(tab.id, { action: 'downloadMarkdown' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('error');
          setErrorMsg('页面连接失败，请刷新页面后重试。');
          return;
        }
      });
    });

    // Listen for progress updates from background
    const listener = (msg) => {
      if (msg.target === 'popup') {
        if (msg.status === 'progress') {
          setStatusMsg(msg.message);
        } else if (msg.status === 'done') {
          setStatus('done');
          setStatusMsg('下载成功！');
          chrome.runtime.onMessage.removeListener(listener);
          setTimeout(() => window.close(), 1200);
        } else if (msg.status === 'error') {
          setStatus('error');
          setErrorMsg(msg.message);
          chrome.runtime.onMessage.removeListener(listener);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  };

  const isLoading = status === 'loading';
  let hostname = '';
  try { if (currentUrl) hostname = new URL(currentUrl).hostname; } catch (_) {}

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="icon-wrapper">
          <FileText size={18} color="white" />
        </div>
        <h1>页面抓取</h1>
      </header>

      <main className="popup-content">
        <p className="description">
          一键提取当前页面正文，本地转换为 Markdown，无需联网。
        </p>

        <div className="action-buttons">
          <button className="primary-btn" onClick={handleDownload} disabled={isLoading}>
            <FileText size={16} />
            <span>{isLoading ? '正在抓取...' : '抓取 Markdown'}</span>
          </button>
        </div>

        {isLoading && (
          <div className="status-bar">
            <div className="spinner" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="error-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{errorMsg}</span>
          </div>
        )}
      </main>

      <footer className="popup-footer">
        <span className="domain-text">{hostname}</span>
        <span className="version-text">v1.0</span>
      </footer>
    </div>
  );
}

export default App;
