// Main Editor class
export { Editor } from './Editor';
export type { DebugConfig, PieceDebug } from './Editor';

// Core data structures
export { PieceTable } from './PieceTable/PieceTable';
export type { Piece } from './PieceTable/PieceTable';

// Text processing
export { TextParser } from './TextParser';
export { TextRenderer } from './renderers/TextRenderer';

// Export renderers
export { PDFRenderer } from './renderers/PDFRenderer';
export { DOCXRenderer } from './renderers/DOCXRenderer';

// Cursor and selection management
export { CursorManager } from './CursorManager';
export type { MousePosition, StructurePosition } from './CursorManager';
export { SelectionManager } from './SelectionManager';

// Input handling
export { InputManager } from './Input/InputManager';

// Logging
export { createEditorLogger } from './EditorLogger';
export type { EditorLogger } from './EditorLogger';

// Page management
export { Page } from './Page';
export { Paragraph } from './Paragraph';
