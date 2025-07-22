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
      const text =
        piece.source === 'original'
          ? this._pieceTable.originalBuffer.substring(piece.offset, piece.offset + piece.length)
          : this._pieceTable.addBuffer.substring(piece.offset, piece.offset + piece.length);

      // Split the text into paragraphs based on newlines
      const newParagraphs = text.split('\n');

      // If this is the first piece, add all paragraphs directly and continue to next piece
      if (i === 0) {
        newParagraphs.forEach((p) => {
          this.paragraphs.push({
            text: p,
            dirty: false,
            offset: currentOffset,
            length: p.length + 1, // Include the newline character
            lines: [],
          });
          currentOffset += p.length + 1; // Include the newline character
        });
        continue;
      }

      // If this is not the first piece, append the first paragraph to the last paragraph
      // and add the rest as new paragraphs
      const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
      lastParagraph.text += newParagraphs[0];

      lastParagraph.dirty = true; // Mark as dirty since it has been modified
      lastParagraph.length = lastParagraph.text.length + 1; // Include the newline character

      currentOffset += newParagraphs[0].length; // No need to include the newline character here, as it is already included in the last paragraph's length

      // Add the rest of the paragraphs as new paragraphs
      for (let j = 1; j < newParagraphs.length; j++) {
        this.paragraphs.push({
          text: newParagraphs[j],
          offset: currentOffset,
          length: newParagraphs[j].length + 1, // Include the newline character
          dirty: false,
          lines: [],
        });
        currentOffset += newParagraphs[j].length + 1; // Include the newline character
      }
    }
  }

  private mapCursorPosition(cursorPosition: number) {
    this._renderedCursorPosition = [-1, -1, -1]; // Reset cursor position

    // 1. Within which paragraph is the cursor position?
    let paragraphIndex = -1;
    for (let i = 0; i < this.paragraphs.length; i++) {
      const paragraph = this.paragraphs[i];

      const isCursorInParagraph =
        cursorPosition >= paragraph.offset && cursorPosition < paragraph.offset + paragraph.length;

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
      if (cursorPosition >= line.offset && cursorPosition < line.offset + line.length) {
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
  /// TODO: still no working
  private splitIntoLines(paragraph: Paragraph, maxWidth: number): void {
    const words = paragraph.text.split(' ');
    let currentLine = '';
    paragraph.lines = [];

    let offsetInParagraph = paragraph.offset;

    words.forEach((word) => {
      // Handle if the word is whitespace
      const wordOrWhitespace = word.length === 0 ? ' ' : word;

      // If we're not at the start of the line, add a space before the word
      const testLine =
        currentLine +
        (currentLine.length === 0 ? '' : word.length === 0 ? '' : ' ') +
        wordOrWhitespace;

      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        paragraph.lines.push({
          text: currentLine,
          offset: offsetInParagraph,
          length: currentLine.length + 1, // Include the space character
        });
        offsetInParagraph += currentLine.length + 1; // Include the space character
        currentLine = wordOrWhitespace; // Start a new line with the current word
      } else {
        currentLine = testLine;
      }
    });

    // Add the last line if it exists
    if (currentLine) {
      paragraph.lines.push({
        text: currentLine,
        offset: offsetInParagraph,
        length: currentLine.length + 1, // Include the space character
      });
    }
  }

  // Render a single line of text on the canvas
  private renderLine(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  public render(cursorPosition: number): void {
    const leftMargin = 150; // Left margin for the text
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.splitIntoParagraphs();
    console.log('Rendering text at cursor position:', cursorPosition, this._renderedCursorPosition);
    this.paragraphs.forEach((paragraph) => {
      this.splitIntoLines(paragraph, 600); // Assuming a max width of 780px for the canvas
    });
    this.mapCursorPosition(cursorPosition);

    this.ctx.save();

    this.paragraphs.forEach((paragraph, pindex) => {
      this.ctx.fillStyle = 'blue';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(
        `Paragraph ${pindex} - offset ${paragraph.offset} - length ${paragraph.length}`,
        800,
        lineHeight,
      );
      paragraph.lines.forEach((line, lindex) => {
        this.ctx.font = '16px Arial'; // Reset font in case it was changed
        this.ctx.fillStyle = 'black'; // Default text color
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

        // Render line length debug info
        this.ctx.fillStyle = 'blue';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`offset ${line.offset}`, 10, 0);
        this.ctx.fillText(`length ${line.length}`, 80, 0);
      });
    });

    this.ctx.fillText(
      `cursor Position i ${cursorPosition} - p ${this._renderedCursorPosition[0]} - l ${this._renderedCursorPosition[1]} - c ${this._renderedCursorPosition[2]}`,
      800,
      200,
    );

    this.ctx.restore();
  }
}
