// Import Tailwind styles
import './styles.css';

// Main Canvas component
export { default as Canvas } from './components/TextEditor';
export { default as TextEditor } from './components/TextEditor';
export type { TextEditorProps } from './components/TextEditor';

// Debug components
export { default as DebugPanel } from './components/DebugPanel';

// Ruler components
export { default as Ruler } from './components/Ruler';
export { default as RulerPin } from './components/RulerPin';

// Assets
export { baseText } from './assets/baseText';

// Hooks
export { useExportHandlers } from './hooks/useExportHandlers';

// Export handler types
export type {
  ExportResult,
  PdfExportHandler,
  DocxExportHandler,
  ExportHandlers,
  OptionalExportHandlers,
  ExportEventManager,
} from './types/ExportHandlers';
