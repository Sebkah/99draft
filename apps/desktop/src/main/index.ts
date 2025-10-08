import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { writeFileSync } from 'fs';

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Set up the application menu
  createApplicationMenu(mainWindow);

  return mainWindow;
}

/**
 * Creates a new window for the Tree Visualizer
 */
function createTreeVisualizerWindow(): BrowserWindow {
  const visualizerWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    title: 'Red-Black Tree Visualizer',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  visualizerWindow.on('ready-to-show', () => {
    visualizerWindow.show();
  });

  // Load the visualizer page
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    visualizerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/visualizer.html`);
  } else {
    visualizerWindow.loadFile(join(__dirname, '../renderer/visualizer.html'));
  }

  return visualizerWindow;
}

/**
 * Creates the application menu with PDF export functionality
 */
function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export as PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            // Trigger PDF export
            mainWindow.webContents.send('export-pdf-request');
          },
        },
        {
          label: 'Export as Word Document...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            // Trigger DOCX export
            mainWindow.webContents.send('export-docx-request');
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Open Tree Visualizer',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            createTreeVisualizerWindow();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC handlers
  setupIpcHandlers();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * Set up IPC handlers for communication between main and renderer processes
 */
function setupIpcHandlers(): void {
  // Legacy ping handler
  ipcMain.on('ping', () => console.log('pong'));

  // Handle PDF export request from renderer
  ipcMain.handle('export-pdf', async (event, htmlContent: string) => {
    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      if (!mainWindow) {
        throw new Error('Could not find main window');
      }

      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export PDF',
        defaultPath: 'document.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export cancelled' };
      }

      // Create a new BrowserWindow for PDF generation
      const pdfWindow = new BrowserWindow({
        width: 800,
        height: 1000,
        show: false, // Keep hidden
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Generate PDF
      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'none',
        },
      });

      // Save the PDF file
      writeFileSync(result.filePath, pdfBuffer);

      // Clean up
      pdfWindow.close();

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('PDF export error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Handle DOCX export request from renderer
  ipcMain.handle('export-docx', async (event, docxBuffer: Uint8Array) => {
    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      if (!mainWindow) {
        throw new Error('Could not find main window');
      }

      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Word Document',
        defaultPath: 'document.docx',
        filters: [{ name: 'Word Documents', extensions: ['docx'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export cancelled' };
      }

      // Convert Uint8Array to Buffer for file writing
      const buffer = Buffer.from(docxBuffer);

      // Save the DOCX file
      writeFileSync(result.filePath, buffer);

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('DOCX export error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
