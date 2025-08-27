import { Editor } from '../Editor';
import { PieceTable } from '../PieceTable/PieceTable';

import { TextRenderer } from '../TextRenderer';

/**
 * InputManager handles all keyboard input for text editing operations
 * Separates input logic from UI rendering concerns
 */
export class InputManager {
  private pieceTable: PieceTable;
  private cursorPosition: number;
  private textRenderer: TextRenderer;

  private editor: Editor;

  constructor(
    pieceTable: PieceTable,
    cursorPosition: number,
    textRenderer: TextRenderer,

    editor: Editor,
  ) {
    this.pieceTable = pieceTable;
    this.cursorPosition = cursorPosition;
    this.textRenderer = textRenderer;
    this.editor = editor;
  }

  private lastLeftArrowTime: number | null = null;
  private lastRightArrowTime: number | null = null;

  private numberOfLeftArrowPresses: number = 0;
  private numberOfRightArrowPresses: number = 0;

  private arrowSpeedMultiplier: number = 1;

  /**
   * Compute and update the arrow speed multiplier for left or right arrow
   * Rapid repeated presses (within 100ms) will increase the multiplier.
   * Returns the multiplier to apply for movement calculation.
   */
  private computeArrowMultiplier(isRight: boolean): number {
    const currentTime = Date.now();

    if (isRight) {
      if (this.lastRightArrowTime) {
        const timeDiff = currentTime - this.lastRightArrowTime;
        if (timeDiff < 100) {
          this.numberOfRightArrowPresses++;
        } else {
          this.numberOfRightArrowPresses = 0;
        }
      }
      // reset left counter when switching directions
      this.numberOfLeftArrowPresses = 0;
      this.lastRightArrowTime = currentTime;
      this.arrowSpeedMultiplier = 1 + this.numberOfRightArrowPresses * 0.1;
      return this.arrowSpeedMultiplier;
    }

    // left
    if (this.lastLeftArrowTime) {
      const timeDiff = currentTime - this.lastLeftArrowTime;
      if (timeDiff < 100) {
        this.numberOfLeftArrowPresses++;
      } else {
        this.numberOfLeftArrowPresses = 0;
      }
    }
    // reset right counter when switching directions
    this.numberOfRightArrowPresses = 0;
    this.lastLeftArrowTime = currentTime;
    this.arrowSpeedMultiplier = 1 + this.numberOfLeftArrowPresses * 0.1;
    return this.arrowSpeedMultiplier;
  }

  /**
   * Handles keyboard input events and performs appropriate text editing operations
   * @param event - Native keyboard event
   * @returns true if the event was handled and should be prevented, false otherwise
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // Handle Enter key - insert newline at cursor position
    if (event.key === 'Enter') {
      this.insertText('\n');
      return true;
    }

    // Handle Backspace key
    if (event.key === 'Backspace') {
      if (this.cursorPosition > 0) {
        this.pieceTable.delete(this.cursorPosition - 1, 1);
        this.cursorPosition = Math.max(0, this.cursorPosition - 1);
        this.textRenderer.setCursorPosition(this.cursorPosition);
        this.textRenderer.render();
        this.editor.triggerDebugUpdate();
      }
      return true;
    }

    // Handle cursor movement - Left arrow
    if (event.key === 'ArrowLeft') {
      const mul = this.computeArrowMultiplier(false);
      this.cursorPosition = Math.max(0, Math.floor(this.cursorPosition - 1 * mul));
      this.textRenderer.setCursorPosition(this.cursorPosition);
      this.textRenderer.render();
      return true;
    }

    // Handle cursor movement - Right arrow
    if (event.key === 'ArrowRight') {
      const mul = this.computeArrowMultiplier(true);
      this.cursorPosition = Math.min(
        this.pieceTable.length,
        this.cursorPosition + Math.floor(1 * mul),
      );
      this.textRenderer.setCursorPosition(this.cursorPosition);
      this.textRenderer.render();
      return true;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      let newCursorPosition: number;
      if (event.key === 'ArrowUp') {
        newCursorPosition = this.textRenderer._textParser.getLineAdjacentCursorPosition(
          this.cursorPosition,
          'above',
        );
      } else {
        newCursorPosition = this.textRenderer._textParser.getLineAdjacentCursorPosition(
          this.cursorPosition,
          'below',
        );
      }
      this.cursorPosition = newCursorPosition;
      this.textRenderer.setCursorPosition(this.cursorPosition);
      this.textRenderer.render();
    }
    // Handle printable character input
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      this.insertText(event.key);

      return true;
    }

    // Event not handled
    return false;
  }

  /**
   * Moves cursor to specified position, ensuring it stays within valid bounds
   * @param position - Target cursor position
   */
  setCursorPosition(position: number): void {
    this.cursorPosition = Math.max(0, Math.min(this.pieceTable.length, position));
    this.textRenderer.setCursorPosition(this.cursorPosition);
  }

  /**
   * Gets the current cursor position
   * @returns Current cursor position
   */
  getCursorPosition(): number {
    return this.cursorPosition;
  }

  /**
   * Inserts text at the current cursor position
   * @param text - Text to insert
   */
  insertText(text: string): void {
    this.pieceTable.insert(text, this.cursorPosition);
    this.cursorPosition = Math.min(this.pieceTable.length, this.cursorPosition + text.length);
    this.textRenderer.setCursorPosition(this.cursorPosition);
    this.textRenderer.render();
    this.editor.triggerDebugUpdate();
  }

  /**
   * Updates the left and right margins of the text renderer
   * @param leftMargin - Left margin in pixels
   * @param rightMargin - Right margin in pixels from the right edge
   * @param canvasWidth - Total canvas width for calculating right margin
   */
  updateMargins(leftMargin: number, rightMargin: number, canvasWidth: number): void {
    this.textRenderer.leftMargin = leftMargin;
    this.textRenderer.rightMargin = canvasWidth - rightMargin;
    this.textRenderer.render();
  }
}
