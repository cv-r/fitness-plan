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

// 移除 index.html 里的启动占位。
// 它的背景和应用背景是同一套配方，所以移除的瞬间不会闪色。
document.getElementById('boot')?.remove();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
