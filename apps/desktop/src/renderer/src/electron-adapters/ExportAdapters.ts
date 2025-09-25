import {
  PdfExportHandler,
  DocxExportHandler,
  ExportEventManager,
  ExportResult,
  OptionalExportHandlers,
} from '@99draft/editor-react';

/**
 * Electron-specific implementation of PDF export handler
 */
export class ElectronPdfExportHandler implements PdfExportHandler {
  /**
   * Export HTML content to PDF using Electron's main process
   * @param htmlContent - The HTML content to convert to PDF
   * @returns Promise resolving to export result
   */
  async exportPdf(htmlContent: string): Promise<ExportResult> {
    try {
      // Use Electron's IPC to convert HTML to PDF
      const result = await window.api.exportPdf(htmlContent);
      return result;
    } catch (error) {
      console.error('Electron PDF export error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown PDF export error',
      };
    }
  }
}

/**
 * Electron-specific implementation of DOCX export handler
 */
export class ElectronDocxExportHandler implements DocxExportHandler {
  /**
   * Export DOCX document buffer using Electron's main process
   * @param docxBuffer - The DOCX document as a Uint8Array
   * @returns Promise resolving to export result
   */
  async exportDocx(docxBuffer: Uint8Array): Promise<ExportResult> {
    try {
      // Use Electron's IPC to save the DOCX file
      const result = await window.api.exportDocx(docxBuffer);
      return result;
    } catch (error) {
      console.error('Electron DOCX export error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown DOCX export error',
      };
    }
  }
}

/**
 * Electron-specific implementation of export event manager
 * This manages IPC event listeners for export requests from the main process
 */
export class ElectronExportEventManager implements ExportEventManager {
  /**
   * Subscribe to PDF export requests from Electron's main process
   * @param handler - Function to call when PDF export is requested
   * @returns Function to unsubscribe from events
   */
  onPdfExportRequest(handler: () => void): () => void {
    // Listen for export requests from the main process
    const removeListener = window.electron.ipcRenderer.on('export-pdf-request', handler);

    // Return cleanup function
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }

  /**
   * Subscribe to DOCX export requests from Electron's main process
   * @param handler - Function to call when DOCX export is requested
   * @returns Function to unsubscribe from events
   */
  onDocxExportRequest(handler: () => void): () => void {
    // Listen for export requests from the main process
    const removeListener = window.electron.ipcRenderer.on('export-docx-request', handler);

    // Return cleanup function
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }
}

/**
 * Factory function to create electron-specific export handlers and event manager
 * Use this in your Electron app to provide export functionality to the editor
 */
export function createElectronExportAdapters(): {
  exportHandlers: OptionalExportHandlers;
  exportEventManager: ExportEventManager;
} {
  return {
    exportHandlers: {
      pdfHandler: new ElectronPdfExportHandler(),
      docxHandler: new ElectronDocxExportHandler(),
    },
    exportEventManager: new ElectronExportEventManager(),
  };
}
