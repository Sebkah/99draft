import { PieceTable } from './PieceTable/PieceTable';

export type Paragraph = {
  dirty: boolean;
  text: string;
  offset: number;
  length: number;
  lines: Line[];
};

export type Line = {
  text: string;
  offset: number;
  length: number;
};

export class TextParser {
  private _pieceTable: PieceTable;
  private _paragraphs: Paragraph[] = [];
  private _lastParsedVersion: number = -1;
  private _lastWrappingWidth: number = -1;
  private _ctx: CanvasRenderingContext2D;

  constructor(pieceTable: PieceTable, ctx: CanvasRenderingContext2D) {
    this._pieceTable = pieceTable;
    this._ctx = ctx;
  }

  public getParagraphs(): Paragraph[] {
    return this._paragraphs;
  }

  public parseIfNeeded(wrappingWidth: number): boolean {
    // Check if we need to reparse
    const currentVersion = this._pieceTable.getVersion();
    const needsReparsing =
      this._lastParsedVersion !== currentVersion ||
      this._lastWrappingWidth !== wrappingWidth ||
      this._paragraphs.length === 0;

    if (needsReparsing) {
      this.parse(wrappingWidth);
      this._lastParsedVersion = currentVersion;
      this._lastWrappingWidth = wrappingWidth;
      return true;
    }

    return false;
  }

  private parse(wrappingWidth: number): void {
    this.splitIntoParagraphs();
    this._paragraphs.forEach((paragraph) => {
      this.splitIntoLines(paragraph, wrappingWidth);
    });
  }

  // Split the text into paragraphs based on newlines
  private splitIntoParagraphs(): void {
    const pieces = this._pieceTable.getPieces();

    this._paragraphs = []; // Reset paragraphs for each parse
    let currentOffset = 0;

    // Iterate over the pieces
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const text = this._pieceTable.getPieceText(piece);

      // Split while preserving newlines (when used with a regex, it keeps the newlines in the array)
      const tokens = text.split(/(\n)/);

      tokens.forEach((token) => {
        // If the token is a newline
        if (token === '\n') {
          // End current paragraph (length is already correct)
          currentOffset += 1; // Account for newline
          // Start a new empty paragraph
          this._paragraphs.push({
            text: '',
            dirty: true,
            offset: currentOffset,
            length: 0,
            lines: [],
          });
        } else if (token.length > 0) {
          // Text content
          if (this._paragraphs.length === 0) {
            // Start new paragraph
            this._paragraphs.push({
              text: token,
              dirty: false,
              offset: currentOffset,
              length: token.length,
              lines: [],
            });
          } else {
            // Append to existing paragraph
            const lastParagraph = this._paragraphs[this._paragraphs.length - 1];
            lastParagraph.text += token;
            lastParagraph.length = lastParagraph.text.length; // Update length immediately
            lastParagraph.dirty = true;
          }
          currentOffset += token.length;
        }
      });
    }
  }

  // Split a paragraph into lines based on the canvas width
  private splitIntoLines(paragraph: Paragraph, maxWidth: number): void {
    // Split while preserving spaces
    const tokens = paragraph.text.split(/(\s+)/);
    paragraph.lines = [];

    let offsetInParagraph = paragraph.offset;
    let currentLine = '';

    tokens.forEach((token) => {
      const testLine = currentLine + token;
      const metrics = this._ctx.measureText(testLine);

      //If the token is spaces only, test those spaces one by one
      if (token.trim() === '') {
        for (const char of token) {
          const testChar = currentLine + char;
          const charMetrics = this._ctx.measureText(testChar);
          if (charMetrics.width > maxWidth && currentLine.trim()) {
            paragraph.lines.push({
              text: currentLine,
              offset: offsetInParagraph,
              length: currentLine.length,
            });
            offsetInParagraph += currentLine.length;
            currentLine = char; // Start new line with the space character
          } else {
            currentLine = testChar; // Add the space to the current line
          }
        }
        return; // Skip further processing for spaces
      }

      if (metrics.width > maxWidth && currentLine.trim()) {
        paragraph.lines.push({
          text: currentLine,
          offset: offsetInParagraph,
          length: currentLine.length,
        });
        offsetInParagraph += currentLine.length;
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    });

    paragraph.lines.push({
      text: currentLine || '',
      offset: offsetInParagraph,
      length: currentLine.length,
    });
  }



  // Map cursor position to paragraph, line, and pixel offset
  public mapCursorPosition(
    cursorPosition: number,
    ctx: CanvasRenderingContext2D,
  ): [number, number, number] {
    let renderedCursorPosition: [number, number, number] = [-1, -1, -1]; // Reset cursor position

    // IF the cursor position is equal to the end of the document, we need to handle it specially
    if (cursorPosition === this._pieceTable.length) {
      // Set cursor at the end of the last paragraph
      const lastParagraph = this._paragraphs[this._paragraphs.length - 1];
      if (lastParagraph) {
        const lastLine = lastParagraph.lines[lastParagraph.lines.length - 1];
        renderedCursorPosition = [
          this._paragraphs.length - 1,
          lastParagraph.lines.length - 1,
          ctx.measureText(lastLine.text).width,
        ];
      }
      return renderedCursorPosition;
    }

    // 1. Within which paragraph is the cursor position?
    let paragraphIndex = -1;
    for (let i = 0; i < this._paragraphs.length; i++) {
      const paragraph = this._paragraphs[i];

      const isCursorInParagraph =
        cursorPosition >= paragraph.offset &&
        cursorPosition < paragraph.offset + paragraph.length + 1;

      // If the cursor is in the paragraph, set the index of the paragraph and break the loop
      if (isCursorInParagraph) {
        paragraphIndex = i;
        break;
      }
    }

    // Set the paragraph index in the rendered cursor position
    renderedCursorPosition[0] = paragraphIndex;

    // 2. Within which line of the paragraph is the cursor position?
    const paragraph = this._paragraphs[paragraphIndex];
    if (!paragraph) {
      // Cursor position is out of bounds in the paragraphs
      renderedCursorPosition[1] = -1;
      return renderedCursorPosition;
    }

    // Search the cursor position in the lines of the paragraphs
    let lineIndex = -1;

    for (let j = 0; j < paragraph.lines.length; j++) {
      const line = paragraph.lines[j];

      const isOnlyLine = paragraph.lines.length === 1;
      const isLastLine = j === paragraph.lines.length - 1;

      const isLastLineButNotOnlyLine = isLastLine && !isOnlyLine;

      let endOffsetDelta = isOnlyLine ? 1 : isLastLineButNotOnlyLine ? 1 : 0;

      if (
        cursorPosition >= line.offset &&
        cursorPosition < line.offset + line.length + endOffsetDelta
      ) {
        lineIndex = j;
        break;
      }
    }
    renderedCursorPosition[1] = lineIndex;

    // 3. Calculate the offset within the line in pixels
    if (lineIndex !== -1) {
      const line = paragraph.lines[lineIndex];
      const textBeforeCursor = line.text.substring(0, cursorPosition - line.offset);
      const metrics = ctx.measureText(textBeforeCursor);
      renderedCursorPosition[2] = metrics.width; // Offset in pixels within the line
    } else {
      renderedCursorPosition[2] = -1; // Cursor is not in any line
    }

    return renderedCursorPosition;
  }
}
