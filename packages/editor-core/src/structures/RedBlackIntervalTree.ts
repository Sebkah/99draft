/**
 * Augmented Red-Black Interval Tree Implementation
 *
 * This implementation provides an interval tree that stores intervals with associated style strings.
 * The tree is augmented with maxEndValue to enable efficient interval overlap queries.
 *
 * Key features:
 * - Red-black tree balancing for O(log n) operations
 * - Interval augmentation with maxEndValue for efficient overlap detection
 * - Style string storage for each interval
 * - Support for overlapping interval queries
 */

/**
 * Represents an interval with start, end positions and associated style
 */
export interface Interval {
  start: number;
  end: number;
  style: string;
}

/**
 * Color enumeration for red-black tree nodes
 */
export enum NodeColor {
  RED = 'RED',
  BLACK = 'BLACK',
}

/**
 * Red-Black tree node with interval tree augmentation
 *
 * Each node represents a single interval and maintains:
 * 1. Standard BST properties (left/right children, parent pointer)
 * 2. Red-Black tree properties (color)
 * 3. Interval tree augmentation (maxEndValue for efficient queries)
 */
export class RedBlackNode {
  interval: Interval; // The interval data stored in this node
  color: NodeColor; // Red or Black color for RB tree balancing
  parent: RedBlackNode | null; // Pointer to parent node (null for root)
  left: RedBlackNode | null; // Pointer to left child
  right: RedBlackNode | null; // Pointer to right child

  // Augmentation: maximum end value in the subtree rooted at this node
  // This enables efficient pruning during interval overlap queries
  maxEndValue: number;

  /**
   * Creates a new Red-Black tree node
   * @param interval - The interval to store in this node
   * @param color - The initial color (defaults to RED for new insertions)
   */
  constructor(interval: Interval, color: NodeColor = NodeColor.RED) {
    this.interval = interval;
    this.color = color;
    this.parent = null;
    this.left = null;
    this.right = null;
    // Initialize maxEndValue to this node's end value
    // Will be updated as children are added
    this.maxEndValue = interval.end;
  }

  /**
   * Updates the maxEndValue for this node based on its interval and children
   *
   * This method maintains the interval tree augmentation by calculating
   * the maximum end value among:
   * 1. This node's interval end value
   * 2. Left subtree's maximum end value (if exists)
   * 3. Right subtree's maximum end value (if exists)
   *
   * Time Complexity: O(1)
   */
  updateMaxEndValue(): void {
    // Start with this node's end value
    this.maxEndValue = this.interval.end;

    // Check if left child has a larger maxEndValue
    if (this.left && this.left.maxEndValue > this.maxEndValue) {
      this.maxEndValue = this.left.maxEndValue;
    }

    // Check if right child has a larger maxEndValue
    if (this.right && this.right.maxEndValue > this.maxEndValue) {
      this.maxEndValue = this.right.maxEndValue;
    }
  }

  /**
   * Checks if this node is a red node
   * @returns true if the node is red, false otherwise
   */
  isRed(): boolean {
    return this.color === NodeColor.RED;
  }

  /**
   * Checks if this node is a black node
   * @returns true if the node is black, false otherwise
   */
  isBlack(): boolean {
    return this.color === NodeColor.BLACK;
  }
}

/**
 * Augmented Red-Black Interval Tree
 *
 * Maintains intervals in a red-black tree structure with augmentation for efficient
 * interval overlap queries. Each node stores the maximum end value in its subtree.
 */
export class RedBlackIntervalTree {
  private root: RedBlackNode | null;
  private size: number;

  constructor() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Gets the current size of the tree
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Checks if the tree is empty
   */
  isEmpty(): boolean {
    return this.root === null;
  }

  /**
   * Gets the root node of the tree
   */
  getRoot(): RedBlackNode | null {
    return this.root;
  }

  /**
   * Performs a left rotation on the given node
   *
   * Left rotation transforms:
   *       x                y
   *      / \              / \
   *     a   y     =>     x   c
   *        / \          / \
   *       b   c        a   b
   *
   * This operation:
   * 1. Moves y up to x's position
   * 2. Makes x the left child of y
   * 3. Makes y's left subtree (b) the right subtree of x
   * 4. Updates parent pointers appropriately
   * 5. Maintains the maxEndValue augmentation
   *
   * Used during red-black tree balancing operations.
   *
   * Time Complexity: O(1)
   * Maintains: BST property, maxEndValue augmentation
   *
   * @param x - The node to rotate (becomes left child after rotation)
   */
  private rotateLeft(x: RedBlackNode): void {
    const y = x.right!; // y will become the new root of this subtree
    x.right = y.left; // Transfer y's left subtree to x's right

    // Update parent pointer of transferred subtree
    if (y.left !== null) {
      y.left.parent = x;
    }

    // Make y take x's place in the tree
    y.parent = x.parent;

    if (x.parent === null) {
      // x was the root, so y becomes new root
      this.root = y;
    } else if (x === x.parent.left) {
      // x was a left child
      x.parent.left = y;
    } else {
      // x was a right child
      x.parent.right = y;
    }

    // Complete the rotation: make x the left child of y
    y.left = x;
    x.parent = y;

    // CRITICAL: Update maxEndValue for affected nodes (bottom-up order)
    // x must be updated first since it's now a child of y
    x.updateMaxEndValue();
    y.updateMaxEndValue();
  }

  /**
   * Performs a right rotation on the given node
   *
   * Right rotation transforms:
   *       y                x
   *      / \              / \
   *     x   c     =>     a   y
   *    / \                  / \
   *   a   b                b   c
   *
   * This is the mirror operation of left rotation:
   * 1. Moves x up to y's position
   * 2. Makes y the right child of x
   * 3. Makes x's right subtree (b) the left subtree of y
   * 4. Updates parent pointers appropriately
   * 5. Maintains the maxEndValue augmentation
   *
   * Used during red-black tree balancing operations.
   *
   * Time Complexity: O(1)
   * Maintains: BST property, maxEndValue augmentation
   *
   * @param y - The node to rotate (becomes right child after rotation)
   */
  private rotateRight(y: RedBlackNode): void {
    const x = y.left!; // x will become the new root of this subtree
    y.left = x.right; // Transfer x's right subtree to y's left

    // Update parent pointer of transferred subtree
    if (x.right !== null) {
      x.right.parent = y;
    }

    // Make x take y's place in the tree
    x.parent = y.parent;

    if (y.parent === null) {
      // y was the root, so x becomes new root
      this.root = x;
    } else if (y === y.parent.left) {
      // y was a left child
      y.parent.left = x;
    } else {
      // y was a right child
      y.parent.right = x;
    }

    // Complete the rotation: make y the right child of x
    x.right = y;
    y.parent = x;

    // CRITICAL: Update maxEndValue for affected nodes (bottom-up order)
    // y must be updated first since it's now a child of x
    y.updateMaxEndValue();
    x.updateMaxEndValue();
  }

  /**
   * Updates the maxEndValue for all ancestors of the given node
   *
   * This method is crucial for maintaining the interval tree augmentation
   * after insertions and deletions. It walks up the tree from the given
   * node to the root, updating each ancestor's maxEndValue.
   *
   * When to call this method:
   * - After inserting a new node (from the new node upward)
   * - After deleting a node (from the replacement node upward)
   * - After any structural change that might affect maxEndValue
   *
   * The maxEndValue represents the maximum end position of any interval
   * in the subtree rooted at that node. This enables efficient pruning
   * during interval overlap queries.
   *
   * Time Complexity: O(log n) - traverses at most the height of the tree
   *
   * @param node - Starting node (typically the lowest changed node)
   */
  private updateAncestorsMaxEndValue(node: RedBlackNode | null): void {
    // Walk up the tree from node to root, updating maxEndValue at each level
    while (node !== null) {
      node.updateMaxEndValue(); // Recalculate based on current children
      node = node.parent; // Move up to parent
    }
  }

  /**
   * Inserts a new interval into the tree
   * Maintains red-black tree properties and maxEndValue augmentation
   */
  insert(interval: Interval): void {
    const newNode = new RedBlackNode(interval);

    if (this.root === null) {
      this.root = newNode;
      this.root.color = NodeColor.BLACK;
      this.size++;
      return;
    }

    // Standard BST insertion based on start position
    let current: RedBlackNode | null = this.root;
    let parent: RedBlackNode | null = null;

    while (current !== null) {
      parent = current;
      if (interval.start < current.interval.start) {
        current = current.left;
      } else if (interval.start > current.interval.start) {
        current = current.right;
      } else {
        // Handle equal start positions - compare by end position
        if (interval.end <= current.interval.end) {
          current = current.left;
        } else {
          current = current.right;
        }
      }
    }

    newNode.parent = parent;
    if (parent !== null) {
      if (interval.start < parent.interval.start) {
        parent.left = newNode;
      } else if (interval.start > parent.interval.start) {
        parent.right = newNode;
      } else {
        // Equal start positions
        if (interval.end <= parent.interval.end) {
          parent.left = newNode;
        } else {
          parent.right = newNode;
        }
      }
    }

    // Update maxEndValue for all ancestors
    this.updateAncestorsMaxEndValue(newNode);

    // Fix red-black tree violations
    this.insertFixup(newNode);
    this.size++;
  }

  /**
   * Fixes red-black tree violations after insertion
   */
  private insertFixup(node: RedBlackNode): void {
    while (node.parent !== null && node.parent.isRed()) {
      if (node.parent === node.parent.parent?.left) {
        const uncle = node.parent.parent?.right;

        if (uncle !== null && uncle !== undefined && uncle.isRed()) {
          // Case 1: Uncle is red
          node.parent.color = NodeColor.BLACK;
          uncle.color = NodeColor.BLACK;
          node.parent.parent!.color = NodeColor.RED;
          node = node.parent.parent!;
        } else {
          if (node === node.parent.right) {
            // Case 2: Node is right child
            node = node.parent;
            this.rotateLeft(node);
          }
          // Case 3: Node is left child
          node.parent!.color = NodeColor.BLACK;
          node.parent!.parent!.color = NodeColor.RED;
          this.rotateRight(node.parent!.parent!);
        }
      } else {
        const uncle = node.parent.parent?.left;

        if (uncle !== null && uncle !== undefined && uncle.isRed()) {
          // Case 1: Uncle is red
          node.parent.color = NodeColor.BLACK;
          uncle.color = NodeColor.BLACK;
          node.parent.parent!.color = NodeColor.RED;
          node = node.parent.parent!;
        } else {
          if (node === node.parent.left) {
            // Case 2: Node is left child
            node = node.parent;
            this.rotateRight(node);
          }
          // Case 3: Node is right child
          node.parent!.color = NodeColor.BLACK;
          node.parent!.parent!.color = NodeColor.RED;
          this.rotateLeft(node.parent!.parent!);
        }
      }
    }

    this.root!.color = NodeColor.BLACK;
  }

  /**
   * Deletes an interval from the tree
   *
   * This is the public interface for deletion. It:
   * 1. Finds the node containing the specified interval
   * 2. If found, delegates to deleteNode() for actual removal
   * 3. Updates the tree size and returns success status
   *
   * Time Complexity: O(log n)
   * Space Complexity: O(1)
   *
   * @param interval - The interval to delete (must match exactly: start, end, and style)
   * @returns true if the interval was found and deleted, false otherwise
   */
  delete(interval: Interval): boolean {
    // First, locate the node containing this exact interval
    const node = this.findNode(interval);
    if (node === null) {
      return false; // Interval not found in tree
    }

    // Perform the actual deletion with tree rebalancing
    this.deleteNode(node);
    this.size--;
    return true;
  }

  /**
   * Finds a node with the given interval using exact match
   *
   * This method performs a standard BST search but with a more complex
   * comparison function since intervals can have the same start position.
   *
   * Search order for tie-breaking:
   * 1. Compare by start position (primary key)
   * 2. If start positions equal, compare by end position
   * 3. If both start and end equal, compare by style string
   *
   * Time Complexity: O(log n)
   *
   * @param interval - The interval to search for
   * @returns The node containing the interval, or null if not found
   */
  private findNode(interval: Interval): RedBlackNode | null {
    let current = this.root;

    while (current !== null) {
      if (interval.start < current.interval.start) {
        // Target interval starts before current, go left
        current = current.left;
      } else if (interval.start > current.interval.start) {
        // Target interval starts after current, go right
        current = current.right;
      } else {
        // Same start position - need to check end and style for exact match
        if (interval.end === current.interval.end && interval.style === current.interval.style) {
          return current; // Exact match found!
        } else if (
          interval.end < current.interval.end ||
          (interval.end === current.interval.end && interval.style < current.interval.style)
        ) {
          // Target is "smaller" in our ordering, go left
          current = current.left;
        } else {
          // Target is "larger" in our ordering, go right
          current = current.right;
        }
      }
    }

    return null; // Not found
  }

  /**
   * Deletes a specific node from the tree
   *
   * This is the heart of Red-Black tree deletion. It handles three cases:
   * 1. Node has no left child (replace with right child)
   * 2. Node has no right child (replace with left child)
   * 3. Node has both children (replace with successor)
   *
   * The algorithm must maintain:
   * - BST property (in-order traversal gives sorted sequence)
   * - Red-Black tree properties (may require fixup)
   * - Interval tree augmentation (maxEndValue updates)
   *
   * Key variables:
   * - nodeToDelete: The node we want to remove from tree
   * - actualNodeToDelete: The node that will actually be spliced out
   * - originalColor: Color of the node being spliced out (determines if fixup needed)
   * - replacementNode: The node that takes the place of actualNodeToDelete
   *
   * Time Complexity: O(log n)
   *
   * @param nodeToDelete - The node to remove from the tree
   */
  private deleteNode(nodeToDelete: RedBlackNode): void {
    // Track which node will actually be removed from the tree
    let actualNodeToDelete = nodeToDelete;
    let originalColor = actualNodeToDelete.color;
    let replacementNode: RedBlackNode | null;

    if (nodeToDelete.left === null) {
      // CASE 1: Node has no left child
      // Replace nodeToDelete with its right child (which may be null)
      replacementNode = nodeToDelete.right;
      this.transplant(nodeToDelete, nodeToDelete.right);
    } else if (nodeToDelete.right === null) {
      // CASE 2: Node has no right child
      // Replace nodeToDelete with its left child
      replacementNode = nodeToDelete.left;
      this.transplant(nodeToDelete, nodeToDelete.left);
    } else {
      // CASE 3: Node has both children (most complex case)
      // We can't just remove nodeToDelete, so we:
      // 1. Find its successor (smallest node in right subtree)
      // 2. Replace nodeToDelete's data with successor's data
      // 3. Remove the successor node instead

      // Find the successor: minimum node in right subtree
      actualNodeToDelete = this.minimum(nodeToDelete.right);
      originalColor = actualNodeToDelete.color; // This color determines if fixup needed
      replacementNode = actualNodeToDelete.right; // Successor's right child replaces it

      if (actualNodeToDelete.parent === nodeToDelete) {
        // Special case: successor is direct right child of nodeToDelete
        // Just need to update parent pointer
        if (replacementNode !== null) {
          replacementNode.parent = actualNodeToDelete;
        }
      } else {
        // General case: successor is deeper in the right subtree
        // First, remove successor from its current position
        this.transplant(actualNodeToDelete, actualNodeToDelete.right);

        // Then, give successor the right subtree of nodeToDelete
        actualNodeToDelete.right = nodeToDelete.right;
        if (actualNodeToDelete.right !== null) {
          actualNodeToDelete.right.parent = actualNodeToDelete;
        }
      }

      // Now move successor to nodeToDelete's position
      this.transplant(nodeToDelete, actualNodeToDelete);

      // Give successor the left subtree of nodeToDelete
      actualNodeToDelete.left = nodeToDelete.left;
      if (actualNodeToDelete.left !== null) {
        actualNodeToDelete.left.parent = actualNodeToDelete;
      }

      // Successor inherits the color of nodeToDelete to maintain RB properties
      actualNodeToDelete.color = nodeToDelete.color;
    }

    // CRITICAL: Update maxEndValue augmentation
    // The maxEndValue of ancestors may have changed due to the deletion
    if (replacementNode !== null) {
      // Update from replacement node upward
      this.updateAncestorsMaxEndValue(replacementNode);
    } else if (actualNodeToDelete.parent !== null) {
      // If replacement is null, update from parent of deleted node
      this.updateAncestorsMaxEndValue(actualNodeToDelete.parent);
    }

    // RED-BLACK TREE FIXUP
    // If we removed a black node, we may have violated RB properties:
    // - Reduced black height on some paths
    // - May need to recolor and rotate to restore balance
    if (originalColor === NodeColor.BLACK && replacementNode !== null) {
      this.deleteFixup(replacementNode);
    }
  }

  /**
   * Replaces one subtree with another (transplant operation)
   *
   * This is a fundamental operation used during deletion. It replaces
   * the subtree rooted at node u with the subtree rooted at node v.
   *
   * The operation:
   * 1. Makes v take u's place as a child of u's parent
   * 2. Updates v's parent pointer to point to u's parent
   * 3. Does NOT modify u's children or v's children
   *
   * Visual example:
   *     parent          parent
   *       |               |
   *       u       =>      v
   *      / \             / \
   *    ...  ...        ...  ...
   *
   * Time Complexity: O(1)
   *
   * @param u - The node being replaced
   * @param v - The node taking u's place (can be null)
   */
  private transplant(u: RedBlackNode, v: RedBlackNode | null): void {
    if (u.parent === null) {
      // u is the root, so v becomes the new root
      this.root = v;
    } else if (u === u.parent.left) {
      // u is a left child, make v the new left child
      u.parent.left = v;
    } else {
      // u is a right child, make v the new right child
      u.parent.right = v;
    }

    // Update v's parent pointer (if v exists)
    if (v !== null) {
      v.parent = u.parent;
    }
  }

  /**
   * Finds the minimum node in a subtree
   *
   * The minimum node is the leftmost node in the subtree,
   * which contains the smallest interval by start position.
   *
   * This is used during deletion to find the successor of a node
   * that has two children. The successor is always the minimum
   * node in the right subtree.
   *
   * Time Complexity: O(log n) in worst case, O(1) in best case
   *
   * @param node - Root of the subtree to search
   * @returns The node with the minimum interval in the subtree
   */
  private minimum(node: RedBlackNode): RedBlackNode {
    // Keep going left until we can't go any further
    while (node.left !== null) {
      node = node.left;
    }
    return node;
  }

  /**
   * Fixes red-black tree violations after deletion
   *
   * When we delete a black node, we may violate the red-black tree properties:
   * 1. Every path from root to NIL has the same number of black nodes
   * 2. Red nodes have only black children
   *
   * This method restores these properties through a combination of:
   * - Recoloring nodes
   * - Performing rotations
   * - Moving the "extra blackness" up the tree
   *
   * The algorithm handles different cases based on the color and position
   * of the node's sibling. It's symmetric for left and right cases.
   *
   * Time Complexity: O(log n)
   *
   * @param node - The node that replaced the deleted black node
   */
  private deleteFixup(node: RedBlackNode): void {
    // Continue until we reach the root or find a red node to recolor
    while (node !== this.root && node.isBlack()) {
      if (node === node.parent?.left) {
        // NODE IS LEFT CHILD - Handle left-side cases
        let sibling = node.parent?.right;

        // CASE 1: Sibling is red
        // Convert to one of the other cases by making sibling black
        if (sibling !== null && sibling !== undefined && sibling.isRed()) {
          sibling.color = NodeColor.BLACK; // Recolor sibling
          node.parent!.color = NodeColor.RED; // Recolor parent
          this.rotateLeft(node.parent!); // Rotate to get new sibling
          sibling = node.parent?.right; // Update sibling reference
        }

        if (sibling !== null && sibling !== undefined) {
          // CASE 2: Sibling is black with two black children
          // Move blackness up the tree
          if (
            (sibling.left === null || sibling.left.isBlack()) &&
            (sibling.right === null || sibling.right.isBlack())
          ) {
            sibling.color = NodeColor.RED; // Make sibling red to balance
            node = node.parent!; // Move problem up the tree
          } else {
            // CASE 3: Sibling is black with red left child, black right child
            // Transform to Case 4
            if (sibling.right === null || sibling.right.isBlack()) {
              if (sibling.left !== null) {
                sibling.left.color = NodeColor.BLACK; // Recolor nephew
              }
              sibling.color = NodeColor.RED; // Recolor sibling
              this.rotateRight(sibling); // Rotate sibling
              sibling = node.parent?.right; // Update sibling
            }

            // CASE 4: Sibling is black with red right child
            // This case terminates the loop
            if (sibling !== null && sibling !== undefined) {
              sibling.color = node.parent!.color; // Sibling takes parent's color
              node.parent!.color = NodeColor.BLACK; // Parent becomes black
              if (sibling.right !== null) {
                sibling.right.color = NodeColor.BLACK; // Right nephew becomes black
              }
              this.rotateLeft(node.parent!); // Final rotation
            }
            node = this.root!; // Terminate the loop
          }
        } else {
          break; // No sibling, exit
        }
      } else {
        // NODE IS RIGHT CHILD - Mirror image of left-side cases
        let sibling = node.parent?.left;

        // CASE 1: Sibling is red (mirror)
        if (sibling !== null && sibling !== undefined && sibling.isRed()) {
          sibling.color = NodeColor.BLACK;
          node.parent!.color = NodeColor.RED;
          this.rotateRight(node.parent!); // Right rotation instead of left
          sibling = node.parent?.left;
        }

        if (sibling !== null && sibling !== undefined) {
          // CASE 2: Sibling black with two black children (mirror)
          if (
            (sibling.left === null || sibling.left.isBlack()) &&
            (sibling.right === null || sibling.right.isBlack())
          ) {
            sibling.color = NodeColor.RED;
            node = node.parent!;
          } else {
            // CASE 3: Sibling black with red right child, black left child (mirror)
            if (sibling.left === null || sibling.left.isBlack()) {
              if (sibling.right !== null) {
                sibling.right.color = NodeColor.BLACK;
              }
              sibling.color = NodeColor.RED;
              this.rotateLeft(sibling); // Left rotation on sibling
              sibling = node.parent?.left;
            }

            // CASE 4: Sibling black with red left child (mirror)
            if (sibling !== null && sibling !== undefined) {
              sibling.color = node.parent!.color;
              node.parent!.color = NodeColor.BLACK;
              if (sibling.left !== null) {
                sibling.left.color = NodeColor.BLACK; // Left nephew instead of right
              }
              this.rotateRight(node.parent!); // Right rotation instead of left
            }
            node = this.root!; // Terminate
          }
        } else {
          break; // No sibling, exit
        }
      }
    }

    // Final step: Ensure the node we ended on is black
    // This handles the case where we moved a red node to a position requiring black
    node.color = NodeColor.BLACK;
  }

  /**
   * Finds all intervals that overlap with the given interval
   */
  findOverlapping(queryInterval: Interval): Interval[] {
    const result: Interval[] = [];
    this.findOverlappingHelper(this.root, queryInterval, result);
    return result;
  }

  /**
   * Helper method for finding overlapping intervals
   */
  private findOverlappingHelper(
    node: RedBlackNode | null,
    queryInterval: Interval,
    result: Interval[],
  ): void {
    if (node === null) {
      return;
    }

    // Check if current node's interval overlaps with query interval
    if (this.intervalsOverlap(node.interval, queryInterval)) {
      result.push(node.interval);
    }

    // Check left subtree if it might contain overlapping intervals
    if (node.left !== null && node.left.maxEndValue >= queryInterval.start) {
      this.findOverlappingHelper(node.left, queryInterval, result);
    }

    // Check right subtree if it might contain overlapping intervals
    if (node.right !== null && node.interval.start <= queryInterval.end) {
      this.findOverlappingHelper(node.right, queryInterval, result);
    }
  }

  /**
   * Checks if two intervals overlap
   */
  private intervalsOverlap(interval1: Interval, interval2: Interval): boolean {
    return interval1.start <= interval2.end && interval2.start <= interval1.end;
  }

  /**
   * Finds all intervals that contain the given point
   */
  findContaining(point: number): Interval[] {
    const result: Interval[] = [];
    this.findContainingHelper(this.root, point, result);
    return result;
  }

  /**
   * Helper method for finding intervals containing a point
   */
  private findContainingHelper(node: RedBlackNode | null, point: number, result: Interval[]): void {
    if (node === null) {
      return;
    }

    // Check if current node's interval contains the point
    if (node.interval.start <= point && point <= node.interval.end) {
      result.push(node.interval);
    }

    // Check left subtree if it might contain intervals that include the point
    if (node.left !== null && node.left.maxEndValue >= point) {
      this.findContainingHelper(node.left, point, result);
    }

    // Check right subtree if it might contain intervals that include the point
    if (node.right !== null && node.interval.start <= point) {
      this.findContainingHelper(node.right, point, result);
    }
  }

  /**
   * Finds all intervals in the given range [start, end]
   */
  findInRange(start: number, end: number): Interval[] {
    const result: Interval[] = [];
    this.findInRangeHelper(this.root, start, end, result);
    return result;
  }

  /**
   * Helper method for finding intervals in a range
   */
  private findInRangeHelper(
    node: RedBlackNode | null,
    start: number,
    end: number,
    result: Interval[],
  ): void {
    if (node === null) {
      return;
    }

    // Check if current node's interval is within the range
    if (node.interval.start >= start && node.interval.end <= end) {
      result.push(node.interval);
    }

    // Check left subtree
    if (node.left !== null && node.left.maxEndValue >= start) {
      this.findInRangeHelper(node.left, start, end, result);
    }

    // Check right subtree
    if (node.right !== null && node.interval.start <= end) {
      this.findInRangeHelper(node.right, start, end, result);
    }
  }

  /**
   * Finds any one interval that overlaps with the given interval
   * Returns null if no overlap is found
   */
  findAnyOverlapping(queryInterval: Interval): Interval | null {
    return this.findAnyOverlappingHelper(this.root, queryInterval);
  }

  /**
   * Helper method for finding any overlapping interval
   */
  private findAnyOverlappingHelper(
    node: RedBlackNode | null,
    queryInterval: Interval,
  ): Interval | null {
    if (node === null) {
      return null;
    }

    // Check if current node's interval overlaps
    if (this.intervalsOverlap(node.interval, queryInterval)) {
      return node.interval;
    }

    // Check left subtree first if it might contain overlapping intervals
    if (node.left !== null && node.left.maxEndValue >= queryInterval.start) {
      const leftResult = this.findAnyOverlappingHelper(node.left, queryInterval);
      if (leftResult !== null) {
        return leftResult;
      }
    }

    // Check right subtree
    if (node.right !== null && node.interval.start <= queryInterval.end) {
      return this.findAnyOverlappingHelper(node.right, queryInterval);
    }

    return null;
  }

  /**
   * Returns all intervals in the tree in sorted order (by start position)
   */
  getAllIntervals(): Interval[] {
    const result: Interval[] = [];
    this.inOrderTraversal(this.root, result);
    return result;
  }

  /**
   * In-order traversal to get sorted intervals
   */
  private inOrderTraversal(node: RedBlackNode | null, result: Interval[]): void {
    if (node !== null) {
      this.inOrderTraversal(node.left, result);
      result.push(node.interval);
      this.inOrderTraversal(node.right, result);
    }
  }

  /**
   * Clears all intervals from the tree
   */
  clear(): void {
    this.root = null;
    this.size = 0;
  }

  /**
   * Validates the red-black tree properties
   * Returns true if the tree is valid, false otherwise
   */
  validate(): boolean {
    if (this.root === null) {
      return true;
    }

    // Property 1: Root is black
    if (this.root.isRed()) {
      console.error('Red-Black Tree Validation Error: Root is not black');
      return false;
    }

    // Check other properties
    return this.validateNode(this.root) !== -1;
  }

  /**
   * Validates a node and its subtree
   * Returns the black height if valid, -1 if invalid
   */
  private validateNode(node: RedBlackNode | null): number {
    if (node === null) {
      return 1; // NIL nodes are black
    }

    // Property 2: Red nodes have black children
    if (node.isRed()) {
      if (
        (node.left !== null && node.left.isRed()) ||
        (node.right !== null && node.right.isRed())
      ) {
        console.error('Red-Black Tree Validation Error: Red node has red child');
        return -1;
      }
    }

    // Validate maxEndValue augmentation
    const expectedMaxEnd = this.calculateMaxEndValue(node);
    if (node.maxEndValue !== expectedMaxEnd) {
      console.error(
        `MaxEndValue Validation Error: Expected ${expectedMaxEnd}, got ${node.maxEndValue}`,
      );
      return -1;
    }

    // Recursively validate children
    const leftHeight = this.validateNode(node.left);
    const rightHeight = this.validateNode(node.right);

    if (leftHeight === -1 || rightHeight === -1) {
      return -1;
    }

    // Property 3: All paths from node to NIL have same black height
    if (leftHeight !== rightHeight) {
      console.error('Red-Black Tree Validation Error: Black heights do not match');
      return -1;
    }

    return leftHeight + (node.isBlack() ? 1 : 0);
  }

  /**
   * Calculates the expected maxEndValue for a node
   */
  private calculateMaxEndValue(node: RedBlackNode): number {
    let maxEnd = node.interval.end;

    if (node.left !== null && node.left.maxEndValue > maxEnd) {
      maxEnd = node.left.maxEndValue;
    }

    if (node.right !== null && node.right.maxEndValue > maxEnd) {
      maxEnd = node.right.maxEndValue;
    }

    return maxEnd;
  }

  /**
   * Returns a string representation of the tree for debugging
   */
  toString(): string {
    if (this.root === null) {
      return 'Empty tree';
    }

    return this.nodeToString(this.root, '', true);
  }

  /**
   * Helper method to create string representation of a node and its subtree
   */
  private nodeToString(node: RedBlackNode | null, prefix: string, isLast: boolean): string {
    if (node === null) {
      return '';
    }

    let result = prefix;
    result += isLast ? '└── ' : '├── ';
    result += `[${node.interval.start}-${node.interval.end}] "${node.interval.style}" `;
    result += `(${node.color}, max: ${node.maxEndValue})\n`;

    const children: (RedBlackNode | null)[] = [];
    if (node.left !== null || node.right !== null) {
      children.push(node.left, node.right);
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLastChild = i === children.length - 1;
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      if (child !== null) {
        result += this.nodeToString(child, childPrefix, isLastChild);
      } else {
        result += childPrefix + (isLastChild ? '└── ' : '├── ') + 'NIL\n';
      }
    }

    return result;
  }

  /**
   * Gets the height of the tree
   */
  getHeight(): number {
    return this.getNodeHeight(this.root);
  }

  /**
   * Gets the height of a node's subtree
   */
  private getNodeHeight(node: RedBlackNode | null): number {
    if (node === null) {
      return 0;
    }

    return 1 + Math.max(this.getNodeHeight(node.left), this.getNodeHeight(node.right));
  }
}
