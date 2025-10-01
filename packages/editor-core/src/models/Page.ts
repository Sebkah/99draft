import { Paragraph } from './Paragraph';

/**
 * Represents a page of text content, defined by paragraph and line boundaries.
 * A page spans from a starting paragraph/line to an ending paragraph/line.
 */
export class Page {
  private startParagraphIdx: number;
  private endParagraphIdx: number;
  private startLineIdx: number; // Line index within the start paragraph
  private endLineIdx: number; // Line index within the end paragraph

  constructor(
    startParagraphIndex: number,
    endParagraphIndex: number,
    startLineIndex: number,
    endLineIndex: number,
  ) {
    this.startParagraphIdx = startParagraphIndex;
    this.endParagraphIdx = endParagraphIndex;
    this.startLineIdx = startLineIndex;
    this.endLineIdx = endLineIndex;
  }

  // Getters
  get startParagraphIndex(): number {
    return this.startParagraphIdx;
  }

  get endParagraphIndex(): number {
    return this.endParagraphIdx;
  }

  get startLineIndex(): number {
    return this.startLineIdx;
  }

  get endLineIndex(): number {
    return this.endLineIdx;
  }

  // Utility methods

  /**
   * Checks if this page contains the specified paragraph index.
   * @param paragraphIndex - The paragraph index to check
   * @returns True if the paragraph is within this page's range
   */
  public containsParagraph(paragraphIndex: number): boolean {
    return paragraphIndex >= this.startParagraphIdx && paragraphIndex <= this.endParagraphIdx;
  }

  /**
   * Checks if this page contains the specified line within a given paragraph.
   * @param paragraphIndex - The paragraph index
   * @param lineIndex - The line index within the paragraph
   * @returns True if the line is within this page's range
   */
  public containsLine(paragraphIndex: number, lineIndex: number): boolean {
    if (!this.containsParagraph(paragraphIndex)) {
      return false;
    }

    // If it's the start paragraph, check if line is >= startLineIndex
    if (paragraphIndex === this.startParagraphIdx && lineIndex < this.startLineIdx) {
      return false;
    }

    // If it's the end paragraph, check if line is <= endLineIndex
    if (paragraphIndex === this.endParagraphIdx && lineIndex > this.endLineIdx) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the total number of lines in this page.
   * @param paragraphs - Array of all paragraphs to calculate from
   * @returns The total number of lines in this page
   */
  public getTotalLines(paragraphs: Paragraph[]): number {
    let totalLines = 0;

    for (let pIndex = this.startParagraphIdx; pIndex <= this.endParagraphIdx; pIndex++) {
      const paragraph = paragraphs[pIndex];
      if (!paragraph) continue;

      let startLine = 0;
      let endLine = paragraph.lines.length - 1;

      // Adjust for start paragraph
      if (pIndex === this.startParagraphIdx) {
        startLine = this.startLineIdx;
      }

      // Adjust for end paragraph
      if (pIndex === this.endParagraphIdx) {
        endLine = this.endLineIdx;
      }

      totalLines += Math.max(0, endLine - startLine + 1);
    }

    return totalLines;
  }

  /**
   * Checks if this page spans multiple paragraphs.
   * @returns True if the page spans more than one paragraph
   */
  public spansMultipleParagraphs(): boolean {
    return this.startParagraphIdx !== this.endParagraphIdx;
  }

  /**
   * Checks if this page is empty (contains no lines).
   * @returns True if the page contains no content
   */
  public isEmpty(): boolean {
    return (
      this.startParagraphIdx > this.endParagraphIdx ||
      (this.startParagraphIdx === this.endParagraphIdx && this.startLineIdx > this.endLineIdx)
    );
  }

  /**
   * Extends this page to include the specified paragraph and line range.
   * @param paragraphIndex - The paragraph index to extend to
   * @param lineIndex - The line index to extend to
   */
  public extendTo(paragraphIndex: number, lineIndex: number): void {
    this.endParagraphIdx = paragraphIndex;
    this.endLineIdx = lineIndex;
  }

  /**
   * Creates a string representation of this page for debugging.
   * @returns A string describing the page boundaries
   */
  public toString(): string {
    return `Page[P${this.startParagraphIdx}:L${this.startLineIdx} -> P${this.endParagraphIdx}:L${this.endLineIdx}]`;
  }

  /**
   * Creates a new page with the same boundaries as this one.
   * @returns A new Page instance with identical boundaries
   */
  public clone(): Page {
    return new Page(
      this.startParagraphIdx,
      this.endParagraphIdx,
      this.startLineIdx,
      this.endLineIdx,
    );
  }
}
