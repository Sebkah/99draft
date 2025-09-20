import { PieceTable } from './PieceTable/PieceTable';
import { TextRenderer } from './TextRenderer';
import { InputManager } from './Input/InputManager';
import { TextParser } from './TextParser';
import { CursorManager, MousePosition, StructurePosition } from './CursorManager';
import { m } from 'motion/dist/react';

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

type Margins = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

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

  public margins: { left: number; right: number; top: number; bottom: number } = {
    left: 50,
    right: 50,
    top: 50,
    bottom: 50,
  };
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

  constructor(initialText: string, ctx: CanvasRenderingContext2D, margins: Margins) {
    // Initialize piece table with provided text
    this.pieceTable = new PieceTable(initialText);

    // Store canvas reference
    this.canvas = ctx.canvas;

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

  startSelection(mousePosition: MousePosition): void {
    this.cursorManager.startSelection(mousePosition);
    this.textRenderer.render();
  }
  updateSelection(mousePosition: MousePosition): void {
    this.cursorManager.updateSelection(mousePosition);
    this.textRenderer.render();
  }
  endSelection(mousePosition: MousePosition): void {
    this.cursorManager.endSelection(mousePosition);
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
    // If it's not just one letter
    const parts = text.split('\n');

    if (this.cursorManager.selection) {
      const start = this.cursorManager.selection.start;
      const end = this.cursorManager.selection.end;
      this.pieceTable.delete(start, end - start);
      this.cursorManager.setCursorPosition(start);
      this.cursorManager.selection = null;
    }

    if (parts.length > 1) {
      // Split it around the line breaks
      // Insert each part separately with line breaks in between
      parts.forEach((part, index) => {
        if (part.length > 0) {
          this.insertText(part);
        }
        if (index < parts.length - 1) {
          this.insertLineBreak();
        }
      });
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
    if (this.cursorManager.selection) {
      const start = this.cursorManager.selection.start;
      const end = this.cursorManager.selection.end;
      this.pieceTable.delete(start, end - start);
      this.cursorManager.setCursorPosition(start);
      this.cursorManager.selection = null;
      this.textParser.splitIntoParagraphs();
      this.textParser.splitAllParagraphsIntoLines();
      this.cursorManager.mapCursorPositionToStructure();
      this.textRenderer.render();
      this.emitDebugUpdate();
      return;
    }

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
