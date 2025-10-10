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

export interface AfterInsertionEvent {
  /** The text that was inserted */
  text: string;
  /** The position where text was inserted */
  position: number;
  /** Length of the inserted text */
  length: number;
}

export interface AfterDeletionEvent {
  /** The position where deletion started */
  position: number;
  /** Number of characters deleted */
  length: number;
}

/**
 * Event map for Editor events
 */
export interface EditorEvents {
  /** Fired when debug information updates (piece table changes) */
  debugUpdate: DebugUpdateEvent;
  /** Fired when the number of pages changes */
  pageCountChange: PageCountChangeEvent;
  /** Fired after text has been inserted */
  afterInsertion: AfterInsertionEvent;
  /** Fired after text has been deleted */
  afterDeletion: AfterDeletionEvent;
}
