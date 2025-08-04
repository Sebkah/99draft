import { PieceTable } from './PieceTable/PieceTable';
import { TextParser } from './TextParser';

export class TextRenderer {
  private ctx: CanvasRenderingContext2D;

  private _textParser: TextParser;

  private _leftMargin: number = 100;
  private _rightMargin: number = 100;

  private _showDebugInfo: boolean = true;

  // Getter for wrapping width
  private get wrappingWidth(): number {
    return this.ctx.canvas.width - this._leftMargin - this._rightMargin;
  }

  // Getters and setters for margins
  public get leftMargin(): number {
    return this._leftMargin;
  }

  public set leftMargin(margin: number) {
    this._leftMargin = margin;
  }

  public get rightMargin(): number {
    return this._rightMargin;
  }

  public set rightMargin(margin: number) {
    this._rightMargin = margin;
  }

  // Getter and setter for debug info
  public get showDebugInfo(): boolean {
    return this._showDebugInfo;
  }

  public set showDebugInfo(show: boolean) {
    this._showDebugInfo = show;
  }

  private _renderedCursorPosition: [number, number, number] = [-1, -1, -1]; // [paragraphIndex, lineIndex, offsetInLineInPixels]

  constructor(ctx: CanvasRenderingContext2D, pieceTable: PieceTable) {
    this.ctx = ctx;
    this._textParser = new TextParser(pieceTable, ctx);

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
  private renderDebugInfo(cursorPosition: number, lineHeight: number): void {
    if (!this._showDebugInfo) return;

    // Save the current context state to avoid interference with main text rendering
    this.ctx.save();

    // Reset any transformations to render debug info in absolute positions
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Set debug text style
    this.ctx.fillStyle = 'blue';
    this.ctx.font = '12px Arial';

    const paragraphs = this._textParser.getParagraphs();

    this.ctx.translate(0, lineHeight);
    paragraphs.forEach((paragraph, pindex) => {
      // Render paragraph debug info
      this.ctx.fillText(
        `Paragraph ${pindex} - offset ${paragraph.offset} - length ${paragraph.length}`,
        800,
        0,
      );

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

  public render(cursorPosition: number): void {
    const leftMargin = this.leftMargin; // Left margin for the text
    const lineHeight = 20; // Height of each line
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // Parse text only if needed (when text changes or width changes)
    const didReparse = this._textParser.parseIfNeeded(this.wrappingWidth);
    if (didReparse) {
      console.log('Text was reparsed');
    }

    console.log('Rendering text at cursor position:', cursorPosition, this._renderedCursorPosition);

    // Map cursor position (this happens on every render, even if text wasn't reparsed)
    this._renderedCursorPosition = this._textParser.mapCursorPosition(cursorPosition, this.ctx);

    this.ctx.save();

    // Set base text style for all text rendering
    this.setBaseTextStyle();

    const paragraphs = this._textParser.getParagraphs();
    paragraphs.forEach((paragraph, pindex) => {
      paragraph.lines.forEach((line, lindex) => {
        if (
          this._renderedCursorPosition[0] === pindex &&
          this._renderedCursorPosition[1] === lindex
        ) {
          this.ctx.fillRect(
            this._renderedCursorPosition[2] + leftMargin,
            0,
            2, // Cursor width
            lineHeight,
          );
        }

        this.ctx.translate(0, lineHeight);
        this.renderLine(line.text, leftMargin, 0);
      });
    });

    this.ctx.restore();
    // Render debug information if enabled
    this.renderDebugInfo(cursorPosition, lineHeight);
  }
}
