import { Editor } from '../Editor';
import { PieceTable } from '../PieceTable/PieceTable';
import { TextParser } from '../TextParser';

import { TextRenderer } from '../TextRenderer';

/**
 * InputManager handles all keyboard input for text editing operations
 * Separates input logic from UI rendering concerns
 */
export class InputManager {
  private pieceTable: PieceTable;

  private textRenderer: TextRenderer;

  private textParser: TextParser;

  private editor: Editor;

  constructor(
    pieceTable: PieceTable,
    textRenderer: TextRenderer,
    textParser: TextParser,
    editor: Editor,
  ) {
    this.pieceTable = pieceTable;

    this.textRenderer = textRenderer;
    this.textParser = textParser;
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
    this.editor.triggerDebugUpdate();
    if (event.key === 'Enter') {
      this.editor.insertLineBreak();
      return true;
    }

    // Handle Backspace key
    if (event.key === 'Backspace') {
      this.editor.deleteText(1);
      return true;
    }

    // Handle cursor movement - Left arrow
    if (event.key === 'ArrowLeft') {
      const mul = this.computeArrowMultiplier(false);
      this.editor.cursorPosition = Math.max(0, Math.floor(this.editor.cursorPosition - 1 * mul));
      this.textParser.mapCursorPositionToStructure(this.editor.cursorPosition);

      this.textRenderer.render();
      return true;
    }

    // Handle cursor movement - Right arrow
    if (event.key === 'ArrowRight') {
      const mul = this.computeArrowMultiplier(true);
      this.editor.cursorPosition = Math.min(
        this.pieceTable.length,
        this.editor.cursorPosition + Math.floor(1 * mul),
      );
      this.textParser.mapCursorPositionToStructure(this.editor.cursorPosition);

      this.textRenderer.render();
      return true;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      let newCursorPosition: number;
      if (event.key === 'ArrowUp') {
        newCursorPosition = this.textParser.getLineAdjacentCursorPosition(
          this.editor.cursorPosition,
          'above',
        );
      } else {
        newCursorPosition = this.textParser.getLineAdjacentCursorPosition(
          this.editor.cursorPosition,
          'below',
        );
      }
      this.editor.cursorPosition = newCursorPosition;

      this.textParser.mapCursorPositionToStructure(this.editor.cursorPosition);

      this.textRenderer.render();
    }
    // Handle printable character input
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      this.editor.insertText(event.key);

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
    this.editor.cursorPosition = Math.max(0, Math.min(this.pieceTable.length, position));
    this.textParser.mapCursorPositionToStructure(this.editor.cursorPosition);
  }

  /**
   * Gets the current cursor position
   * @returns Current cursor position
   */
  getCursorPosition(): number {
    return this.editor.cursorPosition;
  }
}
