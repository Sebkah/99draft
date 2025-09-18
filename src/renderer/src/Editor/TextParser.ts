import { Editor } from './Editor';
import { PieceTable } from './PieceTable/PieceTable';
import { Paragraph } from './Paragraph';

/**
 * Represents a line of text with associated metadata.
 *
 * @property text - The content of the line.
 * @property offset - The starting character offset of the line relative to the paragraph.
 * @property length - The number of characters in the line.
 * @property pixelLength - The rendered pixel width of the line.
 */
export type Line = {
  text: string;
  offset: number;
  length: number;
  pixelLength: number;
};

export class TextParser {
  private _pieceTable: PieceTable;
  private _paragraphs: Paragraph[] = [];
  private _ctx: CanvasRenderingContext2D;
  private _editor: Editor;

  public cursorPositionInStructure: [number, number, number, number] = [-1, -1, -1, -1]; // [paragraphIndex, lineIndex, characterIndex, offsetInLineInPixels]

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
      console.log('Parsing paragraph:', i);
      this.splitParagraphIntoLines(paragraph);
    });
  }

  /*
  editLength is needed to adjust offsets of subsequent paragraphs and 
  to know where to look in the piece table for the updated text 
*/
  public reparseParagraph(position: number, editLength: number): void {
    const paragraphIndex = this.findParagraphIndexAtOffset(position);
    console.log('Parsing single paragraph:', paragraphIndex, 'edit length:', editLength);

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

  // Split a paragraph into lines based on the canvas width
  public splitParagraphIntoLines(paragraph: Paragraph): void {
    const maxWidth = this._editor.wrappingWidth;
    // Split while preserving spaces
    const tokens = paragraph.text.split(/(\s+)/);
    const lines: Line[] = [];

    let offsetInParagraph = 0;
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
            lines.push({
              text: currentLine,
              offset: offsetInParagraph,
              length: currentLine.length,
              pixelLength: this._ctx.measureText(currentLine).width,
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
        lines.push({
          text: currentLine,
          offset: offsetInParagraph,
          length: currentLine.length,
          pixelLength: this._ctx.measureText(currentLine).width,
        });
        offsetInParagraph += currentLine.length;
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    });

    lines.push({
      text: currentLine || '',
      offset: offsetInParagraph,
      length: currentLine.length,
      pixelLength: this._ctx.measureText(currentLine).width,
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
  public mapCursorPositionToStructure(cursorPosition: number): void {
    let renderedCursorPosition: [number, number, number, number] = [-1, -1, -1, -1]; // Reset cursor position

    // IF the cursor position is equal to the end of the document, we need to handle it specially
    if (cursorPosition === this._pieceTable.length) {
      // Set cursor at the end of the last paragraph
      const lastParagraph = this._paragraphs[this._paragraphs.length - 1];
      if (lastParagraph) {
        const lastLine = lastParagraph.lines[lastParagraph.lines.length - 1];
        renderedCursorPosition = [
          this._paragraphs.length - 1,
          lastParagraph.lines.length - 1,
          lastLine.length,
          this._ctx.measureText(lastLine.text).width,
        ];
      }
      this.cursorPositionInStructure = renderedCursorPosition;
      return;
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
        console.log(paragraph);
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
      this.cursorPositionInStructure = renderedCursorPosition;
    }

    // Search the cursor position in the lines of the paragraphs
    let lineIndex = -1;

    for (let j = 0; j < paragraph.lines.length; j++) {
      const line = paragraph.lines[j];

      const cursorOffsetInParagraph = cursorPosition - paragraph.offset;

      const isOnlyLine = paragraph.lines.length === 1;
      const isLastLine = j === paragraph.lines.length - 1;

      const isLastLineButNotOnlyLine = isLastLine && !isOnlyLine;

      let endOffsetDelta = isOnlyLine ? 1 : isLastLineButNotOnlyLine ? 1 : 0;

      if (
        cursorOffsetInParagraph >= line.offset &&
        cursorOffsetInParagraph < line.offset + line.length + endOffsetDelta
      ) {
        lineIndex = j;
        break;
      }
    }
    renderedCursorPosition[1] = lineIndex;

    // 3. Calculate the offset within the line in pixels
    if (lineIndex !== -1) {
      const cursorOffsetInParagraph = cursorPosition - paragraph.offset;
      const line = paragraph.lines[lineIndex];
      const positionInLine = cursorOffsetInParagraph - line.offset;
      const textBeforeCursor = line.text.substring(0, positionInLine);
      const metrics = this._ctx.measureText(textBeforeCursor);
      renderedCursorPosition[2] = positionInLine; // Character index within the line
      renderedCursorPosition[3] = metrics.width; // Offset in pixels within the line
    } else {
      renderedCursorPosition[2] = -1; // Cursor is not in any line
      renderedCursorPosition[3] = -1;
    }

    this.cursorPositionInStructure = renderedCursorPosition;
  }

  public getLineAdjacentCursorPosition(
    cursorPosition: number,
    direction: 'above' | 'below',
  ): number {
    // Get current cursor position mapping
    this.mapCursorPositionToStructure(cursorPosition);
    const [paragraphIndex, lineIndex, _characterOffset, pixelOffset] =
      this.cursorPositionInStructure;

    if (paragraphIndex === -1 || lineIndex === -1) {
      return cursorPosition; // Invalid position, return original
    }

    const currentParagraph = this._paragraphs[paragraphIndex];
    let targetParagraphIndex = paragraphIndex;
    let targetLineIndex = lineIndex;

    // Calculate target line index based on direction
    if (direction === 'above') {
      targetLineIndex = lineIndex - 1;

      // If we're at the first line of a paragraph, move to the last line of the previous paragraph
      if (targetLineIndex < 0 && paragraphIndex > 0) {
        targetParagraphIndex = paragraphIndex - 1;
        const prevParagraph = this._paragraphs[targetParagraphIndex];
        targetLineIndex = prevParagraph.lines.length - 1;
      }
    } else {
      // 'under'
      targetLineIndex = lineIndex + 1;

      // If we're at the last line of a paragraph, move to the first line of the next paragraph
      if (
        targetLineIndex >= currentParagraph.lines.length &&
        paragraphIndex < this._paragraphs.length - 1
      ) {
        targetParagraphIndex = paragraphIndex + 1;
        targetLineIndex = 0;
      }
    }

    // Check if target position is valid
    if (targetParagraphIndex < 0 || targetParagraphIndex >= this._paragraphs.length) {
      return cursorPosition; // Out of bounds, return original position
    }

    const targetParagraph = this._paragraphs[targetParagraphIndex];
    if (targetLineIndex < 0 || targetLineIndex >= targetParagraph.lines.length) {
      return cursorPosition; // Out of bounds, return original position
    }

    const targetLine = targetParagraph.lines[targetLineIndex];

    // Find the closest character position in the target line based on pixel offset
    let closestPosition = targetLine.offset;
    let minDistance = Math.abs(pixelOffset);

    // Check each character position in the target line
    for (let i = 0; i <= targetLine.length; i++) {
      const textUpToPosition = targetLine.text.substring(0, i);
      const currentPixelOffset = this._ctx.measureText(textUpToPosition).width;
      const distance = Math.abs(currentPixelOffset - pixelOffset);

      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = targetLine.offset + i;
      }
    }

    return closestPosition;
  }
}
