import { Editor } from './Editor';
import { TextParser } from './TextParser';

export class TextRenderer {
  private ctx: CanvasRenderingContext2D;

  private _textParser: TextParser;
  private _editor: Editor;

  private _showDebugInfo: boolean = true;

  private justifyText: boolean = false;

  private _hoveredParagraphIndex: number | null = null;
  private _hoveredLine: { p: number; l: number } | null = null;

  public setHoveredParagraph(index: number | null): void {
    this._hoveredParagraphIndex = index;
  }

  public setHoveredLine(pindex: number | null, lindex?: number | null): void {
    if (pindex === null || lindex === null || lindex === undefined) {
      this._hoveredLine = null;
      return;
    }
    this._hoveredLine = { p: pindex, l: lindex };
  }

  // Getter and setter for debug info
  public get showDebugInfo(): boolean {
    return this._showDebugInfo;
  }

  public set showDebugInfo(show: boolean) {
    this._showDebugInfo = show;
  }

  constructor(ctx: CanvasRenderingContext2D, textParser: TextParser, editor: Editor) {
    this.ctx = ctx;
    this._textParser = textParser;
    this._editor = editor;

    this.ctx.font = '16px Arial';
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
  private renderDebugInfo(lineHeight: number): void {
    // Save the current context state to avoid interference with main text rendering
    this.ctx.save();

    // Reset any transformations to render debug info in absolute positions
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Set debug text style
    this.ctx.fillStyle = 'blue';
    this.ctx.font = '12px Arial';

    const paragraphs = this._textParser.getParagraphs();
    const position = this.ctx.canvas.width - this._editor.margins.right;

    this.ctx.translate(0, lineHeight);
    paragraphs.forEach((paragraph, pindex) => {
      // Highlight hovered paragraph area (always, regardless of debug text toggle)
      if (this._hoveredParagraphIndex === pindex) {
        const left = this._editor.margins.left - 2;
        const width = this._editor.wrappingWidth + 4;
        const height = paragraph.lines.length * lineHeight;
        const top = -lineHeight;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(left, top, width, height);
        this.ctx.restore();
      }
      // Render paragraph debug info
      if (this._showDebugInfo && this._editor.debugConfig.showParagraphBounds) {
        const padding = 5;

        const paragraphHeight = paragraph.lines.length * lineHeight;
        const paragraphHeightWithoutPadding = paragraphHeight - padding * 2;

        const paragraphMidHeight = paragraphHeightWithoutPadding / 2;

        const paragraphTop = -lineHeight;

        this.ctx.fillStyle = 'blue';
        this.ctx.fillText(
          `P${pindex} - l ${paragraph.length}`,
          position + 10,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        this.ctx.fillText(
          ` o ${paragraph.offset}`,
          position + 80,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        this.ctx.fillText(
          ` e ${paragraph.offset + paragraph.length}`,
          position + 170,
          paragraphMidHeight - lineHeight / 2 + padding,
        );

        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(position, paragraphTop + padding * 2, 4, paragraphHeightWithoutPadding); // Underline for paragraph info
      }

      paragraph.lines.forEach((line, lindex) => {
        // Highlight hovered line (always)
        if (this._hoveredLine && this._hoveredLine.p === pindex && this._hoveredLine.l === lindex) {
          const left = this._editor.margins.left - 2;
          const width = Math.max(0, Math.min(this._editor.wrappingWidth, line.pixelLength + 4));
          const top = -lineHeight + 1;
          const height = lineHeight - 2;
          this.ctx.save();
          this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.95)';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(left, top, width, height);
          this.ctx.restore();
        }
        // Render line debug info
        if (this._showDebugInfo && this._editor.debugConfig.showLineInfo) {
          this.ctx.fillStyle = 'blue';
          this.ctx.fillText(`offset ${line.offset}`, 10, 0);
          this.ctx.fillText(`length ${line.length}`, 80, 0);
        }

        if (this._showDebugInfo && this._editor.debugConfig.showWordOffsets) {
          line.wordpixelOffsets.forEach((wordOffset, windex) => {
            // Render word pixel offsets as small vertical lines
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(
              wordOffset + this._editor.margins.left - 1,
              -lineHeight,
              2,
              lineHeight,
            );
            this.ctx.fillStyle = 'green';
            const topOrBottom =
              windex % 2 === 0 ? lineHeight - lineHeight / 2 + 7 : lineHeight - lineHeight / 2;

            // Display different info based on mode
            let displayText = '';
            switch (this._editor.debugConfig.wordDisplayMode) {
              case 'index':
                displayText = `${windex}`;
                break;
              case 'charOffset':
                displayText = `${line.wordCharOffsets[windex] || 0}`;
                break;
              case 'pixelOffset':
                displayText = `${wordOffset}px`;
                break;
            }

            this.ctx.fillText(displayText, wordOffset + this._editor.margins.left - 2, topOrBottom);
          });
        }
        this.ctx.translate(0, lineHeight);
      });
    });

    // Restore the context state (which will restore the base text style)
    this.ctx.restore();
  }

  public render(): void {
    const leftMargin = this._editor.margins.left; // Left margin for the text
    const structurePosition = this._editor.getStructurePosition();
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();

    this.ctx.translate(0, this._editor.margins.top); // Top margin

    // Set base text style for all text rendering
    this.setBaseTextStyle();

    const paragraphs = this._textParser.getParagraphs();

    // Draw selection highlight if present
    if (this._editor.cursorManager.selection) {
      const sel = this._editor.cursorManager.selection;
      const start = sel.start;
      const end = sel.end;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';

      let yCursor = 0;
      paragraphs.forEach((paragraph) => {
        paragraph.lines.forEach((line) => {
          const lineStart = paragraph.offset + line.offset;
          const lineEnd = lineStart + line.length;

          const overlStart = Math.max(start, lineStart);
          const overlEnd = Math.min(end, lineEnd);

          if (overlStart < overlEnd) {
            const startChar = overlStart - lineStart;
            const endChar = overlEnd - lineStart;

            // measure widths
            const startWidth = this.ctx.measureText(line.text.substring(0, startChar)).width;
            const endWidth = this.ctx.measureText(line.text.substring(0, endChar)).width;
            const rectX = leftMargin + startWidth;
            const rectW = Math.max(1, endWidth - startWidth);
            // yCursor currently at baseline for this line after translate below, so compute pre-translate
            // We'll draw before translating, tracking yCursor manually
            this.ctx.fillRect(rectX, yCursor, rectW, lineHeight);
          }
          yCursor += lineHeight;
        });
      });
      this.ctx.restore();
    }

    paragraphs.forEach((paragraph, pindex) => {
      paragraph.lines.forEach((line, lindex) => {
        // Render cursor if it's in the current line
        if (
          structurePosition.paragraphIndex === pindex &&
          structurePosition.lineIndex === lindex &&
          !this._editor.cursorManager.selection
        ) {
          if (this._editor.debugConfig.showCursor) {
            this.ctx.fillRect(structurePosition.pixelOffsetInLine + leftMargin, 0, 2, lineHeight);
          }
        }

        if (this.justifyText) {
          const lineLenghtRest = this._editor.wrappingWidth - line.pixelLength;
          const spaceCount = (line.text.match(/ /g) || []).length;
          const distributeSpace = spaceCount > 0 ? lineLenghtRest / spaceCount : 0;

          if (distributeSpace < 10) {
            this.ctx.wordSpacing = distributeSpace + 'px';
          }
        }

        this.ctx.translate(0, lineHeight);
        this.renderLine(line.text, leftMargin, 0);
      });
    });

    this.ctx.restore();

    // Always render debug overlay pass (will only show text if enabled)
    this.renderDebugInfo(lineHeight);
  }
}
