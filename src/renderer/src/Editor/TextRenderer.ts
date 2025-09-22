import { Editor } from './Editor';
import { TextParser } from './TextParser';

export class TextRenderer {
  private ctxs: (CanvasRenderingContext2D | null)[] = [];

  private textParser: TextParser;
  private editor: Editor;

  private debugInfoEnabled: boolean = true;

  private justifyText: boolean = false;

  private hoveredParagraphIndex: number | null = null;
  private hoveredLine: { p: number; l: number } | null = null;

  public setHoveredParagraph(index: number | null): void {
    this.hoveredParagraphIndex = index;
  }

  public setHoveredLine(pindex: number | null, lindex?: number | null): void {
    if (pindex === null || lindex === null || lindex === undefined) {
      this.hoveredLine = null;
      return;
    }
    this.hoveredLine = { p: pindex, l: lindex };
  }

  // Getter and setter for debug info
  public get showDebugInfo(): boolean {
    return this.debugInfoEnabled;
  }

  public set showDebugInfo(show: boolean) {
    this.debugInfoEnabled = show;
  }

  constructor(textParser: TextParser, editor: Editor) {
    /*     this.ctxs = ctxs; */
    this.textParser = textParser;
    this.editor = editor;
  }

  // Render a single line of text on the canvas
  private renderLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    ctx.fillText(text, x, y);
  }

  // Set the base text style
  private setBaseTextStyle(ctx: CanvasRenderingContext2D): void {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
  }

  // Render debug information for paragraphs, lines, and cursor position
  private renderDebugInfo(ctx: CanvasRenderingContext2D, lineHeight: number): void {
    // Save the current context state to avoid interference with main text rendering
    ctx.save();

    // Reset any transformations to render debug info in absolute positions
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Set debug text style
    ctx.fillStyle = 'blue';
    ctx.font = '12px Arial';

    const paragraphs = this.textParser.getParagraphs();
    const position = ctx.canvas.width - this.editor.margins.right;

    ctx.translate(0, lineHeight + this.editor.margins.top); // Start below top margin
    paragraphs.forEach((paragraph, pindex) => {
      // Highlight hovered paragraph area (always, regardless of debug text toggle)
      if (this.hoveredParagraphIndex === pindex) {
        const left = this.editor.margins.left - 2;
        const width = this.editor.wrappingWidth + 4;
        const height = paragraph.lines.length * lineHeight;
        const top = -lineHeight;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
      }
      // Render paragraph debug info
      if (this.showDebugInfo && this.editor.debugConfig.showParagraphBounds) {
        const padding = 5;

        const paragraphHeight = paragraph.lines.length * lineHeight;
        const paragraphHeightWithoutPadding = paragraphHeight - padding * 2;

        const paragraphMidHeight = paragraphHeightWithoutPadding / 2;

        const paragraphTop = -lineHeight;

        ctx.fillStyle = 'blue';
        ctx.fillText(
          `P${pindex} - l ${paragraph.length}`,
          position + 10,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        ctx.fillText(
          ` o ${paragraph.offset}`,
          position + 80,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        ctx.fillText(
          ` e ${paragraph.offset + paragraph.length}`,
          position + 170,
          paragraphMidHeight - lineHeight / 2 + padding,
        );

        ctx.fillStyle = 'green';
        ctx.fillRect(position, paragraphTop + padding * 2, 4, paragraphHeightWithoutPadding); // Underline for paragraph info
      }

      paragraph.lines.forEach((line, lindex) => {
        // Highlight hovered line (always)
        if (this.hoveredLine && this.hoveredLine.p === pindex && this.hoveredLine.l === lindex) {
          const left = this.editor.margins.left - 2;
          const width = Math.max(0, Math.min(this.editor.wrappingWidth, line.pixelLength + 4));
          const top = -lineHeight + 1;
          const height = lineHeight - 2;
          ctx.save();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.95)';
          ctx.lineWidth = 2;
          ctx.strokeRect(left, top, width, height);
          ctx.restore();
        }
        // Render line debug info
        if (this.showDebugInfo && this.editor.debugConfig.showLineInfo) {
          ctx.fillStyle = 'blue';
          ctx.fillText(`offset ${line.offset}`, 10, 0);
          ctx.fillText(`length ${line.length}`, 80, 0);
        }

        if (this.showDebugInfo && this.editor.debugConfig.showWordOffsets) {
          line.wordpixelOffsets.forEach((wordOffset, windex) => {
            // Render word pixel offsets as small vertical lines
            ctx.fillStyle = 'red';
            ctx.fillRect(wordOffset + this.editor.margins.left - 1, -lineHeight, 2, lineHeight);
            ctx.fillStyle = 'green';
            const topOrBottom =
              windex % 2 === 0 ? lineHeight - lineHeight / 2 + 7 : lineHeight - lineHeight / 2;

            // Display different info based on mode
            let displayText = '';
            switch (this.editor.debugConfig.wordDisplayMode) {
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

            ctx.fillText(displayText, wordOffset + this.editor.margins.left - 2, topOrBottom);
          });
        }
        ctx.translate(0, lineHeight);
      });
    });

    // Restore the context state (which will restore the base text style)
    ctx.restore();
  }

  public updateContexts(ctxs: CanvasRenderingContext2D[]): void {
    this.ctxs = ctxs;
  }

  public render(pageIndex: number): void {
    const ctx = this.ctxs[pageIndex];
    const pages = this.textParser.getPages();
    console.log(
      'Rendering page',
      pageIndex,
      'of',
      pages.length,
      'total pages. Context available:',
      !!ctx,
    );

    if (!ctx) {
      console.warn(
        `No context available for page ${pageIndex}. Available contexts:`,
        this.ctxs.length,
      );
      return;
    }

    const leftMargin = this.editor.margins.left; // Left margin for the text
    const structurePosition = this.editor.cursorManager.structurePosition;
    const lineHeight = 20; // Height of each line
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();

    ctx.translate(0, this.editor.margins.top); // Top margin

    // Set base text style for all text rendering
    this.setBaseTextStyle(ctx);

    const page = pages[pageIndex];
    if (!page) {
      console.warn(`No page data available for page ${pageIndex}`);
      return;
    }

    console.log(`Page ${pageIndex} data:`, {
      startParagraphIndex: page.startParagraphIndex,
      endParagraphIndex: page.endParagraphIndex,
      startLineIndex: page.startLineIndex,
      endLineIndex: page.endLineIndex,
    });

    const paragraphs = this.textParser
      .getParagraphs()
      .slice(page.startParagraphIndex, page.endParagraphIndex + 1);

    const startLineIndex = page.startLineIndex;
    const endLineIndex = page.endLineIndex;

    // Draw selection highlight if present
    if (this.editor.selectionManager.hasSelection()) {
      const sel = this.editor.selectionManager.getSelection()!;
      const start = sel.start;
      const end = sel.end;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';

      let yCursor = 0;
      paragraphs.forEach((paragraph) => {
        paragraph.lines.forEach((line, index) => {
          // Only consider lines within the page's line range
          if (
            (paragraph === paragraphs[0] && index < startLineIndex) ||
            (paragraph === paragraphs[paragraphs.length - 1] && index > endLineIndex)
          ) {
            return;
          }
          const lineStart = paragraph.offset + line.offset;
          const lineEnd = lineStart + line.length;

          const overlStart = Math.max(start, lineStart);
          const overlEnd = Math.min(end, lineEnd);

          if (overlStart < overlEnd) {
            const startChar = overlStart - lineStart;
            const endChar = overlEnd - lineStart;

            // measure widths
            const startWidth = ctx.measureText(line.text.substring(0, startChar)).width;
            const endWidth = ctx.measureText(line.text.substring(0, endChar)).width;
            const rectX = leftMargin + startWidth;
            const rectW = Math.max(1, endWidth - startWidth);
            // yCursor currently at baseline for this line after translate below, so compute pre-translate
            // We'll draw before translating, tracking yCursor manually
            ctx.fillRect(rectX, yCursor, rectW, lineHeight);
          }
          yCursor += lineHeight;
        });
      });
      ctx.restore();
    }

    paragraphs.forEach((paragraph, pindex) => {
      paragraph.lines.forEach((line, lindex) => {
        // Only render lines within the page's line range
        if (
          (paragraph === paragraphs[0] && lindex < startLineIndex) ||
          (paragraph === paragraphs[paragraphs.length - 1] && lindex > endLineIndex)
        ) {
          return;
        }

        // Render cursor if it's in the current line
        if (
          structurePosition.paragraphIndex === pindex &&
          structurePosition.lineIndex === lindex &&
          !this.editor.selectionManager.hasSelection()
        ) {
          if (this.editor.debugConfig.showCursor) {
            ctx.fillRect(structurePosition.pixelOffsetInLine + leftMargin, 0, 2, lineHeight);
          }
        }

        if (this.justifyText) {
          const lineLenghtRest = this.editor.wrappingWidth - line.pixelLength;
          const spaceCount = (line.text.match(/ /g) || []).length;
          const distributeSpace = spaceCount > 0 ? lineLenghtRest / spaceCount : 0;

          if (distributeSpace < 10) {
            ctx.wordSpacing = distributeSpace + 'px';
          }
        }

        ctx.translate(0, lineHeight);
        this.renderLine(ctx, line.text, leftMargin, 0);
      });
    });

    ctx.restore();

    // Always render debug overlay pass (will only show text if enabled)
    this.renderDebugInfo(ctx, lineHeight);
  }
}
