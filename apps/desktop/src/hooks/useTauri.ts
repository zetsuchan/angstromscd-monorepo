import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function useTauri() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if Tauri is available
        if (window.__TAURI__) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize Tauri:', error);
      }
    };

    init();
  }, []);

  return { isReady, invoke, listen };
}