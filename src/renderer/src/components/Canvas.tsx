import { PieceTable } from '@renderer/Editor/PieceTable/PieceTable';
import { TextRenderer } from '@renderer/Editor/RenderText';
import DebugPanel from './DebugPanel';
import Ruler from './Ruler';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { text } from 'stream/consumers';

/**
 * Type definition for debugging piece table structure
 */
type PieceDebug = {
  source: 'original' | 'add';
  offset: number;
  length: number;
  text: string;
};

/**
 * Canvas component that implements a text editor using piece table data structure
 * Provides keyboard input handling and visual rendering of text content
 */
const Canvas = () => {
  // Refs for DOM elements and cursor position
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorPosition = useRef<number>(0);

  // Initialize piece table with sample text
  const [pieceTable] = useState<PieceTable>(
    () =>
      new PieceTable(
        'Hello\n world!\n This is a piece   table example.\nYou can insert and delete text efficiently using this structure.\n Piece tables are great for text editors and similar applications. END OF ORIGINAL TEXT',
      ),
  );

  // State for text renderer and debug information
  const [textRenderer, setTextRenderer] = useState<TextRenderer | null>(null);
  const [piecesForDebug, setPieces] = useState<PieceDebug[]>([]);

  // State for ruler margins
  const [leftMargin, setLeftMargin] = useState<number>(50);
  const [rightMargin, setRightMargin] = useState<number>(750);

  // Set initial cursor position to end of text
  useEffect(() => {
    cursorPosition.current = pieceTable.length;
  }, [pieceTable]);

  /**
   * Initialize canvas context and text renderer
   * Also sets up debug information update interval
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !pieceTable) return;

    // Initialize text renderer with canvas context
    setTextRenderer(new TextRenderer(ctx, pieceTable));

    // Update debug information every second
    const debugInterval = setInterval(() => {
      setPieces((prev) => {
        if (!pieceTable) return prev;

        return pieceTable.getPieces().map((piece) => {
          // Extract text from appropriate buffer based on piece source
          if (piece.source === 'original') {
            return {
              ...piece,
              text: pieceTable.originalBuffer.substring(piece.offset, piece.offset + piece.length),
            };
          }
          return {
            ...piece,
            text: pieceTable.addBuffer.substring(piece.offset, piece.offset + piece.length),
          };
        });
      });
    }, 100);

    // Cleanup interval on unmount
    return () => clearInterval(debugInterval);
  }, [pieceTable]);

  /**
   * Focus the canvas element after it's mounted and text renderer is ready
   * This ensures the canvas receives keyboard input immediately
   */
  useEffect(() => {
    if (textRenderer && canvasRef.current) {
      // Small delay to ensure the canvas is fully rendered
      const focusTimeout = setTimeout(() => {
        canvasRef.current?.focus();
      }, 100);
      textRenderer.leftMargin = leftMargin;
      textRenderer.rightMargin = canvasRef.current.getContext('2d')?.canvas.width - rightMargin;

      return () => clearTimeout(focusTimeout);
    }

    return; // Explicit return for linting
  }, [textRenderer]);

  useEffect(() => {
    if (textRenderer && canvasRef.current) {
      // Small delay to ensure the canvas is fully rendered

      textRenderer.leftMargin = leftMargin;
      textRenderer.rightMargin = canvasRef.current.getContext('2d')?.canvas.width - rightMargin;
      // Ensure text renderer is updated with new margins
      textRenderer.render(cursorPosition.current);
    }
    return;
  }, [leftMargin, rightMargin, textRenderer]);

  /**
   * Renders the current text content and cursor position on the canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pieceTable || !textRenderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Render text with current cursor position
    textRenderer.render(cursorPosition.current);
  }, [pieceTable, textRenderer]);

  /**
   * Initial render effect - draws content when text renderer is ready
   */
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * Handles keyboard input for text editing and cursor movement
   * @param event - React keyboard event from canvas element
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!pieceTable || !textRenderer) return;

    // Handle Enter key - insert newline at end of text
    if (event.key === 'Enter') {
      pieceTable.insert('\n', cursorPosition.current);
      cursorPosition.current += 1;
      console.log('Inserted newline');
      draw();
      event.preventDefault();
      return;
    }

    // Handle cursor movement
    if (event.key === 'ArrowLeft') {
      cursorPosition.current = Math.max(0, cursorPosition.current - 1);
      draw();
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      cursorPosition.current = Math.min(pieceTable.length, cursorPosition.current + 1);
      draw();
      event.preventDefault();
      return;
    }

    // Handle printable character input
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      console.log('Key pressed:', event.key);

      // Insert character at current cursor position
      pieceTable.insert(event.key, cursorPosition.current);
      cursorPosition.current = Math.min(pieceTable.length, cursorPosition.current + 1);
      draw();
      event.preventDefault();
    }
  };

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" h-full">
        <Ruler
          width={800}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          onLeftMarginChange={setLeftMargin}
          onRightMarginChange={setRightMargin}
        />
        <canvas
          ref={canvasRef}
          tabIndex={0} // Make canvas focusable for keyboard input
          width={800}
          height={400}
          onKeyDown={handleKeyDown}
          className="bg-white pointer-events-auto shadow-lg focus:outline-none "
        />
      </div>

      {/* Debug panel positioned at bottom right */}
      <DebugPanel
        cursorPosition={cursorPosition.current}
        pieceTable={pieceTable}
        textRenderer={textRenderer}
        piecesForDebug={piecesForDebug}
      />
    </>
  );
};

export default Canvas;
