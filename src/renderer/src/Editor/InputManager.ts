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

  constructor(
    pieceTable: PieceTable,
    cursorPosition: { current: number },
    textRenderer: TextRenderer,
  ) {
    this.pieceTable = pieceTable;
    this.cursorPosition = cursorPosition;
    this.textRenderer = textRenderer;
  }

  /**
   * Handles keyboard input events and performs appropriate text editing operations
   * @param event - Native keyboard event
   * @returns true if the event was handled and should be prevented, false otherwise
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // Handle Enter key - insert newline at cursor position
    if (event.key === 'Enter') {
      this.pieceTable.insert('\n', this.cursorPosition.current);
      this.cursorPosition.current += 1;
      console.log('Inserted newline');
      this.textRenderer.render(this.cursorPosition.current);
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
      console.log('Key pressed:', event.key);

      // Insert character at current cursor position
      this.pieceTable.insert(event.key, this.cursorPosition.current);
      this.cursorPosition.current = Math.min(
        this.pieceTable.length,
        this.cursorPosition.current + 1,
      );
      this.textRenderer.render(this.cursorPosition.current);
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
    this.cursorPosition.current += text.length;
    this.textRenderer.render(this.cursorPosition.current);
  }

  /**
   * Updates the piece table reference (useful if piece table is recreated)
   * @param pieceTable - New piece table instance
   */
  updatePieceTable(pieceTable: PieceTable): void {
    this.pieceTable = pieceTable;
  }

  /**
   * Updates the text renderer reference (useful if text renderer is recreated)
   * @param textRenderer - New text renderer instance
   */
  updateTextRenderer(textRenderer: TextRenderer): void {
    this.textRenderer = textRenderer;
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

  /**
   * Forces a re-render of the text content
   */
  render(): void {
    this.textRenderer.render(this.cursorPosition.current);
  }
}
