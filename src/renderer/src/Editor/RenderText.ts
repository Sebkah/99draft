import { is } from '@electron-toolkit/utils';
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

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const text =
        piece.source === 'original'
          ? this._pieceTable.originalBuffer.substring(piece.offset, piece.offset + piece.length)
          : this._pieceTable.addBuffer.substring(piece.offset, piece.offset + piece.length);

      const newParagraphs = text.split('\n');

      // If this is the first piece, initialize paragraphs
      if (i === 0) {
        newParagraphs.forEach((line, index) => {
          const isLastParagraph = index === newParagraphs.length - 1;
          const addBreakLength = isLastParagraph ? 0 : 1; // No newline for the last paragraph
          // If the line is empty, we still need to add it as a paragraph
          if (line === '') {
            this.paragraphs.push({
              text: '',
              dirty: false,
              offset: currentOffset,
              length: addBreakLength, // +1 for the newline character
              lines: [],
            });
            currentOffset += addBreakLength; // +1 for the newline character
            return;
          }
          this.paragraphs.push({
            text: line,
            dirty: false,
            offset: currentOffset,
            length: line.length + addBreakLength, // +1 for the newline character
            lines: [],
          });
          currentOffset += line.length + addBreakLength; // +1 for the newline character
        });
        continue;
      }

      // Add the first paragraph of the piece to the last paragraph
      if (this.paragraphs.length > 0) {
        const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
        lastParagraph.text += newParagraphs[0];

        lastParagraph.dirty = true; // Mark as dirty since it has been modified
        lastParagraph.length = lastParagraph.text.length;

        currentOffset += newParagraphs[0].length; // +1 for the newline character
      }

      // Add the rest of the paragraphs as new paragraphs
      for (let j = 1; j < newParagraphs.length; j++) {
        const isLastParagraph = j === newParagraphs.length - 1;
        const addBreakLength = isLastParagraph ? 0 : 1; // No newline for the last paragraph

        this.paragraphs.push({
          text: newParagraphs[j],
          offset: currentOffset,
          length: newParagraphs[j].length + addBreakLength, // +1 for the newline character
          dirty: false,
          lines: [],
        });
        currentOffset += newParagraphs[j].length + addBreakLength; // +1 for the newline character
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
  private splitIntoLines(paragraph: Paragraph, maxWidth: number): void {
    const words = paragraph.text.split(' ');
    let currentLine = '';
    paragraph.lines = [];

    let offsetInParagraph = paragraph.offset;

    words.forEach((word) => {
      const testLine = currentLine + (currentLine.length ? ' ' : '') + word; // Add a space if currentLine is not empty
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        paragraph.lines.push({
          text: currentLine,
          offset: offsetInParagraph,
          length: currentLine.length,
        });
        offsetInParagraph += currentLine.length; // +1 for the space between words
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    // Add the last line if it exists
    if (currentLine) {
      paragraph.lines.push({
        text: currentLine,
        offset: offsetInParagraph,
        length: currentLine.length,
      });
    }
  }

  // Render a single line of text on the canvas
  private renderLine(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  public render(cursorPosition: number): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.splitIntoParagraphs();
    console.log('Rendering text at cursor position:', cursorPosition, this._renderedCursorPosition);
    this.paragraphs.forEach((paragraph) => {
      this.splitIntoLines(paragraph, 500); // Assuming a max width of 780px for the canvas
    });
    this.mapCursorPosition(cursorPosition - 1);

    this.ctx.save();

    this.paragraphs.forEach((paragraph, pindex) => {
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
            this._renderedCursorPosition[2] + 80,
            0,
            2, // Cursor width
            20, // Line height
          );
        }

        this.ctx.translate(0, 20);
        this.renderLine(line.text, 80, 0);

        // Render line length debug info
        this.ctx.fillStyle = 'red';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`o ${line.offset}`, 10, 0);
        this.ctx.fillText(`l ${line.length}`, 50, 0);
      });
    });

    this.ctx.restore();
  }
}
