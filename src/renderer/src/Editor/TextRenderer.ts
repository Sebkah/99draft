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
    const styles = this._textParser.getParagraphStyles();
    const position = (pindex?: number) => {
      const right =
        pindex !== undefined && styles[pindex]
          ? styles[pindex].right
          : this._editor.defaultMargins.right;
      return this.ctx.canvas.width - right;
    };

    this.ctx.translate(0, lineHeight);
    paragraphs.forEach((paragraph, pindex) => {
      const style = styles[pindex] || {
        left: this._editor.defaultMargins.left,
        right: this._editor.defaultMargins.right,
      };
      // Highlight hovered paragraph area (always, regardless of debug text toggle)
      if (this._hoveredParagraphIndex === pindex) {
        const left = style.left - 2;
        const width = Math.max(0, this.ctx.canvas.width - style.left - style.right + 4);
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
          position(pindex) + 10,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        this.ctx.fillText(
          ` o ${paragraph.offset}`,
          position(pindex) + 80,
          paragraphMidHeight - lineHeight / 2 + padding,
        );
        this.ctx.fillText(
          ` e ${paragraph.offset + paragraph.length}`,
          position(pindex) + 170,
          paragraphMidHeight - lineHeight / 2 + padding,
        );

        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(
          position(pindex),
          paragraphTop + padding * 2,
          4,
          paragraphHeightWithoutPadding,
        ); // Underline for paragraph info
      }

      paragraph.lines.forEach((line, lindex) => {
        // Highlight hovered line (always)
        if (this._hoveredLine && this._hoveredLine.p === pindex && this._hoveredLine.l === lindex) {
          const left = style.left - 2;
          const width = Math.max(
            0,
            Math.min(this.ctx.canvas.width - style.left - style.right, line.pixelLength + 4),
          );
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
            this.ctx.fillRect(wordOffset + style.left - 1, -lineHeight, 2, lineHeight);
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

            this.ctx.fillText(displayText, wordOffset + style.left - 2, topOrBottom);
          });
        }
        this.ctx.translate(0, lineHeight);
      });
    });

    // Restore the context state (which will restore the base text style)
    this.ctx.restore();
  }

  public render(): void {
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();

    // Set base text style for all text rendering
    this.setBaseTextStyle();

    const paragraphs = this._textParser.getParagraphs();
    const styles = this._textParser.getParagraphStyles();

    paragraphs.forEach((paragraph, pindex) => {
      const style = styles[pindex] || {
        left: this._editor.defaultMargins.left,
        right: this._editor.defaultMargins.right,
      };
      paragraph.lines.forEach((line, lindex) => {
        // Render cursor if it's in the current line
        if (
          this._textParser.cursorPositionInStructure[0] === pindex &&
          this._textParser.cursorPositionInStructure[1] === lindex
        ) {
          if (this._editor.debugConfig.showCursor) {
            this.ctx.fillRect(
              this._textParser.cursorPositionInStructure[3] + style.left,
              0,
              2,
              lineHeight,
            );
          }
        }

        if (this.justifyText) {
          const lineLenghtRest =
            this.ctx.canvas.width - style.left - style.right - line.pixelLength;
          const spaceCount = (line.text.match(/ /g) || []).length;
          const distributeSpace = spaceCount > 0 ? lineLenghtRest / spaceCount : 0;

          if (distributeSpace < 10) {
            this.ctx.wordSpacing = distributeSpace + 'px';
          }
        }

        this.ctx.translate(0, lineHeight);
        this.renderLine(line.text, style.left, 0);
      });
    });

    this.ctx.restore();

    // Always render debug overlay pass (will only show text if enabled)
    this.renderDebugInfo(lineHeight);
  }
}
