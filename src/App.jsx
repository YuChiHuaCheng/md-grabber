import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import './App.css';
import {
  saveDefaultFolderHandle,
  loadDefaultFolderHandle,
  clearDefaultFolderHandle
} from './downloadFolderStore';

const DOWNLOAD_SETTINGS_DEFAULTS = {
  askEveryTime: true,
  defaultFolderName: ''
};

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [status, setStatus] = useState(''); // '', 'loading', 'done', 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [askEveryTime, setAskEveryTime] = useState(true);
  const [defaultFolderName, setDefaultFolderName] = useState('');
  const [folderReady, setFolderReady] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);

  useEffect(() => {
    if (chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) setCurrentUrl(tabs[0].url);
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      let stored = DOWNLOAD_SETTINGS_DEFAULTS;
      if (chrome.storage?.sync) {
        stored = await new Promise((resolve) => {
          chrome.storage.sync.get(DOWNLOAD_SETTINGS_DEFAULTS, (value) => {
            if (chrome.runtime.lastError) {
              resolve(DOWNLOAD_SETTINGS_DEFAULTS);
              return;
            }
            resolve(value);
          });
        });
      }

      const handle = await loadDefaultFolderHandle().catch(() => null);
      if (cancelled) return;

      setAskEveryTime(stored.askEveryTime !== false);
      setDefaultFolderName(typeof stored.defaultFolderName === 'string' ? stored.defaultFolderName : '');
      setFolderReady(Boolean(handle));
    };

    loadSettings();
    return () => { cancelled = true; };
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

  const persistSettings = (nextAskEveryTime, nextDefaultFolderName) => {
    if (!chrome.storage?.sync) return;
    chrome.storage.sync.set({
      askEveryTime: nextAskEveryTime,
      defaultFolderName: nextDefaultFolderName
    });
  };

  const handleToggleAskEveryTime = (event) => {
    const nextValue = event.target.checked;
    setAskEveryTime(nextValue);
    persistSettings(nextValue, defaultFolderName);
  };

  const handlePickFolder = async () => {
    if (!window.showDirectoryPicker) {
      setErrorMsg('当前浏览器不支持文件夹选择器，请保持“每次都选择保存位置”。');
      return;
    }

    try {
      setPickingFolder(true);
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (handle.requestPermission) {
        const permission = await handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          throw new Error('未获得默认文件夹写入权限');
        }
      }

      const folderName = handle.name || '已选择文件夹';
      await saveDefaultFolderHandle(handle);
      setDefaultFolderName(folderName);
      setFolderReady(true);
      setErrorMsg('');
      persistSettings(askEveryTime, folderName);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setErrorMsg(err?.message || '选择默认文件夹失败');
      }
    } finally {
      setPickingFolder(false);
    }
  };

  const handleClearFolder = async () => {
    await clearDefaultFolderHandle().catch(() => {});
    setDefaultFolderName('');
    setFolderReady(false);
    persistSettings(askEveryTime, '');
  };

  const handleDownload = () => {
    setErrorMsg('');
    if (!askEveryTime && !folderReady) {
      setStatus('error');
      setStatusMsg('');
      setErrorMsg('请先选择默认文件夹，或打开“每次都选择保存位置”。');
      return;
    }

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

        <section className="settings-card">
          <div className="setting-row">
            <label htmlFor="ask-every-time" className="setting-label">每次都选择保存位置</label>
            <input
              id="ask-every-time"
              type="checkbox"
              checked={askEveryTime}
              disabled={isLoading}
              onChange={handleToggleAskEveryTime}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">
              默认文件夹：{folderReady ? defaultFolderName : '未设置'}
            </span>
          </div>
          <div className="setting-actions">
            <button
              type="button"
              className="secondary-btn"
              disabled={isLoading || pickingFolder}
              onClick={handlePickFolder}
            >
              {pickingFolder ? '正在打开...' : '选择文件夹'}
            </button>
            <button
              type="button"
              className="secondary-btn danger-btn"
              disabled={isLoading || pickingFolder || !folderReady}
              onClick={handleClearFolder}
            >
              清除
            </button>
          </div>
          <p className="setting-hint">
            关闭“每次都选择保存位置”后，将直接保存到选中的本地文件夹。
          </p>
        </section>

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
