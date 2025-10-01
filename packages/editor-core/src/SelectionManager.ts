import { Editor } from './Editor';
import { CursorManager, MousePosition } from './CursorManager';

/**
 * Manages text selection state and operations within the editor
 * Handles mouse-based selection, selection boundaries, and selection queries
 */
export class SelectionManager {
  private editor: Editor;
  private cursorManager: CursorManager;

  // Selection state
  public selection: { start: number; end: number } | null = null;
  private isSelecting: boolean = false;

  constructor(editor: Editor, cursorManager: CursorManager) {
    this.editor = editor;
    this.cursorManager = cursorManager;
  }

  /**
   * Starts a new selection from the current mouse position
   * @param mousePosition The mouse coordinates where selection begins
   */
  startSelection(mousePosition: MousePosition): void {
    this.selection = null;
    this.isSelecting = true;

    // Move cursor to the starting position
    this.cursorManager.mapPixelCoordinateToStructure(
      mousePosition.x,
      mousePosition.y,
      mousePosition.page,
      true,
    );
  }

  /**
   * Updates the selection as the mouse moves during selection
   * @param mousePosition The current mouse coordinates
   */
  updateSelection(mousePosition: MousePosition): void {
    if (!this.isSelecting) return;

    const endPointInStructure = this.cursorManager.mapPixelCoordinateToStructure(
      mousePosition.x,
      mousePosition.y,
      mousePosition.page,
      false,
    );

    if (endPointInStructure === undefined) {
      return;
    }

    const endPointCursorPos = this.cursorManager.mapStructureToLinear(endPointInStructure);
    const currentCursorPos = this.cursorManager.getPosition();

    this.selection = {
      start: Math.min(currentCursorPos, endPointCursorPos),
      end: Math.max(currentCursorPos, endPointCursorPos),
    };
  }

  /**
   * Finalizes the selection when mouse is released
   * @param mousePosition The final mouse coordinates
   */
  endSelection(mousePosition: MousePosition): void {
    if (!this.isSelecting) return;

    this.isSelecting = false;
    const endPointInStructure = this.cursorManager.mapPixelCoordinateToStructure(
      mousePosition.x,
      mousePosition.y,
      mousePosition.page,
      false,
    );

    if (endPointInStructure === undefined) {
      return;
    }

    const endPointCursorPos = this.cursorManager.mapStructureToLinear(endPointInStructure);
    const currentCursorPos = this.cursorManager.getPosition();

    // Only set selection if there's an actual range, else clear the selection
    if (currentCursorPos !== endPointCursorPos) {
      this.selection = {
        start: Math.min(currentCursorPos, endPointCursorPos),
        end: Math.max(currentCursorPos, endPointCursorPos),
      };
    } else {
      this.selection = null;
    }
  }

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    this.selection = null;
    this.isSelecting = false;
  }

  /**
   * Checks if there is an active selection
   * @returns true if there is a selection, false otherwise
   */
  hasSelection(): boolean {
    return this.selection !== null;
  }

  /**
   * Gets the current selection range
   * @returns The selection range or null if no selection
   */
  getSelection(): { start: number; end: number } | null {
    return this.selection;
  }

  /**
   * Gets the selected text content
   * @returns The selected text or empty string if no selection
   */
  getSelectedText(): string {
    if (!this.selection) {
      return '';
    }

    return this.editor
      .getPieceTable()
      .getRangeText(this.selection.start, this.selection.end - this.selection.start);
  }

  /**
   * Handles cursor movement when there's a selection
   * Collapses selection to start position
   * @returns true if selection was handled, false if no selection
   */
  handleMoveLeftWithSelection(): boolean {
    if (this.selection) {
      this.cursorManager.setCursorPosition(this.selection.start);
      this.clearSelection();
      return true;
    }
    return false;
  }

  /**
   * Handles cursor movement when there's a selection
   * Collapses selection to end position
   * @returns true if selection was handled, false if no selection
   */
  handleMoveRightWithSelection(): boolean {
    if (this.selection) {
      this.cursorManager.setCursorPosition(this.selection.end);
      this.clearSelection();
      return true;
    }
    return false;
  }

  /**
   * Selects all text in the document
   */
  selectAll(): void {
    const textLength = this.editor.getPieceTable().length;
    if (textLength > 0) {
      this.selection = {
        start: 0,
        end: textLength,
      };
    }
  }


}
