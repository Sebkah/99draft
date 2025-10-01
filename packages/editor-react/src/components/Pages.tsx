import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Editor, PageCountChangeEvent } from '@99draft/editor-core';
import Page from './Page';

export type PagesProps = {
  editor: Editor | null;
  canvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>;
};

/**
 * Pages component that manages multiple page canvases for the editor
 * Handles page count changes and canvas linking when pages are added/removed
 */
const Pages = ({ editor, canvasRefs }: PagesProps) => {
  // Manage page count state internally
  const [numberOfPages, setNumberOfPages] = useState<number>(1);

  // Set up page count change event listener
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.on('pageCountChange', (event: PageCountChangeEvent) => {
      setNumberOfPages(event.pageCount);
    });

    // Set initial page count
    const initialPageCount = editor.numberOfPages;
    setNumberOfPages(initialPageCount);

    return () => {
      // Clean up event listener on unmount
      unsubscribe();
    };
  }, [editor]);

  // Link canvases whenever the number of pages changes
  useLayoutEffect(() => {
    if (editor && numberOfPages > 0 && canvasRefs.current) {
      // Clean up the canvas refs array to match the current page count
      // This prevents stale null references when page count decreases
      canvasRefs.current = canvasRefs.current.slice(0, numberOfPages);
      /* 
      console.log(
        'Linking canvases:',
        canvasRefs.current.length,
        'canvases for',
        numberOfPages,
        'pages',
      ); */

      // All canvases should be ready at this point - link them directly
      editor.linkCanvases(canvasRefs.current as HTMLCanvasElement[], true);
      /*   console.log(
        'Linked canvases after page count change:',
        canvasRefs.current.length,
        'canvases',
      ); */
    }
  }, [numberOfPages, editor, canvasRefs]);

  return (
    <>
      {Array.from({ length: numberOfPages }).map((_, index) => (
        <Page key={index} index={index} editor={editor} ref={canvasRefs} />
      ))}
    </>
  );
};

export default Pages;
