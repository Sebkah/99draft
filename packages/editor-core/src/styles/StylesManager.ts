import { BooleanRunManager } from '../runManagers/BooleanRunManager';
import { Run } from '../structures/Run';

const booleanStyles = ['bold', 'italic', 'underline', 'strikethrough'] as const;
type Style = (typeof booleanStyles)[number];

type Styles = {
  [key in Style]?: boolean;
};

export class StylesManager {
  private runManagers: Map<Style, BooleanRunManager>;
  constructor() {
    this.runManagers = new Map();
    for (const style of booleanStyles) {
      this.runManagers.set(style, new BooleanRunManager());
    }
  }

  toggleStyle(style: Style, start: number, end: number) {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    manager.toggleStyle(start, end);
  }

  enableStyle(style: Style, start: number, end: number) {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    manager.enableStyle(start, end);
  }

  disableStyle(style: Style, start: number, end: number) {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    manager.disableStyle(start, end);
  }

  /**
   * Get the value of a specific style at a given position
   * @param style - The style to check
   * @param position - The position to check
   * @returns true if the style is active at the position, false otherwise
   */
  getStyleValueAt(style: Style, position: number): boolean {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    return manager.getStyleValueAt(position);
  }

  /**
   * Get all active styles at a given position
   * @param position - The position to check
   * @returns An object with boolean flags for each style
   */
  getStylesAt(position: number): Styles {
    const styles: Styles = {};
    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      const isActive = manager.getStyleValueAt(position);
      if (isActive) {
        styles[style] = true;
      }
    }
    return styles;
  }

  getStylesOverRange(start: number, end: number): Styles {
    const styles: Styles = {};
    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      const isActive = manager.getStyleValueOverRange(start, end);
      if (isActive) {
        styles[style] = true;
      }
    }
    return styles;
  }

  setStyles(styles: Styles, start: number, end: number) {
    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      if (styles[style]) {
        manager.enableStyle(start, end);
      } else {
        manager.disableStyle(start, end);
      }
    }
  }

  getRunsOverlappingRange(
    start: number,
    end: number,
  ): Run<{
    [key in Style]?: boolean;
  }>[] {
    // Get all runs from all styles that overlap with the range, keeping track of which style each run belongs to
    const runsByStyle = new Map<Style, Run<null>[]>();
    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      runsByStyle.set(style, manager.getRunsOverlappingRange(start, end));
    }

    // Get all boundary points (start and end of each run) within the range
    const boundaries = new Set<number>([start, end]);
    for (const runs of runsByStyle.values()) {
      for (const run of runs) {
        if (run.start > start) {
          boundaries.add(run.start);
        }
        if (run.end < end) {
          boundaries.add(run.end);
        }
      }
    }

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
    const result: Run<{ [key in Style]?: boolean }>[] = [];

    // Create new intervals between each pair of boundary points
    // Coordinates are relative to the range start (start = 0)
    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const segStart = sortedBoundaries[i];
      const segEnd = sortedBoundaries[i + 1];
      const segment = new Run(segStart, segEnd, null);
      const styles: { [key in Style]?: boolean } = {};

      // Check which styles have runs overlapping this segment
      for (const style of booleanStyles) {
        const runs = runsByStyle.get(style)!;
        const hasOverlap = runs.some((run) => run.overlaps(segment));
        if (hasOverlap) {
          styles[style] = true;
        }
      }

      // Create run with coordinates relative to the range start
      result.push(new Run(segStart - start, segEnd - start, styles));
    }

    return result;
  }
}
