type JustifyData = {
  textTrimmed: string;
  pixelLengthTrimmed: number;
  spaceCount: number;
  distributedSpace: number;
};

/**
 * Represents a line of text with associated metadata.
 *
 * This class encapsulates a single line of text within a paragraph, tracking both
 * the text content and its visual/layout properties like pixel width and character offsets.
 */
export class Line {
  private wrappingWidth: number;

  /** The content of the line (may include trailing spaces)   */
  public readonly text: string;
  /** The starting character offset of the line relative to the paragraph   */
  public readonly offsetInParagraph: number;

  /** The number of characters in the line   */
  public readonly length: number;

  /** The rendered pixel width of the line   */
  public readonly pixelLength: number;

  /** The available pixel space remaining in the line (for justification, etc.)  */
  public readonly freePixelSpace: number;

  private _justifyData?: JustifyData;

  /** Gets justification data, cache it   */
  getjustifyData(ctx: CanvasRenderingContext2D): JustifyData {
    if (this._justifyData === undefined) {
      const textTrimmed = this.text.trim();
      const pixelLengthTrimmed = ctx.measureText(textTrimmed).width;
      // Count spaces only in trimmed text to avoid including trailing spaces in calculation
      const spaceCount = (textTrimmed.match(/ /g) || []).length;

      const distributedSpace =
        spaceCount > 0 ? (this.wrappingWidth - pixelLengthTrimmed) / spaceCount : 0;

      this._justifyData = {
        textTrimmed,
        pixelLengthTrimmed,
        spaceCount,
        distributedSpace,
      };
    }
    return this._justifyData;
  }

  /**
   * Creates a new Line instance
   *
   * @param text - The text content of the line
   * @param offsetInParagraph - The starting character offset relative to the paragraph
   * @param length - The number of characters in the line
   * @param pixelLength - The rendered pixel width of the line
   * @param freePixelSpace - The available pixel space remaining in the line

   */
  constructor(
    text: string,
    offsetInParagraph: number,
    length: number,
    pixelLength: number,
    freePixelSpace: number,
    wrappingWidth: number,
  ) {
    this.text = text;
    this.offsetInParagraph = offsetInParagraph;
    this.length = length;
    this.pixelLength = pixelLength;
    this.freePixelSpace = freePixelSpace;
    this.wrappingWidth = wrappingWidth;
  }

  /**
   * Gets the end offset of this line within the paragraph
   *
   * @returns The character position where this line ends
   */
  public getEndOffset(): number {
    return this.offsetInParagraph + this.length;
  }

  /**
   * Checks if this line is empty (contains no text)
   *
   * @returns True if the line has no text content
   */
  public isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Checks if the line contains a specific character offset
   *
   * @param offset - The character offset to check (relative to paragraph)
   * @returns True if the offset falls within this line's range
   */
  public containsOffset(offset: number): boolean {
    return offset >= this.offsetInParagraph && offset < this.getEndOffset();
  }
}
