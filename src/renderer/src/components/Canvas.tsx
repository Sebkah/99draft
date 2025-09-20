import { Editor } from '@renderer/Editor/Editor';
import DebugPanelNew from './DebugPanelNew';
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
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);

  /**
   * Initialize canvas context and editor
   * Also sets up debug information update interval
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ed = new Editor(baseText, ctx, { left: leftMargin, right: rightMargin });
    setEditor(ed);
    // initialize ruler with paragraph at current cursor
    const tp = ed.getTextParser();
    if (tp) {
      const [p] = tp.cursorPositionInStructure;
      const idx = p !== -1 ? p : 0;
      setCurrentParagraphIndex(idx);
      const style = ed.getParagraphStyle(idx);
      if (style) {
        setLeftMargin(style.left);
        setRightMargin(style.right);
      }
    }
    // Focus the canvas for keyboard input
    canvas.focus();
    // Cleanup on unmount
    return () => {
      if (editor) editor.dispose();
    };
  }, []);

  /**
   * Handles keyboard input for text editing and cursor movement
   * @param event - React keyboard event from canvas element
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!editor) return;
    const handled = editor.handleKeyDown(event.nativeEvent);
    if (handled) {
      event.preventDefault();
      // After movement/edits, sync ruler to current paragraph
      const tp = editor.getTextParser();
      if (tp) {
        const [p] = tp.cursorPositionInStructure;
        if (p !== -1) {
          setCurrentParagraphIndex(p);
          const style = editor.getParagraphStyle(p);
          if (style) {
            setLeftMargin(style.left);
            setRightMargin(style.right);
          }
        }
      }
    }
  };

  /**
   * Handles left margin changes from the ruler
   */
  const handleLeftMarginChange = (newLeftMargin: number) => {
    setLeftMargin(newLeftMargin);
    if (!editor) return;
    const index = currentParagraphIndex;
    if (index >= 0) editor.setParagraphMargins(index, newLeftMargin, rightMargin);
  };

  /**
   * Handles right margin changes from the ruler
   */
  const handleRightMarginChange = (newRightMargin: number) => {
    setRightMargin(newRightMargin);
    if (!editor) return;
    const index = currentParagraphIndex;
    if (index >= 0) editor.setParagraphMargins(index, leftMargin, newRightMargin);
  };

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" h-full">
        {/* TODO: some functionnality of ruler should not be in the react component but in the library */}
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
      {editor && <DebugPanelNew editor={editor} />}
    </>
  );
};

export default Canvas;
