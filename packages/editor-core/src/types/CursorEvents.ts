import type { StructurePosition } from '../managers/CursorManager';

/**
 * Event data types for cursor-related events
 */

export interface CursorChangeEvent {
  /** Linear position in the document */
  position: number;
  /** Structured position information (page, paragraph, line, character) */
  structurePosition: StructurePosition;
  /** Previous linear position */
  previousPosition: number;
}

/**
 * Event map for CursorManager events
 */
export interface CursorManagerEvents {
  /** Fired whenever cursor position changes for any reason */
  cursorChange: CursorChangeEvent;
}
