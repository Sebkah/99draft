import { Editor } from './Editor';
import { TextParser } from './TextParser';

export type StructurePosition = {
  paragraphIndex: number;
  lineIndex: number;
  characterIndex: number;
  pixelOffsetInLine: number;
};

export type MousePosition = {
  x: number;
  y: number;
};

export class CursorManager {
  // Manages cursor position and movement within the editor
  private _textParser: TextParser;
  private linearPosition: number;
  public structurePosition: StructurePosition = {
    paragraphIndex: -1,
    lineIndex: -1,
    characterIndex: -1,
    pixelOffsetInLine: -1,
  };
  private _editor: Editor;

  public selection: { start: number; end: number } | null = null;

  private measureText: (text: string) => TextMetrics;

  /**
   * Current cursor position represented in terms of paragraph, line, character index, and pixel offset within the line
   * The TextRenderer uses this to draw the cursor at the correct position
   */

  startSelection(mousePosition: MousePosition): void {
    this.selection = null;

    this.mapPixelCoordinateToStructure(mousePosition.x, mousePosition.y, true);
  }

  updateSelection(mousePosition: MousePosition): void {
    const endPointInStructure = this.mapPixelCoordinateToStructure(
      mousePosition.x,
      mousePosition.y,
      false,
    );
    if (endPointInStructure === undefined) {
      return;
    }
    const endPointCursorPos = this.mapStructureToCursorPosition(endPointInStructure);
    this.selection = {
      start: Math.min(this.linearPosition, endPointCursorPos),
      end: Math.max(this.linearPosition, endPointCursorPos),
    };
  }
  endSelection(mousePosition: MousePosition): void {
    const endPointInStructure = this.mapPixelCoordinateToStructure(
      mousePosition.x,
      mousePosition.y,
      false,
    );

    if (endPointInStructure === undefined) {
      return;
    }
    const endPointCursorPos = this.mapStructureToCursorPosition(endPointInStructure);

    // Only set selection if there's an actual range, else clear the selection (because it might have been created in updateSelection)
    if (this.linearPosition != endPointCursorPos) {
      this.selection = {
        start: Math.min(this.linearPosition, endPointCursorPos),
        end: Math.max(this.linearPosition, endPointCursorPos),
      };
    } else {
      this.selection = null;
    }
  }

  constructor(
    initialPosition: number = 0,
    textParser: TextParser,
    ctx: CanvasRenderingContext2D,
    editor: Editor,
  ) {
    this.linearPosition = initialPosition;
    this._textParser = textParser;
    this._editor = editor;
    this.measureText = ctx.measureText.bind(ctx);
    this.mapCursorPositionToStructure();
  }

  public getPosition(): number {
    return this.linearPosition;
  }

  public setCursorPosition(position: number): void {
    position = Math.max(0, Math.min(position, this._editor.getPieceTable().length)); //ugly, find a solution

    this.linearPosition = position;
    this.mapCursorPositionToStructure();

    // Ensure selection is cleared when cursor moves
    this.selection = null;
  }

  public moveLeft(amount: number): void {
    if (this.selection) {
      this.setCursorPosition(this.selection.start);
      this.selection = null;
      return;
    }

    this.setCursorPosition(this.linearPosition - amount);
  }

  public moveRight(amount: number): void {
    if (this.selection) {
      console.log('Collapsing selection to end');
      this.setCursorPosition(this.selection.end);
      this.selection = null;
      return;
    }
    this.setCursorPosition(this.linearPosition + amount);
  }

  public moveUp(): void {
    this.getLineAdjacentCursorPosition(this.linearPosition, 'above', true);
  }
  public moveDown(): void {
    this.getLineAdjacentCursorPosition(this.linearPosition, 'below', true);
  }

  //TODO:
  // - use binary search for better performance,
  // - provide hints not to search the whole range (if left or right, up or down, the cursor is probably in a line adjacent or in the same line, if left it necessarily before, etc....)
  public mapCursorPositionToStructure(): void {
    const cursorPosition = this.linearPosition;
    const paragraphs = this._textParser.getParagraphs();
    let structurePosition: StructurePosition = {
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
        cursorPosition >= paragraph.offset &&
        cursorPosition < paragraph.offset + paragraph.length + 1;

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

      const isOnlyLine = paragraph.lines.length === 1; //XXX: look into this logic
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
    structurePosition.lineIndex = lineIndex;

    // 3. Calculate the offset within the line in pixels
    if (lineIndex !== -1) {
      const cursorOffsetInParagraph = cursorPosition - paragraph.offset;
      const line = paragraph.lines[lineIndex];
      const positionInLine = cursorOffsetInParagraph - line.offset;
      const textBeforeCursor = line.text.substring(0, positionInLine);
      const metrics = this.measureText(textBeforeCursor);
      structurePosition.characterIndex = positionInLine; // Character index within the line
      structurePosition.pixelOffsetInLine = metrics.width; // Offset in pixels within the line
    }
    this.structurePosition = structurePosition;
  }

  public getLineAdjacentCursorPosition(
    cursorPosition: number,
    direction: 'above' | 'below',
    moveCursor: boolean = true,
  ): number {
    const paragraphs = this._textParser.getParagraphs();

    // Get current cursor position mapping
    const { paragraphIndex, lineIndex, pixelOffsetInLine } = this.structurePosition;

    if (paragraphIndex === -1 || lineIndex === -1 || pixelOffsetInLine === -1) {
      console.log(
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
      const newPos = targetParagraph.offset + line.offset;
      if (moveCursor) {
        this.structurePosition = {
          paragraphIndex: targetParagraphIndex,
          lineIndex: targetLine,
          characterIndex: 0,
          pixelOffsetInLine: 0,
        };
        this.linearPosition = newPos;
        this.selection = null;
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
      this.structurePosition = {
        paragraphIndex: targetParagraphIndex,
        lineIndex: targetLine,
        characterIndex: charIndex,
        pixelOffsetInLine: finalPixelOffset,
      };
      this.linearPosition = newPos;
      this.selection = null;
    }
    return newPos;
  }

  public mapPixelCoordinateToStructure(
    x: number,
    y: number,
    moveCursor: boolean = true,
  ): StructurePosition | undefined {
    const lineHeight = 20; // Height of each line
    const leftMargin = this._editor.margins.left; // Left margin for the text
    const adjustedX = x - leftMargin; // Adjust x for left margin
    const lineIndex = Math.floor(y / lineHeight);

    const paragraphs = this._textParser.getParagraphs();

    let accumulatedLines = 0;
    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex];
      if (lineIndex < accumulatedLines + paragraph.lines.length) {
        const lineInParagraph = lineIndex - accumulatedLines;
        const line = paragraph.lines[lineInParagraph];
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
          paragraphIndex: pIndex,
          lineIndex: lineInParagraph,
          characterIndex: charIndex,
          pixelOffsetInLine: currentWidth,
        };

        if (moveCursor) {
          this.structurePosition = proposed;
          this.linearPosition = this.mapStructureToCursorPosition({
            paragraphIndex: pIndex,
            lineIndex: lineInParagraph,
            characterIndex: charIndex,
          });
        }
        return proposed;
      }
      accumulatedLines += paragraph.lines.length;
    }
    return undefined;
  }

  public mapStructureToCursorPosition(
    structurePos: Omit<StructurePosition, 'pixelOffsetInLine'>,
  ): number {
    const paragraphs = this._textParser.getParagraphs();
    const { paragraphIndex, lineIndex, characterIndex } = structurePos;
    const targetParagraph = paragraphs[paragraphIndex];
    if (!targetParagraph) return this.linearPosition; // Invalid paragraph index
    if (lineIndex < 0 || lineIndex >= targetParagraph.lines.length) return this.linearPosition; // Invalid line index
    if (characterIndex < 0 || characterIndex > targetParagraph.lines[lineIndex].length)
      return this.linearPosition; // Invalid character index
    return targetParagraph.offset + targetParagraph.lines[lineIndex].offset + characterIndex;
  }
}
