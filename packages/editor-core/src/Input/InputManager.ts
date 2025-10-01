import { CursorManager } from '../CursorManager';
import { Editor } from '../Editor';

/**
 * InputManager handles all keyboard input for text editing operations
 * Separates input logic from UI rendering concerns
 */
export class InputManager {
  private editor: Editor;
  private cursorManager: CursorManager;

  constructor(cursorManager: CursorManager, editor: Editor) {
    this.cursorManager = cursorManager;

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
      Math.floor(this.arrowSpeedMultiplier);
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
    return Math.floor(this.arrowSpeedMultiplier);
  }

  /**
   * Handle copy operation (Ctrl+C)
   * Copies the selected text to clipboard if there's a selection
   */
  private async handleCopy(): Promise<void> {
    if (!this.editor.selectionManager.hasSelection()) {
      return; // Nothing to copy if no selection
    }

    const selectedText = this.editor.selectionManager.getSelectedText();

    try {
      await navigator.clipboard.writeText(selectedText);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
    }
  }

  /**
   * Handle paste operation (Ctrl+V)
   * Pastes text from clipboard at cursor position or replaces selection
   */
  private async handlePaste(): Promise<void> {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        this.editor.insertText(clipboardText);
      }
    } catch (error) {
      console.error('Failed to read text from clipboard:', error);
    }
  }

  /**
   * Handles keyboard input events and performs appropriate text editing operations
   * @param event - Native keyboard event
   * @returns true if the event was handled and should be prevented, false otherwise
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // Handle Enter key - insert newline at cursor position
    this.editor.emitDebugUpdate();
    if (event.key === 'Enter') {
      this.editor.insertLineBreak();
      return true;
    }

    // Handle Backspace key
    if (event.key === 'Backspace') {
      // If there's a selection, delete it
      if (this.editor.deleteSelection()) {
        return true;
      }

      this.editor.deleteTextBefore(1);
      return true;
    }

    // Handle Delete key
    if (event.key === 'Delete') {
      // If there's a selection, delete it
      if (this.editor.deleteSelection()) {
        return true;
      }
      this.editor.deleteTextBefore(1, this.cursorManager.getPosition() + 1);
      return true;
    }

    // Handle copy (Ctrl+C)
    if (event.ctrlKey && event.key === 'c') {
      this.handleCopy();
      return true;
    }

    // Handle paste (Ctrl+V)
    if (event.ctrlKey && event.key === 'v') {
      this.handlePaste();
      return true;
    }

    // Handle cut (Ctrl+X)
    if (event.ctrlKey && event.key === 'x') {
      this.handleCopy().then(() => {
        this.editor.deleteSelection();
      });
      return true;
    }

    // Handle cursor movement - Left arrow
    if (event.key === 'ArrowLeft') {
      const mul = this.computeArrowMultiplier(false);
      this.cursorManager.moveLeft(mul);

      this.editor.renderPages();
      return true;
    }

    // Handle cursor movement - Right arrow
    if (event.key === 'ArrowRight') {
      const mul = this.computeArrowMultiplier(true);

      this.cursorManager.moveRight(mul);

      this.editor.renderPages();
      return true;
    }

    if (event.key === 'ArrowUp') {
      this.cursorManager.moveUp();
      this.editor.renderPages();
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.cursorManager.moveDown();
      this.editor.renderPages();
      return true;
    }

    // Handle printable character input
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      this.editor.insertText(event.key);
      return true;
    }

    // Event not handled
    return false;
  }
}
