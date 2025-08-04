import { PieceTable } from './PieceTable/PieceTable';

type Paragraph = {
  dirty: boolean;
  text: string;
  offset: number;
  length: number;
  lines: Line[];
};

type Line = {
  text: string;
  offset: number;
  length: number;
};

export class TextRenderer {
  private ctx: CanvasRenderingContext2D;

  private paragraphs: Paragraph[] = [];

  private _pieceTable: PieceTable;

  private _leftMargin: number = 100;
  private _rightMargin: number = 100;

  private _showDebugInfo: boolean = false;

  // Getter for wrapping width
  private get wrappingWidth(): number {
    return this.ctx.canvas.width - this._leftMargin - this._rightMargin;
  }

  // Getters and setters for margins
  public get leftMargin(): number {
    return this._leftMargin;
  }

  public set leftMargin(margin: number) {
    this._leftMargin = margin;
  }

  public get rightMargin(): number {
    return this._rightMargin;
  }

  public set rightMargin(margin: number) {
    this._rightMargin = margin;
  }

  // Getter and setter for debug info
  public get showDebugInfo(): boolean {
    return this._showDebugInfo;
  }

  public set showDebugInfo(show: boolean) {
    this._showDebugInfo = show;
  }

  private _renderedCursorPosition: [number, number, number] = [-1, -1, -1]; // [paragraphIndex, lineIndex, offsetInLineInPixels]

  constructor(ctx: CanvasRenderingContext2D, pieceTable: PieceTable) {
    this._pieceTable = pieceTable;
    this.ctx = ctx;

    this.ctx.font = '16px Arial';
  }

  // Split the text into paragraphs based on newlines
  private splitIntoParagraphs(): void {
    const pieces = this._pieceTable.getPieces();

    this.paragraphs = []; // Reset paragraphs for each render
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
          this.paragraphs.push({
            text: '',
            dirty: true,
            offset: currentOffset,
            length: 0,
            lines: [],
          });
        } else if (token.length > 0) {
          // Text content
          if (this.paragraphs.length === 0) {
            // Start new paragraph
            this.paragraphs.push({
              text: token,
              dirty: false,
              offset: currentOffset,
              length: token.length,
              lines: [],
            });
          } else {
            // Append to existing paragraph
            const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
            lastParagraph.text += token;
            lastParagraph.length = lastParagraph.text.length; // Update length immediately
            lastParagraph.dirty = true;
          }
          currentOffset += token.length;
        }
      });
    }
  }

  private mapCursorPosition(cursorPosition: number) {
    this._renderedCursorPosition = [-1, -1, -1]; // Reset cursor position

    // IF the cursor position is equal to the end of the document, we need to handle it specially
    if (cursorPosition === this._pieceTable.length) {
      // Set cursor at the end of the last paragraph
      const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
      if (lastParagraph) {
        const lastLine = lastParagraph.lines[lastParagraph.lines.length - 1];
        this._renderedCursorPosition = [
          this.paragraphs.length - 1,
          lastParagraph.lines.length - 1,
          this.ctx.measureText(lastLine.text).width,
        ];
      }
      return;
    }

    // 1. Within which paragraph is the cursor position?
    let paragraphIndex = -1;
    for (let i = 0; i < this.paragraphs.length; i++) {
      const paragraph = this.paragraphs[i];

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
    this._renderedCursorPosition[0] = paragraphIndex;

    // 2. Within which line of the paragraph is the cursor position?
    const paragraph = this.paragraphs[paragraphIndex];
    if (!paragraph) {
      // Cursor position is out of bounds in the paragraphs
      this._renderedCursorPosition[1] = -1;
      return;
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
    this._renderedCursorPosition[1] = lineIndex;

    // 3. Calculate the offset within the line in pixels
    if (lineIndex !== -1) {
      const line = paragraph.lines[lineIndex];
      const textBeforeCursor = line.text.substring(0, cursorPosition - line.offset);
      const metrics = this.ctx.measureText(textBeforeCursor);
      this._renderedCursorPosition[2] = metrics.width; // Offset in pixels within the line
    } else {
      this._renderedCursorPosition[2] = -1; // Cursor is not in any line
    }
  }

  // Split a paragraph into lines based on the canvas width
  private splitIntoLines(paragraph: Paragraph, maxWidth: number): void {
    // Split while preserving spaces
    const tokens = paragraph.text.split(/(\s+)/);
    paragraph.lines = [];

    let offsetInParagraph = paragraph.offset;
    let currentLine = '';

    console.log(tokens);

    tokens.forEach((token) => {
      const testLine = currentLine + token;
      const metrics = this.ctx.measureText(testLine);

      //If the token is spaces only, add test those spaces one by one
      if (token.trim() === '') {
        for (const char of token) {
          const testChar = currentLine + char;
          const charMetrics = this.ctx.measureText(testChar);
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

  // Render a single line of text on the canvas
  private renderLine(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  // Set the base text style
  private setBaseTextStyle(): void {
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = 'black';
  }

  // Render debug information for paragraphs, lines, and cursor position
  private renderDebugInfo(cursorPosition: number, lineHeight: number): void {
    if (!this._showDebugInfo) return;

    // Save the current context state to avoid interference with main text rendering
    this.ctx.save();

    // Reset any transformations to render debug info in absolute positions
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Set debug text style
    this.ctx.fillStyle = 'blue';
    this.ctx.font = '12px Arial';

    this.paragraphs.forEach((paragraph, pindex) => {
      // Render paragraph debug info
      this.ctx.fillText(
        `Paragraph ${pindex} - offset ${paragraph.offset} - length ${paragraph.length}`,
        800,
        lineHeight + pindex * lineHeight * paragraph.lines.length,
      );

      paragraph.lines.forEach((line, lindex) => {
        const currentY = lineHeight * (this.getCurrentLineIndex(pindex, lindex) + 1);

        // Render line debug info
        this.ctx.fillText(`offset ${line.offset}`, 10, currentY);
        this.ctx.fillText(`length ${line.length}`, 80, currentY);
      });
    });

    // Render cursor position debug info
    this.ctx.fillText(
      `cursor Position i ${cursorPosition} - p ${this._renderedCursorPosition[0]} - l ${this._renderedCursorPosition[1]} - c ${this._renderedCursorPosition[2]}`,
      800,
      200,
    );

    // Restore the context state (which will restore the base text style)
    this.ctx.restore();
  }

  // Helper function to get the absolute line index for debug positioning
  private getCurrentLineIndex(paragraphIndex: number, lineIndex: number): number {
    let totalLines = 0;
    for (let i = 0; i < paragraphIndex; i++) {
      totalLines += this.paragraphs[i].lines.length;
    }
    return totalLines + lineIndex;
  }

  public render(cursorPosition: number): void {
    const leftMargin = this.leftMargin; // Left margin for the text
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.splitIntoParagraphs();
    console.log('Rendering text at cursor position:', cursorPosition, this._renderedCursorPosition);
    this.paragraphs.forEach((paragraph) => {
      this.splitIntoLines(paragraph, this.wrappingWidth); // Assuming a max width of 780px for the canvas
    });
    this.mapCursorPosition(cursorPosition);

    this.ctx.save();

    // Set base text style for all text rendering
    this.setBaseTextStyle();

    this.paragraphs.forEach((paragraph, pindex) => {
      paragraph.lines.forEach((line, lindex) => {
        // Apply highlighting if this paragraph contains the cursor
        if (this._renderedCursorPosition[0] === pindex) {
          this.ctx.fillStyle = 'green'; // Highlight the paragraph with the cursor
        }

        if (
          this._renderedCursorPosition[0] === pindex &&
          this._renderedCursorPosition[1] === lindex
        ) {
          this.ctx.fillStyle = 'blue'; // Highlight the line with the cursor
          this.ctx.fillRect(
            this._renderedCursorPosition[2] + leftMargin,
            0,
            2, // Cursor width
            lineHeight,
          );
        }

        this.ctx.translate(0, lineHeight);
        this.renderLine(line.text, leftMargin, 0);
      });
    });

    // Render debug information if enabled
    this.renderDebugInfo(cursorPosition, lineHeight);

    this.ctx.restore();
  }
}
