import { Editor } from '../core/Editor';
import { TextParser } from '../core/TextParser';

export class TextRenderer {
  private ctxs: (CanvasRenderingContext2D | null)[] = [];

  private textParser: TextParser;
  private editor: Editor;

  private debugInfoEnabled: boolean = true;

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

  // Render cursor for the current line if conditions are met
  private renderCursor(
    ctx: CanvasRenderingContext2D,
    pageIndex: number,
    absoluteParagraphIndex: number,
    lindex: number,
    leftMargin: number,
    lineHeight: number,
  ): void {
    const structurePosition = this.editor.cursorManager.structurePosition;

    // Render cursor if it's in the current line and on the current page
    if (
      structurePosition.pageIndex === pageIndex &&
      structurePosition.paragraphIndex === absoluteParagraphIndex &&
      structurePosition.lineIndex === lindex &&
      !this.editor.selectionManager.hasSelection()
    ) {
      if (this.editor.debugConfig.showCursor) {
        ctx.fillRect(structurePosition.pixelOffsetInLine + leftMargin, 0, 2, lineHeight);
      }
    }
  }

  // Render selection highlight for a single line if present
  private renderLineSelection(
    ctx: CanvasRenderingContext2D,
    paragraph: any,
    line: any,
    adjustedLeftMargin: number,
    lineHeight: number,
  ): void {
    if (!this.editor.selectionManager.hasSelection()) {
      return;
    }

    const sel = this.editor.selectionManager.getSelection()!;
    const start = sel.start;
    const end = sel.end;

    const lineStart = paragraph.offset + line.offset;
    const lineEnd = lineStart + line.length;

    const overlStart = Math.max(start, lineStart);
    const overlEnd = Math.min(end, lineEnd);

    if (overlStart < overlEnd) {
      const startChar = overlStart - lineStart;
      const endChar = overlEnd - lineStart;

      // Measure widths using the current context (which may have word spacing applied)
      const startWidth = ctx.measureText(line.text.substring(0, startChar)).width;
      const endWidth = ctx.measureText(line.text.substring(0, endChar)).width;

      const rectX = adjustedLeftMargin + startWidth;
      const rectW = Math.max(1, endWidth - startWidth);

      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      // Draw selection rectangle at current transform position
      ctx.fillRect(rectX, 0, rectW, lineHeight);
      ctx.restore();
    }
  }

  // Render debug information for paragraphs, lines, and cursor position
  private renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    lineHeight: number,
    pageIndex: number,
  ): void {
    // Save the current context state to avoid interference with main text rendering
    ctx.save();

    // Reset any transformations to render debug info in absolute positions
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Set debug text style
    ctx.fillStyle = 'blue';
    ctx.font = '12px Arial';

    const page = this.textParser.getPages()[pageIndex];
    const paragraphs = this.textParser.getParagraphs();

    // Start at the top margin like the main render method
    ctx.translate(0, this.editor.margins.top);

    // Only iterate through paragraphs that are actually on this page
    for (let pindex = page.startParagraphIndex; pindex <= page.endParagraphIndex; pindex++) {
      const paragraph = paragraphs[pindex];
      if (!paragraph) continue;

      // Get paragraph styles to use correct margins
      const styles = this.editor.paragraphStylesManager.getParagraphStyles(pindex);
      const { marginLeft, marginRight } = styles;

      // Calculate debug info position using the right margin
      const debugInfoPosition = ctx.canvas.width - marginRight;

      // Determine which lines of this paragraph are on this page
      const startLineIndex = pindex === page.startParagraphIndex ? page.startLineIndex : 0;
      const endLineIndex =
        pindex === page.endParagraphIndex ? page.endLineIndex : paragraph.lines.length - 1;

      // Calculate how many lines this paragraph contributes to this page
      const linesOnThisPage = endLineIndex - startLineIndex + 1;
      const paragraphHeightOnPage = linesOnThisPage * lineHeight;

      // Highlight hovered paragraph area (always, regardless of debug text toggle)
      if (this.hoveredParagraphIndex === pindex) {
        const left = marginLeft - 2;
        const width = this.editor.wrappingWidth + 4;
        const height = paragraphHeightOnPage;
        const top = 0;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
      }

      // Render paragraph debug info
      if (this.showDebugInfo && this.editor.debugConfig.showParagraphBounds) {
        const padding = 5;
        const paragraphHeightWithoutPadding = paragraphHeightOnPage - padding * 2;
        const paragraphMidHeight = paragraphHeightWithoutPadding / 2;

        ctx.fillStyle = 'blue';
        ctx.fillText(
          `P${pindex} - L ${paragraph.length}`,
          debugInfoPosition + 10,
          paragraphMidHeight + lineHeight / 2 + padding,
        );
        ctx.fillText(
          ` O ${paragraph.offset}`,
          debugInfoPosition + 80,
          paragraphMidHeight + lineHeight / 2 + padding,
        );
        ctx.fillText(
          ` E ${paragraph.offset + paragraph.length}`,
          debugInfoPosition + 170,
          paragraphMidHeight + lineHeight / 2 + padding,
        );

        ctx.fillStyle = 'green';
        ctx.fillRect(debugInfoPosition, padding * 2, 4, paragraphHeightWithoutPadding);
      }

      // Iterate through lines that are actually on this page
      for (let lindex = startLineIndex; lindex <= endLineIndex; lindex++) {
        const line = paragraph.lines[lindex];
        if (!line) continue;

        // Use translate for Y positioning like main render method
        ctx.translate(0, lineHeight);

        // Highlight hovered line (always)
        if (this.hoveredLine && this.hoveredLine.p === pindex && this.hoveredLine.l === lindex) {
          const left = marginLeft - 2;
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
          ctx.fillText(`offset ${line.offsetInParagraph}`, 10, 0);
          ctx.fillText(`length ${line.length}`, 80, 0);
        }
      }
    }

    // Restore the context state (which will restore the base text style)
    ctx.restore();
  }

  public updateContexts(ctxs: CanvasRenderingContext2D[]): void {
    this.ctxs = ctxs;
  }

  public render(pageIndex: number): void {
    const ctx = this.ctxs[pageIndex];
    const pages = this.textParser.getPages();

    if (!ctx) {
      this.editor.logger.warn(
        'rendering',
        `No context available for page ${pageIndex}. Available contexts:`,
        this.ctxs.length,
      );
      return;
    }

    const lineHeight = 20; // Height of each line
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();

    ctx.translate(0, this.editor.margins.top); // Top margin

    // Set base text style for all text rendering
    this.setBaseTextStyle(ctx);

    const page = pages[pageIndex];
    if (!page) {
      this.editor.logger.warn('rendering', `No page data available for page ${pageIndex}`);
      return;
    }

    this.editor.logger.rendering(`Page ${pageIndex} data:`, {
      startParagraphIndex: page.startParagraphIndex,
      endParagraphIndex: page.endParagraphIndex,
      startLineIndex: page.startLineIndex,
      endLineIndex: page.endLineIndex,
    });

    const allParagraphs = this.textParser.getParagraphs();
    const startLineIndex = page.startLineIndex;
    const endLineIndex = page.endLineIndex;

    for (let i = page.startParagraphIndex; i <= page.endParagraphIndex; i++) {
      const paragraph = allParagraphs[i];
      const styles = this.editor.paragraphStylesManager.getParagraphStyles(i);

      const { align, marginLeft, marginRight } = styles;

      const wrappingWidth = this.editor.internalCanvas.width - marginLeft - marginRight;

      paragraph.lines.forEach((line, lindex) => {
        // Only render lines within the page's line range
        if (
          (i === page.startParagraphIndex && lindex < startLineIndex) ||
          (i === page.endParagraphIndex && lindex > endLineIndex)
        ) {
          return;
        }

        // Calculate alignment adjustments once
        const lineLengthRest = wrappingWidth - line.pixelLength;
        let adjustedLeftMargin = marginLeft;
        let textToRender = line.text;
        let shouldApplyWordSpacing = false;
        let distributeSpace = 0;

        if (align === 'justify') {
          textToRender = line.text.trim();
          const lineLengthRestWithoutSpaces = wrappingWidth - ctx.measureText(textToRender).width;
          const spaceCount = (textToRender.match(/ /g) || []).length;
          distributeSpace = spaceCount > 0 ? lineLengthRestWithoutSpaces / spaceCount : 0;
          shouldApplyWordSpacing = distributeSpace < 10000;
        } else if (align === 'center') {
          adjustedLeftMargin = marginLeft + lineLengthRest / 2;
        } else if (align === 'right') {
          adjustedLeftMargin = marginLeft + lineLengthRest;
        }

        // Apply word spacing if needed for justify alignment
        if (shouldApplyWordSpacing) {
          ctx.wordSpacing = distributeSpace + 'px';
        }

        // Render selection highlight for this line (uses adjusted margin)
        this.renderLineSelection(ctx, paragraph, line, adjustedLeftMargin, lineHeight);

        // Render cursor if it's in the current line and on the current page
        this.renderCursor(ctx, pageIndex, i, lindex, marginLeft, lineHeight);

        // Render the text
        ctx.translate(0, lineHeight);
        this.renderLine(ctx, textToRender, adjustedLeftMargin, 0);
        ctx.wordSpacing = '0px'; // Reset word spacing

        if (align === 'justify') {
          return;
        }

        // Default case (left alignment) is already handled above
      });
    }

    ctx.restore();

    // Always render debug overlay pass (will only show text if enabled)
    this.renderDebugInfo(ctx, lineHeight, pageIndex);
  }
}
