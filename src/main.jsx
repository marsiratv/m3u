import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Polyfill for window.storage (using localStorage)
window.storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? { key, value, shared: false } : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch (error) {
      console.error('Storage set error:', error);
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch (error) {
      console.error('Storage delete error:', error);
      return null;
    }
  },
  async list(prefix) {
    try {
      const keys = Object.keys(localStorage).filter(k => 
        prefix ? k.startsWith(prefix) : true
      );
      return { keys, prefix, shared: false };
    } catch (error) {
      console.error('Storage list error:', error);
      return { keys: [], prefix, shared: false };
    }
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
