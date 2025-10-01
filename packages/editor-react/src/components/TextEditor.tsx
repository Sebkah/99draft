import { Editor } from '@99draft/editor-core';

import Ruler from './Ruler';
import Pages from './Pages';
import { OptionalExportHandlers, ExportEventManager } from '../types/ExportHandlers';
import { useExportHandlers } from '../hooks/useExportHandlers';

import { useEffect, useRef, useState } from 'react';
import { baseText} from '../assets/baseText';


const editorWidth = 800;
const editorHeight = (editorWidth / 21) * 29.7; // A4 aspect ratio

/**
 * Props for the TextEditor component
 */
export interface TextEditorProps {
  /** Optional export handlers for different document formats */
  exportHandlers?: OptionalExportHandlers;
  /** Optional event manager for handling export requests */
  exportEventManager?: ExportEventManager;
}

/**
 * Canvas component that implements a text editor using piece table data structure
 * Provides keyboard input handling and visual rendering of text content
 */
const TextEditor = ({ exportHandlers, exportEventManager }: TextEditorProps = {}) => {
  // Refs for DOM elements
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);

  const [editor] = useState<Editor>(
    new Editor(
      baseText,
      { left: 100, right: 200, top: 50 }, // Default margins that will be overridden by Ruler
      editorWidth,
      editorHeight,
    ),
  );

  /**
   * Initialize canvas context and editor
   */
  useEffect(() => {
    editor.linkCanvases(canvasRefs.current);
    /*     console.log('Initial canvas linking:', canvasRefs.current); */
    editor.initialize();

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

  // Handle export functionality using custom hook
  useExportHandlers(editor, exportHandlers, exportEventManager);

  return (
    <>
      {/* Main text editor canvas */}
      <div className=" grid grid-rows-auto w-dvw gap-4 justify-center overflow-x-hidden overflow-y-auto bg-gray-200 ">
        <Ruler width={editorWidth} editor={editor} />
        <Pages editor={editor} canvasRefs={canvasRefs} />
      </div>

      {/* Debug panel positioned at bottom right */}
      {/*   {editor && <DebugPanel editor={editor} />} */}
    </>
  );
};

export default TextEditor;
