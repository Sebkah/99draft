import { Document, Paragraph, TextRun, AlignmentType } from 'docx';
import { Editor } from '..';
import { TextParser } from '../core/TextParser';

/**
 * DOCXRenderer handles the generation of DOCX content for Word document export.
 * Works similarly to TextRenderer and PDFRenderer but generates DOCX content instead.
 * This class mirrors the TextRenderer's line-by-line rendering approach to ensure
 * the DOCX output matches exactly what's displayed on screen.
 */
export class DOCXRenderer {
  private textParser: TextParser;
  private editor: Editor;

  constructor(textParser: TextParser, editor: Editor) {
    this.textParser = textParser;
    this.editor = editor;
  }

  /**
   * Generate DOCX document for export
   * Creates a Word document that matches the TextRenderer output
   * Returns a Document object that can be saved by the application layer
   */
  public generateDocxDocument(): Document {
    const pages = this.textParser.getPages();
    const allParagraphs = this.textParser.getParagraphs();

    const documentParagraphs: Paragraph[] = [];

    // Process each page exactly like TextRenderer does
    pages.forEach((page, pageIndex) => {
      // Add page break for pages after the first one
      if (pageIndex > 0) {
        documentParagraphs.push(
          new Paragraph({
            pageBreakBefore: true,
            children: [],
          }),
        );
      }

      // Render lines exactly as TextRenderer does
      for (let i = page.startParagraphIndex; i <= page.endParagraphIndex; i++) {
        const paragraph = allParagraphs[i];

        // Safety check: Skip if paragraph is undefined
        if (!paragraph || !paragraph.lines) {
          console.warn(`Paragraph at index ${i} is undefined or has no lines. Skipping rendering.`);
          continue;
        }

        paragraph.lines.forEach((line, lindex) => {
          // Only render lines within the page's line range (same logic as TextRenderer)
          if (
            (i === page.startParagraphIndex && lindex < page.startLineIndex) ||
            (i === page.endParagraphIndex && lindex > page.endLineIndex)
          ) {
            return;
          }

          // Create a DOCX paragraph for each line
          const docxParagraph = this.createDocxParagraphFromLine(line.text);
          documentParagraphs.push(docxParagraph);
        });
      }
    });

    // Create the document with proper margins and formatting
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: this.convertPixelsToTwips(this.editor.margins.top),
                right: this.convertPixelsToTwips(this.editor.margins.right),
                bottom: this.convertPixelsToTwips(this.editor.margins.bottom),
                left: this.convertPixelsToTwips(this.editor.margins.left),
              },
            },
          },
          children: documentParagraphs,
        },
      ],
    });

    return doc;
  }

  /**
   * Create a DOCX paragraph from a single line of text, matching TextRenderer formatting
   */
  private createDocxParagraphFromLine(lineText: string): Paragraph {
    // Handle empty lines
    if (!lineText || lineText.trim() === '') {
      return new Paragraph({
        children: [new TextRun('')],
        spacing: {
          after: 0,
          before: 0,
          line: 240, // 20px line height converted to twips (20 * 12 = 240 twips)
        },
      });
    }

    return new Paragraph({
      children: [
        new TextRun({
          text: lineText,
          font: 'Arial',
          size: 32, // 16px font size in half-points (16 * 2 = 32)
        }),
      ],
      spacing: {
        after: 0,
        before: 0,
        line: 240, // 20px line height converted to twips
      },
      alignment: AlignmentType.LEFT,
    });
  }

  /**
   * Convert pixels to twips (twentieth of a point) for Word document measurements
   * 1 pixel ≈ 12 twips at 96 DPI
   */
  private convertPixelsToTwips(pixels: number): number {
    return Math.round(pixels * 12);
  }

  /**
   * Generate a simplified text-only DOCX version
   * Useful for basic exports without complex formatting
   */
  public generateSimpleDocxDocument(): Document {
    const fullText = this.textParser.getFullText();

    // Split text into paragraphs and create DOCX paragraphs
    const textLines = fullText.split('\n');
    const documentParagraphs = textLines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Arial',
              size: 24, // 12pt font
            }),
          ],
          spacing: {
            after: 120, // Small spacing between paragraphs
          },
        }),
    );

    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: documentParagraphs,
        },
      ],
    });
  }
}
