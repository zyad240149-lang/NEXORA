import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './services/auth';
import './index.css';
import './styles/system.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
