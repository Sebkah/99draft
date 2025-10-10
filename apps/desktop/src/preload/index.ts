import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  exportPdf: (htmlContent: string) => ipcRenderer.invoke('export-pdf', htmlContent),
  exportDocx: (docxBuffer: Uint8Array) => ipcRenderer.invoke('export-docx', docxBuffer),
};

// Enhanced electron API with additional IPC methods
const enhancedElectronAPI = {
  ...electronAPI,
  ipcRenderer: {
    on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
        callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', enhancedElectronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = enhancedElectronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
