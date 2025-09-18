import { Editor } from './Editor';
import { TextParser } from './TextParser';

export class TextRenderer {
  private ctx: CanvasRenderingContext2D;

  private _textParser: TextParser;
  private _editor: Editor;

  private _showDebugInfo: boolean = true;

  private justifyText: boolean = false;

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
    if (!this._showDebugInfo) return;

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
      // Render paragraph debug info

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

      paragraph.lines.forEach((line) => {
        // Render line debug info
        this.ctx.fillText(`offset ${line.offset}`, 10, 0);
        this.ctx.fillText(`length ${line.length}`, 80, 0);

        this.ctx.translate(0, lineHeight);
      });
    });

    // Restore the context state (which will restore the base text style)
    this.ctx.restore();
  }

  public render(): void {
    const leftMargin = this._editor.margins.left; // Left margin for the text
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();

    // Set base text style for all text rendering
    this.setBaseTextStyle();

    const paragraphs = this._textParser.getParagraphs();

    paragraphs.forEach((paragraph, pindex) => {
      paragraph.lines.forEach((line, lindex) => {
        // Render cursor if it's in the current line
        if (
          this._textParser.cursorPositionInStructure[0] === pindex &&
          this._textParser.cursorPositionInStructure[1] === lindex
        ) {
          this.ctx.fillRect(
            this._textParser.cursorPositionInStructure[3] + leftMargin,
            0,
            2, // Cursor width
            lineHeight,
          );
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

    // Render debug information if enabled
    this.renderDebugInfo(lineHeight);
  }
}
