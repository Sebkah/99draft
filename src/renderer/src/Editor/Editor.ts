import { PieceTable } from './PieceTable/PieceTable';
import { TextRenderer } from './TextRenderer';
import { InputManager } from './Input/InputManager';

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
 * Editor class that manages all text editing functionality
 * Coordinates between PieceTable, TextRenderer, and InputManager
 */
export class Editor {
  private pieceTable: PieceTable;
  private textRenderer: TextRenderer | null = null;
  private inputManager: InputManager | null = null;
  private cursorPosition: number;
  private leftMargin: number = 50;
  private rightMargin: number = 750;
  private canvas: HTMLCanvasElement | null = null;
  private debugUpdateCallback?: (pieces: PieceDebug[]) => void;

  constructor(initialText: string) {
    // Initialize piece table with provided text
    this.pieceTable = new PieceTable(initialText);

    // Initialize cursor position at end of text
    this.cursorPosition = this.pieceTable.length ;
  }

  /**
   * Initialize the editor with a canvas context
   * @param ctx - Canvas 2D rendering context
   */
  initialize(ctx: CanvasRenderingContext2D): void {
    if (this.textRenderer && this.inputManager) {
      return; // Already initialized
    }

    // Store canvas reference
    this.canvas = ctx.canvas;

    // Initialize text renderer and input manager
    this.textRenderer = new TextRenderer(ctx, this.pieceTable);
    this.textRenderer.setCursorPosition(this.cursorPosition);
    this.inputManager = new InputManager(
      this.pieceTable,
      this.cursorPosition,
      this.textRenderer,
      this,
    );

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

  /**
   * Update the left and right margins with new values
   * @param leftMargin - Left margin in pixels
   * @param rightMargin - Right margin in pixels
   */
  setMargins(leftMargin: number, rightMargin: number): void {
    this.leftMargin = leftMargin;
    this.rightMargin = rightMargin;
    this.updateMargins();
  }

  /**
   * Update the margins using stored values and canvas reference
   * @param leftMargin - Optional left margin override
   * @param rightMargin - Optional right margin override
   * @param canvasWidth - Optional canvas width override
   */
  updateMargins(leftMargin?: number, rightMargin?: number, canvasWidth?: number): void {
    const left = leftMargin ?? this.leftMargin;
    const right = rightMargin ?? this.rightMargin;
    const width = canvasWidth ?? this.canvas?.width ?? 0;

    if (leftMargin !== undefined) this.leftMargin = leftMargin;
    if (rightMargin !== undefined) this.rightMargin = rightMargin;

    if (this.inputManager) {
      this.inputManager.updateMargins(left, right, width);
    }
  }

  /**
   * Get the current cursor position
   */
  getCursorPosition(): number {
    return this.cursorPosition;
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

  /**
   * Get current margin values
   */
  getMargins(): { left: number; right: number } {
    return { left: this.leftMargin, right: this.rightMargin };
  }

  /**
   * Start debug information updates (triggered on input changes)
   * @param callback - Function to call with updated debug information
   */
  startDebugUpdates(callback: (pieces: PieceDebug[]) => void): void {
    this.debugUpdateCallback = callback;
    // Trigger initial update
    this.triggerDebugUpdate();
  }

  /**
   * Trigger debug information update immediately
   */
  public triggerDebugUpdate(): void {
    if (this.debugUpdateCallback) {
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
