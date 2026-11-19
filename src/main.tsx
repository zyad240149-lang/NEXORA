import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { InstallButton } from './components/InstallButton';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './services/auth';
import './index.css';
import './styles/system.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider><AuthProvider><App /><InstallButton /></AuthProvider></ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
