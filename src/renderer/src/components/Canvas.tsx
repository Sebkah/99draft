import { PieceTable } from '@renderer/Editor/PieceTable/PieceTable';
import { TextRenderer } from '@renderer/Editor/TextRenderer';
import { InputManager } from '@renderer/Editor/InputManager';
import DebugPanel from './DebugPanel';
import Ruler from './Ruler';

import React, { useEffect, useRef, useState } from 'react';

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
  const [pieceTable] = useState(() => {
    const table = new PieceTable(
      'Hello\n world!\n This is a piece   table example.\nYou can insert and delete text efficiently using this structure.\n Piece tables are great for text editors and similar applications. END OF ORIGINAL TEXT',
    );

    // Set initial cursor position to end of text
    cursorPosition.current = table.length;

    return table;
  });

  // Layout/rendering state
  const [leftMargin, setLeftMargin] = useState<number>(50);
  const [rightMargin, setRightMargin] = useState<number>(750);

  // Initialize textRenderer and inputManager with lazy initialization
  const [textRenderer, setTextRenderer] = useState<TextRenderer | null>(null);
  const [inputManager, setInputManager] = useState<InputManager | null>(null);
  const [piecesForDebug, setPieces] = useState<PieceDebug[]>([]);

  /**
   * Initialize canvas context, text renderer, and input manager
   * Also sets up debug information update interval
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize text renderer and input manager if not already created
    if (!textRenderer || !inputManager) {
      const renderer = new TextRenderer(ctx, pieceTable);
      const manager = new InputManager(pieceTable, cursorPosition, renderer);

      setTextRenderer(renderer);
      setInputManager(manager);

      // Set initial margins and render
      manager.updateMargins(leftMargin, rightMargin, canvas.width);
    }

    // Focus the canvas for keyboard input

    canvas.focus();

    // Update debug information
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

    // Cleanup
    return () => {
      clearInterval(debugInterval);
    };
  }, [pieceTable, leftMargin, rightMargin, textRenderer, inputManager]);

  // Separate effect to handle margin updates
  useEffect(() => {
    if (inputManager && canvasRef.current) {
      inputManager.updateMargins(leftMargin, rightMargin, canvasRef.current.width);
    }
  }, [leftMargin, rightMargin, inputManager]);

  /**
   * Handles keyboard input for text editing and cursor movement
   * @param event - React keyboard event from canvas element
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!inputManager) return;

    const handled = inputManager.handleKeyDown(event.nativeEvent);
    if (handled) {
      event.preventDefault();
    }
  };

  /**
   * Handles left margin changes from the ruler
   */
  const handleLeftMarginChange = (newLeftMargin: number) => {
    setLeftMargin(newLeftMargin);
    if (inputManager && canvasRef.current) {
      inputManager.updateMargins(newLeftMargin, rightMargin, canvasRef.current.width);
    }
  };

  /**
   * Handles right margin changes from the ruler
   */
  const handleRightMarginChange = (newRightMargin: number) => {
    setRightMargin(newRightMargin);
    if (inputManager && canvasRef.current) {
      inputManager.updateMargins(leftMargin, newRightMargin, canvasRef.current.width);
    }
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
        cursorPosition={cursorPosition.current}
        pieceTable={pieceTable}
        textRenderer={textRenderer}
        piecesForDebug={piecesForDebug}
      />
    </>
  );
};

export default Canvas;
