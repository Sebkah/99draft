import { Editor } from '../core/Editor';
import { TextParser } from '../core/TextParser';
import { EventEmitter } from '../utils/EventEmitter';
import type { CursorManagerEvents, CursorChangeEvent } from '../types/CursorEvents';
import type { SelectionManager } from './SelectionManager';
import { Line, Paragraph } from '..';

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

  private ctx: CanvasRenderingContext2D;

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
    this.ctx = ctx;

    this.mapLinearToStructure();
  }

  // XXX: this is a dirty way to avoid circular dependency
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
        this.selectionManager.clearSelection();
      }
    }
  }

  public clampLinearPosition(position: number): number {
    return Math.max(0, Math.min(position, this.editor.getPieceTable().length));
  }

  public moveLeft(amount: number): void {
    // Handle selection if there's one - collapse to start position
    if (this.selectionManager && this.selectionManager.hasSelection()) {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        this.setCursorPosition(selection.start);
        this.selectionManager.clearSelection();
        return;
      }
    }
    this.setCursorPosition(this.linearPosition - amount);
  }

  public moveRight(amount: number): void {
    // Handle selection if there's one - collapse to end position
    if (this.selectionManager && this.selectionManager.hasSelection()) {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        this.setCursorPosition(selection.end);
        this.selectionManager.clearSelection();
        return;
      }
    }
    this.setCursorPosition(this.linearPosition + amount);
  }

  public moveUp(): void {
    // Handle selection if there's one - collapse to start position
    if (this.selectionManager && this.selectionManager.hasSelection()) {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        this.setCursorPosition(selection.start);
        this.selectionManager.clearSelection();
        return;
      }
    }

    this.getLineAdjacentPosition('above', true);
  }

  public moveDown(): void {
    // Handle selection if there's one - collapse to start position
    if (this.selectionManager && this.selectionManager.hasSelection()) {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        this.setCursorPosition(selection.start);
        this.selectionManager.clearSelection();
        return;
      }
    }

    this.getLineAdjacentPosition('below', true);
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
        cursorOffsetInParagraph >= line.offsetInParagraph &&
        cursorOffsetInParagraph < line.offsetInParagraph + line.length + endOffsetDelta
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
      const positionInLine = cursorOffsetInParagraph - line.offsetInParagraph;

      structurePosition.characterIndex = positionInLine; // Character index within the line
      structurePosition.pixelOffsetInLine = line.measureTextWithStyles(this.ctx, 0, positionInLine); // Offset in pixels within the line
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
    const page = this.textParser.getPage(pageIndex);
    if (!page) return undefined;

    const paragraphs = this.textParser.getParagraphs();
    const { startParagraphIndex, endParagraphIndex, startLineIndex, endLineIndex } = page;

    // I. Find the paragraph and line at the given y coordinate
    let accumulatedHeight = this.editor.margins.top; // Start from top margin
    let paragraphFound: Paragraph | null = null;
    let paragraphIndexFound: number | null = null;
    let lineFound: Line | null = null;
    let lineIndexFound: number | null = null;
    //  Go through paragraphs until we find the one that contains the y coordinate
    for (let pIndex = startParagraphIndex; pIndex <= endParagraphIndex; pIndex++) {
      const paragraph = paragraphs[pIndex];
      if (!paragraph) continue;

      // Determine how many lines of this paragraph are in this page
      let linesCutAtStart = 0;
      let linesCutAtEnd = 0;
      if (pIndex === startParagraphIndex) {
        linesCutAtStart += startLineIndex;
      }
      if (pIndex === endParagraphIndex) {
        linesCutAtEnd += paragraph.lines.length - 1 - endLineIndex;
      }
      const linesNotInPage = linesCutAtStart + linesCutAtEnd;

      const linesInPage = paragraph.lines.length - linesNotInPage;

      // Get paragraph styles for line height
      const { lineHeight } = this.editor.paragraphStylesManager.getParagraphStyles(pIndex);

      // Try adding the whole paragraph height at once for a quick check, accounting for cut lines (start and end)
      const paragraphHeight = lineHeight * linesInPage;
      // 1. Paragraph does not contain the y coordinate, skip it
      if (accumulatedHeight + paragraphHeight < y) {
        accumulatedHeight += paragraphHeight;
        continue; // Not in this paragraph, skip to next
      }
      // 2. Paragraph contains the y coordinate, find the exact line, accounting for cut lines (start only)
      paragraphFound = paragraph;
      paragraphIndexFound = pIndex;
      const remainingY = y - accumulatedHeight + linesCutAtStart * lineHeight;
      const lineIndexInParagraph = Math.floor(remainingY / lineHeight);
      lineFound = paragraph.lines[lineIndexInParagraph];
      lineIndexFound = lineIndexInParagraph;
      console.log('Found paragraph index', pIndex, 'line index', lineIndexInParagraph);
      break;
    }

    if (!(lineFound && paragraphFound && paragraphIndexFound && lineIndexFound)) return undefined;

    // II. Find the character index in the line at the given x coordinate
    // Get paragraph alignment
    const { align, marginLeft } =
      this.editor.paragraphStylesManager.getParagraphStyles(paragraphIndexFound);
    const { freePixelSpace } = lineFound;

    let xDelta = marginLeft; // Start with left margin
    if (align === 'center') {
      xDelta += freePixelSpace / 2;
    } else if (align === 'right') {
      xDelta += freePixelSpace;
    }

    // Binary search to find the character index that best matches the x coordinate
    let low = 0;
    let high = lineFound.length;
    let bestMatchIndex = 0;
    let smallestDiff = Infinity;
    let steps = 0;
    const adjustedX = x - xDelta;
    while (low <= high) {
      steps++;
      const mid = Math.floor((low + high) / 2);
      const midPixelOffset = lineFound.measureTextWithStyles(this.ctx, 0, mid);
      const diff = Math.abs(midPixelOffset - adjustedX);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestMatchIndex = mid;
      }
      if (midPixelOffset < adjustedX) {
        low = mid + 1;
      } else if (midPixelOffset > adjustedX) {
        high = mid - 1;
      } else {
        break; // Exact match
      }
    }

    console.log(`Binary search steps: ${steps}`);
    console.log('Best match character index:', lineFound.text[bestMatchIndex], bestMatchIndex);
    const pixelOffsetInLine = lineFound.measureTextWithStyles(this.ctx, 0, bestMatchIndex);

    // III. Map back to linear position
    const newLinearPosition = paragraphFound.offset + lineFound.offsetInParagraph + bestMatchIndex;
    const newStructurePosition: StructurePosition = {
      pageIndex: pageIndex,
      paragraphIndex: paragraphIndexFound,
      lineIndex: lineIndexFound,
      characterIndex: bestMatchIndex,
      pixelOffsetInLine: pixelOffsetInLine,
    };
    if (moveCursor) {
      const previousPosition = this.linearPosition;
      this.linearPosition = newLinearPosition;
      this.structurePosition = newStructurePosition;
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
    return newStructurePosition;
  }

  public mapStructureToLinear(structurePos: Omit<StructurePosition, 'pixelOffsetInLine'>): number {
    const paragraphs = this.textParser.getParagraphs();
    const { paragraphIndex, lineIndex, characterIndex } = structurePos;
    const targetParagraph = paragraphs[paragraphIndex];
    if (!targetParagraph) return this.linearPosition; // Invalid paragraph index
    if (lineIndex < 0 || lineIndex >= targetParagraph.lines.length) return this.linearPosition; // Invalid line index

    const targetLine = targetParagraph.lines[lineIndex];
    if (characterIndex < 0 || characterIndex > targetLine.text.length) return this.linearPosition; // Invalid character index
    return targetParagraph.offset + targetLine.offsetInParagraph + characterIndex;
  }

  // TODO: mapPixelCoo seems to work, trye reproducing the same thing here
  public getLineAdjacentPosition(
    direction: 'above' | 'below',
    moveCursor: boolean = true,
  ): { linearPosition: number; structurePosition: StructurePosition } {
    const paragraphs = this.textParser.getParagraphs();

    // Get current cursor position mapping
    const { paragraphIndex, lineIndex, pixelOffsetInLine } = this.structurePosition;

    // I. Determine which line to move to and in which paragraph
    const { targetParagraphIndex, targetLineIndex } = this.getAdjacentTargetLine(
      paragraphs,
      paragraphIndex,
      lineIndex,
      direction,
    );

    // II. Calculate the character index in the target line based on pixel offset
    const targetParagraph = paragraphs[targetParagraphIndex];
    const targetLine = targetParagraph.lines[targetLineIndex];
    const currentLine = paragraphs[paragraphIndex].lines[lineIndex];

    // Get paragraph margin
    // XXX: Handle alignment is going to be tricky here (especially when you switch from different alignments)
    // XXX: FOR NOW IT DOESN'T WORK AT ALL
    const targetMarginLeft = targetLine.wrappingWidth - targetLine.pixelLength;
    const currentMarginLeft = currentLine.wrappingWidth - currentLine.pixelLength;
    const difference = targetMarginLeft - currentMarginLeft;

    let target = pixelOffsetInLine;
    /*  if (paragraphIndex === targetParagraphIndex) {
      target += difference; // Adjust target pixel offset for margin differences if in the same paragraph
    } */

    // Explore with a binary search to find the character index that best matches the pixel offset
    let low = 0;
    let high = targetLine.length;
    let bestMatchIndex = 0;
    let smallestDiff = Infinity;
    let steps = 0;
    while (low <= high) {
      steps++;
      const mid = Math.floor((low + high) / 2);
      const midPixelOffset = targetLine.measureTextWithStyles(this.ctx, 0, mid);
      const diff = Math.abs(midPixelOffset - target);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestMatchIndex = mid;
      }
      if (midPixelOffset < target) {
        low = mid + 1;
      } else if (midPixelOffset > target) {
        high = mid - 1;
      } else {
        break; // Exact match
      }
    }

    console.log(`Binary search steps: ${steps}`);

    console.log('Best match character index:', targetLine.text[bestMatchIndex], bestMatchIndex);

    // III. Map back to linear position
    const newLinearPosition =
      targetParagraph.offset + targetLine.offsetInParagraph + bestMatchIndex;
    const newStructurePosition: StructurePosition = {
      pageIndex: -1, // Will be updated in mapLinearToStructure
      paragraphIndex: targetParagraphIndex,
      lineIndex: targetLineIndex,
      characterIndex: bestMatchIndex,
      pixelOffsetInLine: targetLine.measureTextWithStyles(this.ctx, 0, bestMatchIndex),
    };

    // Update page index in structure position
    const pages = this.textParser.getPages();
    for (let p = 0; p < pages.length; p++) {
      const page = pages[p];
      if (page.containsLine(targetParagraphIndex, targetLineIndex)) {
        newStructurePosition.pageIndex = p;
        break;
      }
    }

    if (moveCursor) {
      const previousPosition = this.linearPosition;
      this.linearPosition = newLinearPosition;
      this.structurePosition = newStructurePosition;
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
    return { linearPosition: newLinearPosition, structurePosition: newStructurePosition };
  }

  private getAdjacentTargetLine(
    paragraphs: Paragraph[],
    paragraphIndex: number,
    lineIndex: number,
    direction: 'above' | 'below',
  ): { targetParagraphIndex: number; targetLineIndex: number } {
    const initialParagraph = paragraphs[paragraphIndex];
    let targetParagraphIndex = paragraphIndex;
    let targetLine = -1;

    // 1 - Easy case: we're not at first or last line (we stay in the same paragraph)
    // Not the first line
    if (direction === 'above' && lineIndex > 0) {
      targetLine = lineIndex - 1;
      return { targetParagraphIndex: paragraphIndex, targetLineIndex: targetLine };
      // Not the last line
    } else if (direction === 'below' && lineIndex < initialParagraph.lines.length - 1) {
      targetLine = lineIndex + 1;
      return { targetParagraphIndex: paragraphIndex, targetLineIndex: targetLine };
    }
    // 2 - Harder case: we are at first or last line
    if (direction === 'above') {
      // Already at the top of the document, return current position
      if (paragraphIndex === 0) {
        return { targetParagraphIndex: paragraphIndex, targetLineIndex: lineIndex };
      }
      // Get the last line of the previous paragraph
      targetParagraphIndex -= 1;
      const previousParagraph = paragraphs[targetParagraphIndex];
      targetLine = previousParagraph.lines.length - 1;
      return { targetParagraphIndex, targetLineIndex: targetLine };
    }
    // direction === 'below'
    // Already at the bottom of the document, return current position
    if (paragraphIndex === paragraphs.length - 1) {
      return { targetParagraphIndex: paragraphIndex, targetLineIndex: lineIndex };
    }
    // Get the first line of the next paragraph
    targetLine = 0;
    targetParagraphIndex += 1;

    return { targetParagraphIndex, targetLineIndex: targetLine };
  }
}
