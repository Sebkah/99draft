import { RunManager } from './RunManager';
import { Run } from '../structures/Run';

export class BooleanRunManager extends RunManager<null> {
  /**
   * Toggles formatting for a text range using standard text editor behavior:
   * - Unformatted selection → Apply formatting
   * - Fully formatted selection → Remove formatting (creates a "hole")
   * - Partially formatted selection → Extend formatting to entire selection
   *
   * This assumes and enforces that intervals are always disjoint (non-overlapping, non-adjacent).
   */
  toggleStyle(start: number, end: number) {
    const selection = new Run(start, end, null);

    // Find all intervals that overlap with the selection
    const overlappingNodes = this.tree.findOverlappingNodes(selection);

    // Case 0: No formatting exists in this range - apply formatting
    // Example:
    //   Intervals: |-----|         |-----|
    //   Selection:         |~~~~~|
    //   Result:    |-----| |~~~~~| |-----|
    if (overlappingNodes.length === 0) {
      this.tree.insert(new Run(start, end, null));
      return;
    }

    // Case 1: Selection is completely within a single formatted interval - remove formatting
    // This creates a "hole" by splitting the interval into up to two parts
    // Example:
    //   Intervals: |------------------|
    //   Selection:     |~~~~~~~|
    //   Result:    |---|       |------|
    if (overlappingNodes.length === 1 && overlappingNodes[0].interval.contains(selection)) {
      const node = overlappingNodes[0];
      this.tree.delete(node.interval);

      // Insert left part if it exists (before selection)
      if (node.interval.start < selection.start) {
        this.tree.insert(new Run(node.interval.start, selection.start, null));
      }

      // Insert right part if it exists (after selection)
      if (selection.end < node.interval.end) {
        this.tree.insert(new Run(selection.end, node.interval.end, null));
      }
      return;
    }

    // Case 2: Selection partially overlaps or spans multiple intervals - extend formatting
    // Merge the selection with all overlapping intervals to create one continuous formatted range
    // Example:
    //   Intervals: |-----|     |-----|
    //   Selection:    |~~~~~~~~~~~~~|
    //   Result:    |-----------------|
    const union = selection.union(
      overlappingNodes.map((node) => node.interval),
      true,
    );

    // Remove all the old overlapping intervals
    for (const node of overlappingNodes) {
      this.tree.delete(node.interval);
    }

    // Insert the merged interval covering the entire range
    this.tree.insert(union);
  }

  enableStyle(start: number, end: number) {
    const selection = new Run(start, end, null);
    // Find all intervals that overlap with the selection
    const overlappingNodes = this.tree.findOverlappingNodes(selection);
    if (overlappingNodes.length === 0) {
      this.tree.insert(new Run(start, end, null));
      return;
    }
    const union = selection.union(
      overlappingNodes.map((node) => node.interval),
      true,
    );
    for (const node of overlappingNodes) {
      this.tree.delete(node.interval);
    }
    this.tree.insert(union);
  }

  disableStyle(start: number, end: number) {
    // Use toggle twice to remove formatting
    this.toggleStyle(start, end);
    this.toggleStyle(start, end);
  }

  getStyleValueAt(position: number): boolean {
    const nodes = this.tree.findOverlappingNodes(new Run(position, position + 1, null));
    return nodes.length > 0;
  }

  /**
   * Checks if the entire range [start, end) is fully covered by formatting.
   * Returns true only if every position in the range is formatted (no gaps).
   */
  getStyleValueOverRange(start: number, end: number): boolean {
    const selection = new Run(start, end, null);
    const overlappingNodes = this.tree.findOverlappingNodes(selection);
    const intervals = overlappingNodes.map((node) => node.interval);
    return selection.isCoveredBy(intervals);
  }

  getRunsOverlappingRange(start: number, end: number): Run<null>[] {
    const selection = new Run(start, end, null);
    const overlappingNodes = this.tree.findOverlappingNodes(selection);
    return overlappingNodes.map((node) => node.interval);
  }
}
