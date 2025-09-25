import {
  PdfExportHandler,
  DocxExportHandler,
  ExportEventManager,
  ExportResult,
  OptionalExportHandlers,
} from '@99draft/editor-react';

/**
 * Example web-based implementation of PDF export handler
 * This could use libraries like jsPDF or send data to a server
 */
export class WebPdfExportHandler implements PdfExportHandler {
  async exportPdf(htmlContent: string): Promise<ExportResult> {
    try {
      // Example: Create a blob and trigger download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Create a temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.html'; // Could be converted to PDF on server
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      return {
        success: true,
        filePath: 'document.html',
        message: 'HTML file downloaded (server conversion to PDF required)',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown web PDF export error',
      };
    }
  }
}

/**
 * Example web-based implementation of DOCX export handler
 */
export class WebDocxExportHandler implements DocxExportHandler {
  async exportDocx(docxBuffer: Uint8Array): Promise<ExportResult> {
    try {
      // Create a blob and trigger download
      const blob = new Blob([new Uint8Array(docxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);

      // Create a temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      return {
        success: true,
        filePath: 'document.docx',
        message: 'DOCX file downloaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown web DOCX export error',
      };
    }
  }
}

/**
 * Example web-based implementation of export event manager
 * This could listen to custom events, button clicks, keyboard shortcuts, etc.
 */
export class WebExportEventManager implements ExportEventManager {
  onPdfExportRequest(handler: () => void): () => void {
    // Example: Listen for custom events or keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  onDocxExportRequest(handler: () => void): () => void {
    // Example: Listen for custom events
    const handleCustomEvent = () => handler();

    document.addEventListener('export-docx', handleCustomEvent);

    // Return cleanup function
    return () => {
      document.removeEventListener('export-docx', handleCustomEvent);
    };
  }
}

/**
 * Factory function to create web-specific export handlers and event manager
 * Use this in your web app to provide export functionality to the editor
 */
export function createWebExportAdapters(): {
  exportHandlers: OptionalExportHandlers;
  exportEventManager: ExportEventManager;
} {
  return {
    exportHandlers: {
      pdfHandler: new WebPdfExportHandler(),
      docxHandler: new WebDocxExportHandler(),
    },
    exportEventManager: new WebExportEventManager(),
  };
}

/**
 * Example usage in a web React component:
 *
 * ```tsx
 * import { TextEditor } from '@99draft/editor-react';
 * import { createWebExportAdapters } from './web-adapters/ExportAdapters';
 *
 * function WebApp() {
 *   const { exportHandlers, exportEventManager } = createWebExportAdapters();
 *
 *   return (
 *     <div>
 *       <button
 *         onClick={() => document.dispatchEvent(new CustomEvent('export-docx'))}
 *       >
 *         Export DOCX
 *       </button>
 *       <TextEditor
 *         exportHandlers={exportHandlers}
 *         exportEventManager={exportEventManager}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
