import { Editor } from './Editor';
import { PieceTable } from './PieceTable/PieceTable';
import { Paragraph } from './Paragraph';

/**
 * Represents a line of text with associated metadata.
 *
 * @property te    lines.push({
      text: currentLine || '',
      offset: offsetInParagraph,
      length: currentLine.length,
      pixelLength: this._ctx.measureText(currentLine).width,
      wordpixelOffsets: [...wordpixelOffsets],
      wordCharOffsets: [...wordCharOffsets],
    });e content of the line.
 * @property offset - The starting character offset of the line relative to the paragraph.
 * @property length - The number of characters in the line.
 * @property pixelLength - The rendered pixel width of the line.
 * @property wordpixelOffsets - An array of pixel offsets for each word in the line.
 * @property wordCharOffsets - An array of character offsets for each word in the line.
 */
export type Line = {
  text: string;
  offset: number;
  length: number;
  pixelLength: number;
  wordpixelOffsets: number[];
  wordCharOffsets: number[];
};

type Pages = {

};

export class TextParser {
  private _pieceTable: PieceTable;
  private _paragraphs: Paragraph[] = [];
  private _ctx: CanvasRenderingContext2D;
  private _editor: Editor;

  private _pages: Pages[] = [];

  constructor(pieceTable: PieceTable, ctx: CanvasRenderingContext2D, editor: Editor) {
    this._pieceTable = pieceTable;
    this._ctx = ctx;
    this._editor = editor;

    this.splitIntoParagraphs();

    this.splitAllParagraphsIntoLines();
  }

  public getParagraphs(): Paragraph[] {
    return this._paragraphs;
  }

  public splitAllParagraphsIntoLines(): void {
    this._paragraphs.forEach((paragraph, i) => {
      this.splitParagraphIntoLines(paragraph);
    });
  }

  /*
  editLength is needed to adjust offsets of subsequent paragraphs and 
  to know where to look in the piece table for the updated text 
*/
  public reparseParagraph(position: number, editLength: number): void {
    const paragraphIndex = this.findParagraphIndexAtOffset(position);
    const paragraph = this._paragraphs[paragraphIndex];
    if (!paragraph) return;

    // Update paragraph length
    paragraph.updateLength(editLength);
    paragraph.updateText(this._pieceTable.getRangeText(paragraph.offset, paragraph.length));

    // Shift offsets for all subsequent paragraphs
    for (let i = paragraphIndex + 1; i < this._paragraphs.length; i++) {
      this._paragraphs[i].shiftOffset(editLength);
    }

    this.splitParagraphIntoLines(paragraph);
  }

  // Split the text into paragraphs based on newlines
  public splitIntoParagraphs(): void {
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
          this._paragraphs.push(new Paragraph('', currentOffset));
        } else if (token.length > 0) {
          // Text content
          if (this._paragraphs.length === 0) {
            // Start new paragraph
            this._paragraphs.push(new Paragraph(token, currentOffset));
          } else {
            // Append to existing paragraph
            const lastParagraph = this._paragraphs[this._paragraphs.length - 1];
            lastParagraph.appendText(token);
          }
          currentOffset += token.length;
        }
      });
    }
  }

  //TODO: rewrite this
  // Split a paragraph into lines based on the canvas width
  public splitParagraphIntoLines(paragraph: Paragraph): void {
    const maxWidth = this._editor.wrappingWidth;
    // Split while preserving spaces
    const tokens = paragraph.text.split(/(\s+)/);
    const lines: Line[] = [];

    let offsetInParagraph = 0;
    let currentLine = '';
    let wordpixelOffsets: number[] = [];
    let wordCharOffsets: number[] = [];

    tokens.forEach((token) => {
      //If the token is spaces only
      if (token.trim() === '') {
        // If this is the start of a new line (empty currentLine), add initial 0 offset
        if (currentLine === '') {
          wordpixelOffsets.push(0);
          wordCharOffsets.push(0);
        }

        let currentSpaceWidth = 0;
        const spaceWidth = this._ctx.measureText(' ').width;
        let spaceIndex = 0;

        // Process spaces one by one to allow breaking within space sequences
        while (spaceIndex < token.length) {
          const testChar = currentLine + token[spaceIndex];
          const charMetrics = this._ctx.measureText(testChar);

          // If adding this space exceeds the max width, we need to handle line breaking
          if (charMetrics.width > maxWidth) {
            // If current line has content, push it and start new line
            if (currentLine.length > 0) {
              lines.push({
                text: currentLine,
                offset: offsetInParagraph,
                length: currentLine.length,
                pixelLength: this._ctx.measureText(currentLine).width,
                wordpixelOffsets: [...wordpixelOffsets],
                wordCharOffsets: [...wordCharOffsets],
              });
              offsetInParagraph += currentLine.length;

              // Start a new line and continue processing remaining spaces
              wordpixelOffsets = [0]; // Always start with 0 for new lines
              wordCharOffsets = [0]; // Always start with 0 for new lines
              currentLine = '';
              currentSpaceWidth = 0;
              // Continue with the same space in the next iteration
            } else {
              // Current line is empty, force add at least one space
              currentLine = testChar;
              currentSpaceWidth += spaceWidth;
              spaceIndex++;
            }
          } else {
            // Space fits on current line, add it
            currentLine = testChar;
            currentSpaceWidth += spaceWidth;
            spaceIndex++;
          }
        }

        // Only add to wordpixelOffsets if there are multiple spaces in the token
        if (token.length > 1) {
          wordpixelOffsets.push(this._ctx.measureText(currentLine).width - currentSpaceWidth);
          wordCharOffsets.push(currentLine.length - token.length);
        }

        // Continue to next token
        return;
      }

      if (token.trim()) {
        // Handle regular words/tokens
        // Recalculate testLine and metrics after spaces have been processed
        const testLine = currentLine + token;
        const metrics = this._ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine.length > 0) {
          // Line is too long, push the current line...
          lines.push({
            text: currentLine,
            offset: offsetInParagraph,
            length: currentLine.length,
            pixelLength: this._ctx.measureText(currentLine).width,
            wordpixelOffsets: [...wordpixelOffsets],
            wordCharOffsets: [...wordCharOffsets],
          });
          offsetInParagraph += currentLine.length;

          // ...and start a new line with the current token
          wordpixelOffsets = [0];
          wordCharOffsets = [0];
          currentLine = token;
        } else {
          wordpixelOffsets.push(this._ctx.measureText(currentLine).width);
          wordCharOffsets.push(currentLine.length);
          currentLine = testLine;
        }
      }
    });

    // Push any remaining text as the last line
    lines.push({
      text: currentLine || '',
      offset: offsetInParagraph,
      length: currentLine.length,
      pixelLength: this._ctx.measureText(currentLine).width,
      wordpixelOffsets: wordpixelOffsets,
      wordCharOffsets: wordCharOffsets,
    });

    paragraph.setLines(lines); // Use the new setLines method which also marks as clean
  }

  public findParagraphIndexAtOffset(offset: number): number {
    for (let i = 0; i < this._paragraphs.length; i++) {
      const paragraph = this._paragraphs[i];
      if (offset >= paragraph.offset && offset < paragraph.offset + paragraph.length + 1) {
        return i;
      }
    }
    return -1; // Not found
  }

  public splitParagraph(cursorPosition: number): void {
    const paragraphIndex = this.findParagraphIndexAtOffset(cursorPosition);

    const currentParagraph = this._paragraphs[paragraphIndex];
    const splitPosition = cursorPosition - currentParagraph.offset;

    // Split the paragraph text
    const beforeText = currentParagraph.text.substring(0, splitPosition);
    const afterText = currentParagraph.text.substring(splitPosition);

    // Update the current paragraph with the "before" text
    currentParagraph.updateText(beforeText);
    currentParagraph.updateLength(beforeText.length - currentParagraph.length);

    // Create new paragraph with the "after" text
    const newParagraph = new Paragraph(afterText, cursorPosition + 1);

    // Insert the new paragraph after the current one
    this._paragraphs.splice(paragraphIndex + 1, 0, newParagraph);

    // Shift offsets for all subsequent paragraphs (starting from the one after the new paragraph)
    for (let i = paragraphIndex + 2; i < this._paragraphs.length; i++) {
      this._paragraphs[i].shiftOffset(1); // +1 for the newline character
    }

    // Only reparse the affected paragraphs into lines
    this.splitParagraphIntoLines(currentParagraph);
    this.splitParagraphIntoLines(newParagraph);
  }

  public deleteTextInParagraph(position: number, length: number): void {
    const paragraphIndex = this.findParagraphIndexAtOffset(position);
    if (paragraphIndex === -1) return;

    const paragraph = this._paragraphs[paragraphIndex];
    const newText = this._pieceTable.getRangeText(paragraph.offset, paragraph.length - length);

    paragraph.updateText(newText);
    paragraph.updateLength(-length);

    // Shift offsets for subsequent paragraphs
    for (let i = paragraphIndex + 1; i < this._paragraphs.length; i++) {
      this._paragraphs[i].shiftOffset(-length);
    }

    // Only reparse the affected paragraph
    this.splitParagraphIntoLines(paragraph);
  }

  public optimizedDelete(position: number, length: number): void {
    // Get the text being deleted to check if it contains newlines
    const deletedText = this._pieceTable.getRangeText(position, length);

    if (deletedText.includes('\n')) {
      // Complex case: deleting across paragraphs or multiple newlines
      // For now, fall back to full reparse, but this could be optimized further
      this.splitIntoParagraphs();
      this.splitAllParagraphsIntoLines();
    } else {
      // Simple case: deleting within a paragraph
      this.deleteTextInParagraph(position, length);
    }
  }

  public mapPixelCoordinateToStructure(x: number, y: number): [number, number, number] {
    const lineHeight = 20; // Height of each line
    const leftMargin = this._editor.margins.left; // Left margin for the text
    const adjustedX = x - leftMargin; // Adjust x for left margin
    const lineIndex = Math.floor(y / lineHeight);

    let accumulatedLines = 0;
    for (let pIndex = 0; pIndex < this._paragraphs.length; pIndex++) {
      const paragraph = this._paragraphs[pIndex];
      if (lineIndex < accumulatedLines + paragraph.lines.length) {
        const lineInParagraph = lineIndex - accumulatedLines;
        const line = paragraph.lines[lineInParagraph];
        // Now find the character index in the line based on adjustedX
        let charIndex = 0;
        let currentWidth = 0;
        for (let i = 0; i < line.text.length; i++) {
          const char = line.text[i];
          const charWidth = this._ctx.measureText(char).width;
          if (currentWidth + charWidth / 2 >= adjustedX) {
            break;
          }
          currentWidth += charWidth;
          charIndex++;
        }
        return [pIndex, lineInParagraph, charIndex];
      }
      accumulatedLines += paragraph.lines.length;
    }
    return [-1, -1, -1]; // Not found
  }

  // Map cursor position to paragraph, line, and pixel offset
}
