import React from 'react';
import { Editor } from '@99draft/editor-core';

const editorWidth = 800;
const editorHeight = (editorWidth / 21) * 29.7; // A4 aspect ratio

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

export default Page;
