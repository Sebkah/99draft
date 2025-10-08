# @99draft/tree-visualizer

An animated visual debugger for Red-Black Interval Trees built with React and Framer Motion.

## Features

- 🎨 **Color-coded nodes**: Red and black nodes clearly distinguished
- ✨ **Smooth animations**: Nodes animate smoothly when they change position during tree operations
- 🔍 **Interactive tooltips**: Hover over nodes to see detailed information
- 📊 **Real-time statistics**: View tree size, root node, and other metrics
- 🎯 **Interval visualization**: See interval ranges and maxEndValue at a glance

## Installation

```bash
pnpm add @99draft/tree-visualizer
```

## Usage

### Basic Usage

```tsx
import { RedBlackIntervalTree } from '@99draft/editor-core';
import { TreeVisualizer } from '@99draft/tree-visualizer';

const tree = new RedBlackIntervalTree();
tree.insert({ start: 10, end: 20, style: 'bold' });
tree.insert({ start: 5, end: 15, style: 'italic' });

function MyComponent() {
  return <TreeVisualizer tree={tree} />;
}
```

### With Custom Dimensions

```tsx
<TreeVisualizer tree={tree} width={1400} height={800} nodeRadius={35} levelHeight={120} />
```

### Interactive Example

See `src/examples/TreeVisualizerExample.tsx` for a complete example with controls to add/remove intervals and watch the tree animate in real-time.

## Props

| Prop          | Type                   | Default  | Description                          |
| ------------- | ---------------------- | -------- | ------------------------------------ |
| `tree`        | `RedBlackIntervalTree` | Required | The tree instance to visualize       |
| `width`       | `number`               | `1200`   | Width of the SVG canvas              |
| `height`      | `number`               | `800`    | Height of the SVG canvas             |
| `nodeRadius`  | `number`               | `30`     | Radius of each node circle           |
| `levelHeight` | `number`               | `100`    | Vertical spacing between tree levels |
| `className`   | `string`               | `''`     | Additional CSS class name            |

## How It Works

The visualizer:

1. **Calculates positions**: Uses a post-order traversal to calculate optimal positions for each node
2. **Tracks nodes**: Each node gets a unique ID based on its interval for animation tracking
3. **Animates changes**: Framer Motion's `layoutId` prop enables smooth transitions when nodes move
4. **Renders layers**: Edges are rendered first, then nodes on top with hover states

### Animation System

The component uses Framer Motion's powerful animation capabilities:

- **Spring animations**: Natural, physics-based movement for node positions
- `layoutId`: Automatic layout animations when nodes change position
- **AnimatePresence**: Smooth entrance/exit animations for added/removed nodes
- **Hover effects**: Scale and border color changes on interaction

## Node Information Display

Each node shows:

- **Primary label**: The interval range `[start, end]`
- **Secondary label**: The max end value in the subtree
- **Color**: Red or black based on Red-Black tree properties
- **Tooltip** (on hover):
  - Full interval range
  - Style string
  - Max end value
  - Node color

## Tree Operations Visualization

The visualizer automatically responds to tree changes:

- **Insertions**: New nodes fade in and animate to their position
- **Rotations**: Nodes smoothly slide to new positions
- **Rebalancing**: Color changes animate smoothly
- **Deletions**: Nodes fade out gracefully

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch mode for development
pnpm dev
```

## License

MIT
