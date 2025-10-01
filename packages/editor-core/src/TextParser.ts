import { Editor } from './Editor';
import { PieceTable } from './PieceTable/PieceTable';
import { Paragraph } from './Paragraph';
import { Page } from './Page';

/**
 * Represents a line of text with associated metadata.
 *
 * @property te    lines.push({
      text: currentLine || '',
      offset: offsetInParagraph,
      length: currentLine.length,
      pixelLength: this.ctx.measureText(currentLine).width,
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

export class TextParser {
  private pieceTable: PieceTable;
  private paragraphs: Paragraph[] = [];
  private ctx: CanvasRenderingContext2D;
  private editor: Editor;

  private pages: Page[] = [];
  private lastPageCount: number = 0;

  private paragraphStylesManager;
  private pageCountChangeCallback?: (pageCount: number) => void;

  public getPages(): Page[] {
    return this.pages;
  }

  constructor(pieceTable: PieceTable, ctx: CanvasRenderingContext2D, editor: Editor) {
    this.pieceTable = pieceTable;
    this.ctx = ctx;
    this.editor = editor;

    this.paragraphStylesManager = editor.paragraphStylesManager;

    this.splitIntoParagraphs();

    this.splitAllParagraphsIntoLines();

    this.splitParagraphsIntoPages();
  }

  /**
   * Set a callback to be called when the number of pages changes
   * @param callback - Function to call when page count changes
   */
  setPageCountChangeCallback(callback: (pageCount: number) => void): void {
    this.pageCountChangeCallback = callback;
  }

  /**
   * Notify about page count changes
   */
  private notifyPageCountChange(): void {
    if (this.pageCountChangeCallback) {
      const currentPageCount = this.pages.length;
      if (this.lastPageCount !== currentPageCount) {
        this.editor.logger.pageManagement(
          'Page count changed:',
          this.lastPageCount,
          '->',
          currentPageCount,
        );
        this.lastPageCount = currentPageCount;
        this.pageCountChangeCallback(currentPageCount);
      }
    }
  }

  public getParagraphs(): Paragraph[] {
    return this.paragraphs;
  }

  /**
   * Get the full text from the piece table
   */
  public getFullText(): string {
    return this.pieceTable.getText();
  }

  public splitParagraphsIntoPages(): void {
    const pages: Page[] = [];
    const maxHeight = this.editor.wrappingHeight;
    const lineHeight = 20; // Assuming a fixed line height for simplicity

    // Early exit if no paragraphs exist
    if (this.paragraphs.length === 0) {
      this.pages = [];
      return;
    }

    // Calculate how many lines can fit on a single page
    const maxLinesPerPage = Math.floor(maxHeight / lineHeight);

    // If a page can't even fit a single line, we have a problem
    if (maxLinesPerPage < 1) {
      console.warn('Page height too small to fit even one line');
      this.pages = [];
      return;
    }

    let currentPage: Page | undefined = undefined; // Current page being built
    let currentNumberOfLines = 0; // Lines already used in current page

    // Iterate through all paragraphs to distribute them across pages
    for (let pIndex = 0; pIndex < this.paragraphs.length; pIndex++) {
      const paragraph = this.paragraphs[pIndex];

      // Skip empty paragraphs (paragraphs with no lines)
      if (paragraph.lines.length === 0) {
        this.editor.logger.pageManagement(
          `Skipping empty paragraph ${pIndex} with ${paragraph.lines.length} lines`,
        );
        continue;
      }

      this.editor.logger.pageManagement(
        `Processing paragraph ${pIndex} with ${paragraph.lines.length} lines`,
      );

      let remainingLinesInParagraph = paragraph.lines.length;

      // Process all lines in the current paragraph, potentially across multiple pages
      while (remainingLinesInParagraph > 0) {
        const numberOfFreeLines = maxLinesPerPage - currentNumberOfLines;

        // Calculate the current line index within the paragraph based on remaining lines
        const currentLineIndexInParagraph = paragraph.lines.length - remainingLinesInParagraph;

        // Case 1: The remaining lines of the paragraph fit entirely on the current page
        if (remainingLinesInParagraph <= numberOfFreeLines) {
          // If there's no current page, start a new one with this paragraph
          if (!currentPage) {
            const endLineIndex = currentLineIndexInParagraph + remainingLinesInParagraph - 1;
            this.editor.logger.pageManagement(
              `Creating new page: P${pIndex}:L${currentLineIndexInParagraph} -> P${pIndex}:L${endLineIndex}`,
            );
            currentPage = new Page(pIndex, pIndex, currentLineIndexInParagraph, endLineIndex);
            pages.push(currentPage);
          }
          // Extend the current page to include this paragraph
          else {
            const endLineIndex = currentLineIndexInParagraph + remainingLinesInParagraph - 1;
            this.editor.logger.pageManagement(`Extending page to: P${pIndex}:L${endLineIndex}`);
            currentPage.extendTo(pIndex, endLineIndex);
          }

          // Update counters - all remaining lines are now accounted for
          currentNumberOfLines += remainingLinesInParagraph;
          remainingLinesInParagraph = 0;
        }
        // Case 2: The paragraph has more lines than can fit on the current page
        else {
          // If there's no current page, start a new one
          if (!currentPage) {
            currentPage = new Page(
              pIndex,
              pIndex,
              currentLineIndexInParagraph,
              currentLineIndexInParagraph + numberOfFreeLines - 1,
            );
            pages.push(currentPage);
          }
          // Extend the current page to fill it completely
          else {
            currentPage.extendTo(pIndex, currentLineIndexInParagraph + numberOfFreeLines - 1);
          }

          // Update counters for the lines we just allocated
          currentNumberOfLines += numberOfFreeLines;
          remainingLinesInParagraph -= numberOfFreeLines;

          // Current page is now full, so we need to start a new page for remaining lines
          currentPage = undefined;
          currentNumberOfLines = 0;
        }
      }
    }

    // Store the computed pages
    this.pages = pages;
    this.editor.logger.pageManagement('Page splitting completed. Created', pages.length, 'pages:');
    pages.forEach((page, index) => {
      this.editor.logger.pageManagement(`Page ${index}:`, page.toString());
    });

    // Notify about page count changes
    this.notifyPageCountChange();
  }

  public splitAllParagraphsIntoLines(): void {
    for (let i = 0; i < this.paragraphs.length; i++) {
      this.splitParagraphIntoLines(i);
    }
  }

  /*
  editLength is needed to adjust offsets of subsequent paragraphs and 
  to know where to look in the piece table for the updated text 
*/
  public reparseParagraph(position: number, editLength: number): void {
    const paragraphIndex = this.findParagraphIndexAtOffset(position);
    console.log(
      'Reparsing paragraph at index',
      paragraphIndex,
      'for edit length',
      editLength,
      'at position',
      position,
    );
    const paragraph = this.paragraphs[paragraphIndex];
    if (!paragraph) return;

    // Update paragraph 
    paragraph.updateText(
      this.pieceTable.getRangeText(paragraph.offset, paragraph.length + editLength),
    );
    paragraph.adjustLength(editLength);

    // Shift offsets for all subsequent paragraphs
    for (let i = paragraphIndex + 1; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(editLength);
    }

    this.splitParagraphIntoLines(paragraphIndex);
  }

  // Split the text into paragraphs based on newlines
  public splitIntoParagraphs(): void {
    const pieces = this.pieceTable.getPieces();

    this.paragraphs = []; // Reset paragraphs for each parse
    let currentOffset = 0;

    // Iterate over the pieces
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const text = this.pieceTable.getPieceText(piece);

      // Split while preserving newlines (when used with a regex, it keeps the newlines in the array)
      const tokens = text.split(/(\n)/);

      tokens.forEach((token) => {
        // If the token is a newline
        if (token === '\n') {
          // End current paragraph
          currentOffset += 1; // Account for newline. Note: newline is counted at the end of the paragraph
          // Also add this newline to the previous paragraph's length
          if (this.paragraphs.length > 0) {
            const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
            lastParagraph.adjustLength(1); // +1 for the newline
          }

          // Start a new empty paragraph
          this.paragraphs.push(new Paragraph('', currentOffset));
        } else if (token.length > 0) {
          // Text content
          if (this.paragraphs.length === 0) {
            // Start new paragraph
            this.paragraphs.push(new Paragraph(token, currentOffset));
          } else {
            // Append to existing paragraph
            const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
            lastParagraph.appendText(token);
          }
          currentOffset += token.length;
        }
      });
    }
  }

  // Split a paragraph into lines based on the canvas width
  public splitParagraphIntoLines(paragraphIndex: number): void {
    const paragraph = this.paragraphs[paragraphIndex];

    // Ensure canvas context has correct font for measurements
    this.ctx.font = '16px Arial';

    // Get paragraph-specific styles
    const styles = this.paragraphStylesManager.getParagraphStyles(paragraphIndex);

    // Merge margins with editor defaults
    const marginLeft = styles.marginLeft ?? this.editor.margins.left;
    const marginRight = styles.marginRight ?? this.editor.margins.right;

    const wrappingWidth = this.editor.internalCanvas.width - marginLeft - marginRight;

    const maxWidth = wrappingWidth;
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
        const spaceWidth = this.ctx.measureText(' ').width;
        let spaceIndex = 0;

        // Process spaces one by one to allow breaking within space sequences
        while (spaceIndex < token.length) {
          const testChar = currentLine + token[spaceIndex];
          const charMetrics = this.ctx.measureText(testChar);

          // If adding this space exceeds the max width, we need to handle line breaking
          if (charMetrics.width > maxWidth) {
            // If current line has content, push it and start new line
            if (currentLine.length > 0) {
              lines.push({
                text: currentLine,
                offset: offsetInParagraph,
                length: currentLine.length,
                pixelLength: this.ctx.measureText(currentLine).width,
                wordpixelOffsets: [...wordpixelOffsets],
                wordCharOffsets: [...wordCharOffsets],
              });
              offsetInParagraph += currentLine.length;

              // Start a new line and add the space that caused the break to the new line
              wordpixelOffsets = [0]; // Always start with 0 for new lines
              wordCharOffsets = [0]; // Always start with 0 for new lines
              currentLine = token[spaceIndex]; // Add the space that caused the break
              currentSpaceWidth = spaceWidth;
              spaceIndex++; // Move to the next space
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
          wordpixelOffsets.push(this.ctx.measureText(currentLine).width - currentSpaceWidth);
          wordCharOffsets.push(currentLine.length - token.length);
        }

        // Continue to next token
        return;
      }

      if (token.trim()) {
        // Handle regular words/tokens
        // Recalculate testLine and metrics after spaces have been processed
        const testLine = currentLine + token;
        const metrics = this.ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine.length > 0) {
          // Line is too long, push the current line...
          lines.push({
            text: currentLine,
            offset: offsetInParagraph,
            length: currentLine.length,
            pixelLength: this.ctx.measureText(currentLine).width,
            wordpixelOffsets: [...wordpixelOffsets],
            wordCharOffsets: [...wordCharOffsets],
          });
          offsetInParagraph += currentLine.length;

          // ...and start a new line with the current token
          wordpixelOffsets = [0];
          wordCharOffsets = [0];
          currentLine = token;
        } else {
          wordpixelOffsets.push(this.ctx.measureText(currentLine).width);
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
      pixelLength: this.ctx.measureText(currentLine).width,
      wordpixelOffsets: wordpixelOffsets,
      wordCharOffsets: wordCharOffsets,
    });

    paragraph.setLines(lines); // Use the new setLines method which also marks as clean
  }

  /**
   * Locate the paragraph that contains a given character offset.
   *
   * This function uses an inclusive model where each paragraph "owns" the position
   * immediately after its text content (typically a newline position). This ensures
   * there are no gaps in coverage and every valid cursor position belongs to a paragraph.
   *
   * See how {@link TextParser.splitIntoParagraphs} accounts for newlines when creating paragraphs.
   * See also the {@link Paragraph} type for paragraph shape and offsets.
   *
   * @param offset - Character position within the full document text.
   * @returns The paragraph index that contains the offset, or -1 if not found.
   *
   * @see {@link TextParser.splitIntoParagraphs}
   */
  public findParagraphIndexAtOffset(offset: number): number {
    // Use the same logic as CursorManager.mapLinearToStructure for consistency
    for (let i = 0; i < this.paragraphs.length; i++) {
      const paragraph = this.paragraphs[i];

      const isOffsetInParagraph =
        offset >= paragraph.offset && offset < paragraph.offset + paragraph.length;

      if (isOffsetInParagraph) {
        return i;
      }
    }
    return -1; // Not found
  }

  /**
   * This method handles splitting a paragraph into two at the given cursor position.
   * It's a fast path for handling Enter key presses.
   * It updates the piece table, paragraph list, and re-parses the affected paragraphs into lines.
   *
   *
   *
   *
   * @param cursorPosition - Character offset just after the newline was inserted.
   */
  public splitParagraphDirectly(cursorPosition: number): void {
    // Key implementation considerations:
    // - To reproduce the operation of splitIntoParagraphs, linebreaks need to be
    //    counted in the length but not inserted into the actual paragraph.text.
    // - Order of operation : Since the editor updates the cursor position AFTER
    //    calling this function, the cursor is behind the inserted linebreak currently.
    // - We need to take both those points into consideration when splitting the text, updating the length of the
    //    paragraphs and the offset of the second paragraph.
    // - getRangeText(start, length) retrieves text from the piece table, where length is inclusive.

    // Insert the newline character
    this.pieceTable.insert('\n', cursorPosition);

    const paragraphIndex = this.findParagraphIndexAtOffset(cursorPosition);

    const currentParagraph = this.paragraphs[paragraphIndex];

    const offsetInParagraph = cursorPosition - currentParagraph.offset;

    // ┌─────────────────────────────────────────────────────────┐
    // │  offset=10         cursor=24   cursor+1=25              │
    // │  ↓                   ↓        ↓                         │
    // │  "Hello world, this" [newline] " is a test"             │
    // │  └─ offsetInParagraph=14 ─┘    └─ remaining text ─┘     │
    // └─────────────────────────────────────────────────────────┘

    // First part from start of paragraph up to the cursor (which is before the linebreak)
    const firstPartText = this.pieceTable.getRangeText(currentParagraph.offset, offsetInParagraph);

    // Second part from just after the linebreak (because we don't insert it into text) to the end of the paragraph
    const secondPartText = this.pieceTable.getRangeText(
      cursorPosition + 1,
      currentParagraph.length - offsetInParagraph - 1, //   Why -1? Original length includes the paragraph's trailing newline.
    );

    // It's important to to update after getting the texts, because updating the paragraph text
    // changes its length and would mess up the offsets for the second part.
    currentParagraph.updateText(firstPartText);
    currentParagraph.setLength(Math.max(0, firstPartText.length + 1)); // +1 for the newline just added

    // New paragraph with the second part of the text, the offset is cursorPosition + 1 to account for the newline
    const newParagraph = new Paragraph(secondPartText, cursorPosition + 1);
    newParagraph.setLength(secondPartText.length + 1); // +1 for the already existing newline

    // Insert the new paragraph into the array right after the current one
    this.paragraphs.splice(paragraphIndex + 1, 0, newParagraph);

    // Shift offsets for all subsequent paragraphs by +1 (to account for the added newline)
    for (let i = paragraphIndex + 2; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(1);
    }

    // Only reparse the affected paragraphs into lines
    this.splitParagraphIntoLines(paragraphIndex);
    this.splitParagraphIntoLines(paragraphIndex + 1);
  }

  public mergeWithNextParagraph(paragraphIndex: number): void {
    const currentParagraph = this.paragraphs[paragraphIndex];
    const nextParagraph = this.paragraphs[paragraphIndex + 1];
    if (!nextParagraph) return; // No next paragraph to merge with

    // Remove the next paragraph from the array
    this.paragraphs.splice(paragraphIndex + 1, 1);

    // Calculate the new combined length
    // When merging paragraphs, we subtract 1 for the removed newline character
    // but ensure the result is never negative (for empty paragraphs)
    const newLength = Math.max(0, currentParagraph.length + nextParagraph.length);

    // Get the text of the new combined paragraph from the piece table
    const text =
      newLength > 0 ? this.pieceTable.getRangeText(currentParagraph.offset, newLength) : '';

    // Update the current paragraph with the merged content
    currentParagraph.updateText(text);
    currentParagraph.setLength(newLength); // -1 for the removed newline

    // Shift offsets for all subsequent paragraphs (-1 for the removed newline)
    for (let i = paragraphIndex + 1; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(-1);
    }

    // Re-parse the merged paragraph into lines since its content changed
    this.splitParagraphIntoLines(paragraphIndex);
  }

  public getParagraph(index: number): Paragraph | null {
    return this.paragraphs[index] || null;
  }
}
