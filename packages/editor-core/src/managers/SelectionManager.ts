import { Editor } from '../core/Editor';
import { CursorManager, MousePosition } from './CursorManager';
import { EventEmitter } from '../utils/EventEmitter';
import type { SelectionManagerEvents, SelectionChangeEvent } from '../types/SelectionEvents';

/**
 * Manages text selection state and operations within the editor
 * Handles mouse-based selection, selection boundaries, and selection queries
 */
export class SelectionManager extends EventEmitter<SelectionManagerEvents> {
  private editor: Editor;
  private cursorManager: CursorManager;

  // Selection state
  public selection: { start: number; end: number } | null = null;
  private isPointerDown: boolean = false;
  private isPointerDragging: boolean = false;

  constructor(editor: Editor, cursorManager: CursorManager) {
    super();
    this.editor = editor;
    this.cursorManager = cursorManager;
  }

  /**
   * Starts a new selection from the current mouse position
   * @param mousePosition The mouse coordinates where selection begins
   */
  startSelection(mousePosition: MousePosition): void {
    this.selection = null;
    this.isPointerDown = true;

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
    if (!this.isPointerDown) return;
    this.isPointerDragging = true;

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
    this.emitSelectionChange();
  }

  /**
   * Finalizes the selection when mouse is released
   * @param mousePosition The final mouse coordinates
   */
  endSelection(mousePosition: MousePosition): void {
    if (!this.isPointerDown) return;
    if (!this.isPointerDragging) return;

    this.isPointerDown = false;
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
    this.emitSelectionChange();
  }

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    this.selection = null;
    this.isPointerDown = false;
    this.emitSelectionChange();
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
   * Selects all text in the document
   */
  selectAll(): void {
    const textLength = this.editor.getPieceTable().length;
    if (textLength > 0) {
      this.selection = {
        start: 0,
        end: textLength,
      };
      this.emitSelectionChange();
    }
  }

  /**
   * Emits a selectionChange event with current selection state
   * @private
   */
  private emitSelectionChange(): void {
    const event: SelectionChangeEvent = {
      selection: this.selection,
      hasSelection: this.hasSelection(),
      selectedText: this.getSelectedText(),
    };
    this.emit('selectionChange', event);
  }
}
