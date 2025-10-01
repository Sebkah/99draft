/**
 * Example demonstrating how to use the Editor and CursorManager event systems
 *
 * This shows how to subscribe to cursor position changes and debug updates in the editor.
 */

import {
  Editor,
  CursorChangeEvent,
  DebugUpdateEvent,
  PageCountChangeEvent,
} from '@99draft/editor-core';

// Example: Creating an editor and subscribing to various events
function setupEditorWithEvents() {
  // Create an editor instance (simplified for example)
  const editor = new Editor(
    'Initial text content',
    { left: 50, right: 50, top: 50, bottom: 50 },
    800,
    600,
  );

  // Subscribe to cursor position changes
  const unsubscribe = editor.cursorManager.on('cursorChange', (event: CursorChangeEvent) => {
    console.log('Cursor moved!');
    console.log('New position:', event.position);
    console.log('Previous position:', event.previousPosition);
    console.log('Structure position:', {
      page: event.structurePosition.pageIndex,
      paragraph: event.structurePosition.paragraphIndex,
      line: event.structurePosition.lineIndex,
      character: event.structurePosition.characterIndex,
    });
  });

  // Example: Subscribe to cursor changes for updating UI
  const updateStatusBar = editor.cursorManager.on('cursorChange', (event: CursorChangeEvent) => {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      statusBar.textContent = `Line ${event.structurePosition.lineIndex + 1}, Column ${event.structurePosition.characterIndex + 1}`;
    }
  });

  // Example: Subscribe to debug updates for development tools
  const debugUpdateListener = editor.on('debugUpdate', (event: DebugUpdateEvent) => {
    console.log('Piece table updated:', event.pieces.length, 'pieces');
  });

  // Example: Subscribe to page count changes for pagination UI
  const pageCountListener = editor.on('pageCountChange', (event: PageCountChangeEvent) => {
    console.log(`Page count changed from ${event.previousPageCount} to ${event.pageCount}`);
    // Update pagination UI here
  });

  // Example: Subscribe for auto-save functionality
  let autoSaveTimeout: NodeJS.Timeout;
  const autoSaveOnCursorChange = editor.cursorManager.on('cursorChange', () => {
    // Debounce auto-save
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      console.log('Auto-saving document...');
      // Perform auto-save logic here
    }, 2000);
  });

  // Example: One-time subscription (fires once then unsubscribes automatically)
  editor.cursorManager.once('cursorChange', (event: CursorChangeEvent) => {
    console.log('First cursor movement detected!', event.position);
  });

  // Example: Clean up subscriptions when component unmounts
  function cleanup() {
    unsubscribe();
    updateStatusBar();
    debugUpdateListener();
    pageCountListener();
    autoSaveOnCursorChange();
    clearTimeout(autoSaveTimeout);
  }

  return { editor, cleanup };
}

// Example: Check if there are listeners before doing expensive operations
function conditionalProcessing(editor: Editor) {
  if (editor.cursorManager.hasListeners('cursorChange')) {
    // Only do expensive cursor position analysis if someone is listening
    console.log('Performing detailed cursor analysis...');
  }
}

// Example: Get information about current listeners
function debugEventListeners(editor: Editor) {
  console.log('Event names with listeners:', editor.cursorManager.eventNames());
  console.log(
    'Number of cursorChange listeners:',
    editor.cursorManager.listenerCount('cursorChange'),
  );
  console.log('Editor event names:', editor.eventNames());
  console.log('Number of debugUpdate listeners:', editor.listenerCount('debugUpdate'));
}

export { setupEditorWithEvents, conditionalProcessing, debugEventListeners };
