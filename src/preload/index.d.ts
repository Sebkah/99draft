import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        on: (channel: string, callback: (...args: any[]) => void) => () => void;
        send: (channel: string, ...args: any[]) => void;
      };
    };
    api: {
      exportPdf: (
        htmlContent: string,
      ) => Promise<{ success: boolean; filePath?: string; message?: string }>;
      exportDocx: (
        docxBuffer: Uint8Array,
      ) => Promise<{ success: boolean; filePath?: string; message?: string }>;
    };
  }
}
