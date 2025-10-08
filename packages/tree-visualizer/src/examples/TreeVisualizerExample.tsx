/**
 * Example usage of TreeVisualizer
 *
 * This component demonstrates how to use the TreeVisualizer with a RedBlackIntervalTree.
 * It provides controls to add, remove intervals and watch the tree animate in real-time.
 */

import React, { useState, useCallback } from 'react';
import { RedBlackIntervalTree } from '@99draft/editor-core';
import { TreeVisualizer } from '../components/TreeVisualizer';

/**
 * Example component with interactive controls
 */
export const TreeVisualizerExample: React.FC = () => {
  // Create a tree instance (you would typically get this from your editor or state)
  const [tree] = useState(() => {
    const t = new RedBlackIntervalTree();

    // Add some initial intervals for demonstration
    t.insert({ start: 10, end: 20, style: 'bold' });
    t.insert({ start: 5, end: 15, style: 'italic' });
    t.insert({ start: 25, end: 30, style: 'underline' });
    t.insert({ start: 1, end: 8, style: 'color:red' });
    t.insert({ start: 15, end: 22, style: 'color:blue' });

    return t;
  });

  const [newInterval, setNewInterval] = useState({
    start: 0,
    end: 10,
    style: 'bold',
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const handleInsert = useCallback(() => {
    tree.insert({ ...newInterval });
    // Force re-render by updating key
    setRefreshKey((k) => k + 1);
  }, [tree, newInterval]);

  const handleClear = useCallback(() => {
    // Create a new tree (we can't clear the existing one easily)
    // In a real app, you might want to add a clear method to the tree
    window.location.reload();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Red-Black Interval Tree Visualizer
      </h1>

      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Visualize the structure of a Red-Black Interval Tree with smooth animations. Watch nodes
        move as the tree balances itself during insertions.
      </p>

      {/* Controls */}
      <div
        style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Controls</h2>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Start</label>
            <input
              type="number"
              value={newInterval.start}
              onChange={(e) =>
                setNewInterval({ ...newInterval, start: parseInt(e.target.value) || 0 })
              }
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                width: '80px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>End</label>
            <input
              type="number"
              value={newInterval.end}
              onChange={(e) =>
                setNewInterval({ ...newInterval, end: parseInt(e.target.value) || 0 })
              }
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                width: '80px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Style</label>
            <select
              value={newInterval.style}
              onChange={(e) => setNewInterval({ ...newInterval, style: e.target.value })}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                width: '120px',
              }}
            >
              <option value="bold">bold</option>
              <option value="italic">italic</option>
              <option value="underline">underline</option>
              <option value="color:red">color:red</option>
              <option value="color:blue">color:blue</option>
              <option value="color:green">color:green</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleInsert}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Insert Interval
          </button>

          <button
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Clear Tree (Reload)
          </button>

          <button
            onClick={() => {
              const start = Math.floor(Math.random() * 900);
              const end = start + Math.floor(Math.random() * 100) + 1;
              const styles = ['bold', 'italic', 'underline', 'strikethrough', 'highlight'];
              const randomStyle = styles[Math.floor(Math.random() * styles.length)];
              tree.insert({ start, end, style: randomStyle });
              setRefreshKey((k) => k + 1);
            }}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Add Random Interval
          </button>
        </div>
      </div>

      {/* Tree Visualization */}
      <TreeVisualizer key={refreshKey} tree={tree} width={1400} height={600} />

      {/* Legend */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Legend</h3>
        <div style={{ display: 'flex', gap: '24px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid #000',
              }}
            />
            <span>Red Node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#1f2937',
                border: '2px solid #000',
              }}
            />
            <span>Black Node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#1f2937',
                border: '3px solid #3b82f6',
              }}
            />
            <span>Hovered Node</span>
          </div>
        </div>
        <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '12px' }}>
          <strong>Hover over nodes</strong> to see detailed information including interval range,
          style, and max end value. Nodes will <strong>animate smoothly</strong> when the tree
          rebalances during insertions.
        </p>
      </div>
    </div>
  );
};
