/**
 * Event data types for selection-related events
 */

export interface SelectionChangeEvent {
  /** The current selection range, or null if no selection */
  selection: { start: number; end: number } | null;
  /** Whether there is an active selection */
  hasSelection: boolean;
  /** The selected text content (empty string if no selection) */
  selectedText: string;
}

/**
 * Event map for SelectionManager events
 */
export interface SelectionManagerEvents {
  /** Fired whenever selection state changes (created, updated, cleared) */
  selectionChange: SelectionChangeEvent;
}
