/**
 * Interface for handling document exports from the editor
 * This allows different platforms (electron, web, mobile) to implement
 * their own export mechanisms while keeping the editor-react package platform-agnostic
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  message?: string;
}

/**
 * Handler for PDF export operations
 */
export interface PdfExportHandler {
  /**
   * Export HTML content to PDF
   * @param htmlContent - The HTML content to convert to PDF
   * @returns Promise resolving to export result
   */
  exportPdf(htmlContent: string): Promise<ExportResult>;
}

/**
 * Handler for DOCX export operations
 */
export interface DocxExportHandler {
  /**
   * Export DOCX document buffer
   * @param docxBuffer - The DOCX document as a Uint8Array
   * @returns Promise resolving to export result
   */
  exportDocx(docxBuffer: Uint8Array): Promise<ExportResult>;
}

/**
 * Combined interface for all export handlers
 * Platforms can implement all or just some of these export types
 */
export interface ExportHandlers extends PdfExportHandler, DocxExportHandler {}

/**
 * Optional export handlers - allows platforms to only implement what they support
 */
export interface OptionalExportHandlers {
  pdfHandler?: PdfExportHandler;
  docxHandler?: DocxExportHandler;
}

/**
 * Event listener management for export requests
 * This abstraction allows different platforms to handle export triggers differently
 */
export interface ExportEventManager {
  /**
   * Subscribe to PDF export requests
   * @param handler - Function to call when PDF export is requested
   * @returns Function to unsubscribe from events
   */
  onPdfExportRequest(handler: () => void): () => void;

  /**
   * Subscribe to DOCX export requests
   * @param handler - Function to call when DOCX export is requested
   * @returns Function to unsubscribe from events
   */
  onDocxExportRequest(handler: () => void): () => void;
}
