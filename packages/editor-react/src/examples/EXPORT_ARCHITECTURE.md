# Export Handling Architecture

This document explains how the `editor-react` package maintains platform independence while supporting different export mechanisms across platforms.

## Problem

Previously, the `Canvas.tsx` component contained electron-specific code that directly used:

- `window.api.exportPdf()` and `window.api.exportDocx()`
- `window.electron.ipcRenderer.on()` for IPC event listeners

This made the `editor-react` package tightly coupled to Electron, preventing its use in web browsers, mobile apps, or other platforms.

## Solution: Dependency Injection Pattern

We've implemented a **dependency injection pattern** where the Canvas component accepts export functionality through props rather than directly calling platform-specific APIs.

### Key Components

#### 1. Export Handler Interfaces (`types/ExportHandlers.ts`)

```typescript
export interface PdfExportHandler {
  exportPdf(htmlContent: string): Promise<ExportResult>;
}

export interface DocxExportHandler {
  exportDocx(docxBuffer: Uint8Array): Promise<ExportResult>;
}

export interface ExportEventManager {
  onPdfExportRequest(handler: () => void): () => void;
  onDocxExportRequest(handler: () => void): () => void;
}
```

#### 2. Platform-Agnostic Canvas Component

The `TextEditor` component now accepts optional export handlers:

```typescript
export interface TextEditorProps {
  exportHandlers?: OptionalExportHandlers;
  exportEventManager?: ExportEventManager;
}

const TextEditor = ({ exportHandlers, exportEventManager }: TextEditorProps = {}) => {
  // Uses injected handlers instead of direct platform APIs
};
```

#### 3. Platform-Specific Implementations

Each platform implements the interfaces according to its capabilities:

**Electron Implementation** (`desktop/src/renderer/src/electron-adapters/ExportAdapters.ts`):

```typescript
export class ElectronPdfExportHandler implements PdfExportHandler {
  async exportPdf(htmlContent: string): Promise<ExportResult> {
    return await window.api.exportPdf(htmlContent);
  }
}
```

**Web Implementation** (`examples/WebExportAdapters.ts`):

```typescript
export class WebPdfExportHandler implements PdfExportHandler {
  async exportPdf(htmlContent: string): Promise<ExportResult> {
    // Downloads HTML file or sends to server for PDF conversion
    const blob = new Blob([htmlContent], { type: 'text/html' });
    // ... download logic
  }
}
```

## Usage

### In Electron Apps

```typescript
import { TextEditor } from '@99draft/editor-react';
import { createElectronExportAdapters } from './electron-adapters/ExportAdapters';

function App() {
  const { exportHandlers, exportEventManager } = createElectronExportAdapters();

  return (
    <TextEditor
      exportHandlers={exportHandlers}
      exportEventManager={exportEventManager}
    />
  );
}
```

### In Web Apps

```typescript
import { TextEditor } from '@99draft/editor-react';
import { createWebExportAdapters } from './web-adapters/ExportAdapters';

function WebApp() {
  const { exportHandlers, exportEventManager } = createWebExportAdapters();

  return (
    <div>
      <button onClick={() => document.dispatchEvent(new CustomEvent('export-docx'))}>
        Export DOCX
      </button>
      <TextEditor
        exportHandlers={exportHandlers}
        exportEventManager={exportEventManager}
      />
    </div>
  );
}
```

### Without Export Functionality

The editor works perfectly fine without any export handlers:

```typescript
import { TextEditor } from '@99draft/editor-react';

function SimpleApp() {
  return <TextEditor />; // No export functionality, just editing
}
```

## Benefits

1. **Platform Independence**: `editor-react` package has no platform-specific dependencies
2. **Flexibility**: Each platform can implement exports according to its capabilities and UX patterns
3. **Optional Features**: Platforms can choose which export formats to support
4. **Testability**: Export logic can be easily mocked or stubbed for testing
5. **Extensibility**: New export formats can be added without changing the core editor

## Adding New Export Formats

To add a new export format (e.g., RTF):

1. **Define the interface**:

```typescript
export interface RtfExportHandler {
  exportRtf(rtfContent: string): Promise<ExportResult>;
}
```

2. **Update OptionalExportHandlers**:

```typescript
export interface OptionalExportHandlers {
  pdfHandler?: PdfExportHandler;
  docxHandler?: DocxExportHandler;
  rtfHandler?: RtfExportHandler; // Add this
}
```

3. **Implement in each platform** as needed.

4. **Update Canvas component** to handle the new export type.

This pattern ensures clean separation of concerns and maintainable, platform-agnostic code.
