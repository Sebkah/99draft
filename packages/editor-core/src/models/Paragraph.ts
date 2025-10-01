import { Line } from '../core/TextParser';

/**
 * Represents a paragraph of text with associated metadata and methods for manipulation.
 */
export class Paragraph {
  private paragraphText: string;
  private paragraphOffset: number;
  private paragraphLength: number;
  private paragraphLines: Line[] = [];

  constructor(text: string, offset: number, length?: number) {
    this.paragraphText = text;
    this.paragraphOffset = offset;
    if (length) {
      this.paragraphLength = length;
    } else {
      this.paragraphLength = text.length;
    }
  }

  // Getters
  get text(): string {
    return this.paragraphText;
  }

  get offset(): number {
    return this.paragraphOffset;
  }

  get length(): number {
    return this.paragraphLength;
  }

  get lines(): Line[] {
    return this.paragraphLines;
  }

  // Utility methods
  public updateText(newText: string): void {
    this.paragraphText = newText;
  }

  public adjustLength(delta: number): void {
    this.paragraphLength += delta;
  }

  public setLength(newLength: number): void {
    this.paragraphLength = newLength;
  }

  public shiftOffset(delta: number): void {
    this.paragraphOffset += delta;
  }

  public setLines(lines: Line[]): void {
    this.paragraphLines = lines;
  }

  public appendText(text: string): void {
    this.paragraphText += text;
    this.paragraphLength = this.paragraphText.length;
  }

  public isEmpty(): boolean {
    return this.paragraphLength === 0;
  }

  public getEndOffset(): number {
    return this.paragraphOffset + this.paragraphLength;
  }

  public containsPosition(position: number): boolean {
    return position >= this.paragraphOffset && position < this.getEndOffset() + 1;
  }
}
