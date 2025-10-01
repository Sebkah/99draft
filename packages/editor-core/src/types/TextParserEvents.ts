/**
 * Event data types for text parser related events
 */

export interface PageCountChangeEvent {
  /** New number of pages */
  pageCount: number;
  /** Previous number of pages */
  previousPageCount: number;
}

/**
 * Event map for TextParser events
 */
export interface TextParserEvents {
  /** Fired when the number of pages changes */
  pageCountChange: PageCountChangeEvent;
}
