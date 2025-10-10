import { Run } from '../structures/Run';
import { RedBlackIntervalTree } from '../structures/RedBlackIntervalTree';
import { Editor } from '../core/Editor';

export abstract class RunManager<T extends {} | null> {
  protected tree = new RedBlackIntervalTree<T>();

  constructor(editor: Editor) {
    editor.on('afterInsertion', ({ position, length }) => {
      console.log('RunManager detected insertion at', position, 'length', length);
      this.onTextInsertion(position, length);
    });
    editor.on('afterDeletion', ({ position, length }) => {
      this.onTextDeletion(position, length);
    });
  }

  onTextInsertion(position: number, length: number): void {
    const rootNode = this.tree.getRoot();
    if (!rootNode) return;

    // 1. Find all intervals containing the insertion position and extend their end
    // No need to reinsert since start position (BST key) doesn't change
    const containingNodes = this.tree.findContainingNodes(position);

    for (const node of containingNodes) {
      node.interval.end += length;
      // Update maxEndValue augmentation for this node and ancestors
      this.tree.updateNodeAndAncestors(node);
    }

    // 2. Find all intervals starting at or after the insertion position and shift them
    // Must reinsert since start position (BST key) changes
    const affectedNodes = this.tree.findInRangeNodes(position, Infinity);
    const updatedAffected: Run<T>[] = [];

    for (const node of affectedNodes) {
      const interval = node.interval;
      this.tree.delete(interval);
      updatedAffected.push(new Run(interval.start + length, interval.end + length, interval.data));
    }

    // 3. Re-insert shifted intervals (tree will rebalance and maintain BST property)
    for (const interval of updatedAffected) {
      this.tree.insert(interval);
    }
  }

  onTextDeletion(position: number, length: number): void {
    const rootNode = this.tree.getRoot();
    if (!rootNode) return;

    const deleteEnd = position + length;

    // 1. Find all intervals that overlap with the deleted range
    const deletionRange = new Run(position, deleteEnd, null as T);
    const overlappingNodes = this.tree.findOverlappingNodes(deletionRange);

    for (const node of overlappingNodes) {
      const interval = node.interval;

      // XXX: this may be a reason to rethink findOverlappingNodes implementation
      // findOverlap is inclusive on both ends, so intervals that overlap at the boundary
      // but do not actually cover any deleted text will be returned. Skip these.
      if (interval.end <= position || interval.start >= deleteEnd) {
        // No actual overlap, skip
        continue;
      }

      this.tree.delete(interval);

      // Case 1: Interval completely within deleted range - don't reinsert
      if (interval.start >= position && interval.end <= deleteEnd) {
        continue;
      }

      // Case 2: Interval starts before and ends after deletion - shrink
      if (interval.start < position && interval.end > deleteEnd) {
        this.tree.insert(new Run(interval.start, interval.end - length, interval.data));
      }
      // Case 3: Interval starts before deletion - trim the end
      else if (interval.start < position && interval.end > position) {
        this.tree.insert(new Run(interval.start, position, interval.data));
      }
      // Case 4: Interval ends after deletion - trim the start and shift
      else if (interval.start < deleteEnd && interval.end > deleteEnd) {
        this.tree.insert(new Run(position, interval.end - length, interval.data));
      }
    }

    // 2. Find all intervals starting at or after the deletion end and shift them back
    const affectedNodes = this.tree.findInRangeNodes(deleteEnd, Infinity);
    const updatedAffected: Run<T>[] = [];

    for (const node of affectedNodes) {
      const interval = node.interval;
      this.tree.delete(interval);
      updatedAffected.push(new Run(interval.start - length, interval.end - length, interval.data));
    }

    // 3. Re-insert shifted intervals
    for (const interval of updatedAffected) {
      this.tree.insert(interval);
    }
  }

  abstract getRunsOverlappingRange(start: number, end: number): Run<T>[];
}
