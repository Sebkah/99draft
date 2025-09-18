import { Editor, PieceDebug } from '@renderer/Editor/Editor';
import DebugPanel from './DebugPanel';
import Ruler from './Ruler';

import React, { useEffect, useRef, useState } from 'react';
import { baseText } from '@renderer/assets/baseText';

const editorWidth = 1000;

/**
 * Canvas component that implements a text editor using piece table data structure
 * Provides keyboard input handling and visual rendering of text content
 */
const Canvas = () => {
  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [editor, setEditor] = useState<Editor | null>(null);

  // Layout/rendering state
  const [leftMargin, setLeftMargin] = useState<number>(140);
  const [rightMargin, setRightMargin] = useState<number>(450);

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

    setEditor(new Editor(baseText, ctx, { left: leftMargin, right: rightMargin }));
    // Focus the canvas for keyboard input
    canvas.focus();
    // Cleanup on unmount
    return () => {
      if (editor) editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (editor) {
      editor.startDebugUpdates(setPieces);
    }
  }, [editor]);

  /**
   * Handles keyboard input for text editing and cursor movement
   * @param event - React keyboard event from canvas element
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!editor) return;
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
    if (!editor) return;
    editor.setMargins(newLeftMargin, rightMargin);
  };

  /**
   * Handles right margin changes from the ruler
   */
  const handleRightMarginChange = (newRightMargin: number) => {
    setRightMargin(newRightMargin);
    if (!editor) return;
    editor.setMargins(leftMargin, newRightMargin);
  };

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" h-full">
        <Ruler
          width={editorWidth}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          onLeftMarginChange={handleLeftMarginChange}
          onRightMarginChange={handleRightMarginChange}
        />
        <canvas
          ref={canvasRef}
          tabIndex={0} // Make canvas focusable for keyboard input
          width={editorWidth}
          height={400}
          onKeyDown={handleKeyDown}
          className="bg-white pointer-events-auto shadow-lg focus:outline-none "
        />
      </div>

      {/* Debug panel positioned at bottom right */}
      {editor && (
        <DebugPanel
          cursorPosition={editor.getCursorPosition()}
          pieceTable={editor.getPieceTable()}
          textRenderer={editor.getTextRenderer()}
          textParser={editor.getTextParser()}
          piecesForDebug={piecesForDebug}
        />
      )}
    </>
  );
};

export default Canvas;
