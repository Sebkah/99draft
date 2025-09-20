export type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  color?: string; // CSS color string
  fontFamily?: string;
  fontSize?: number; // in px
};

export type StyleRange = {
  start: number; // inclusive
  end: number; // exclusive
  style: TextStyle;
};

export class StyleManager {
  private ranges: StyleRange[] = [];

  getRanges(): StyleRange[] {
    return this.ranges;
  }

  // Insert characters at position; expand range if inserted inside
  onInsert(position: number, length: number): void {
    if (length <= 0) return;
    this.ranges = this.ranges.map((r) => {
      if (position <= r.start) {
        return { ...r, start: r.start + length, end: r.end + length };
      }
      if (position >= r.end) {
        return r; // before range
      }
      // inside the range: expand end so inserted text inherits style
      return { ...r, end: r.end + length };
    });
  }

  // Delete length characters starting at position
  onDelete(position: number, length: number): void {
    if (length <= 0) return;
    const delStart = position;
    const delEnd = position + length;
    const updated: StyleRange[] = [];
    for (const r of this.ranges) {
      // Case 1: range entirely before deletion
      if (r.end <= delStart) {
        updated.push(r);
        continue;
      }
      // Case 2: range entirely after deletion -> shift left
      if (r.start >= delEnd) {
        updated.push({ ...r, start: r.start - length, end: r.end - length });
        continue;
      }
      // Overlap exists
      const rightOverlap = r.end - Math.min(r.end, delEnd); // remaining part on the right after deletion

      const hadLeft = r.start < delStart;
      const hadRight = r.end > delEnd;

      if (hadLeft && hadRight) {
        // Split into two ranges: left part and right part (shifted left by length)
        updated.push({ start: r.start, end: delStart, style: { ...r.style } });
        updated.push({ start: delStart, end: delStart + rightOverlap, style: { ...r.style } });
      } else if (hadLeft) {
        // Keep left part only
        updated.push({ start: r.start, end: delStart, style: { ...r.style } });
      } else if (hadRight) {
        // Keep right part only, shifted left
        updated.push({ start: delStart, end: delStart + rightOverlap, style: { ...r.style } });
      } else {
        // Deletion fully covers the range -> drop it
      }
    }
    this.ranges = this.mergeAdjacent(updated);
  }

  applyStyle(
    start: number,
    end: number,
    updates: Partial<TextStyle>,
    mode: 'set' | 'toggle' = 'set',
  ) {
    if (end <= start) return;
    // collect cut points
    const points = new Set<number>([start, end]);
    for (const r of this.ranges) {
      points.add(r.start);
      points.add(r.end);
    }
    const cuts = Array.from(points).sort((a, b) => a - b);

    const segs: StyleRange[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i];
      const b = cuts[i + 1];
      if (b <= a) continue;
      // base style from existing ranges (there should be at most one due to invariants)
      const base = this.getStyleAt(a);
      const inside = a < end && b > start; // segment intersects target
      if (!inside) {
        if (base) segs.push({ start: a, end: b, style: { ...base } });
        continue;
      }
      // inside: merge styles
      const newStyle: TextStyle = { ...(base || {}) };
      if (mode === 'set') {
        if (updates.bold !== undefined) newStyle.bold = updates.bold;
        if (updates.italic !== undefined) newStyle.italic = updates.italic;
        if (updates.color !== undefined) newStyle.color = updates.color || undefined;
        if (updates.fontFamily !== undefined) newStyle.fontFamily = updates.fontFamily || undefined;
        if (updates.fontSize !== undefined) newStyle.fontSize = updates.fontSize || undefined;
      } else {
        if (updates.bold !== undefined) newStyle.bold = !newStyle.bold;
        if (updates.italic !== undefined) newStyle.italic = !newStyle.italic;
        if (updates.color !== undefined) newStyle.color = updates.color;
        // For fonts, treat toggle as set if provided
        if (updates.fontFamily !== undefined) newStyle.fontFamily = updates.fontFamily || undefined;
        if (updates.fontSize !== undefined) newStyle.fontSize = updates.fontSize || undefined;
      }
      // Only push if style has at least one property set
      const hasAny =
        !!newStyle.bold ||
        !!newStyle.italic ||
        !!newStyle.color ||
        !!newStyle.fontFamily ||
        newStyle.fontSize !== undefined;
      if (hasAny) {
        segs.push({ start: a, end: b, style: newStyle });
      } else if (base) {
        // preserve base if updates cleared everything
        segs.push({ start: a, end: b, style: { ...base } });
      }
    }
    this.ranges = this.mergeAdjacent(segs);
  }

  clearStyle(start: number, end: number, keys: Array<keyof TextStyle>) {
    if (end <= start) return;
    this.splitAt(start);
    this.splitAt(end);
    this.ranges = this.ranges.map((r) => {
      if (r.end <= start || r.start >= end) return r;
      const style = { ...r.style };
      for (const k of keys) delete style[k];
      return { ...r, style };
    });
    this.ranges = this.mergeAdjacent(this.ranges);
  }

  getRunsForRange(
    start: number,
    end: number,
  ): Array<{ start: number; end: number; style?: TextStyle }> {
    if (end <= start) return [];
    const runs: Array<{ start: number; end: number; style?: TextStyle }> = [];
    let pos = start;
    // iterate over ranges that intersect [start,end)
    const relevant = this.ranges
      .filter((r) => r.start < end && r.end > start)
      .sort((a, b) => a.start - b.start);
    for (const r of relevant) {
      if (pos < Math.max(start, r.start)) {
        runs.push({ start: pos, end: Math.max(start, r.start) });
        pos = Math.max(start, r.start);
      }
      const segStart = Math.max(pos, r.start);
      const segEnd = Math.min(end, r.end);
      if (segEnd > segStart) {
        runs.push({ start: segStart, end: segEnd, style: r.style });
        pos = segEnd;
      }
    }
    if (pos < end) runs.push({ start: pos, end });
    return runs;
  }

  getStyleAt(position: number): TextStyle | undefined {
    for (const r of this.ranges) {
      if (position >= r.start && position < r.end) return r.style;
    }
    return undefined;
  }

  private splitAt(position: number) {
    const out: StyleRange[] = [];
    for (const r of this.ranges) {
      if (position <= r.start || position >= r.end) {
        out.push(r);
      } else {
        // split into [start, position) and [position, end)
        out.push({ start: r.start, end: position, style: { ...r.style } });
        out.push({ start: position, end: r.end, style: { ...r.style } });
      }
    }
    this.ranges = out;
  }

  private mergeAdjacent(ranges: StyleRange[]): StyleRange[] {
    if (ranges.length === 0) return ranges;
    const sorted = ranges.slice().sort((a, b) => a.start - b.start);
    const merged: StyleRange[] = [];
    for (const r of sorted) {
      if (r.start >= r.end) continue;
      const last = merged[merged.length - 1];
      if (last && last.end === r.start && this.sameStyle(last.style, r.style)) {
        last.end = r.end;
      } else {
        merged.push({ start: r.start, end: r.end, style: { ...r.style } });
      }
    }
    return merged;
  }

  private sameStyle(a: TextStyle, b: TextStyle): boolean {
    return (
      !!a.bold === !!b.bold &&
      !!a.italic === !!b.italic &&
      (a.color || '') === (b.color || '') &&
      (a.fontFamily || '') === (b.fontFamily || '') &&
      (a.fontSize || 0) === (b.fontSize || 0)
    );
  }
}
