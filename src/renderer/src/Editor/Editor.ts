import { PieceTable } from './PieceTable/PieceTable';
import { TextRenderer } from './TextRenderer';
import { InputManager } from './Input/InputManager';
import { TextParser } from './TextParser';
import { CursorManager, StructurePosition } from './CursorManager';

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
 */
export interface DebugConfig {
  showWordOffsets: boolean;
  showLineInfo: boolean;
  showParagraphBounds: boolean;
  showCursor: boolean;
  wordDisplayMode: 'index' | 'charOffset' | 'pixelOffset';
}

/**
 * Editor class that manages all text editing functionality
 * Coordinates between PieceTable, TextRenderer, and InputManager
 */
export class Editor {
  private pieceTable: PieceTable;
  private textRenderer: TextRenderer;
  private textParser: TextParser;
  private inputManager: InputManager;

  public cursorManager: CursorManager;

  public get cursorPosition(): number {
    return this.cursorManager.getPosition();
  }

  public margins: { left: number; right: number };
  public debugConfig: DebugConfig;

  private canvas: HTMLCanvasElement | null = null;
  private debugUpdateCallback?: (pieces: PieceDebug[]) => void;

  // Getter for wrapping width
  public get wrappingWidth(): number {
    if (!this.canvas) return 700; // Default width if canvas not set
    return this.canvas.width - this.margins.left - this.margins.right;
  }

  public getStructurePosition(): StructurePosition {
    return this.cursorManager.structurePosition;
  }

  constructor(
    initialText: string,
    ctx: CanvasRenderingContext2D,
    margins = { left: 50, right: 50 },
  ) {
    // Initialize piece table with provided text
    this.pieceTable = new PieceTable(initialText);

    // Store canvas reference
    this.canvas = ctx.canvas;
    this.margins = margins;

    // Initialize debug configuration with default values
    this.debugConfig = {
      showWordOffsets: false,
      showLineInfo: true,
      showParagraphBounds: true,
      showCursor: true,
      wordDisplayMode: 'charOffset',
    };

    // Initialize text renderer and input manager
    this.textParser = new TextParser(this.pieceTable, ctx, this);
    this.textRenderer = new TextRenderer(ctx, this.textParser, this);
    this.cursorManager = new CursorManager(
      Math.floor(this.pieceTable.length / 2),
      this.textParser,
      ctx,
      this,
    );
    this.inputManager = new InputManager(
      this.pieceTable,
      this.textRenderer,
      this.textParser,
      this.cursorManager,
      this,
    );

    this.textRenderer.render();

    // Set initial margins and render
    this.updateMargins();
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

  handleClick(x: number, y: number): void {
    this.cursorManager.mapPixelCoordinateToStructure(x, y, true);

    this.emitDebugUpdate();
    this.textRenderer.render();
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
    this.cursorManager.mapCursorPositionToStructure();
    this.textRenderer.render();
  }

  /**
   * Get the current cursor position
   */
  getCursorPosition(): number {
    return this.cursorManager.getPosition();
  }

  /**
   * Get the piece table for debugging purposes
   */
  getPieceTable(): PieceTable {
    return this.pieceTable;
  }

  /**
   * Get the text renderer for debugging purposes
   */
  getTextRenderer(): TextRenderer | null {
    return this.textRenderer;
  }

  getTextParser(): TextParser | null {
    return this.textParser;
  }

  //TODO: enable inserting and deleting at arbitrary positions

  insertText(text: string): void {
    if (text.includes('\n')) {
      console.warn('Inserting text with newlines is not supported yet.');
      return;
    }

    this.pieceTable.insert(text, this.cursorPosition);

    this.textParser.reparseParagraph(this.cursorPosition, text.length);

    /*  this.cursorPosition = Math.min(this.pieceTable.length, this.cursorPosition + text.length); */
    this.cursorManager.setCursorPosition(
      Math.min(this.pieceTable.length, this.cursorPosition + text.length),
    );

    this.textRenderer.render();
    this.emitDebugUpdate();
  }

  //TODO: this should also do partial reparsing, but we need to be carefull if we delete newlines
  deleteText(length: number): void {
    if (this.cursorPosition > 0) {
      this.pieceTable.delete(this.cursorPosition - 1, length);

      this.cursorManager.setCursorPosition(Math.max(0, this.cursorPosition - length));

      this.textParser.splitIntoParagraphs();
      this.textParser.splitAllParagraphsIntoLines();

      this.cursorManager.mapCursorPositionToStructure();
      this.textRenderer.render();
      this.emitDebugUpdate();
    }
  }

  insertLineBreak(): void {
    this.pieceTable.insert('\n', this.cursorPosition);
    this.textParser.splitParagraph(this.cursorPosition);

    this.cursorManager.setCursorPosition(Math.min(this.pieceTable.length, this.cursorPosition + 1));

    this.textRenderer.render();
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
            text: this.pieceTable.originalBuffer.substring(
              piece.offset,
              piece.offset + piece.length,
            ),
          };
        }
        return {
          ...piece,
          text: this.pieceTable.addBuffer.substring(piece.offset, piece.offset + piece.length),
        };
      });
      this.debugUpdateCallback(pieces);
    }
  }

  /**
   * Clean up resources when the editor is no longer needed
   */
  dispose(): void {}
}
