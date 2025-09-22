import { Editor } from '@99draft/editor-core';

import Ruler from './Ruler';

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { baseText } from './assets/baseText';
import DebugPanelNew from './DebugPanelNew';

const editorWidth = 800;
const editorHeight = (editorWidth / 21) * 29.7; // A4 aspect ratio

/**
 * Canvas component that implements a text editor using piece table data structure
 * Provides keyboard input handling and visual rendering of text content
 */
const TextEditor = () => {
  // Refs for DOM elements
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  // Layout/rendering state
  const [leftMargin, setLeftMargin] = useState<number>(100);
  const [rightMargin, setRightMargin] = useState<number>(100);
  const [numberOfPages, setNumberOfPages] = useState<number>(1);

  const [editor] = useState<Editor>(
    new Editor(
      baseText,
      { left: leftMargin, right: rightMargin, top: 50 },
      editorWidth,
      editorHeight,
    ),
  );

  /**
   * Update number of pages state to trigger React re-render
   */
  const updatePageCount = () => {
    const newPageCount = editor.numberOfPages;
    setNumberOfPages(newPageCount);
  };

  useEffect(() => {
    console.log('PageCount changed');
  }, [numberOfPages]);

  /**
   * Initialize canvas context and editor
   * Also sets up debug information update interval
   */
  useEffect(() => {
    // Set up page count change callback
    editor.setPageCountChangeCallback((newPageCount) => {
      setNumberOfPages(newPageCount);
    });

    editor.linkCanvases(canvasRefs.current);
    console.log('Initial canvas linking:', canvasRefs.current);
    editor.initialize();
    editor.setMargins(leftMargin, rightMargin);
    updatePageCount(); // Set initial page count

    // Cleanup on unmount
    return () => {
      if (editor) editor.dispose();
    };
  }, []);

  // Add global keydown listener
  useEffect(() => {
    /**
     * Handles keyboard input for text editing and cursor movement
     * @param event - Native keyboard event from window
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editor) return;

      // Forward the native event to the editor's handler
      const consumed = editor.handleKeyDown(event);
      if (consumed) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add PDF export listener
  useEffect(() => {
    /**
     * Handle PDF export request from the main process
     */
    const handlePdfExport = async () => {
      if (!editor) {
        console.error('Editor not available for PDF export');
        return;
      }

      try {
        // Generate HTML content using the editor's PDF export functionality
        const htmlContent = editor.exportToPdf();

        // Use Electron's IPC to convert HTML to PDF
        const result = await window.api.exportPdf(htmlContent);

        if (result.success) {
          console.log('PDF exported successfully to:', result.filePath);
          // Optionally show a success notification
        } else {
          console.error('PDF export failed:', result.message);
          // Optionally show an error notification
        }
      } catch (error) {
        console.error('PDF export error:', error);
      }
    };

    /**
     * Handle DOCX export request from the main process
     */
    const handleDocxExport = async () => {
      if (!editor) {
        console.error('Editor not available for DOCX export');
        return;
      }

      try {
        // Import the docx library dynamically to avoid bundling issues
        const { Packer } = await import('docx');

        // Generate DOCX document using the editor's DOCX export functionality
        const docxDocument = editor.exportToDocx();

        // Convert the document to a blob (browser-compatible)
        const blob = await Packer.toBlob(docxDocument);

        // Convert blob to array buffer, then to buffer for IPC
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Use Electron's IPC to save the DOCX file
        const result = await window.api.exportDocx(buffer);

        if (result.success) {
          console.log('DOCX exported successfully to:', result.filePath);
          // Optionally show a success notification
        } else {
          console.error('DOCX export failed:', result.message);
          // Optionally show an error notification
        }
      } catch (error) {
        console.error('DOCX export error:', error);
      }
    };

    // Listen for export requests from the main process
    const removePdfListener = window.electron.ipcRenderer.on('export-pdf-request', handlePdfExport);
    const removeDocxListener = window.electron.ipcRenderer.on(
      'export-docx-request',
      handleDocxExport,
    );

    return () => {
      if (removePdfListener) {
        removePdfListener();
      }
      if (removeDocxListener) {
        removeDocxListener();
      }
    };
  }, [editor]);

  /**
   * Handles left margin changes from the ruler
   */
  const handleLeftMarginChange = (newLeftMargin: number) => {
    setLeftMargin(newLeftMargin);
    if (!editor) return;
    editor.setMargins(newLeftMargin, rightMargin);
    // Page count will be updated via callback
  };

  /**
   * Handles right margin changes from the ruler
   */
  const handleRightMarginChange = (newRightMargin: number) => {
    setRightMargin(newRightMargin);
    if (!editor) return;
    editor.setMargins(leftMargin, newRightMargin);
    // Page count will be updated via callback
  };

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" grid grid-rows-auto  gap-2 content-start ">
        <Ruler
          width={editorWidth}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          onLeftMarginChange={handleLeftMarginChange}
          onRightMarginChange={handleRightMarginChange}
        />
        <Pages editor={editor} canvasRefs={canvasRefs} numberOfPages={numberOfPages} />
      </div>

      {/* Debug panel positioned at bottom right */}
      {editor && <DebugPanelNew editor={editor} />}
    </>
  );
};

type Pages = {
  editor: Editor | null;
  canvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>;
  numberOfPages: number;
};

const Pages = ({ editor, canvasRefs, numberOfPages }: Pages) => {
  // Re-link canvases whenever the number of pages changes
  useLayoutEffect(() => {
    if (editor && numberOfPages > 0) {
      let retryCount = 0;
      const maxRetries = 50; // Max 500ms of retries

      // Wait for React to create all canvas elements
      const checkCanvases = () => {
        if (!canvasRefs.current) return;

        // Count how many canvases are actually created and not null
        const validCanvases = canvasRefs.current.filter(
          (canvas): canvas is HTMLCanvasElement => canvas !== null,
        );

        console.log(
          'Canvas check:',
          validCanvases.length,
          'canvases available for',
          numberOfPages,
          'pages',
        );

        // Only proceed if we have all canvases we need
        if (validCanvases.length === numberOfPages) {
          editor.relinkCanvases(validCanvases);
          console.log(
            'Re-linked canvases after page count change:',
            validCanvases.length,
            'canvases',
          );
        } else if (retryCount < maxRetries) {
          // Retry after a short delay if not all canvases are ready
          retryCount++;
          setTimeout(checkCanvases, 10);
        } else {
          console.warn(
            'Failed to link all canvases after',
            maxRetries,
            'retries. Expected:',
            numberOfPages,
            'Got:',
            validCanvases.length,
          );
          // Proceed with whatever canvases we have
          if (validCanvases.length > 0) {
            editor.relinkCanvases(validCanvases);
          }
        }
      };

      // Start checking immediately
      checkCanvases();
    }
  }, [numberOfPages, editor]);

  return (
    <>
      {Array.from({ length: numberOfPages }).map((_, index) => (
        <Page key={index} index={index} editor={editor} ref={canvasRefs} />
      ))}
    </>
  );
};

type PageProps = {
  index: number;
  editor: Editor | null;
  ref: React.RefObject<(HTMLCanvasElement | null)[]>;
};

const Page = ({ index, editor, ref }: PageProps) => {
  return (
    <canvas
      ref={(el) => {
        if (!ref.current) ref.current = [];
        ref.current[index] = el;
      }}
      tabIndex={0} // Make canvas focusable for keyboard input
      width={editorWidth}
      height={editorHeight}
      onPointerMove={(e) => {
        if (!editor || !e.buttons) return;
        editor.updateSelection({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, page: index });
      }}
      onPointerDown={(e) => {
        if (!editor) return;
        editor.startSelection({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, page: index });
      }}
      onPointerUp={(e) => {
        if (!editor) return;
        editor.endSelection({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, page: index });
      }}
      className="bg-white pointer-events-auto shadow-lg focus:outline-none "
    />
  );
};

export default TextEditor;
