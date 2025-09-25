import { TextParser } from '../TextParser';

export type ParagraphStyle = {
  marginLeft?: number;
  marginRight?: number;
  lineHeight?: number;
};

export class ParagraphStylesManager {
  private textParser: TextParser;
  private styles: ParagraphStyle[] = [
    {
      marginLeft: 0,
      marginRight: 0,

      lineHeight: 1.2,
    },
    {
      marginLeft: 20,
      marginRight: 200,
      lineHeight: 1.5,
    },
    {
      marginLeft: 20,
      marginRight: 300,
      lineHeight: 1.5,
    },
  ];

  constructor($textParser: TextParser, $styles?: ParagraphStyle[]) {
    this.textParser = $textParser;
    if ($styles) this.styles = $styles;
  }

  getParagraphStyles(paragraphIndex: number): ParagraphStyle {
    return this.styles[paragraphIndex] || [];
  }

  setParagraphStyles(paragraphIndex: number, styles: ParagraphStyle) {
    this.styles[paragraphIndex] = styles;
  }

  splitParagraph(paragraphIndex: number) {
    const currentStyles = this.getParagraphStyles(paragraphIndex);
    this.styles.splice(paragraphIndex + 1, 0, { ...currentStyles });
  }
  mergeParagraphs(paragraphIndex: number) {
    // If the text of the paragraph before is empty (just a newline)
    if (this.textParser.getParagraph(paragraphIndex - 1)?.text.trim() === '') {
      // Remove the styles of the empty paragraph
      this.styles.splice(paragraphIndex - 1, 1);
      return;
    }

    if (paragraphIndex < this.styles.length - 1) {
      this.styles.splice(paragraphIndex + 1, 1);
    }
  }
}
