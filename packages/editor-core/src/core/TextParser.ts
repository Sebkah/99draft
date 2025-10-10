import { Editor } from './Editor';
import { PieceTable } from '../PieceTable/PieceTable';
import { Paragraph } from '../models/Paragraph';
import { Page } from '../models/Page';
import { Line } from '../models/Line';
import { EventEmitter } from '../utils/EventEmitter';
import type { TextParserEvents, PageCountChangeEvent } from '../types/TextParserEvents';

export class TextParser extends EventEmitter<TextParserEvents> {
  private pieceTable: PieceTable;
  private paragraphs: Paragraph[] = [];
  private ctx: CanvasRenderingContext2D;
  private editor: Editor;

  private pages: Page[] = [];
  private lastPageCount: number = 0;

  private paragraphStylesManager;

  public getPages(): Page[] {
    return this.pages;
  }

  constructor(pieceTable: PieceTable, ctx: CanvasRenderingContext2D, editor: Editor) {
    super();
    this.pieceTable = pieceTable;
    this.ctx = ctx;
    this.editor = editor;

    this.paragraphStylesManager = editor.paragraphStylesManager;

    this.splitIntoParagraphs();

    this.splitAllParagraphsIntoLines();

    this.splitParagraphsIntoPages();
  }

  /**
   * Notify about page count changes by emitting events
   */
  private notifyPageCountChange(): void {
    const currentPageCount = this.pages.length;
    if (this.lastPageCount !== currentPageCount) {
      this.editor.logger.pageManagement(
        'Page count changed:',
        this.lastPageCount,
        '->',
        currentPageCount,
      );

      const event: PageCountChangeEvent = {
        pageCount: currentPageCount,
        previousPageCount: this.lastPageCount,
      };

      this.lastPageCount = currentPageCount;
      this.emit('pageCountChange', event);
    }
  }

  public getParagraphs(): Paragraph[] {
    return this.paragraphs;
  }

  /**
   * Update cached style runs for lines affected by a style change
   * This is more efficient than re-splitting paragraphs into lines
   * @param start - The start position of the style change
   * @param end - The end position of the style change
   */
  public updateCachedStyleRuns(start: number, end: number): void {
    // Find the paragraphs affected by this range
    const startParagraphIndex = this.findParagraphIndexAtOffset(start);
    const endParagraphIndex = this.findParagraphIndexAtOffset(Math.max(start, end - 1));

    // Update each affected paragraph's lines
    for (let pIndex = startParagraphIndex; pIndex <= endParagraphIndex; pIndex++) {
      const paragraph = this.paragraphs[pIndex];

      // Create new lines with updated style runs
      const updatedLines = paragraph.lines.map((line) => {
        // Calculate absolute positions for this line
        const lineAbsoluteStart = paragraph.offset + line.offsetInParagraph;
        const lineAbsoluteEnd = lineAbsoluteStart + line.length;

        // Get updated style runs for this line
        const styleRuns = this.editor.stylesManager.getRunsOverlappingRange(
          lineAbsoluteStart,
          lineAbsoluteEnd,
        );

        // Create a new Line instance with updated styleRuns
        return new Line(
          line.text,
          line.offsetInParagraph,
          line.length,
          line.pixelLength,
          line.freePixelSpace,
          line.wrappingWidth,
          styleRuns,
        );
      });

      // Update the paragraph's lines
      paragraph.setLines(updatedLines);
    }
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
      this.wrapParagraphLines(i);
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

    this.wrapParagraphLines(paragraphIndex);
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

    //XXX: bad fix
    // Append a line break to the last paragraph
    // This ensures the last paragraph is treated consistently, especially for splitting and merging
    if (this.paragraphs.length > 0) {
      const lastParagraph = this.paragraphs[this.paragraphs.length - 1];
      lastParagraph.appendText('\n');
      lastParagraph.adjustLength(1); // +1 for the newline
    }
  }

  // Split a paragraph into lines based on the canvas width
  public wrapParagraphLines(paragraphIndex: number): void {
    const paragraph = this.paragraphs[paragraphIndex];

    // Ensure canvas context has correct font for measurements
    this.ctx.font = '16px Arial';

    // Get paragraph-specific styles
    const styles = this.paragraphStylesManager.getParagraphStyles(paragraphIndex);

    // Merge margins with editor defaults
    const marginLeft = styles.marginLeft ?? this.editor.margins.left;
    const marginRight = styles.marginRight ?? this.editor.margins.right;

    const wrappingWidth = this.editor.internalCanvas.width - marginLeft - marginRight;

    const lines: Line[] = [];

    let offsetInParagraph = 0;
    let currentLine = '';
    let currentLineWidth = 0;

    // Get the styles that affect parsing (changing font weight, size, family would affect measurements)
    const styleRuns = this.editor.stylesManager.getRunsOverlappingRange(
      paragraph.offset,
      paragraph.offset + paragraph.length,
      ['bold'],
    );

    // Divide the paragraph text into those runs
    const textSegments = styleRuns.map((run) => {
      // The run coordinates are already relative to the range start (paragraph.offset)
      // So run.start and run.end are already paragraph-relative
      const text = paragraph.text.substring(run.start, run.end);

      return { text, styles: run.data };
    });

    // Helper function to set canvas font based on styles
    const setCanvasFont = (styles: any): void => {
      if (styles.bold) {
        this.ctx.font = 'bold 16px Arial';
      } else {
        this.ctx.font = '16px Arial';
      }
    };

    // Helper function to create a line with cached style runs
    const createLine = (lineText: string, lineOffset: number, lineWidth: number): Line => {
      const lineLength = lineText.length;

      // Get the absolute offset in the document for this line
      const absoluteStart = paragraph.offset + lineOffset;
      const absoluteEnd = absoluteStart + lineLength;

      // Get style runs for this line range (returned with relative coordinates)
      const styleRuns = this.editor.stylesManager.getRunsOverlappingRange(
        absoluteStart,
        absoluteEnd,
      );

      return new Line(
        lineText,
        lineOffset,
        lineLength,
        lineWidth,
        wrappingWidth - lineWidth,
        wrappingWidth,
        styleRuns,
      );
    };

    textSegments.forEach((segment) => {
      const segmentTokens = segment.text.split(/(\s+)/);

      // Set canvas font based on segment styles for space width calculation
      setCanvasFont(segment.styles);

      // Calculate the width of a single space character with current font
      const spaceWidth = this.ctx.measureText(' ').width;

      segmentTokens.forEach((token) => {
        // Ensure font is set correctly for this token's measurement
        setCanvasFont(segment.styles);

        // 1. Token is spaces only
        if (token.trim() === '') {
          // Width of spaces added so far in this sequence
          let currentSpaceWidth = 0;

          // Process spaces one by one to allow breaking within space sequences
          for (let i = 0; i < token.length; i++) {
            // Test if adding one more space exceeds the max width
            const testWidth = currentLineWidth + currentSpaceWidth + spaceWidth;
            if (testWidth > wrappingWidth) {
              // If adding this space exceeds the max width, finish the current line
              lines.push(createLine(currentLine, offsetInParagraph, currentLineWidth));

              offsetInParagraph += currentLine.length;

              // Start a new line with the current space
              currentLine = ' ';
              currentSpaceWidth = spaceWidth;
              currentLineWidth = spaceWidth;
            } else {
              // Space fits on current line, add it
              currentLine += ' ';
              currentSpaceWidth += spaceWidth;
              currentLineWidth += spaceWidth;
            }
          }
          // Continue to next token
          return;
        }

        // 2. Token is a regular word/token (not just spaces)
        if (token.trim()) {
          // Measure token width with the correct font context
          const tokenWidth = this.ctx.measureText(token).width;
          const testLine = currentLine + token;

          if (currentLineWidth + tokenWidth > wrappingWidth) {
            // Line is too long, push the current line...
            lines.push(createLine(currentLine, offsetInParagraph, currentLineWidth));
            offsetInParagraph += currentLine.length;

            currentLine = token;
            currentLineWidth = tokenWidth;
          } else {
            currentLine = testLine;
            currentLineWidth += tokenWidth;
          }
        }
      });
    });

    // Push any remaining text as the last line
    // Always ensure at least one line exists (even for empty paragraphs with just a newline)
    if (currentLine.length > 0 || lines.length === 0) {
      lines.push(createLine(currentLine, offsetInParagraph, currentLineWidth));
    }
    paragraph.setLines(lines);
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

    /*     console.log('New paragraph created with text:', JSON.stringify(secondPartText)); */

    // Insert the new paragraph into the array right after the current one
    this.paragraphs.splice(paragraphIndex + 1, 0, newParagraph);

    // Shift offsets for all subsequent paragraphs by +1 (to account for the added newline)
    for (let i = paragraphIndex + 2; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(1);
    }

    // Split the styles before so the line splitting can use the correct styles (margins)
    this.paragraphStylesManager.splitParagraph(paragraphIndex);

    // Only reparse the affected paragraphs into lines
    this.wrapParagraphLines(paragraphIndex);
    this.wrapParagraphLines(paragraphIndex + 1);
  }

  /**
   * Merge the paragraph at the given line break position with the next paragraph.
   * This is a fast path for handling Backspace at the start of a paragraph.
   * It updates the piece table, paragraph list, and re-parses the affected paragraph into lines.
   * @param lineBreakPosition - Character offset of the line break to remove (i.e. just before the start of the paragraph to merge).
   *
   * Considerations:
   * - The linebreaks are counted in the paragraph length but not stored in the paragraph text.
   * - They are counted at the end of a paragraph.
   **/

  public mergeParagraphsAtLineBreak(lineBreakPosition: number): void {
    const beforeParagraphIndex = this.findParagraphIndexAtOffset(lineBreakPosition);

    const beforeParagraph = this.paragraphs[beforeParagraphIndex];
    const oldText = beforeParagraph ? beforeParagraph.text : '';

    // Check we're not at the end of the document (no next paragraph to merge with)
    if (beforeParagraphIndex === -1 || beforeParagraphIndex === this.paragraphs.length - 1) {
      console.warn('No next paragraph to merge with at line break position', lineBreakPosition);
      return;
    }

    const afterParagraph = this.paragraphs[beforeParagraphIndex + 1];

    // Remove the next paragraph from the array
    this.paragraphs.splice(beforeParagraphIndex + 1, 1);

    // Calculate the new combined length
    // When merging paragraphs, we subtract 1 for the removed newline character
    const newLength = Math.max(0, beforeParagraph.length - 1 + afterParagraph.length);

    // Get the text of the new combined paragraph from the piece table
    const text = this.pieceTable.getRangeText(beforeParagraph.offset, newLength);

    // Update the current paragraph with the merged content
    beforeParagraph.updateText(text);
    beforeParagraph.setLength(newLength);

    // Shift offsets for all subsequent paragraphs (-1 for the removed newline)
    for (let i = beforeParagraphIndex + 1; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(-1);
    }

    const isParagraphEmpty = oldText === '';

    // Merge the styles of the two paragraphs
    this.paragraphStylesManager.mergeWithNextParagraphStyle(beforeParagraphIndex, isParagraphEmpty);

    // Re-parse the merged paragraph into lines since its content changed
    this.wrapParagraphLines(beforeParagraphIndex);
  }

  /**
   * Delete a range of text that may span multiple paragraphs.
   * This is a fast path for handling multi-character deletions (e.g., selection deletions).
   * It updates the piece table, merges affected paragraphs, and re-parses the result.
   *
   * @param start - Character offset where the deletion begins.
   * @param length - Number of characters to delete.
   *
   * Algorithm:
   * 1. Delete from piece table
   * 2. If within single paragraph, use simple reparse
   * 3. If spanning multiple paragraphs:
   *    - Keep text before deletion start from first paragraph
   *    - Keep text after deletion end from last paragraph
   *    - Merge into first paragraph
   *    - Remove all intermediate and last paragraphs
   *    - Shift subsequent paragraph offsets
   */
  public deleteTextRangeDirectly(start: number, length: number): void {
    if (length <= 0) {
      console.warn('Delete range length is 0 or negative, no operation performed');
      return;
    }

    const startParagraphIndex = this.findParagraphIndexAtOffset(start);
    const endParagraphIndex = this.findParagraphIndexAtOffset(start + length - 1);

    if (startParagraphIndex === -1 || endParagraphIndex === -1) {
      console.warn('Invalid start or end position for deletion:', start, length);
      return;
    }

    // Simple case: deletion within a single paragraph
    if (startParagraphIndex === endParagraphIndex) {
      this.reparseParagraph(start, -length);
      return;
    }

    // Complex case: deletion spans multiple paragraphs
    // Capture paragraph references before any modifications to the array
    const startParagraph = this.paragraphs[startParagraphIndex];
    const endParagraph = this.paragraphs[endParagraphIndex];

    // Calculate how much text to keep from each boundary paragraph
    // keepFromStart: characters before the deletion point in the start paragraph
    const keepFromStart = start - startParagraph.offset;

    // keepFromEnd: characters after the deletion endpoint in the end paragraph
    // Note: The piece table has already been modified, so we calculate based on original positions
    const deletionEnd = start + length;
    const keepFromEnd = Math.max(0, endParagraph.offset + endParagraph.length - deletionEnd);

    console.log(
      `Merging paragraphs ${startParagraphIndex}-${endParagraphIndex}: keeping ${keepFromStart} chars from start, ${keepFromEnd} chars from end`,
    );

    // The merged paragraph's total length (including trailing newline if present)
    const newLength = keepFromStart + keepFromEnd;

    // Retrieve the merged text from the piece table (which has already been modified)
    const newText = this.pieceTable.getRangeText(startParagraph.offset, newLength);

    // Update the start paragraph with the merged content
    startParagraph.updateText(newText);
    startParagraph.setLength(newLength);

    // Remove all paragraphs from (start+1) through end (inclusive)
    // This is a single operation that removes all intermediate paragraphs plus the end paragraph
    const paragraphsToRemove = endParagraphIndex - startParagraphIndex;
    if (paragraphsToRemove > 0) {
      this.paragraphs.splice(startParagraphIndex + 1, paragraphsToRemove);
    }

    // Shift offsets for all subsequent paragraphs
    // They all move backward by the length of the deletion
    for (let i = startParagraphIndex + 1; i < this.paragraphs.length; i++) {
      this.paragraphs[i].shiftOffset(-length);
    }

    // Re-parse the merged paragraph into lines
    this.wrapParagraphLines(startParagraphIndex);
  }

  public getParagraph(index: number): Paragraph | null {
    return this.paragraphs[index] || null;
  }
}
