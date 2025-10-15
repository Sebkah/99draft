import { TextEditor } from '@99draft/editor-react';
import { createElectronExportAdapters } from './electron-adapters/ExportAdapters';
import type React from 'react';

function App(): React.JSX.Element {
  // Create electron-specific export adapters
  const { exportHandlers, exportEventManager } = createElectronExportAdapters();

  return (
    <main className="h-full w-full overflow-hidden ">
      <TextEditor exportHandlers={exportHandlers} exportEventManager={exportEventManager} />
    </main>
  );
}

export default App;
