// Main Editor class
export { Editor } from './core/Editor';
export type { DebugConfig, PieceDebug } from './core/Editor';

// Core data structures
export { PieceTable } from './pieceTable/PieceTable';
export type { Piece } from './pieceTable/PieceTable';

// Text processing
export { TextParser } from './core/TextParser';
export { TextRenderer } from './renderers/TextRenderer';

// Export renderers
export { PDFRenderer } from './renderers/PDFRenderer';
export { DOCXRenderer } from './renderers/DOCXRenderer';

// Cursor and selection management
export { CursorManager } from './managers/CursorManager';
export type { MousePosition, StructurePosition } from './managers/CursorManager';
export { SelectionManager } from './managers/SelectionManager';

// Event system
export { EventEmitter } from './utils/EventEmitter';
export type { EventMap } from './utils/EventEmitter';
export type { CursorChangeEvent, CursorManagerEvents } from './types/CursorEvents';
export type { SelectionChangeEvent, SelectionManagerEvents } from './types/SelectionEvents';
export type { DebugUpdateEvent, PageCountChangeEvent, EditorEvents } from './types/EditorEvents';
export type { TextParserEvents } from './types/TextParserEvents';

// Input handling
export { InputManager } from './managers/InputManager';

// Logging
export { createEditorLogger } from './managers/EditorLogger';
export type { EditorLogger } from './managers/EditorLogger';

// Page management
export { Page } from './models/Page';
export { Paragraph } from './models/Paragraph';
export { Line } from './models/Line';

// Data structures
export { RedBlackIntervalTree, RedBlackNode, NodeColor } from './structures/RedBlackIntervalTree';

