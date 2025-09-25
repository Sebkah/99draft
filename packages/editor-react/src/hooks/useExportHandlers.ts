import { useEffect } from 'react';
import { Editor } from '@99draft/editor-core';
import { OptionalExportHandlers, ExportEventManager } from '../types/ExportHandlers';

/**
 * Custom hook that manages document export functionality for the editor
 * Handles PDF and DOCX export requests from the platform-specific event manager
 */
export function useExportHandlers(
  editor: Editor | null,
  exportHandlers?: OptionalExportHandlers,
  exportEventManager?: ExportEventManager,
) {
  useEffect(() => {
    if (!editor || !exportHandlers || !exportEventManager) {
      // No export functionality provided or editor not ready
      return;
    }

    /**
     * Handle PDF export request from the platform
     */
    const handlePdfExport = async () => {
      if (!exportHandlers.pdfHandler) {
        console.error('PDF handler not available for PDF export');
        return;
      }

      try {
        // Generate HTML content using the editor's PDF export functionality
        const htmlContent = editor.exportToPdf();

        // Use the injected PDF handler
        const result = await exportHandlers.pdfHandler.exportPdf(htmlContent);

        if (result.success) {
          console.log('PDF exported successfully to:', result.filePath);
          // Optionally show a success notification
        } else {
          console.error('PDF export failed:', result.message);
          // Optionally show an error notification
        }
      } catch (error) {
        console.error('PDF export error:', error);
      }
    };

    /**
     * Handle DOCX export request from the platform
     */
    const handleDocxExport = async () => {
      if (!exportHandlers.docxHandler) {
        console.error('DOCX handler not available for DOCX export');
        return;
      }

      try {
        // Import the docx library dynamically to avoid bundling issues
        const { Packer } = await import('docx');

        // Generate DOCX document using the editor's DOCX export functionality
        const docxDocument = editor.exportToDocx();

        // Convert the document to a blob (browser-compatible)
        const blob = await Packer.toBlob(docxDocument);

        // Convert blob to array buffer, then to buffer for the handler
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Use the injected DOCX handler
        const result = await exportHandlers.docxHandler.exportDocx(buffer);

        if (result.success) {
          console.log('DOCX exported successfully to:', result.filePath);
          // Optionally show a success notification
        } else {
          console.error('DOCX export failed:', result.message);
          // Optionally show an error notification
        }
      } catch (error) {
        console.error('DOCX export error:', error);
      }
    };

    // Subscribe to export events using the injected event manager
    const removePdfListener = exportEventManager.onPdfExportRequest(handlePdfExport);
    const removeDocxListener = exportEventManager.onDocxExportRequest(handleDocxExport);

    // Cleanup function to remove event listeners
    return () => {
      if (removePdfListener) {
        removePdfListener();
      }
      if (removeDocxListener) {
        removeDocxListener();
      }
    };
  }, [editor, exportHandlers, exportEventManager]);
}
