import React, { useState } from 'react';
import { Editor } from '@99draft/editor-core';
import {
  useExportHandlers,
  OptionalExportHandlers,
  ExportEventManager,
} from '@99draft/editor-react';

/**
 * Example of using the useExportHandlers hook directly in a custom component
 * This demonstrates how you can add export functionality to any component that uses the Editor
 */
export function CustomEditorComponent() {
  const [editor] = useState<Editor | null>(null); // Your editor instance

  // Example export handlers (you would implement these based on your platform)
  const exportHandlers: OptionalExportHandlers = {
    pdfHandler: {
      async exportPdf(htmlContent: string) {
        console.log('Exporting PDF:', htmlContent);
        return { success: true, filePath: 'document.pdf' };
      },
    },
    docxHandler: {
      async exportDocx(docxBuffer: Uint8Array) {
        console.log('Exporting DOCX:', docxBuffer.length, 'bytes');
        return { success: true, filePath: 'document.docx' };
      },
    },
  };

  // Example event manager (you would implement this based on your platform)
  const exportEventManager: ExportEventManager = {
    onPdfExportRequest(handler: () => void) {
      // Listen for custom events, keyboard shortcuts, etc.
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'P') {
          event.preventDefault();
          handler();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    },

    onDocxExportRequest(handler: () => void) {
      // Listen for custom events
      const handleCustomEvent = () => handler();
      document.addEventListener('export-docx', handleCustomEvent);
      return () => document.removeEventListener('export-docx', handleCustomEvent);
    },
  };

  // Use the export handlers hook
  useExportHandlers(editor, exportHandlers, exportEventManager);

  return (
    <div>
      <div className="export-controls">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('export-docx'))}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Export DOCX
        </button>
        <p className="text-sm text-gray-600 mt-2">Use Ctrl+Shift+P to export PDF</p>
      </div>

      {/* Your custom editor UI would go here */}
      <div className="editor-container">{/* Custom editor implementation */}</div>
    </div>
  );
}

/**
 * Alternative approach: Using the hook in a higher-order component
 */
export function withExportHandlers<T extends { editor: Editor | null }>(
  WrappedComponent: React.ComponentType<T>,
  exportHandlers?: OptionalExportHandlers,
  exportEventManager?: ExportEventManager,
) {
  return function WithExportHandlersComponent(props: T) {
    // Extract editor from props
    const { editor } = props;

    // Apply export handlers
    useExportHandlers(editor, exportHandlers, exportEventManager);

    // Render the wrapped component
    return <WrappedComponent {...props} />;
  };
}

/**
 * Example usage of the HOC:
 *
 * ```tsx
 * const MyEditorWithExports = withExportHandlers(
 *   MyCustomEditor,
 *   myExportHandlers,
 *   myExportEventManager
 * );
 * ```
 */
