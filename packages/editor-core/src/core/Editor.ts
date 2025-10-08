import { PieceTable } from '../pieceTable/PieceTable';

import { InputManager } from '../managers/InputManager';
import { TextParser } from './TextParser';
import { CursorManager, MousePosition } from '../managers/CursorManager';
import { SelectionManager } from '../managers/SelectionManager';
import { createEditorLogger, type EditorLogger } from '../managers/EditorLogger';
import { TextRenderer, PDFRenderer, DOCXRenderer } from '..';
import { ParagraphStylesManager } from '../styles/ParagraphStylesManager';
import { EventEmitter } from '../utils/EventEmitter';
import type { EditorEvents, DebugUpdateEvent } from '../types/EditorEvents';

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
export class Editor extends EventEmitter<EditorEvents> {
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
    super();
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
      showParagraphBounds: true,
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
    this.paragraphStylesManager = new ParagraphStylesManager(this, [
      {
        marginLeft: 45,
        marginRight: 20,
        lineHeight: 1.2,
      },
      {
        marginLeft: 20,
        marginRight: 200,
        lineHeight: 1.5,
      },
      {
        marginLeft: 20,
        marginRight: 300,
        lineHeight: 1.5,
        align: 'justify',
      },
      {
        marginLeft: 20,
        marginRight: 300,
        lineHeight: 1.5,
        align: 'justify',
      },
      {
        marginLeft: 100,
        marginRight: 100,
        lineHeight: 1.5,
        align: 'right',
      },
    ]);
    this.textParser = new TextParser(this.pieceTable, ctx, this);

    // Forward TextParser events as Editor events
    this.textParser.on('pageCountChange', (event) => {
      this.emit('pageCountChange', event);
    });

    this.textRenderer = new TextRenderer(this.textParser, this);
    this.pdfRenderer = new PDFRenderer(this.textParser, this);
    this.docxRenderer = new DOCXRenderer(this.textParser, this);
    this.cursorManager = new CursorManager(0, this.textParser, ctx, this);
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
    this.emitDebugUpdate();
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
   * Update the left and right margins with new values
   * @param leftMargin - Left margin in pixels
   * @param rightMargin - Right margin in pixels
   */
  setMargins(leftMargin: number, rightMargin: number): void {
    this.margins.left = leftMargin;
    this.margins.right = rightMargin;
    this.updateMargins();
  }

  setMarginsForCurrentParagraph(marginLeft: number, marginRight: number): void {
    const { paragraphIndex } = this.cursorManager.structurePosition;

    this.paragraphStylesManager.setParagraphStylesPartial(paragraphIndex, {
      marginLeft,
      marginRight,
    });

    this.textParser.splitParagraphIntoLines(paragraphIndex);

    this.textParser.splitParagraphsIntoPages();

    this.cursorManager.mapLinearToStructure();
    this.renderPages();
  }

  /**
   * Set text alignment for the current paragraph
   * @param align - The alignment to apply: 'left', 'center', 'right', or 'justify'
   */
  setAlignmentForCurrentParagraph(align: 'left' | 'center' | 'right' | 'justify'): void {
    const { paragraphIndex } = this.cursorManager.structurePosition;

    this.paragraphStylesManager.setParagraphStylesPartial(paragraphIndex, {
      align,
    });

    this.cursorManager.mapLinearToStructure();
    this.renderPages();
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

  /**
   * Internal method to insert text without triggering render
   * Used by other operations that will handle rendering themselves
   * Note: Does NOT update page structure - caller must call splitParagraphsIntoPages()
   * @param text - Text to insert
   * @param position - Optional position to insert at (defaults to cursor position)
   */
  private insertTextInternal(text: string, position?: number): void {
    const currentPosition = position
      ? this.cursorManager.clampLinearPosition(position)
      : this.cursorManager.getPosition();

    this.pieceTable.insert(text, currentPosition);
    this.textParser.reparseParagraph(currentPosition, text.length);
    this.cursorManager.moveRight(text.length);
  }

  /**
   * Internal method to insert line break without triggering render
   * Used by other operations that will handle rendering themselves
   * Note: Does NOT update page structure - caller must call splitParagraphsIntoPages()
   * @param position - Optional position to insert at (defaults to cursor position)
   */
  private insertLineBreakInternal(position?: number): void {
    const currentPosition = position
      ? this.cursorManager.clampLinearPosition(position)
      : this.cursorManager.getPosition();

    this.pieceTable.insert('\n', currentPosition);
    this.textParser.splitParagraphDirectly(currentPosition);

    this.cursorManager.moveRight(1);
  }

  /**
   * Insert a line break at cursor position or specified position
   * Triggers rerender after insertion
   * @param position - Optional position to insert at (defaults to cursor position)
   */
  insertLineBreak(position?: number): void {
    // Handle selection deletion if there's a selection
    if (this.selectionManager.hasSelection()) {
      this.deleteSelectionInternal();
    }

    this.insertLineBreakInternal(position);
    this.textParser.splitParagraphsIntoPages();
    this.renderPages();
    this.emitDebugUpdate();
  }

  /**
   * Insert text at cursor position or specified position
   * Handles multi-line text and triggers rerender after insertion
   * @param text - Text to insert (can contain newlines)
   * @param position - Optional position to insert at (defaults to cursor position)
   */
  insertText(text: string, position?: number): void {
    const parts = text.split('\n');

    // First delete selection if there's one (internal, no render)
    this.deleteSelectionInternal();

    // If there are line breaks, handle each part separately
    if (parts.length > 1) {
      // Insert each part separately with line breaks in between
      parts.forEach((part, index) => {
        if (part.length > 0) {
          this.insertTextInternal(part, position);
        }
        // Insert line break between parts (if not the last part)
        if (index < parts.length - 1) {
          this.insertLineBreakInternal(position);
        }
      });
      // Update page structure once after all insertions
      this.textParser.splitParagraphsIntoPages();
      // Render once after all insertions
      this.renderPages();
      this.emitDebugUpdate();
      return;
    }

    // Single line insertion
    this.insertTextInternal(text, position);
    // Update page structure before rendering
    this.textParser.splitParagraphsIntoPages();
    this.renderPages();
    this.emitDebugUpdate();
  }

  /**
   * Deletes the specified number of characters before the cursor or before a given position.
   *
   * For now this will clear any selection first if there's one.
   *
   *
   * **/
  deleteTextBefore(length: number, position?: number): void {
    this.selectionManager.clearSelection();

    const currentPosition = position
      ? this.cursorManager.clampLinearPosition(position)
      : this.cursorManager.getPosition();

    // Case 2: No selection, delete before cursor
    // Validate position bounds
    if (currentPosition - length < 0) {
      console.warn('Delete operation would exceed text bounds, adjusting length');
      length = currentPosition;
    }

    if (length === 0) {
      console.warn('Delete length is 0, no operation performed');
      return;
    }

    // Case 2.1: Only one character
    if (length === 1) {
      // Check if we are deleting a newline character
      const charBefore = this.pieceTable.getRangeText(currentPosition - 1, 1);
      // Delete the text first
      this.pieceTable.delete(currentPosition - 1, length);
      // Merge the paragraphs if a newline was deleted
      if (charBefore === '\n') this.textParser.mergeParagraphsAtLineBreak(currentPosition - 1);
      else this.textParser.reparseParagraph(currentPosition, -1);
    }
    // Case 2.2: Multiple characters
    else {
      this.pieceTable.delete(currentPosition - length, length);
      this.textParser.deleteTextRangeDirectly(currentPosition - length, length);
    }

    // Re-split paragraphs into pages
    this.textParser.splitParagraphsIntoPages();

    // Ensure cursor position is valid before setting it
    const newCursorPos = Math.max(0, Math.min(this.pieceTable.length, currentPosition - length));
    this.cursorManager.setCursorPosition(newCursorPos);

    this.renderPages();
    this.emitDebugUpdate();
  }

  /**
   * Internal method to delete selection without triggering render
   * Used by other operations that will handle rendering themselves
   * Note: Does NOT update page structure - caller must call splitParagraphsIntoPages()
   * @returns true if selection was deleted, false if no selection existed
   */
  private deleteSelectionInternal(): boolean {
    const selection = this.selectionManager.getSelection();
    if (!selection) {
      return false;
    }
    const { start, end } = selection;
    const selectionLength = end - start;
    this.pieceTable.delete(start, selectionLength);
    this.textParser.deleteTextRangeDirectly(start, selectionLength);
    this.cursorManager.setCursorPosition(start);
    this.selectionManager.clearSelection();

    return true;
  }

  /**
   * Public API to delete the current selection
   * Triggers rerender after deletion
   * @returns true if selection was deleted, false if no selection existed
   */
  deleteSelection(): boolean {
    const result = this.deleteSelectionInternal();
    if (result) {
      this.textParser.splitParagraphsIntoPages();
      this.renderPages();
      this.emitDebugUpdate();
    }
    return result;
  }

  /**
   * Trigger debug information update immediately
   * Emits 'debugUpdate' event with current piece table state
   */
  public emitDebugUpdate(): void {
    if (this.hasListeners('debugUpdate')) {
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

      const event: DebugUpdateEvent = { pieces };
      this.emit('debugUpdate', event);
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
   * Clean up resources when the editor is no longer needed
   */
  dispose(): void {}
}
