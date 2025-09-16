import { Editor, PieceDebug } from '@renderer/Editor/Editor';
import DebugPanel from './DebugPanel';
import Ruler from './Ruler';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Canvas component that implements a text editor using piece table data structure
 * Provides keyboard input handling and visual rendering of text content
 */
const Canvas = () => {
  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize editor with sample text
  const [editor] = useState(() => {
    return new Editor(
      'Hello\n world!\n This is a piece   table example.\nYou can insert and delete text efficiently using this structure.\n Piece tables are great for text editors and similar applications. END OF ORIGINAL TEXT. You can insert and delete text efficiently using this structure. Piece tables are great for text editors and similar applications. END OF ORIGINAL TEXT.',
    );
  });

  // Layout/rendering state
  const [leftMargin, setLeftMargin] = useState<number>(50);
  const [rightMargin, setRightMargin] = useState<number>(750);

  // Debug state
  const [piecesForDebug, setPieces] = useState<PieceDebug[]>([]);

  /**
   * Initialize canvas context and editor
   * Also sets up debug information update interval
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize editor with canvas context
    editor.initialize(ctx);

    // Set initial margins
    editor.setMargins(leftMargin, rightMargin);

    // Focus the canvas for keyboard input
    canvas.focus();

    // Start debug information updates
    editor.startDebugUpdates(setPieces);


  }, [editor, leftMargin, rightMargin]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      editor.dispose();
    };
  }, [editor]);

  /**
   * Handles keyboard input for text editing and cursor movement
   * @param event - React keyboard event from canvas element
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const handled = editor.handleKeyDown(event.nativeEvent);
    if (handled) {
      event.preventDefault();
    }
  };

  /**
   * Handles left margin changes from the ruler
   */
  const handleLeftMarginChange = (newLeftMargin: number) => {
    setLeftMargin(newLeftMargin);
    editor.setMargins(newLeftMargin, rightMargin);
  };

  /**
   * Handles right margin changes from the ruler
   */
  const handleRightMarginChange = (newRightMargin: number) => {
    setRightMargin(newRightMargin);
    editor.setMargins(leftMargin, newRightMargin);
  };

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" h-full">
        <Ruler
          width={1000}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          onLeftMarginChange={handleLeftMarginChange}
          onRightMarginChange={handleRightMarginChange}
        />
        <canvas
          ref={canvasRef}
          tabIndex={0} // Make canvas focusable for keyboard input
          width={1000}
          height={400}
          onKeyDown={handleKeyDown}
          className="bg-white pointer-events-auto shadow-lg focus:outline-none "
        />
      </div>

      {/* Debug panel positioned at bottom right */}
      <DebugPanel
        cursorPosition={editor.getCursorPosition()}
        pieceTable={editor.getPieceTable()}
        textRenderer={editor.getTextRenderer()}
        piecesForDebug={piecesForDebug}
      />
    </>
  );
};

export default Canvas;
