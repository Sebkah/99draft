import { Editor } from '..';
import { TextParser } from '../TextParser';

export type ParagraphStyle = {
  marginLeft?: number;
  marginRight?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
};

export class ParagraphStylesManager {
  private editor: Editor;
  private styles: ParagraphStyle[] = [
    /*  {
      marginLeft: 0,
      marginRight: 40,
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
    }, */
  ];

  constructor(editor: Editor, $styles?: ParagraphStyle[]) {
    this.editor = editor;
    if ($styles) this.styles = $styles;
  }

  getParagraphStyles(paragraphIndex: number): ParagraphStyle {
    return (
      this.styles[paragraphIndex] || {
        marginLeft: this.editor.margins.left,
        marginRight: this.editor.margins.right,
        lineHeight: 20,
      }
    );
  }

  setParagraphStyles(paragraphIndex: number, styles: ParagraphStyle) {
    this.styles[paragraphIndex] = styles;
  }

  splitParagraph(paragraphIndex: number) {
    const currentStyles = this.getParagraphStyles(paragraphIndex);
    this.styles.splice(paragraphIndex + 1, 0, { ...currentStyles });
  }
  /**
   * Merge paragraph styles by removing the next paragraph's style or the current empty one.
   */
  mergeWithNextParagraphStyle(paragraphIndex: number, _textParser: TextParser) {
    // If the text of the paragraph is empty (just a newline)
    if (_textParser.getParagraph(paragraphIndex)?.text === '') {
      // Remove the styles of the empty paragraph
      this.styles.splice(paragraphIndex, 1);
      return;
    }

    if (paragraphIndex < this.styles.length - 1) {
      this.styles.splice(paragraphIndex + 1, 1);
    }
  }
}
