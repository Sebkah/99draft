import { Editor } from '@renderer/Editor/Editor';

import Ruler from './Ruler';

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { baseText } from '@renderer/assets/baseText';

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
    console.log('Updating page count from', numberOfPages, 'to', newPageCount);
    setNumberOfPages(newPageCount);
  };

  /**
   * Initialize canvas context and editor
   * Also sets up debug information update interval
   */
  useEffect(() => {
    // Set up page count change callback
    editor.setPageCountChangeCallback((newPageCount) => {
      console.log('Page count changed via callback:', newPageCount);
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
      const handled = editor.handleKeyDown(event);
      if (handled) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/*  {editor && <DebugPanelNew editor={editor} />} */}
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
