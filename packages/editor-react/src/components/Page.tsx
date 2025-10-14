import React from 'react';
import { Editor } from '@99draft/editor-core';

const editorWidth = 800;
const editorHeight = (editorWidth / 21) * 29.7; // A4 aspect ratio
const DRAG_THRESHOLD = 3; // Minimum pixels to move before considering it a drag

export type PageProps = {
  index: number;
  editor: Editor | null;
  ref: React.RefObject<(HTMLCanvasElement | null)[]>;
};

/**
 * Single page component that renders a canvas element for the editor
 * Handles pointer events for text selection and cursor positioning
 */
const Page = ({ index, editor, ref }: PageProps) => {
  // Track initial pointer position to detect drag vs click
  const pointerDownPos = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="rounded-[3px] overflow-hidden shadow-md ">
      <canvas
        ref={(el) => {
          if (!ref.current) ref.current = [];
          ref.current[index] = el;
        }}
        tabIndex={0} // Make canvas focusable for keyboard input
        width={editorWidth}
        height={editorHeight}
        onPointerMove={(e) => {
          if (!editor || !e.buttons || !pointerDownPos.current) return;

          // Calculate distance from initial pointer-down position
          const dx = e.nativeEvent.offsetX - pointerDownPos.current.x;
          const dy = e.nativeEvent.offsetY - pointerDownPos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Only update selection if pointer has moved beyond threshold
          if (distance < DRAG_THRESHOLD) return;

          editor.updateSelection({
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY,
            page: index,
          });
        }}
        onPointerDown={(e) => {
          if (!editor) return;

          // Store initial position for drag detection
          pointerDownPos.current = {
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY,
          };

          editor.startSelection({
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY,
            page: index,
          });
        }}
        onPointerUp={(e) => {
          if (!editor) return;

          editor.endSelection({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, page: index });

          // Clear pointer position tracking
          pointerDownPos.current = null;
        }}
        className="bg-white pointer-events-auto shadow-lg focus:outline-none "
      />
    </div>
  );
};

export default Page;
