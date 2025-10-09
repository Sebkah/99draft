/**
 * Represents an interval with start, end positions and associated data
 */
export class Run<T extends {} | null> {
  constructor(
    public start: number,
    public end: number,
    public data: T,
  ) {}

  contains(position: number): boolean;
  contains(other: Run<T>): boolean;
  /**
   * Checks if a position or another interval is contained within this interval.
   *
   * For a position (number): Inclusive of start, exclusive of end (i.e., start <= position < end).
   * For another interval: Inclusive of both start and end (i.e., this.start <= other.start and this.end >= other.end).
   * Equal intervals contain each other.
   *
   * @param positionOrOther - A position (number) or another Interval to check.
   * @returns True if the position or interval is contained, false otherwise.
   */
  contains(positionOrOther: number | Run<T>): boolean {
    if (typeof positionOrOther === 'number') {
      return this.start <= positionOrOther && positionOrOther < this.end;
    } else {
      return this.start <= positionOrOther.start && this.end >= positionOrOther.end;
    }
  }
  isContainedBy(other: Run<T>): boolean {
    return other.contains(this);
  }

  /**
   * Checks if this interval is fully covered by a collection of intervals.
   * Returns true only if every position in this interval is covered by at least one interval
   * in the provided array, with no gaps.
   *
   * @param intervals - Array of intervals to check coverage against
   * @returns True if this interval is completely covered with no gaps, false otherwise
   *
   * @example
   * ```typescript
   * const selection = new Run(0, 10, null);
   * const covered = selection.isCoveredBy([
   *   new Run(0, 5, null),
   *   new Run(5, 10, null)
   * ]); // true - no gaps
   *
   * const notCovered = selection.isCoveredBy([
   *   new Run(0, 5, null),
   *   new Run(7, 10, null)
   * ]); // false - gap at [5, 7)
   * ```
   */
  isCoveredBy(intervals: Run<T>[]): boolean {
    // No intervals means this range is not covered
    if (intervals.length === 0) {
      return false;
    }

    // Sort intervals by start position to check coverage sequentially
    const sorted = [...intervals].sort((a, b) => a.start - b.start);

    // Check if coverage starts at or before this interval's start
    if (sorted[0].start > this.start) {
      return false;
    }

    // Track the end of coverage as we process intervals
    let coverEnd = sorted[0].end;

    // Check each subsequent interval for gaps
    for (let i = 1; i < sorted.length; i++) {
      // If there's a gap between intervals, this range is not fully covered
      if (sorted[i].start > coverEnd) {
        return false;
      }
      // Extend coverage to the maximum end seen so far
      coverEnd = Math.max(coverEnd, sorted[i].end);
    }

    // Check if coverage extends to or beyond this interval's end
    return coverEnd >= this.end;
  }

  overlaps(other: Run<T>): boolean {
    return this.start < other.end && other.start < this.end;
  }
  isEqual(other: Run<T>): boolean {
    return this.start === other.start && this.end === other.end;
  }

  union(others: Run<T>[], skipOverlappingCheck: true): Run<T>;
  union(others: Run<T>[]): {
    union: Run<T> | null;
    nonOverlapping: Run<T>[];
  };
  union(
    others: Run<T>[],
    skipOverlappingCheck?: true,
  ): Run<T> | { union: Run<T> | null; nonOverlapping: Run<T>[] } {
    if (skipOverlappingCheck) {
      let min = this.start;
      let max = this.end;
      for (const other of others) {
        min = Math.min(min, other.start);
        max = Math.max(max, other.end);
      }
      return new Run(min, max, this.data);
    } else {
      let overlapping: Run<T>[] = [];
      let nonOverlapping: Run<T>[] = [];
      for (const other of others) {
        if (this.overlaps(other)) {
          overlapping.push(other);
        } else {
          nonOverlapping.push(other);
        }
      }
      let all = [this, ...overlapping];
      let min = Math.min(...all.map((i) => i.start));
      let max = Math.max(...all.map((i) => i.end));
      let union = all.length > 0 ? new Run(min, max, this.data) : null;
      return { union, nonOverlapping };
    }
  }
}
