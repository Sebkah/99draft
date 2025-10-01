import { Editor } from '..';

export type ParagraphStyle = {
  marginLeft: number;
  marginRight: number;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
};

export class ParagraphStylesManager {
  private editor: Editor;

  // Native sparse array: undefined holes for paragraphs with default styles
  // Only defined indices contain custom styles
  styles: (Partial<ParagraphStyle> | undefined)[] = [];

  constructor(editor: Editor, initialStyles?: (Partial<ParagraphStyle> | undefined)[]) {
    this.editor = editor;
    if (initialStyles) {
      // JavaScript spread preserves sparseness naturally
      this.styles = [...initialStyles];
    }
  }

  /**
   * Get styles for a paragraph at the given index.
   * Returns the custom styles if they exist, otherwise returns computed defaults.
   *
   * @param paragraphIndex - Zero-based index of the paragraph
   * @returns Complete style object with either custom or default values
   */
  getParagraphStyles(paragraphIndex: number): ParagraphStyle {
    // Check if we have custom styles stored for this paragraph
    const customStyles = this.styles[paragraphIndex];

    if (customStyles) {
      // Return custom styles, filling in any missing properties with defaults
      return {
        marginLeft: customStyles.marginLeft ?? this.editor.margins.left,
        marginRight: customStyles.marginRight ?? this.editor.margins.right,
        align: customStyles.align ?? 'left',
        lineHeight: customStyles.lineHeight ?? 1.2,
      };
    }

    // No custom styles - return editor defaults
    return {
      marginLeft: this.editor.margins.left,
      marginRight: this.editor.margins.right,
      align: 'left',
      lineHeight: 1.2,
    };
  }

  /**
   * Set custom styles for a paragraph. Pass null to remove custom styles.
   *
   * @param paragraphIndex - Zero-based index of the paragraph
   * @param styles - Custom styles to apply, or null to use defaults
   */
  setParagraphStylesPartial(paragraphIndex: number, styles: Partial<ParagraphStyle> | null) {
    if (styles === null) {
      // Create a true sparse hole by deleting the index
      delete this.styles[paragraphIndex];
    } else {
      // Merge with existing styles, keeping old values if not set again
      const existingStyles = this.styles[paragraphIndex] || {};
      this.styles[paragraphIndex] = { ...existingStyles, ...styles };
    }
  }

  /**
   * Check if a paragraph has custom styles (vs using defaults).
   *
   * @param paragraphIndex - Zero-based index of the paragraph
   * @returns True if paragraph has custom styles
   */
  hasCustomStyles(paragraphIndex: number): boolean {
    return this.styles[paragraphIndex] != null;
  } /**
   * Split a paragraph: insert a new paragraph after the current one with the same styles.
   * This handles the index shifting by inserting into the array.
   *
   * @param paragraphIndex - Index of the paragraph being split
   */
  splitParagraph(paragraphIndex: number) {
    // Get current styles (could be undefined for holes/default styles)
    const currentStyles = this.styles[paragraphIndex];

    // Insert the same styles (or undefined for holes) for the new paragraph
    // This automatically shifts all subsequent indices
    this.styles.splice(paragraphIndex + 1, 0, currentStyles);
  }

  /**
   * Merge paragraphs: handle the index shifting when paragraphs are combined.
   *
   * @param paragraphIndex - Index of the paragraph being merged
   * @param isParagraphEmpty - Whether the current paragraph is empty
   */
  mergeWithNextParagraphStyle(paragraphIndex: number, isParagraphEmpty: boolean) {
    if (isParagraphEmpty) {
      // Remove the empty paragraph's styles - this shifts all subsequent indices down
      console.log('Merging styles for empty paragraph at index', paragraphIndex);
      this.styles.splice(paragraphIndex, 1);
    } else {
      // Remove the next paragraph's styles - merge content stays with current styles
      if (paragraphIndex < this.styles.length - 1) {
        console.log('Merging styles with next paragraph at index', paragraphIndex);
        this.styles.splice(paragraphIndex + 1, 1);
      }
    }
  }
}
