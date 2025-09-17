import { Line } from './TextParser';

/**
 * Represents a paragraph of text with associated metadata and methods for manipulation.
 */
export class Paragraph {
  private _text: string;
  private _offset: number;
  private _length: number;
  private _lines: Line[] = [];

  constructor(text: string, offset: number) {
    this._text = text;
    this._offset = offset;
    this._length = text.length;
  }

  // Getters
  get text(): string {
    return this._text;
  }

  get offset(): number {
    return this._offset;
  }

  get length(): number {
    return this._length;
  }

  get lines(): Line[] {
    return this._lines;
  }

  // Utility methods
  public updateText(newText: string): void {
    this._text = newText;
    this._length = newText.length;
  }

  public updateLength(delta: number): void {
    this._length += delta;
  }

  public shiftOffset(delta: number): void {
    this._offset += delta;
  }

  public setLines(lines: Line[]): void {
    this._lines = lines;
  }

  public appendText(text: string): void {
    this._text += text;
    this._length = this._text.length;
  }

  public isEmpty(): boolean {
    return this._length === 0;
  }

  public getEndOffset(): number {
    return this._offset + this._length;
  }

  public containsPosition(position: number): boolean {
    return position >= this._offset && position < this.getEndOffset() + 1;
  }
}
