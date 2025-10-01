import type { EditorLogger } from '../managers/EditorLogger';

/**
 * Represents a single, contiguous piece of text from one of the buffers.
 */
export interface Piece {
  /** The buffer this piece refers to. */
  readonly source: 'original' | 'add';

  /** The starting index (offset) of the text segment in the source buffer. */
  offset: number;

  /** The number of characters in the text segment. */
  length: number;
}
export class PieceTable {
  // CORE PROPERTIES

  /**
   * Holds the initial, immutable text content of the file.
   */
  private readonly originalBuffer: string;

  /**
   * A buffer that stores all newly inserted text. It is append-only.
   */
  private addBuffer: string;

  /**
   * The ordered list of pieces that represents the current state of the document.
   * The core of the data structure.
   * @private
   */
  private pieces: Piece[];

  /**
   * A cached value of the total length of the document for performance.
   */
  private documentLength: number;

  private addBufferLength: number = 0;

  /**
   * Logger instance for debug output
   */
  private logger?: EditorLogger;

  /**
   * Version counter that increments with each modification.
   * Used to track when the text has changed for optimizing parsing.
   */
  private version: number = 0;

  // CONSTRUCTOR

  /**
   * Initializes the Piece Table with the original document content.
   * @param originalContent The initial text of the document.
   * @param logger Optional logger for debug output.
   */
  constructor(originalContent: string, logger?: EditorLogger) {
    this.originalBuffer = originalContent;
    this.addBuffer = '';
    this.logger = logger;

    this.documentLength = originalContent.length;

    // The initial state is a single piece spanning the entire original buffer.
    if (originalContent.length > 0) {
      this.pieces = [
        {
          source: 'original',
          offset: 0,
          length: originalContent.length,
        },
      ];
    } else {
      this.pieces = [];
    }
  }

  // PUBLIC METHODS

  /**
   * Gets the total length of the document.
   */
  public get length(): number {
    return this.documentLength;
  }

  /**
   * Gets the current version of the document.
   * Increments with each modification (insert/delete).
   */
  public getVersion(): number {
    return this.version;
  }

  /**
   * Gets the original buffer content (read-only access).
   */
  public getOriginalBuffer(): string {
    return this.originalBuffer;
  }

  /**
   * Gets the add buffer content (read-only access).
   */
  public getAddBuffer(): string {
    return this.addBuffer;
  }

  /**
   * Reconstructs and returns the full text of the document.
   * In a real editor, you'd use a more optimized version for rendering
   * that only gets the text for the visible viewport.
   */
  public getText(): string {
    return this.pieces
      .map((piece) => {
        const buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
        return buffer.substring(piece.offset, piece.offset + piece.length);
      })
      .join('');
  }

  public getRangeText(start: number, length: number): string {
    // Handle the common case of length 0 (empty range)
    if (length === 0) {
      return '';
    }

    const end = Math.min(start + length, this.documentLength);
    if (
      start < 0 ||
      length < 0 ||
      start >= this.documentLength ||
      start >= end ||
      end > this.documentLength
    ) {
      console.warn('getRangeText: invalid range');
      return '';
    }

    // Find the piece containing the start position
    const { pieceIndex, offsetInPiece } = this._findPiece(start);

    // Find the piece containing the end position
    const { pieceIndex: endPieceIndex, offsetInPiece: endPieceOffset } = this._findPiece(end);

    if (pieceIndex === -1 || endPieceIndex === -1) {
      console.warn('getRangeText: position out of bounds');
      return '';
    }
    const result: string[] = [];
    // If the range is within a single piece
    if (pieceIndex === endPieceIndex) {
      const piece = this.pieces[pieceIndex];
      const buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
      result.push(buffer.substring(piece.offset + offsetInPiece, piece.offset + endPieceOffset));
      return result.join('');
    }
    // Range spans multiple pieces
    // Handle the first piece (from offsetInPiece to end of piece)
    let piece = this.pieces[pieceIndex];
    let buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
    result.push(buffer.substring(piece.offset + offsetInPiece, piece.offset + piece.length));
    // Handle any full pieces in between
    for (let i = pieceIndex + 1; i < endPieceIndex; i++) {
      piece = this.pieces[i];
      buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
      result.push(buffer.substring(piece.offset, piece.offset + piece.length));
    }
    // Handle the last piece (from start of piece to endPieceOffset)
    piece = this.pieces[endPieceIndex];
    buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
    result.push(buffer.substring(piece.offset, piece.offset + endPieceOffset));
    return result.join('');
  }

  public getPieceText(piece: Piece): string {
    const buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
    return buffer.substring(piece.offset, piece.offset + piece.length);
  }

  public getPieces(): Piece[] {
    return this.pieces;
  }

  /**
   * Gets text within a specific range without reconstructing the entire document.
   * This is more efficient than getText() when you only need a portion of the text.
   *
   * @param startOffset The starting character position (inclusive)
   * @param endOffset The ending character position (exclusive)
   * @returns The text within the specified range
   */

  /**
   * Updates the document length and add buffer length tracking.
   *
   * This helper method ensures that both the total document length and
   * the add buffer length stay in sync when text is added or removed.
   *
   * @param count Positive for insertions, negative for deletions
   * @private
   */
  private updateLength(count: number): void {
    this.documentLength += count;
    this.addBufferLength += count;
  }

  /**
   * Inserts text at a specific position in the document.
   * @param text The text to insert.
   * @param position The character position at which to insert the text.
   */
  public insert(text: string, position: number): void {
    if (text.length === 0) return;
    if (position < 0 || position > this.documentLength) {
      throw new Error('Insert position out of bounds');
    }

    const textLength = text.length;

    // 1. Append the new text to the 'add' buffer and create a piece for it.
    this.addBuffer += text;
    const newTextOffset = this.addBufferLength;

    const cursorAtEnd = position === this.documentLength;

    // If inserting at the end, append new add-buffer piece and merge inline
    if (cursorAtEnd) {
      const newPiece: Piece = { source: 'add', offset: newTextOffset, length: textLength };
      this.pieces.push(newPiece);
      this.updateLength(textLength);
      this.version++;
      // Inline merge with previous if contiguous
      const last = this.pieces.length - 1;
      if (last > 0) {
        const prev = this.pieces[last - 1];
        const curr = this.pieces[last];
        if (
          prev.source === 'add' &&
          curr.source === 'add' &&
          prev.offset + prev.length === curr.offset
        ) {
          prev.length += curr.length;
          this.pieces.splice(last, 1);
        }
      }
      return;
    }

    const newPiece: Piece = {
      source: 'add',
      offset: newTextOffset,
      length: textLength,
    };

    // 2. Find the piece where the insertion occurs.
    const { pieceIndex, offsetInPiece } = this._findPiece(position);
    // 3. Merge into existing add-buffer piece if insertion at its end and contiguous
    const oldPiece = this.pieces[pieceIndex];
    if (
      oldPiece.source === 'add' &&
      offsetInPiece === oldPiece.length &&
      oldPiece.offset + oldPiece.length === newTextOffset
    ) {
      oldPiece.length += textLength;
      this.updateLength(textLength);
      this.version++;
      return;
    }

    // 4. Split the existing piece and insert the new piece.
    const before: Piece | null =
      offsetInPiece > 0
        ? {
            source: oldPiece.source,
            offset: oldPiece.offset,
            length: offsetInPiece,
          }
        : null;

    const after: Piece | null =
      offsetInPiece < oldPiece.length
        ? {
            source: oldPiece.source,
            offset: oldPiece.offset + offsetInPiece,
            length: oldPiece.length - offsetInPiece,
          }
        : null;

    // Create the replacement sequence
    const replacement: Piece[] = [];
    if (before) replacement.push(before);
    replacement.push(newPiece);
    if (after) replacement.push(after);

    // 4. Replace the old piece with the new sequence of pieces.
    this.pieces.splice(pieceIndex, 1, ...replacement);

    // 5. Update length and version
    this.updateLength(textLength);
    this.version++;

    // 6. Inline merge around the new piece
    const insertionIndex = pieceIndex + (before ? 1 : 0);
    // Merge with previous piece if the newly inserted add-piece abuts an earlier add-piece
    // insertionIndex > 0 ensures there is a piece immediately to the left
    if (insertionIndex > 0) {
      /*   console.log('Merging with previous piece if possible'); */
      // prev is the piece immediately before the insertion point
      const prev = this.pieces[insertionIndex - 1];
      // curr is the newly inserted add-buffer piece at insertionIndex
      const curr = this.pieces[insertionIndex];
      // Only merge if both are from the add-buffer and their offsets line up exactly
      if (
        prev.source === 'add' && // left piece is from add-buffer
        curr.source === 'add' && // right piece is also from add-buffer
        prev.offset + prev.length === curr.offset // contiguous in buffer
      ) {
        // Extend the left piece to include the new text
        prev.length += curr.length;
        // Remove the now-redundant right piece
        this.pieces.splice(insertionIndex, 1);
      }
    }
    // Merge with next piece if the newly inserted add-piece directly precedes another add-piece
    // insertionIndex < pieces.length - 1 ensures a neighbor exists on the right
    if (insertionIndex < this.pieces.length - 1) {
      /* console.log('Merging with next piece if possible'); */
      // curr2 is the newly inserted (or merged) add-buffer piece
      const curr2 = this.pieces[insertionIndex];
      // next is the piece immediately after insertionIndex
      const next = this.pieces[insertionIndex + 1];
      // Only merge if both are from add-buffer and contiguous
      if (
        curr2.source === 'add' && // current piece from add-buffer
        next.source === 'add' && // right neighbor also from add-buffer
        curr2.offset + curr2.length === next.offset // contiguous in buffer
      ) {
        // Extend current piece to cover the neighbor
        curr2.length += next.length;
        // Remove the neighbor piece as it's now merged
        this.pieces.splice(insertionIndex + 1, 1);
      }
    }
    return;
  }

  /**
   * Deletes a number of characters starting at a specific position.
   * @param start The starting position of the deletion.
   * @param deleteCount The number of characters to delete.
   * @throws Error if the deletion range is invalid
   */
  public delete(start: number, deleteCount: number): void {
    // Input validation
    if (deleteCount <= 0) return;
    if (start < 0) {
      throw new Error('Delete: start position cannot be negative');
    }
    //XXX: should it be > ?
    if (start >= this.documentLength) {
      throw new Error('Delete: start position out of bounds');
    }
    if (start + deleteCount > this.documentLength) {
      deleteCount = this.documentLength - start; // Clamp to document length
    }

    // 1. Find the starting piece and ending piece for the deletion range.
    const startpiece = this._findPiece(start);
    const endPiece = this._findPiece(start + deleteCount);

    // 2. Deletion is within a single piece
    if (startpiece.pieceIndex === endPiece.pieceIndex) {
      // Deletion within single piece
      this._truncatePiece(
        startpiece.pieceIndex,
        [startpiece.offsetInPiece, startpiece.offsetInPiece + deleteCount],
        'delete',
      );
      return;
    }

    // 3. Deletion spans multiple pieces
    if (startpiece.pieceIndex !== endPiece.pieceIndex) {
      const startIdx = startpiece.pieceIndex;
      const endIdx = endPiece.pieceIndex;
      const newPieces: Piece[] = [];
      const sp = this.pieces[startIdx];
      const ep = this.pieces[endIdx];
      // Keep content before the deletion in the start piece
      if (startpiece.offsetInPiece > 0) {
        newPieces.push({
          source: sp.source,
          offset: sp.offset,
          length: startpiece.offsetInPiece,
        });
      }
      // Keep content after the deletion in the end piece
      if (endPiece.offsetInPiece < ep.length) {
        newPieces.push({
          source: ep.source,
          offset: ep.offset + endPiece.offsetInPiece,
          length: ep.length - endPiece.offsetInPiece,
        });
      }
      // Replace the range of pieces with the new kept pieces
      this.pieces.splice(startIdx, endIdx - startIdx + 1, ...newPieces);
      // Update document length
      this.documentLength -= deleteCount;
      this.version++;
      return;
    }
    // No further action needed; multi-piece case handled above
  }

  // PRIVATE HELPER METHODS
  /**
   * Finds which piece a given character position falls into.
   *
   * Takes an absolute position in the document and determines:
   * 1. Which piece contains that position
   * 2. The relative offset within that piece
   *
   * This is a core helper method used by insert/delete operations.
   *
   * ```
   * Document: [    Piece 1    ][   Piece 2   ][   Piece 3   ]
   * Position:  0              12             25            40
   *
   * findPiece(15) would return { pieceIndex: 1, offsetInPiece: 3 }
   * because position 15 is in the second piece (index 1), 3 characters from its start.
   * ```
   *
   * @param position The absolute character position in the document
   * @returns Object with pieceIndex (index in this.pieces) and offsetInPiece (relative position)
   * @private
   */
  private _findPiece(position: number): { pieceIndex: number; offsetInPiece: number } {
    // Handle empty document case
    if (this.pieces.length === 0) {
      return { pieceIndex: -1, offsetInPiece: 0 };
    }

    // Walk through pieces until we find the one containing our position
    let currentPos = 0;
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];
      const pieceEnd = currentPos + piece.length;

      // Check if position falls within this piece's range (half-open interval)
      if (position >= currentPos && position < pieceEnd) {
        const offsetInPiece = position - currentPos;
        return {
          pieceIndex: i,
          offsetInPiece: offsetInPiece,
        };
      }

      // Move to next piece
      currentPos = pieceEnd;
    }

    // Special case: position is at the very end of the document
    if (position === this.length) {
      return {
        pieceIndex: this.pieces.length - 1,
        offsetInPiece: this.pieces[this.pieces.length - 1].length,
      };
    }

    // Position is out of bounds or document is empty
    return { pieceIndex: -1, offsetInPiece: 0 };
  }

  /**
   * Modifies a piece by either keeping or deleting a specified range.
   *
   * This function handles various cases based on the position of the range:
   *
   * ```
   * 1: Keep mode             2: Delete start            3: Delete end             4: Delete middle
   * ┌────── Piece ─────┐     ┌────── Piece ─────┐       ┌────── Piece ─────┐     ┌──────── Piece ────────┐
   *      ┌─ range ─┐         ┌─ range ─┐                      ┌─ range ─┐             ┌─── range ───┐
   *      │  KEEP   │         │ DELETE  │  KEEP           KEEP │ DELETE  │        KEEP │   DELETE    │ KEEP
   *      └─────────┘         └─────────┘                      └─────────┘             └─────────────┘
   *
   * ```
   
   *
   * @param pieceIndex The index of the piece in the pieces array to modify
   * @param range A tuple [start, end] with the character positions relative to the piece
   * @param mode 'keep' to keep only the specified range, 'delete' to remove it
   * @private
   */
  private _truncatePiece(pieceIndex: number, range: [number, number], mode: 'keep' | 'delete') {
    // Validate pieceIndex is within array bounds
    if (pieceIndex < 0 || pieceIndex >= this.pieces.length) {
      throw new Error(`truncation: invalid pieceIndex ${pieceIndex}`);
    }

    const piece = this.pieces[pieceIndex];
    let [start, end] = range;

    // Normalize inputs
    if (start < 0) start = 0;
    if (end > piece.length) end = piece.length;

    if (start > end) {
      throw new Error('truncation: range is invalid');
    }

    this.version++;

    // 1. KEEP MODE: Keep only the specified range, discard everything else
    if (mode === 'keep') {
      if (start >= end) {
        // Empty range to keep, delete the whole piece
        this.pieces.splice(pieceIndex, 1);
        this.documentLength -= piece.length;
        return;
      }

      // Create a new piece with just the range we want to keep
      const newPiece: Piece = {
        offset: piece.offset + start, // Adjust offset to point to the start of our range
        source: piece.source,
        length: end - start, // Only keep the specified range length
      };

      this.pieces[pieceIndex] = newPiece;
      this.documentLength -= piece.length - newPiece.length; // Update document length
      return;
    }

    // 2. DELETE MODE: Remove the specified range, keep everything else

    // Case 2A: Remove the entire piece
    if (start === 0 && end === piece.length) {
      this.logger?.textBuffer('Deleting entire piece');
      this.pieces.splice(pieceIndex, 1);
      this.documentLength -= piece.length;
      return; // Added return to prevent fallthrough
    }

    // Case 2B: Range to delete is at the start of the piece
    if (start === 0) {
      // Keep only the text after the deleted range
      const secondPart: Piece = {
        offset: piece.offset + end, // Skip past the deleted section
        length: piece.length - end, // Keep the remaining length
        source: piece.source,
      };

      this.pieces[pieceIndex] = secondPart;
      this.documentLength -= end - start; // Update document length
      return;
    }

    // Case 2C: Range to delete is at the end of the piece
    if (end === piece.length) {
      // Keep only the text before the deleted range
      const firstPart: Piece = {
        offset: piece.offset, // Keep the original offset
        length: start, // Truncate to just before deleted range
        source: piece.source,
      };
      this.pieces[pieceIndex] = firstPart;
      this.documentLength -= end - start; // Update document length
      return;
    }

    // Case 2D: Range to delete is in the middle - split into two pieces

    // Piece before the deleted range
    const beforePiece: Piece = {
      source: piece.source,
      offset: piece.offset, // Keep original offset
      length: start, // Length until deleted section starts
    };

    // Piece after the deleted range
    const afterPiece: Piece = {
      source: piece.source,
      offset: piece.offset + end, // Skip past deleted section
      length: piece.length - end, // Keep remaining text
    };

    // Replace original piece with the two new pieces
    this.pieces.splice(pieceIndex, 1, beforePiece, afterPiece);
    this.documentLength -= end - start; // Update document length
  }

  /**
   * Splits a piece into two pieces at the specified index.
   * @param piece The piece to split
   * @param splitIndex The character index at which to split the piece
   * @returns An object containing the two resulting pieces
   * @private
   */
}
