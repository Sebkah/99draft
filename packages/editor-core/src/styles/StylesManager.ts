import { Editor } from '../core/Editor';
import { BooleanRunManager } from '../runManagers/BooleanRunManager';
import { ValueRunManager } from '../runManagers/ValueRunManager';
import { Run } from '../structures/Run';

const booleanStyles = ['bold', 'italic', 'underline', 'strikethrough'] as const;
const valueStyles = ['color'] as const;
type BooleanStyle = (typeof booleanStyles)[number];
type ValueStyle = (typeof valueStyles)[number];
type Style = BooleanStyle | ValueStyle;

export type Styles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
};

export class StylesManager {
  private runManagers: Map<Style, BooleanRunManager | ValueRunManager<string>>;

  private pendingStyle: Styles | null = null;

  setPendingStyle(style: BooleanStyle, position: number) {
    if (!this.pendingStyle) {
      this.pendingStyle = {};
    }

    //Set it to the inverse of current state
    const currentStyles = this.getStylesAt(position);
    this.pendingStyle[style] = !currentStyles[style];
  }

  constructor(editor: Editor, initialStyles?: Run<{ [key in Style]?: boolean | string }>[]) {
    this.runManagers = new Map();
    for (const style of booleanStyles) {
      this.runManagers.set(style, new BooleanRunManager(editor));
    }
    for (const style of valueStyles) {
      this.runManagers.set(style, new ValueRunManager<string>(editor));
    }

    if (initialStyles) {
      for (const run of initialStyles) {
        for (const style of booleanStyles) {
          const manager = this.runManagers.get(style) as BooleanRunManager;
          if (run.data && run.data[style]) {
            manager.enableStyle(run.start, run.end);
          }
        }
        for (const style of valueStyles) {
          const manager = this.runManagers.get(style) as ValueRunManager<string>;
          const value = run.data?.[style];
          if (value && typeof value === 'string') {
            manager.setValue(run.start, run.end, value);
          }
        }
      }
    }

    editor.on('afterInsertion', ({ position, length }) => {
      if (this.pendingStyle) {
        for (const style of Object.keys(this.pendingStyle) as BooleanStyle[]) {
          const manager = this.runManagers.get(style) as BooleanRunManager;
          manager.enableStyle(position, position + length);
        }
        this.pendingStyle = null;
      }
    });
  }

  toggleStyle(style: Style, start: number, end: number) {
    if (booleanStyles.includes(style as BooleanStyle)) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      manager.toggleStyle(start, end);
    }
  }

  enableStyle(style: BooleanStyle, start: number, end: number) {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    manager.enableStyle(start, end);
  }

  disableStyle(style: BooleanStyle, start: number, end: number) {
    const manager = this.runManagers.get(style) as BooleanRunManager;
    manager.disableStyle(start, end);
  }

  setValue(style: ValueStyle, start: number, end: number, value: string) {
    const manager = this.runManagers.get(style) as ValueRunManager<string>;
    manager.setValue(start, end, value);
  }

  /**
   * Get the value of a specific style at a given position
   * @param style - The style to check
   * @param position - The position to check
   * @returns true if the style is active at the position, false otherwise for boolean styles; string value for value styles
   */
  getStyleValueAt(style: Style, position: number): boolean | string | undefined {
    if (booleanStyles.includes(style as BooleanStyle)) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      return manager.getRunValueAt(position);
    } else {
      const manager = this.runManagers.get(style) as ValueRunManager<string>;
      return manager.getValueAt(position);
    }
  }

  /**
   * Get all active styles at a given position
   * @param position - The position to check
   * @returns An object with boolean flags for boolean styles and string values for value styles
   */
  getStylesAt(position: number): Styles {
    const styles: Styles = {};
    if (this.pendingStyle) {
      return this.pendingStyle;
    }

    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      const isActive = manager.getRunValueAt(position);
      if (isActive) {
        styles[style] = true;
      }
    }
    for (const style of valueStyles) {
      const manager = this.runManagers.get(style) as ValueRunManager<string>;
      const value = manager.getValueAt(position);
      if (value !== undefined) {
        styles[style] = value;
      }
    }
    return styles;
  }

  getStylesOverRange(start: number, end: number): Styles {
    const styles: Styles = {};
    for (const style of booleanStyles) {
      const manager = this.runManagers.get(style) as BooleanRunManager;
      const isActive = manager.getRunValueOverRange(start, end);
      if (isActive) {
        styles[style] = true;
      }
    }
    for (const style of valueStyles) {
      const manager = this.runManagers.get(style) as ValueRunManager<string>;
      const value = manager.getValueOverRange(start, end);
      if (value !== undefined) {
        styles[style] = value;
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

  getRunsOverlappingRange(start: number, end: number, styleFilter?: Array<Style>): Run<Styles>[] {
    // Get all runs from all styles that overlap with the range, keeping track of which style each run belongs to
    const runsByStyle = new Map<Style, Run<null | string>[]>();
    for (const style of booleanStyles) {
      if (styleFilter && !styleFilter.includes(style)) continue;

      const manager = this.runManagers.get(style) as BooleanRunManager;
      runsByStyle.set(style, manager.getRunsOverlappingRange(start, end));
    }
    for (const style of valueStyles) {
      if (styleFilter && !styleFilter.includes(style)) continue;

      const manager = this.runManagers.get(style) as ValueRunManager<string>;
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
    const result: Run<Styles>[] = [];

    // Create new intervals between each pair of boundary points
    // Coordinates are relative to the range start (start = 0)
    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const segStart = sortedBoundaries[i];
      const segEnd = sortedBoundaries[i + 1];
      const segment = new Run(segStart, segEnd, null);
      // Create run with coordinates relative to the range start
      const runData: Styles = {} as Styles;

      // Check which styles have runs overlapping this segment
      for (const style of booleanStyles) {
        if (styleFilter && !styleFilter.includes(style)) continue;
        const runs = runsByStyle.get(style)!;
        const hasOverlap = runs.some((run) => run.overlaps(segment));
        if (hasOverlap) {
          runData[style] = true;
        }
      }
      for (const style of valueStyles) {
        if (styleFilter && !styleFilter.includes(style)) continue;
        const runs = runsByStyle.get(style)!;
        // For value styles, we need to find the value from overlapping runs
        const overlappingRuns = runs.filter((run) => run.overlaps(segment));
        if (overlappingRuns.length > 0 && overlappingRuns[0].data !== null) {
          // Take the value from the first overlapping run (they should be consistent)
          runData[style] = overlappingRuns[0].data;
        }
      }

      result.push(new Run(segStart - start, segEnd - start, runData));
    }

    return result;
  }
}
