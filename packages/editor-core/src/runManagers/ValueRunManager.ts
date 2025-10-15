import { RunManager } from './RunManager';
import { Run } from '../structures/Run';

export class ValueRunManager<T extends {} | null> extends RunManager<T> {
  /**
   * Sets a value for a text range, properly handling overlaps by splitting existing runs.
   * When the new range overlaps with existing runs, it splits them at boundaries and replaces
   * the overlapping portions with the new value.
   */
  setValue(start: number, end: number, value: T) {
    console.log(`ValueRunManager.setValue: applying ${value} to range ${start}-${end}`);

    // If the entire range already has this value, do nothing
    const currentValue = this.getValueOverRange(start, end);
    if (currentValue !== undefined && this.valuesEqual(currentValue, value)) {
      console.log(`ValueRunManager.setValue: range already has value ${currentValue}, skipping`);
      return;
    }

    const selection = new Run(start, end, value);

    // Find all intervals that overlap with the selection
    const overlappingNodes = this.tree.findOverlappingNodes(selection);
    console.log(`ValueRunManager.setValue: found ${overlappingNodes.length} overlapping runs`);

    // Collect all parts of overlapping runs that should be preserved
    const preservedRuns: Run<T>[] = [];

    for (const node of overlappingNodes) {
      const interval = node.interval;
      console.log(
        `ValueRunManager.setValue: processing overlapping run ${interval.start}-${interval.end} with value ${interval.data}`,
      );

      // Left part: if the run starts before the selection
      if (interval.start < start) {
        const leftEnd = Math.min(interval.end, start);
        if (leftEnd > interval.start) {
          preservedRuns.push(new Run(interval.start, leftEnd, interval.data));
          console.log(
            `ValueRunManager.setValue: preserving left part ${interval.start}-${leftEnd} with value ${interval.data}`,
          );
        }
      }

      // Right part: if the run ends after the selection
      if (interval.end > end) {
        const rightStart = Math.max(interval.start, end);
        if (rightStart < interval.end) {
          preservedRuns.push(new Run(rightStart, interval.end, interval.data));
          console.log(
            `ValueRunManager.setValue: preserving right part ${rightStart}-${interval.end} with value ${interval.data}`,
          );
        }
      }
    }

    // Remove all overlapping intervals
    for (const node of overlappingNodes) {
      this.tree.delete(node.interval);
    }

    // Insert the preserved parts
    for (const run of preservedRuns) {
      this.tree.insert(run);
    }

    // Insert the new interval
    console.log(`ValueRunManager.setValue: inserting new run ${start}-${end} with value ${value}`);
    this.tree.insert(selection);

    // Try to merge with adjacent intervals of the same value
    this.mergeAdjacentRuns(start, end, value);
  }

  /**
   * Helper method to merge adjacent runs with the same value
   */
  private mergeAdjacentRuns(start: number, end: number, value: T) {
    // Check for merge with previous interval
    const prevNodes = this.tree.findInRangeNodes(-Infinity, start);
    if (prevNodes.length > 0) {
      const prevNode = prevNodes[prevNodes.length - 1];
      if (prevNode.interval.end === start && this.valuesEqual(prevNode.interval.data, value)) {
        // Merge with previous
        const mergedStart = prevNode.interval.start;
        const mergedEnd = end;
        this.tree.delete(prevNode.interval);
        this.tree.delete(new Run(start, end, value));
        this.tree.insert(new Run(mergedStart, mergedEnd, value));
        return; // Don't check next since we modified the tree
      }
    }

    // Check for merge with next interval
    const nextNodes = this.tree.findInRangeNodes(end, Infinity);
    if (nextNodes.length > 0) {
      const nextNode = nextNodes[0];
      if (nextNode.interval.start === end && this.valuesEqual(nextNode.interval.data, value)) {
        // Merge with next
        const mergedStart = start;
        const mergedEnd = nextNode.interval.end;
        this.tree.delete(nextNode.interval);
        this.tree.delete(new Run(start, end, value));
        this.tree.insert(new Run(mergedStart, mergedEnd, value));
      }
    }
  }

  /**
   * Gets the value at a specific position
   * @param position - The position to check
   * @returns The value at the position, or undefined if no value is set
   */
  getValueAt(position: number): T | undefined {
    const nodes = this.tree.findContainingNodes(position);
    return nodes.length > 0 ? nodes[0].interval.data : undefined;
  }

  /**
   * Gets the value over a range. Returns the value if the entire range has the same value,
   * otherwise returns undefined.
   * @param start - Start of the range
   * @param end - End of the range
   * @returns The consistent value over the range, or undefined if inconsistent or no value
   */
  getValueOverRange(start: number, end: number): T | undefined {
    const selection = new Run(start, end, null) as Run<T>;
    const overlappingNodes = this.tree.findOverlappingNodes(selection);

    if (overlappingNodes.length === 0) {
      return undefined;
    }

    // Check if the range is fully covered by runs with the same value
    const intervals = overlappingNodes.map((node) => node.interval);
    const isFullyCovered = (selection as Run<null>).isCoveredBy(intervals as Run<null>[]);

    if (!isFullyCovered) {
      return undefined;
    }

    // Check if all overlapping intervals have the same value
    const firstValue = intervals[0].data;
    for (const interval of intervals) {
      if (!this.valuesEqual(interval.data, firstValue)) {
        return undefined;
      }
    }

    return firstValue;
  }

  /**
   * Gets all runs that overlap with the specified range
   * @param start - Start of the range
   * @param end - End of the range
   * @returns Array of overlapping runs
   */
  getRunsOverlappingRange(start: number, end: number): Run<T>[] {
    const selection = new Run(start, end, null) as Run<T>;
    const overlappingNodes = this.tree.findOverlappingNodes(selection);
    return overlappingNodes.map((node) => node.interval);
  }

  /**
   * Helper method to compare values for equality
   * Override this method if custom equality logic is needed for complex types
   */
  protected valuesEqual(a: T, b: T): boolean {
    return a === b;
  }
}
