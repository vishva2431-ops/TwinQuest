import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { preloadCharacterModels } from './game/glbCharacter';

createRoot(document.getElementById('root')!).render(<App />);

// Start fetching the Leo / Maya GLB models right away
preloadCharacterModels();

// Register Service Worker for offline playability
if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost') && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline fallback registered silently
    });
  });
}

