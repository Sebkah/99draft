import type { PieceDebug } from '../core/Editor';

/**
 * Event data types for editor-related events
 */

export interface DebugUpdateEvent {
  /** Array of piece table pieces with extracted text content */
  pieces: PieceDebug[];
}

export interface PageCountChangeEvent {
  /** New number of pages */
  pageCount: number;
  /** Previous number of pages */
  previousPageCount: number;
}

/**
 * Event map for Editor events
 */
export interface EditorEvents {
  /** Fired when debug information updates (piece table changes) */
  debugUpdate: DebugUpdateEvent;
  /** Fired when the number of pages changes */
  pageCountChange: PageCountChangeEvent;
}
