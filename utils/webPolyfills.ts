// Web polyfills for React Native compatibility
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined' && document.head) {
  // Add global CSS to remove focus outlines from text inputs
  const style = document.createElement('style');
  style.textContent = `
    /* Remove blue focus outline from all text inputs and TextInput components */
    input:focus,
    textarea:focus,
    select:focus,
    [role="textbox"]:focus,
    [contenteditable="true"]:focus,
    .react-native-web-textinput:focus,
    div[role="textbox"]:focus {
      outline: none !important;
      border-color: inherit !important;
      box-shadow: none !important;
    }

    /* Remove focus outline from any element that might get focus */
    *:focus {
      outline: none !important;
    }

    /* Ensure TextInput components specifically don't show outline */
    input[type="text"]:focus,
    input[type="email"]:focus,
    input[type="password"]:focus,
    input[type="search"]:focus,
    input[type="tel"]:focus,
    input[type="url"]:focus,
    input[type="number"]:focus,
    input[type="date"]:focus,
    input[type="time"]:focus,
    input[type="datetime-local"]:focus {
      outline: none !important;
      border-color: inherit !important;
      box-shadow: none !important;
    }

    /* Remove focus outline from buttons and other interactive elements */
    button:focus,
    select:focus,
    option:focus {
      outline: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Common web polyfills that don't require DOM access
if (Platform.OS === 'web') {
  // Suppress useNativeDriver warnings on web
  if (typeof console !== 'undefined' && console.warn) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('useNativeDriver')) {
        // Suppress useNativeDriver warnings on web
        return;
      }
      originalWarn.apply(console, args);
    };
  }

  // Polyfill for global if it doesn't exist
  if (typeof window !== 'undefined' && typeof global === 'undefined') {
    (window as any).global = window;
  }

  // Polyfill for process if it doesn't exist
  if (typeof window !== 'undefined' && typeof process === 'undefined') {
    (window as any).process = {
      env: {},
      nextTick: (callback: () => void) => setTimeout(callback, 0),
    };
  }

  // Ensure Buffer is available if needed
  if (typeof window !== 'undefined' && typeof Buffer === 'undefined') {
    try {
      const { Buffer } = require('buffer');
      (window as any).Buffer = Buffer;
    } catch (e) {
      // Buffer not available, that's okay
    }
  }

  // Polyfill for AsyncStorage on web to prevent import errors
  if (typeof window !== 'undefined') {
    // Create a mock AsyncStorage that uses localStorage
    const AsyncStorageMock = {
      getItem: async (key: string) => {
        try {
          return window.localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {
          // Ignore errors
        }
      },
      removeItem: async (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      },
      clear: async () => {
        try {
          window.localStorage.clear();
        } catch (e) {
          // Ignore errors
        }
      },
      getAllKeys: async () => {
        try {
          return Object.keys(window.localStorage);
        } catch (e) {
          return [];
        }
      },
      multiGet: async (keys: string[]) => {
        try {
          return keys.map(key => [key, window.localStorage.getItem(key)]);
        } catch (e) {
          return keys.map(key => [key, null]);
        }
      },
      multiSet: async (keyValuePairs: [string, string][]) => {
        try {
          keyValuePairs.forEach(([key, value]) => {
            window.localStorage.setItem(key, value);
          });
        } catch (e) {
          // Ignore errors
        }
      },
      multiRemove: async (keys: string[]) => {
        try {
          keys.forEach(key => {
            window.localStorage.removeItem(key);
          });
        } catch (e) {
          // Ignore errors
        }
      },
    };

    // Override the AsyncStorage module resolution for web
    if (typeof require !== 'undefined') {
      try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        
        Module.prototype.require = function(id: string) {
          if (id === '@react-native-async-storage/async-storage') {
            return { default: AsyncStorageMock };
          }
          return originalRequire.apply(this, arguments);
        };
      } catch (e) {
        // Module patching not available, that's okay
      }
    }
  }
} 