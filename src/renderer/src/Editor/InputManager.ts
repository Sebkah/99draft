import { Editor } from './Editor';
import { PieceTable } from './PieceTable/PieceTable';
import { TextRenderer } from './TextRenderer';

/**
 * InputManager handles all keyboard input for text editing operations
 * Separates input logic from UI rendering concerns
 */
export class InputManager {
  private pieceTable: PieceTable;
  private cursorPosition: { current: number };
  private textRenderer: TextRenderer;

  private editor: Editor;

  constructor(
    pieceTable: PieceTable,
    cursorPosition: { current: number },
    textRenderer: TextRenderer,
    editor: Editor,
  ) {
    this.pieceTable = pieceTable;
    this.cursorPosition = cursorPosition;
    this.textRenderer = textRenderer;
    this.editor = editor;
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

    // Handle cursor movement - Left arrow
    if (event.key === 'ArrowLeft') {
      this.cursorPosition.current = Math.max(0, this.cursorPosition.current - 1);
      this.textRenderer.render(this.cursorPosition.current);
      return true;
    }

    // Handle cursor movement - Right arrow
    if (event.key === 'ArrowRight') {
      this.cursorPosition.current = Math.min(
        this.pieceTable.length,
        this.cursorPosition.current + 1,
      );
      this.textRenderer.render(this.cursorPosition.current);
      return true;
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
    this.cursorPosition.current = Math.max(0, Math.min(this.pieceTable.length, position));
    this.textRenderer.render(this.cursorPosition.current);
  }

  /**
   * Gets the current cursor position
   * @returns Current cursor position
   */
  getCursorPosition(): number {
    return this.cursorPosition.current;
  }

  /**
   * Inserts text at the current cursor position
   * @param text - Text to insert
   */
  insertText(text: string): void {
    this.pieceTable.insert(text, this.cursorPosition.current);
    this.cursorPosition.current = Math.min(
      this.pieceTable.length,
      this.cursorPosition.current + text.length,
    );
    this.textRenderer.render(this.cursorPosition.current);
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
    this.textRenderer.render(this.cursorPosition.current);
  }
}
