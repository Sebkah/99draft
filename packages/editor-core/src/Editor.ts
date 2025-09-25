import { PieceTable } from './PieceTable/PieceTable';

import { InputManager } from './Input/InputManager';
import { TextParser } from './TextParser';
import { CursorManager, MousePosition } from './CursorManager';
import { SelectionManager } from './SelectionManager';
import { createEditorLogger, type EditorLogger } from './EditorLogger';
import { TextRenderer, PDFRenderer, DOCXRenderer } from '.';
import { ParagraphStylesManager } from './styles/ParagraphStylesManager';

/**
 * Type definition for debugging piece table structure
 */
export type PieceDebug = {
  source: 'original' | 'add';
  offset: number;
  length: number;
  text: string;
};

/**
 * Debug configuration for controlling visibility of different debug visualizations
 * and logging categories
 */
export interface DebugConfig {
  // Visual debug controls
  showWordOffsets: boolean;
  showLineInfo: boolean;
  showParagraphBounds: boolean;
  showCursor: boolean;
  wordDisplayMode: 'index' | 'charOffset' | 'pixelOffset';

  // Logging debug controls
  logging: {
    pageManagement: boolean;
    rendering: boolean;
    canvasLinking: boolean;
    cursorOperations: boolean;
    textBuffer: boolean;
  };
}

type Margins = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

/**
 * Editor class that manages all text editing functionality
 * Coordinates between PieceTable, TextRenderer, and other subsystems
 *
 * Public API:
 * - cursorManager: Direct access to cursor operations
 * - selectionManager: Direct access to selection operations
 * - insertText(), deleteText(), insertLineBreak(): High-level editing operations
 * - handleKeyDown(): Input event handling
 * - setMargins(), updateMargins(): Layout configuration
 *
 * Internal subsystems are kept private to maintain consistency and proper coordination.
 * Use the public managers for direct access to cursor/selection functionality.
 */
export class Editor {
  private pieceTable: PieceTable;
  private textRenderer: TextRenderer;
  private pdfRenderer: PDFRenderer;
  private docxRenderer: DOCXRenderer;
  private textParser: TextParser;
  private inputManager: InputManager;

  public cursorManager: CursorManager;
  public selectionManager: SelectionManager;

  public paragraphStylesManager: ParagraphStylesManager;

  public margins: { left: number; right: number; top: number; bottom: number } = {
    left: 50,
    right: 50,
    top: 50,
    bottom: 50,
  };
  public debugConfig: DebugConfig;
  public logger: EditorLogger;

  public internalCanvas: HTMLCanvasElement;
  private debugUpdateCallback?: (pieces: PieceDebug[]) => void;

  public get numberOfPages(): number {
    return this.textParser.getPages().length;
  }

  // Getter for wrapping width
  public get wrappingWidth(): number {
    return this.internalCanvas.width - this.margins.left - this.margins.right;
  }

  public get wrappingHeight(): number {
    return this.internalCanvas.height - this.margins.top - this.margins.bottom;
  }

  constructor(initialText: string, margins: Margins, width: number, height: number) {
    // Initialize an internal canvas for offscreen measurements if needed
    this.internalCanvas = document.createElement('canvas');
    this.internalCanvas.width = width;
    this.internalCanvas.height = height;

    const ctx = this.internalCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create internal canvas context');

    // Set font for internal canvas context to match rendering font
    ctx.font = '16px Arial';

    // Set initial margins if provided
    if (margins.left !== undefined) this.margins.left = margins.left;
    if (margins.right !== undefined) this.margins.right = margins.right;
    if (margins.top !== undefined) this.margins.top = margins.top;
    if (margins.bottom !== undefined) this.margins.bottom = margins.bottom;

    // Initialize debug configuration with default values
    this.debugConfig = {
      showWordOffsets: false,
      showLineInfo: false,
      showParagraphBounds: false,
      showCursor: true,
      wordDisplayMode: 'charOffset',
      logging: {
        pageManagement: false,
        rendering: false,
        canvasLinking: false,
        cursorOperations: false,
        textBuffer: false,
      },
    };

    // Initialize logger with access to debug config
    this.logger = createEditorLogger(() => this.debugConfig);

    // Initialize piece table with provided text and logger
    this.pieceTable = new PieceTable(initialText, this.logger);

    // Initialize text renderer and input manager
    this.textParser = new TextParser(this.pieceTable, ctx, this);

    this.paragraphStylesManager = new ParagraphStylesManager(this.textParser);

    this.textRenderer = new TextRenderer(this.textParser, this);
    this.pdfRenderer = new PDFRenderer(this.textParser, this);
    this.docxRenderer = new DOCXRenderer(this.textParser, this);
    this.cursorManager = new CursorManager(
      Math.floor(this.pieceTable.length / 2),
      this.textParser,
      ctx,
      this,
    );
    this.selectionManager = new SelectionManager(this, this.cursorManager);
    this.cursorManager.setSelectionManager(this.selectionManager);
    this.inputManager = new InputManager(this.cursorManager, this);
  }

  initialize(): void {
    this.renderPages();
  }

  /**
   * Link canvases to the editor's text renderer
   * @param canvases - Array of canvas elements to link
   * @param skipMarginsUpdate - If true, only renders pages without updating margins (used when relinking after page count changes)
   */
  linkCanvases(canvases: HTMLCanvasElement[] | null, skipMarginsUpdate = false): void {
    if (!canvases || canvases.length === 0) return;

    // Filter out null canvas elements that may exist when page count decreases
    const validCanvases = canvases.filter((canvas): canvas is HTMLCanvasElement => canvas !== null);

    const operation = skipMarginsUpdate ? 'Re-linking' : 'Linking';
    this.logger.canvasLinking(
      `${operation} canvases:`,
      validCanvases.length,
      'valid canvases for',
      this.numberOfPages,
      'pages',
    );

    const ctxs = validCanvases
      .map((canvas) => canvas.getContext('2d'))
      .filter((ctx): ctx is CanvasRenderingContext2D => ctx !== null);

    this.textRenderer.updateContexts(ctxs);
    this.synchronizeFontSettings(ctxs);

    if (skipMarginsUpdate) {
      // Only render pages, don't update margins (avoids infinite loops during page count changes)
      this.renderPages();
    } else {
      // Full initialization with margin updates
      this.updateMargins();
    }
  }

  renderPages(): void {
    for (let i = 0; i < this.numberOfPages; i++) {
      this.textRenderer.render(i);
    }
  }

  /**
   * Handle keyboard input events
   * @param event - Native keyboard event
   * @returns true if the event was handled and should be prevented
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.inputManager) return false;
    return this.inputManager.handleKeyDown(event);
  }

  startSelection(mousePosition: MousePosition): void {
    this.selectionManager.startSelection(mousePosition);
    this.renderPages();
  }
  updateSelection(mousePosition: MousePosition): void {
    this.selectionManager.updateSelection(mousePosition);
    this.renderPages();
  }
  endSelection(mousePosition: MousePosition): void {
    this.selectionManager.endSelection(mousePosition);
    this.renderPages();
  }

  /**
   * Set a callback to be called when the number of pages changes
   * @param callback - Function to call when page count changes
   */
  setPageCountChangeCallback(callback: (pageCount: number) => void): void {
    // Delegate to TextParser which is responsible for page management
    this.textParser.setPageCountChangeCallback(callback);
  }

  /**
   * Update the left and right margins with new values
   * @param leftMargin - Left margin in pixels
   * @param rightMargin - Right margin in pixels
   */
  setMargins(leftMargin: number, rightMargin: number): void {
    this.margins.left = leftMargin;
    this.margins.right = rightMargin;
    this.updateMargins();
  }

  /**
   * Update the margins using stored values and canvas reference
   * @param leftMargin - Optional left margin override
   * @param rightMargin - Optional right margin override
   * @param canvasWidth - Optional canvas width override
   */
  updateMargins(leftMargin?: number, rightMargin?: number): void {
    if (leftMargin !== undefined) this.margins.left = leftMargin;
    if (rightMargin !== undefined) this.margins.right = rightMargin;

    this.textParser.splitAllParagraphsIntoLines();
    this.textParser.splitParagraphsIntoPages();
    this.cursorManager.mapLinearToStructure();
    this.renderPages();
  }

  /**
   * Synchronize font settings between internal canvas context and rendering contexts
   * This ensures text measurements match actual rendering
   * @param ctxs - Array of rendering contexts to synchronize with
   */
  private synchronizeFontSettings(ctxs: CanvasRenderingContext2D[]): void {
    const font = '16px Arial'; // Keep this consistent with TextRenderer.setBaseTextStyle()

    // Set font on internal canvas context used for measurements
    const internalCtx = this.internalCanvas.getContext('2d');
    if (internalCtx) {
      internalCtx.font = font;
    }

    // Set font on all rendering contexts
    ctxs.forEach((ctx) => {
      ctx.font = font;
    });
  }

  /**
   * Get the piece table for debugging purposes
   */
  getPieceTable(): PieceTable {
    return this.pieceTable;
  }

  /**
   * Get the text renderer for debugging/inspection purposes
   * @deprecated Use editor.textRenderer directly for debugging
   */
  getTextRenderer(): TextRenderer | null {
    return this.textRenderer;
  }

  /**
   * Get the text parser for debugging/inspection purposes
   * @deprecated Use editor.textParser directly for debugging
   */
  getTextParser(): TextParser | null {
    return this.textParser;
  }

  //TODO: enable inserting and deleting at arbitrary positions

  insertText(text: string): void {
    // If it's not just one letter
    const parts = text.split('\n');

    // Handle selection deletion if there's a selection
    const deletedRange = this.selectionManager.deleteSelection();
    if (deletedRange) {
      this.textParser.splitIntoParagraphs();
      this.textParser.splitAllParagraphsIntoLines();
      this.cursorManager.mapLinearToStructure();
    }

    if (parts.length > 1) {
      // Split it around the line breaks
      // Insert each part separately with line breaks in between
      parts.forEach((part, index) => {
        if (part.length > 0) {
          this.insertText(part);
        }
        // Insert line break between parts (if not the last part)
        if (index < parts.length - 1) {
          this.insertLineBreak();
        }
      });
      return;
    }

    this.pieceTable.insert(text, this.cursorManager.getPosition());

    this.textParser.reparseParagraph(this.cursorManager.getPosition(), text.length);

    this.cursorManager.setCursorPosition(
      Math.min(this.pieceTable.length, this.cursorManager.getPosition() + text.length),
    );

    this.textParser.splitParagraphsIntoPages();

    this.renderPages();
    this.emitDebugUpdate();
  }

  //TODO: this should also do partial reparsing, but we need to be carefull if we delete newlines
  deleteText(length: number): void {
    // Handle selection deletion if there's a selection
    const deletedRange = this.selectionManager.deleteSelection();
    if (deletedRange) {
      this.textParser.splitIntoParagraphs();
      this.textParser.splitAllParagraphsIntoLines();
      this.textParser.splitParagraphsIntoPages();
      this.cursorManager.mapLinearToStructure();
      this.renderPages();
      this.emitDebugUpdate();
      return;
    }

    if (this.cursorManager.getPosition() > 0) {
      // Check if we are deleting a newline character
      const charBefore = this.pieceTable.getRangeText(this.cursorManager.getPosition() - 1, 1);
      if (charBefore === '\n') {
        // Merging paragraphs, so update paragraph styles accordingly
        this.paragraphStylesManager.mergeParagraphs(
          this.textParser.findParagraphIndexAtOffset(this.cursorManager.getPosition()),
        );
      }

      this.pieceTable.delete(this.cursorManager.getPosition() - 1, length);

      this.cursorManager.setCursorPosition(Math.max(0, this.cursorManager.getPosition() - length));

      this.textParser.splitIntoParagraphs();
      this.textParser.splitAllParagraphsIntoLines();
      this.textParser.splitParagraphsIntoPages();

      this.cursorManager.mapLinearToStructure();
      this.renderPages();
      this.emitDebugUpdate();
    }
  }

  insertLineBreak(): void {
    this.pieceTable.insert('\n', this.cursorManager.getPosition());
    this.textParser.splitParagraph(this.cursorManager.getPosition());
    this.textParser.splitParagraphsIntoPages();

    this.cursorManager.setCursorPosition(
      Math.min(this.pieceTable.length, this.cursorManager.getPosition() + 1),
    );

    this.renderPages();
    this.emitDebugUpdate();
  }

  /**
   * Start debug information updates (triggered on input changes)
   * @param callback - Function to call with updated debug information
   */
  startDebugUpdates(callback: (pieces: PieceDebug[]) => void): void {
    this.debugUpdateCallback = callback;
    // Trigger initial update
    this.emitDebugUpdate();
  }

  /**
   * Trigger debug information update immediately
   */
  public emitDebugUpdate(): void {
    if (this.debugUpdateCallback) {
      /*  console.log('Triggering debug update'); */
      const pieces = this.pieceTable.getPieces().map((piece) => {
        // Extract text from appropriate buffer based on piece source
        if (piece.source === 'original') {
          return {
            ...piece,
            text: this.pieceTable
              .getOriginalBuffer()
              .substring(piece.offset, piece.offset + piece.length),
          };
        }
        return {
          ...piece,
          text: this.pieceTable.getAddBuffer().substring(piece.offset, piece.offset + piece.length),
        };
      });
      this.debugUpdateCallback(pieces);
    }
  }

  /**
   * Export the current document as HTML content ready for PDF conversion
   * Returns HTML that can be converted to PDF by the application layer
   */
  public exportToPdf(): string {
    return this.pdfRenderer.generateHtmlForPdf();
  }

  /**
   * Export the current document as a DOCX Document object
   * Returns a Document object that can be saved as .docx by the application layer
   */
  public exportToDocx(): any {
    return this.docxRenderer.generateDocxDocument();
  }

  /**
   * Export the current document as a simple DOCX Document object
   * Returns a simplified Document object for basic exports
   */
  public exportToSimpleDocx(): any {
    return this.docxRenderer.generateSimpleDocxDocument();
  }

  /**
   * Clean up resources when the editor is no longer needed
   */
  dispose(): void {}
}
