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

  useEffect(() => {
    const listener = (msg) => {
      if (msg.target !== 'popup') return;

      if (msg.status === 'progress') {
        setStatus('loading');
        setErrorMsg('');
        setStatusMsg(msg.message);
      } else if (msg.status === 'done') {
        setStatus('done');
        setErrorMsg('');
        setStatusMsg(msg.message || '下载成功！');
        setTimeout(() => window.close(), 1200);
      } else if (msg.status === 'error') {
        setStatus('error');
        setStatusMsg('');
        setErrorMsg(msg.message);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleDownload = () => {
    setErrorMsg('');
    setStatus('loading');
    setStatusMsg('本地提取中...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url) {
        setStatus('error');
        setStatusMsg('');
        setErrorMsg('未找到当前页面，请重试。');
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        setStatus('error');
        setStatusMsg('');
        setErrorMsg('无法在浏览器内部页面运行，请在正常网页上使用。');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'downloadMarkdown' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('error');
          setStatusMsg('');
          setErrorMsg('页面连接失败，请刷新页面后重试。');
          return;
        }

        if (response?.status === 'error') {
          setStatus('error');
          setStatusMsg('');
          setErrorMsg(response.message || '提取失败，请重试。');
        }
      });
    });
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
          优先本地提取当前页面正文，复杂页面会自动切换云端补全。
        </p>
        <p className="helper-text">
          云端兜底仅发送当前页面 URL，不上传页面正文或 Cookie。
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
