/**
 * RedBlackIntervalTree Visualizer Component
 *
 * An animated visual debugger for Red-Black Interval Trees.
 * Features:
 * - Hierarchical tree layout with automatic positioning
 * - Color-coded nodes (red/black) based on RB tree properties
 * - Smooth animations during tree operations (rotations, insertions, deletions)
 * - Interactive node display with interval and maxEndValue information
 * - Hover tooltips with detailed node information
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RedBlackIntervalTree, RedBlackNode, NodeColor } from '@99draft/editor-core';

/**
 * Represents a node's position in the visualization
 */
interface NodePosition {
  x: number;
  y: number;
  node: RedBlackNode;
  id: string; // Unique identifier for animation tracking
}

/**
 * Props for the TreeVisualizer component
 */
interface TreeVisualizerProps {
  tree: RedBlackIntervalTree;
  width?: number;
  height?: number;
  nodeRadius?: number;
  levelHeight?: number;
  className?: string;
}

/**
 * Calculate positions for all nodes in the tree using a post-order traversal
 * This ensures proper horizontal spacing based on subtree sizes
 */
const calculateNodePositions = (
  node: RedBlackNode | null,
  depth: number,
  leftBound: number,
  rightBound: number,
  levelHeight: number,
  positions: NodePosition[],
): number => {
  if (!node) return leftBound;

  let y = depth * levelHeight + levelHeight; // Start root a bit lower for aesthetics
  // Calculate positions for left subtree
  let currentX = leftBound;
  if (node.left) {
    currentX = calculateNodePositions(
      node.left,
      depth + 1,
      currentX,
      rightBound,
      levelHeight,
      positions,
    );
  }

  // Position this node
  const nodeX = currentX + 40; // Add spacing after left subtree

  const isleftChild = node.parent && node.parent.left === node;

  // Generate unique ID based on interval (used for animation tracking)
  const id = `${node.interval.start}-${node.interval.end}-${node.interval.style}-${depth}-${isleftChild ? 'L' : 'R'}`;

  positions.push({ x: nodeX, y, node, id });

  currentX = nodeX + 40; // Add spacing for right subtree

  // Calculate positions for right subtree
  if (node.right) {
    currentX = calculateNodePositions(
      node.right,
      depth + 1,
      currentX,
      rightBound,
      levelHeight,
      positions,
    );
  }

  return currentX;
};

/**
 * TreeVisualizer Component
 * Renders an animated visualization of a RedBlackIntervalTree
 */
export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  tree,
  width = 1200,
  height = 800,
  nodeRadius = 30,
  levelHeight = 100,
  className = '',
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Calculate all node positions
  const nodePositions = useMemo(() => {
    const positions: NodePosition[] = [];
    const root = tree.getRoot();

    if (root) {
      calculateNodePositions(root, 0, 0, width, levelHeight, positions);
    }

    return positions;
  }, [tree, width, levelHeight]);

  // Generate edge data (connections between nodes)
  const edges = useMemo(() => {
    const edgeList: Array<{
      from: NodePosition;
      to: NodePosition;
      key: string;
    }> = [];

    nodePositions.forEach((nodePos) => {
      const { node } = nodePos;

      if (node.left) {
        const leftPos = nodePositions.find((p) => p.node === node.left);
        if (leftPos) {
          edgeList.push({
            from: nodePos,
            to: leftPos,
            key: `${nodePos.id}-left`,
          });
        }
      }

      if (node.right) {
        const rightPos = nodePositions.find((p) => p.node === node.right);
        if (rightPos) {
          edgeList.push({
            from: nodePos,
            to: rightPos,
            key: `${nodePos.id}-right`,
          });
        }
      }
    });

    return edgeList;
  }, [nodePositions]);

  return (
    <div className={`tree-visualizer ${className}`}>
      <svg
        width={width}
        height={height}
        style={{
          border: '1px solid #ccc',
          background: '#fafafa',
          borderRadius: '8px',
        }}
      >
        {/* Render edges first (behind nodes) */}
        <g className="edges">
          {edges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke="#666"
              strokeWidth={2}
            />
          ))}
        </g>

        {/* Render nodes */}
        <motion.g className="nodes">
          {nodePositions.map((nodePos) => {
            const { node, x, y, id } = nodePos;
            const isRed = node.color === NodeColor.RED;
            const isHovered = hoveredNode === id;

            return (
              <g
                key={id}
                transform={`translate(${x}, ${y}) scale(${isHovered ? 1.2 : 1})`}
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node circle */}
                <circle
                  r={nodeRadius}
                  fill={isRed ? '#ef4444' : '#1f2937'}
                  stroke={isHovered ? '#3b82f6' : '#000'}
                  strokeWidth={isHovered ? 3 : 2}
                />

                {/* Interval text - primary label */}
                <text
                  y={-5}
                  textAnchor="middle"
                  fill="white"
                  fontSize={12}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  [{node.interval.start}, {node.interval.end}]
                </text>

                {/* MaxEndValue - secondary label */}
                <text y={10} textAnchor="middle" fill="white" fontSize={10} pointerEvents="none">
                  max: {node.maxEndValue}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={nodeRadius + 10}
                      y={-50}
                      width={180}
                      height={80}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      rx={4}
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                    />
                    <text x={nodeRadius + 20} y={-30} fontSize={11} fontWeight="bold">
                      Interval: [{node.interval.start}, {node.interval.end}]
                    </text>
                    <text x={nodeRadius + 20} y={-15} fontSize={10} fill="#666">
                      Style: {node.interval.style}
                    </text>
                    <text x={nodeRadius + 20} y={0} fontSize={10} fill="#666">
                      MaxEnd: {node.maxEndValue}
                    </text>
                    <text
                      x={nodeRadius + 20}
                      y={15}
                      fontSize={10}
                      fill={isRed ? '#ef4444' : '#1f2937'}
                      fontWeight="bold"
                    >
                      Color: {node.color}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </motion.g>
      </svg>

      {/* Tree statistics panel */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Tree Statistics
        </h3>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          <div>Total Nodes: {tree.getSize()}</div>
          <div>Tree Empty: {tree.isEmpty() ? 'Yes' : 'No'}</div>
          <div>
            Root Node:{' '}
            {tree.getRoot()
              ? `[${tree.getRoot()!.interval.start}, ${tree.getRoot()!.interval.end}]`
              : 'None'}
          </div>
        </div>
      </div>
    </div>
  );
};
