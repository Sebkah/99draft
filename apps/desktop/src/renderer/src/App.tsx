import { TextEditor } from '@99draft/editor-react';
import { createElectronExportAdapters } from './electron-adapters/ExportAdapters';

function App() {
  // Create electron-specific export adapters
  const { exportHandlers, exportEventManager } = createElectronExportAdapters();

  return (
    <main className="bg-black/5 w-full h-screen flex  overflow-x-hidden ">
      <TextEditor exportHandlers={exportHandlers} exportEventManager={exportEventManager} />
    </main>
  );
}

export default App;
