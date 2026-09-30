import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyTheme, loadTheme } from './theme/themes';

// 在 React 挂载前就把主题写到 <html data-theme>，避免首屏闪一下默认配色
applyTheme(loadTheme());

const container = document.getElementById('root');
if (!container) {
  throw new Error('找不到 #root 挂载点');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
