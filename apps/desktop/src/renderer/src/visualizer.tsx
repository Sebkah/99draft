/**
 * Tree Visualizer Window for Electron App
 *
 * This is a separate window that displays the TreeVisualizerExample component
 * from the @99draft/tree-visualizer package.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { TreeVisualizerExample } from '@99draft/tree-visualizer';
import './assets/main.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TreeVisualizerExample />
  </React.StrictMode>,
);
