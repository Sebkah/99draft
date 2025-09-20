export class CursorManager {
  position: number;
  private anchor: number | null = null; // selection anchor, null when no selection

  constructor(initialPosition = 0) {
    this.position = initialPosition;
  }

  setPosition(pos: number, extendSelection = false) {
    if (!extendSelection) {
      this.anchor = null;
    } else if (this.anchor === null) {
      this.anchor = this.position;
    }
    this.position = Math.max(0, pos);
  }

  clearSelection() {
    this.anchor = null;
  }

  hasSelection(): boolean {
    const sel = this.getSelection();
    return !!sel && sel.end > sel.start;
  }

  getSelection(): { start: number; end: number } | null {
    if (this.anchor === null || this.anchor === this.position) return null;
    const start = Math.min(this.anchor, this.position);
    const end = Math.max(this.anchor, this.position);
    return { start, end };
  }
}
