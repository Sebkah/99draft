import { Editor } from '..';
import { Run } from '../structures/Run';


type JustifyData = {
  textTrimmed: string;
  pixelLengthTrimmed: number;
  spaceCount: number;
  distributedSpace: number;
};

type Styles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

/**
 * Represents a line of text with associated metadata.
 *
 * This class encapsulates a single line of text within a paragraph, tracking both
 * the text content and its visual/layout properties like pixel width and character offsets.
 */
export class Line {
  public readonly wrappingWidth: number;

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

  /** Cached style runs for this line, with coordinates relative to the line start (0-based) */
  public readonly styleRuns: Run<Styles>[];

  private _justifyData?: JustifyData;

  /**
   * Measures the pixel width of a text substring within this line while accounting for style formatting
   * @param ctx - Canvas rendering context for text measurement
   * @param startOffset - Start offset within the line (0-based)
   * @param endOffset - End offset within the line (0-based)
   * @returns The accurate pixel width of the substring
   */
  public measureTextWithStyles(
    ctx: CanvasRenderingContext2D,
    startOffset: number,
    endOffset: number,
  ): number {
    let totalWidth = 0;

    // Get the paragraph-styles that affect text measurement (e.g. bold)
    const paragraphStyles = this.editor.paragraphStylesManager.getParagraphStyles(
      this.parentParagraphIndex,
    );
    if (paragraphStyles.align === 'justify' && this._justifyData) {
      console.log(this._justifyData);
      ctx.wordSpacing = this._justifyData.distributedSpace + 'px';
    }

    // Measure text segments with proper formatting
    for (const styleRun of this.styleRuns) {
      // Calculate intersection of style run with the text range we want to measure
      const runStart = Math.max(styleRun.start, startOffset);
      const runEnd = Math.min(styleRun.end, endOffset);

      if (runStart < runEnd) {
        // Set appropriate font for this style run
        if (styleRun.data.bold) {
          ctx.font = 'bold 16px Arial';
        } else {
          ctx.font = '16px Arial';
        }

        const runText = this.text.substring(runStart, runEnd);
        totalWidth += ctx.measureText(runText).width;
      }
    }

    return totalWidth;
  }

  /** Gets justification data, cache it   */
  getjustifyData(ctx: CanvasRenderingContext2D): JustifyData {
    if (this._justifyData === undefined) {
      const textTrimmed = this.text.trim();

      // Calculate accurate pixel length accounting for mixed formatting
      let pixelLengthTrimmed = 0;

      // Get the trimmed text start offset relative to line start
      const trimStartOffset = this.text.indexOf(textTrimmed);
      const trimEndOffset = trimStartOffset + textTrimmed.length;

      // Use the helper method to measure the trimmed text with proper formatting
      pixelLengthTrimmed = this.measureTextWithStyles(ctx, trimStartOffset, trimEndOffset);

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
   * @param wrappingWidth - The wrapping width for the line
   * @param styleRuns - Cached style runs with coordinates relative to the line start
   */
  constructor(
    text: string,
    offsetInParagraph: number,
    length: number,
    pixelLength: number,
    freePixelSpace: number,
    wrappingWidth: number,
    styleRuns: Run<Styles>[] = [],
    public lineHeight: number,
    private parentParagraphIndex: number,
    private editor: Editor,
  ) {
    this.text = text;
    this.offsetInParagraph = offsetInParagraph;
    this.length = length;
    this.pixelLength = pixelLength;
    this.freePixelSpace = freePixelSpace;
    this.wrappingWidth = wrappingWidth;
    this.styleRuns = styleRuns;
    this.lineHeight = lineHeight;
    this.parentParagraphIndex = parentParagraphIndex;
    this.editor = editor;
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
