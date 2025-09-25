import { Editor } from "..";
import { TextParser } from "../TextParser";

/**
 * PDFRenderer handles the generation of HTML content for PDF export.
 * Works similarly to TextRenderer but generates HTML instead of canvas rendering.
 * This class mirrors the TextRenderer's line-by-line rendering approach to ensure
 * the PDF output matches exactly what's displayed on screen.
 */
export class PDFRenderer {
  private textParser: TextParser;
  private editor: Editor;

  constructor(textParser: TextParser, editor: Editor) {
    this.textParser = textParser;
    this.editor = editor;
  }

  /**
   * Generate HTML content for PDF export
   * Creates a printable HTML representation that matches the TextRenderer output
   * This HTML can then be converted to PDF by the application layer
   */
  public generateHtmlForPdf(): string {
    const pages = this.textParser.getPages();
    const allParagraphs = this.textParser.getParagraphs();

    // Generate CSS for styling that matches the editor's appearance
    const css = this.generateCSS();

    // Generate HTML content for each page
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Document Export</title>
        ${css}
      </head>
      <body>
    `;

    // Process each page exactly like TextRenderer does
    pages.forEach((page, pageIndex) => {
      htmlContent += `<div class="page" data-page="${pageIndex + 1}">`;

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

          // Render the line content
          const lineContent = this.renderLineForHtml(line.text);
          htmlContent += `<div class="line">${lineContent}</div>`;
        });
      }

      htmlContent += `</div>`;
    });

    htmlContent += `
      </body>
      </html>
    `;

    return htmlContent;
  }

  /**
   * Generate CSS styles that match the TextRenderer's appearance exactly
   */
  private generateCSS(): string {
    const lineHeight = 20; // Same as TextRenderer

    return `
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: 16px;
          line-height: ${lineHeight}px;
          color: #000;
          background: white;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          padding: ${this.editor.margins.top}px ${this.editor.margins.right}px ${this.editor.margins.bottom}px ${this.editor.margins.left}px;
          box-sizing: border-box;
          page-break-after: always;
          background: white;
          position: relative;
          overflow: hidden;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        .line {
          height: ${lineHeight}px;
          line-height: ${lineHeight}px;
          margin: 0;
          padding: 0;
          white-space: pre;
          font-family: Arial, sans-serif;
          font-size: 16px;
          color: black;
        }
        
        /* Ensure no extra spacing between lines */
        .line:first-child {
          margin-top: 0;
        }
        
        .line:last-child {
          margin-bottom: 0;
        }
      </style>
    `;
  }

  /**
   * Render a single line for HTML export, matching TextRenderer's approach
   */
  private renderLineForHtml(lineText: string): string {
    // Escape HTML characters but preserve spaces and structure
    return lineText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    // Note: We don't replace spaces or newlines here since we're handling line-by-line
  }
}
