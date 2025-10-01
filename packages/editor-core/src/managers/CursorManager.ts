import { Editor } from '../core/Editor';
import { TextParser } from '../core/TextParser';
import { EventEmitter } from '../utils/EventEmitter';
import type { CursorManagerEvents, CursorChangeEvent } from '../types/CursorEvents';

// Forward declaration to avoid circular dependency
class SelectionManager {}

export type StructurePosition = {
  pageIndex: number;
  paragraphIndex: number;
  lineIndex: number;
  characterIndex: number;
  pixelOffsetInLine: number;
};

export type MousePosition = {
  x: number;
  y: number;
  page: number;
};

export class CursorManager extends EventEmitter<CursorManagerEvents> {
  // Manages cursor position and movement within the editor
  private textParser: TextParser;
  private linearPosition: number;
  public structurePosition: StructurePosition = {
    pageIndex: -1,
    paragraphIndex: -1,
    lineIndex: -1,
    characterIndex: -1,
    pixelOffsetInLine: -1,
  };
  private editor: Editor;
  private selectionManager?: SelectionManager;

  private measureText: (text: string) => TextMetrics;

  constructor(
    initialPosition: number = 0,
    textParser: TextParser,
    ctx: CanvasRenderingContext2D,
    editor: Editor,
  ) {
    super();
    this.linearPosition = initialPosition;
    this.textParser = textParser;
    this.editor = editor;
    this.measureText = ctx.measureText.bind(ctx);
    this.mapLinearToStructure();
  }

  public setSelectionManager(selectionManager: any): void {
    this.selectionManager = selectionManager;
  }

  public getPosition(): number {
    return this.linearPosition;
  }

  public setCursorPosition(position: number): void {
    const previousPosition = this.linearPosition;
    const clampedPosition = this.clampLinearPosition(position);

    // Only update and emit if position actually changed
    if (clampedPosition !== previousPosition) {
      this.linearPosition = clampedPosition;
      this.mapLinearToStructure();

      // Emit cursor change event
      const event: CursorChangeEvent = {
        position: clampedPosition,
        structurePosition: { ...this.structurePosition },
        previousPosition: previousPosition,
      };
      this.emit('cursorChange', event);

      // Clear selection when cursor moves
      if (this.selectionManager) {
        (this.selectionManager as any).clearSelection();
      }
    }
  }

  public clampLinearPosition(position: number): number {
    return Math.max(0, Math.min(position, this.editor.getPieceTable().length));
  }

  public moveLeft(amount: number): void {
    // Handle selection if there's one
    if (this.selectionManager && (this.selectionManager as any).handleMoveLeftWithSelection()) {
      return;
    }
    this.setCursorPosition(this.linearPosition - amount);
  }

  public moveRight(amount: number): void {
    // Handle selection if there's one
    if (this.selectionManager && (this.selectionManager as any).handleMoveRightWithSelection()) {
      return;
    }
    this.setCursorPosition(this.linearPosition + amount);
  }

  public moveUp(): void {
    this.getLineAdjacentLinearPosition(this.linearPosition, 'above', true);
  }

  public moveDown(): void {
    this.getLineAdjacentLinearPosition(this.linearPosition, 'below', true);
  }

  //TODO:
  // - use binary search for better performance,
  // - provide hints not to search the whole range (if left or right, up or down, the cursor is probably in a line adjacent or in the same line, if left it necessarily before, etc....)
  public mapLinearToStructure(): void {
    const cursorPosition = this.linearPosition;
    const paragraphs = this.textParser.getParagraphs();
    let structurePosition: StructurePosition = {
      pageIndex: -1,
      paragraphIndex: -1,
      lineIndex: -1,
      characterIndex: -1,
      pixelOffsetInLine: -1,
    }; // Reset cursor position

    // 1. Within which paragraph is the cursor position?
    let paragraphIndex = -1;
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      const isCursorInParagraph =
        cursorPosition >= paragraph.offset && cursorPosition < paragraph.offset + paragraph.length;

      // If the cursor is in the paragraph, set the index of the paragraph and break the loop
      if (isCursorInParagraph) {
        paragraphIndex = i;
        break;
      }
    }

    // Set the paragraph index in the rendered cursor position
    structurePosition.paragraphIndex = paragraphIndex;

    // 2. Within which line of the paragraph is the cursor position?
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) {
      // Cursor position is out of bounds in the paragraphs
      structurePosition.lineIndex = -1;
      this.structurePosition = structurePosition;
      return;
    }

    // Search the cursor position in the lines of the paragraphs
    let lineIndex = -1;

    for (let j = 0; j < paragraph.lines.length; j++) {
      const line = paragraph.lines[j];

      const cursorOffsetInParagraph = cursorPosition - paragraph.offset;

      // Don't forget the newline character at the end of the paragraph
      const isEndOfParagraph = cursorPosition === paragraph.offset + paragraph.length - 1;
      const endOffsetDelta = isEndOfParagraph ? 1 : 0;

      // Allow cursor to be positioned at the end of any line, including trailing whitespace
      // Use <= instead of < to include the position exactly at the end of the line
      if (
        cursorOffsetInParagraph >= line.offset &&
        cursorOffsetInParagraph < line.offset + line.length + endOffsetDelta
      ) {
        lineIndex = j;
        break;
      }
    }
    structurePosition.lineIndex = lineIndex;

    // 3. Calculate the offset within the line in pixels
    if (lineIndex !== -1) {
      const cursorOffsetInParagraph = cursorPosition - paragraph.offset;
      const line = paragraph.lines[lineIndex];
      const positionInLine = cursorOffsetInParagraph - line.offset;

      // Ensure positionInLine doesn't exceed the line length (safety check)
      const clampedPositionInLine = Math.min(positionInLine, line.text.length);

      const textBeforeCursor = line.text.substring(0, clampedPositionInLine);
      const metrics = this.measureText(textBeforeCursor);
      structurePosition.characterIndex = clampedPositionInLine; // Character index within the line
      structurePosition.pixelOffsetInLine = metrics.width; // Offset in pixels within the line
    }

    // 4. Determine the page index
    const pages = this.textParser.getPages();
    let pageIndex = -1;
    for (let p = 0; p < pages.length; p++) {
      const page = pages[p];
      if (page.containsLine(paragraphIndex, lineIndex)) {
        pageIndex = p;
        break;
      }
    }
    structurePosition.pageIndex = pageIndex;

    // Finally set the calculated structure position
    this.structurePosition = structurePosition;
  }

  public mapPixelCoordinateToStructure(
    x: number,
    y: number,
    pageIndex: number,
    moveCursor: boolean = true,
  ): StructurePosition | undefined {
    const lineHeight = 20; // Height of each line

    const clickedLineInPage = Math.floor((y - this.editor.margins.top) / lineHeight);

    const page = this.textParser.getPages()[pageIndex];
    if (!page) return undefined;

    const paragraphs = this.textParser.getParagraphs();
    const { startParagraphIndex, endParagraphIndex, startLineIndex, endLineIndex } = page;

    // Count lines in the page to find which paragraph and line was clicked
    let accumulatedLinesInPage = 0;

    for (let pIndex = startParagraphIndex; pIndex <= endParagraphIndex; pIndex++) {
      const paragraph = paragraphs[pIndex];

      // Paragraph margin
      const marginLeft =
        this.editor.paragraphStylesManager.getParagraphStyles(pIndex).marginLeft ??
        this.editor.margins.left;
      const adjustedX = x - marginLeft; // Adjust x for paragraph margin

      if (!paragraph) continue;

      // Determine which lines of this paragraph are in this page
      let firstLineInPage = 0;
      let lastLineInPage = paragraph.lines.length - 1;

      if (pIndex === startParagraphIndex) {
        firstLineInPage = startLineIndex;
      }
      if (pIndex === endParagraphIndex) {
        lastLineInPage = endLineIndex;
      }

      const linesInPageForThisParagraph = lastLineInPage - firstLineInPage + 1;

      // Check if the clicked line is within this paragraph's lines in the page
      if (clickedLineInPage < accumulatedLinesInPage + linesInPageForThisParagraph) {
        const lineInParagraph = firstLineInPage + (clickedLineInPage - accumulatedLinesInPage);
        const line = paragraph.lines[lineInParagraph];

        if (!line) return undefined;

        // Now find the character index in the line based on adjustedX
        let charIndex = 0;
        let currentWidth = 0;
        for (let i = 0; i < line.text.length; i++) {
          const char = line.text[i];
          const charWidth = this.measureText(char).width;
          if (currentWidth + charWidth / 2 >= adjustedX) {
            break;
          }
          currentWidth += charWidth;
          charIndex++;
        }

        const proposed: StructurePosition = {
          pageIndex: pageIndex,
          paragraphIndex: pIndex,
          lineIndex: lineInParagraph,
          characterIndex: charIndex,
          pixelOffsetInLine: currentWidth,
        };

        if (moveCursor) {
          const previousPosition = this.linearPosition;
          this.structurePosition = proposed;
          this.linearPosition = this.mapStructureToLinear({
            pageIndex: pageIndex,
            paragraphIndex: pIndex,
            lineIndex: lineInParagraph,
            characterIndex: charIndex,
          });

          // Emit events if position changed
          if (this.linearPosition !== previousPosition) {
            const event: CursorChangeEvent = {
              position: this.linearPosition,
              structurePosition: { ...this.structurePosition },
              previousPosition: previousPosition,
            };
            this.emit('cursorChange', event);
          }
        }
        return proposed;
      }

      accumulatedLinesInPage += linesInPageForThisParagraph;
    }
    return undefined;
  }

  public mapStructureToLinear(structurePos: Omit<StructurePosition, 'pixelOffsetInLine'>): number {
    const paragraphs = this.textParser.getParagraphs();
    const { paragraphIndex, lineIndex, characterIndex } = structurePos;
    const targetParagraph = paragraphs[paragraphIndex];
    if (!targetParagraph) return this.linearPosition; // Invalid paragraph index
    if (lineIndex < 0 || lineIndex >= targetParagraph.lines.length) return this.linearPosition; // Invalid line index

    const targetLine = targetParagraph.lines[lineIndex];
    if (characterIndex < 0 || characterIndex > targetLine.text.length) return this.linearPosition; // Invalid character index
    return targetParagraph.offset + targetLine.offset + characterIndex;
  }

  public getLineAdjacentLinearPosition(
    cursorPosition: number,
    direction: 'above' | 'below',
    moveCursor: boolean = true,
  ): number {
    const paragraphs = this.textParser.getParagraphs();

    // Get current cursor position mapping
    const { paragraphIndex, lineIndex, pixelOffsetInLine } = this.structurePosition;

    if (paragraphIndex === -1 || lineIndex === -1 || pixelOffsetInLine === -1) {
      this.editor.logger.cursorOperations(
        'getLineAdjacentCursorPosition - Invalid cursor position structure:',
        this.structurePosition,
      );
      return cursorPosition;
    }

    const initialParagraph = paragraphs[paragraphIndex];
    let targetParagraphIndex = paragraphIndex;
    let targetLine = -1;

    // 1 - Easy case we're not at first or last line
    if (direction === 'above' && lineIndex > 0) {
      targetLine = lineIndex - 1;
    } else if (direction === 'below' && lineIndex < initialParagraph.lines.length - 1) {
      targetLine = lineIndex + 1;
    }

    // 2 - We're at the first line and want to go up, or at the last line and want to go down
    if (targetLine === -1) {
      if (direction === 'above') {
        // Move to the end of the previous paragraph if it exists
        if (paragraphIndex > 0) {
          targetParagraphIndex -= 1;
          const previousParagraph = paragraphs[targetParagraphIndex];
          targetLine = previousParagraph.lines.length - 1;
        } else {
          return cursorPosition; // Already at the top of the document
        }
      } else if (direction === 'below') {
        // Move to the start of the next paragraph if it exists
        if (paragraphIndex < paragraphs.length - 1) {
          targetLine = 0;
          targetParagraphIndex += 1;
        } else {
          return cursorPosition; // Already at the bottom of the document
        }
      }
    }
    const targetParagraph = paragraphs[targetParagraphIndex];

    // Now find the character index in the target line based on pixelOffset
    const line = targetParagraph.lines[targetLine];

    // Handle empty line quickly
    if (!line.text || line.text.length === 0) {
      console.log('Empty line, moving to start of line');
      const newPos = targetParagraph.offset + line.offset;
      if (moveCursor) {
        // Find the correct page for this empty line
        const pages = this.textParser.getPages();
        let newPageIndex = -1;

        for (let p = 0; p < pages.length; p++) {
          const page = pages[p];
          if (page.containsLine(targetParagraphIndex, targetLine)) {
            newPageIndex = p;
            break;
          }
        }

        // Fallback to current page if not found (shouldn't happen)
        if (newPageIndex === -1) {
          newPageIndex = this.structurePosition.pageIndex;
          console.warn('Empty line: Could not find page, using current page');
        }

        const previousPosition = this.linearPosition;
        this.structurePosition = {
          pageIndex: newPageIndex,
          paragraphIndex: targetParagraphIndex,
          lineIndex: targetLine,
          characterIndex: 0,
          pixelOffsetInLine: 0,
        };
        this.linearPosition = newPos;

        // Emit events if position changed
        if (this.linearPosition !== previousPosition) {
          const event: CursorChangeEvent = {
            position: this.linearPosition,
            structurePosition: { ...this.structurePosition },
            previousPosition: previousPosition,
          };
          this.emit('cursorChange', event);
        }
      }
      return newPos;
    }

    // First step through the words to find the closest word boundary
    let wordIndex = 0;
    for (let i = 0; i < line.wordpixelOffsets.length; i++) {
      if (line.wordpixelOffsets[i] > pixelOffsetInLine) {
        break;
      }
      wordIndex = i;
    }

    // Start from the beginning of the identified word
    let accumulatedWidth = line.wordpixelOffsets[wordIndex];
    let charIndex = line.wordCharOffsets[wordIndex];
    let decided = false;
    let finalPixelOffset = accumulatedWidth;

    // Add characters one by one until we reach or exceed the pixelOffset
    for (let i = line.wordCharOffsets[wordIndex]; i < line.text.length; i++) {
      const char = line.text[i];
      const charWidth = this.measureText(char).width;
      const nextAccumulatedWidth = accumulatedWidth + charWidth;

      if (nextAccumulatedWidth > pixelOffsetInLine) {
        const distanceToCurrent = Math.abs(accumulatedWidth - pixelOffsetInLine);
        const distanceToNext = Math.abs(nextAccumulatedWidth - pixelOffsetInLine);

        if (distanceToNext < distanceToCurrent) {
          charIndex = i + 1;
          finalPixelOffset = nextAccumulatedWidth;
        } else {
          charIndex = i;
          finalPixelOffset = accumulatedWidth;
        }
        decided = true;
        break;
      }

      accumulatedWidth = nextAccumulatedWidth;
      charIndex = i + 1;
      finalPixelOffset = accumulatedWidth;
    }

    // If we never exceeded pixelOffset, place cursor at end of line
    if (!decided) {
      charIndex = Math.min(charIndex, line.text.length);
      finalPixelOffset = accumulatedWidth;
    }

    const newPos = targetParagraph.offset + targetParagraph.lines[targetLine].offset + charIndex;
    if (moveCursor) {
      // TODO: check this part of the code, it seems complex for something that should be simple
      // Calculate the page index for the new position
      const pages = this.textParser.getPages();
      let newPageIndex = -1; // Start with invalid page to detect if we find one

      for (let p = 0; p < pages.length; p++) {
        const page = pages[p];
        if (page.containsLine(targetParagraphIndex, targetLine)) {
          newPageIndex = p;
          break;
        }
      }

      // If no page was found, log error and try to find the correct page
      if (newPageIndex === -1) {
        console.error(
          'Cursor movement: Could not find page for paragraph',
          targetParagraphIndex,
          'line',
          targetLine,
        );
        console.error('Available pages:', pages.length);
        console.error('Current position:', this.structurePosition);

        // Fallback: find the page that contains this paragraph
        for (let p = 0; p < pages.length; p++) {
          const page = pages[p];
          if (page.containsParagraph(targetParagraphIndex)) {
            newPageIndex = p;
            console.warn(
              'Fallback: Using page',
              p,
              'which contains paragraph',
              targetParagraphIndex,
            );
            break;
          }
        }

        // Last resort: use current page
        if (newPageIndex === -1) {
          newPageIndex = this.structurePosition.pageIndex;
          console.warn('Last resort: Using current page index', newPageIndex);
        }
      }

      console.log(
        `Moving cursor ${direction} to paragraph ${targetParagraphIndex}, line ${targetLine}, char ${charIndex} (page ${newPageIndex})`,
      );

      // log line text
      console.log('Line text:', JSON.stringify(line.text));

      const previousPosition = this.linearPosition;
      this.structurePosition = {
        pageIndex: newPageIndex,
        paragraphIndex: targetParagraphIndex,
        lineIndex: targetLine,
        characterIndex: charIndex,
        pixelOffsetInLine: finalPixelOffset,
      };
      this.linearPosition = newPos;

      // Emit events if position changed
      if (this.linearPosition !== previousPosition) {
        const event: CursorChangeEvent = {
          position: this.linearPosition,
          structurePosition: { ...this.structurePosition },
          previousPosition: previousPosition,
        };
        this.emit('cursorChange', event);
      }
    }
    return newPos;
  }
}
