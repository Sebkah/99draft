import { PieceTable } from '@renderer/Editor/PieceTable/PieceTable';
import { TextRenderer } from '@renderer/Editor/RenderText';

import { useCallback, useEffect, useRef, useState } from 'react';

type PieceDebug = {
  source: 'original' | 'add';
  offset: number;
  length: number;
  text: string;
};

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pieceTable] = useState<PieceTable>(
    new PieceTable(
      'Hello\n world!\n This is a piece table example.\nYou can insert and delete text efficiently using this structure. \n Piece tables are great for text editors and similar applications. END OF ORIGINAL TEXT',
    ),
  );
  const [textRenderer, setTextRenderer] = useState<TextRenderer | null>(null);
  const [pieces, setPieces] = useState<PieceDebug[]>([]);

  const cursorPosition = useRef(0); // Start at the end of the original text

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !pieceTable) return;
    setTextRenderer(new TextRenderer(ctx, pieceTable));

    setInterval(() => {
      setPieces((prev) => {
        if (!pieceTable) return prev;
        return pieceTable.getPieces().map((piece) => {
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
    }, 1000);
  }, [pieceTable]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Failed to get canvas context');

    if (!pieceTable || !textRenderer) return;

    textRenderer.render(cursorPosition.current);
  }, [pieceTable, textRenderer]);

  // Draw the initial content
  useEffect(() => {
    draw();
  }, [draw]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!pieceTable || !textRenderer) return;

    if (event.key === 'Enter') {
      pieceTable.insert('\n', pieceTable.length);
      cursorPosition.current += 1; // Move cursor down after inserting a newline
      console.log('Inserted newline');
      draw();
      event.preventDefault();
      return;
    }

    // handle cursor movement
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

    // Handle text input
    if (event.key.length === 1) {
      console.log('Key pressed:', event.key);
      if (event.ctrlKey) {
        // Ignore Ctrl or Meta keys
        return;
      }

      // Handle other printable characters
      pieceTable.insert(event.key, cursorPosition.current);
      cursorPosition.current = Math.max(0, cursorPosition.current + 1); // Move cursor right for the new character
      draw();
      event.preventDefault();
    }
  };

  return (
    <div className="grid grid-cols-[min-content_1fr] w-full overflow-hidden gap-2 items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        tabIndex={0} // Make the canvas focusable
        // Make the canvas focussed by default
        autoFocus
        width={1000}
        height={400}
        onKeyDown={handleKeyDown}
        className="bg-white pointer-events-auto"
      />
      <div className="w-full h-full overflow-auto bg-white">
        <p> Add buffer</p>
        {/* Stringify escaped characters */}
        <p className="text-xs">
          {pieceTable ? pieceTable.addBuffer.replace(/[\n\r]/g, '\\n') : 'Loading...'}
        </p>

        <p>Piece Table Debug</p>
        <pre className="text-xs">
          {pieces.map((piece, index) => (
            <div key={index}>
              <strong>
                Piece {index} (Source: {piece.source}, Offset: {piece.offset}, Length:{' '}
                {piece.length}):
              </strong>{' '}
              {piece.text}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export default Canvas;
