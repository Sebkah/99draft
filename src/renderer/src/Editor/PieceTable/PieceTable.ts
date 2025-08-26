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
   * @private
   */
  public readonly originalBuffer: string;

  /**
   * A buffer that stores all newly inserted text. It is append-only.
   * @private
   */
  public addBuffer: string;

  /**
   * The ordered list of pieces that represents the current state of the document.
   * The core of the data structure.
   * @private
   */
  private pieces: Piece[];

  /**
   * A cached value of the total length of the document for performance.
   * @private
   */
  private _length: number;

  private _addBufferLength: number = 0;

  /**
   * Version counter that increments with each modification.
   * Used to track when the text has changed for optimizing parsing.
   * @private
   */
  private _version: number = 0;

  // CONSTRUCTOR

  /**
   * Initializes the Piece Table with the original document content.
   * @param originalContent The initial text of the document.
   */
  constructor(originalContent: string) {
    this.originalBuffer = originalContent;
    this.addBuffer = '';

    this._length = originalContent.length;

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
    return this._length;
  }

  /**
   * Gets the current version of the document.
   * Increments with each modification (insert/delete).
   */
  public getVersion(): number {
    return this._version;
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

  public getPieceText(piece: Piece): string {
    const buffer = piece.source === 'original' ? this.originalBuffer : this.addBuffer;
    return buffer.substring(piece.offset, piece.offset + piece.length);
  }

  public getPieces(): Piece[] {
    return this.pieces;
  }

  private updateLength(count: number): void {
    this._length += count;
    this._addBufferLength += count;
  }

  /**
   * Inserts text at a specific position in the document.
   * @param text The text to insert.
   * @param position The character position at which to insert the text.
   */
  public insert(text: string, position: number): void {
    if (text.length === 0) return;
    if (position < 0 || position > this._length) {
      throw new Error('Insert position out of bounds');
    }

    const textLength = text.length;

    // 1. Append the new text to the 'add' buffer and create a piece for it.
    this.addBuffer += text;
    const newTextOffset = this._addBufferLength;

    const cursorAtEnd = position === this._length;

    // If inserting at the very end of the document
    if (cursorAtEnd) {
      // If inserting at the end, we can just append to the last piece.
      const { offset, length, source } = this.pieces[this.pieces.length - 1];

      //If the last piece is from the 'add' buffer, we can extend it.
      if (source === 'add') {
        // Extend the last piece with the new text.
        const newPiece: Piece = {
          source: 'add',
          offset, // Keep the original offset
          length: length + textLength, // Extend the length
        };
        // Replace the last piece with the new one.
        this.pieces[this.pieces.length - 1] = newPiece;
      } else {
        // Otherwise, we create a new piece for the 'add' buffer.
        const newPiece: Piece = {
          source: 'add',
          offset: newTextOffset,
          length: textLength,
        };
        this.pieces.push(newPiece);
      }

      this.updateLength(textLength);
      this._version++;

      return;
    }

    const newPiece: Piece = {
      source: 'add',
      offset: newTextOffset,
      length: textLength,
    };

    // 2. Find the piece where the insertion occurs.
    const { pieceIndex, offsetInPiece } = this._findPiece(position);

    // 3. Split the existing piece and insert the new piece.
    const oldPiece = this.pieces[pieceIndex];

    if (
      oldPiece.source === 'add' && //If the piece is from the 'add' buffer
      offsetInPiece === oldPiece.length && //If the insertion is at the end of the piece
      oldPiece.offset + oldPiece.length === this._addBufferLength //If the piece maps to the end of the add buffer
    ) {
      oldPiece.length += textLength;
      this.updateLength(textLength);
      this._version++;
      return;
    }

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

    // 5. Update the cached length.
    this.updateLength(textLength);

    // 6. Increment version to track changes
    this._version++;
  }

  /**
   * Deletes a number of characters starting at a specific position.
   * @param start The starting position of the deletion.
   * @param deleteCount The number of characters to delete.
   */
  // TODO: FINISH
  public delete(start: number, deleteCount: number): void {
    // 1. Find the starting piece and ending piece for the deletion range.
    const piece = this._findPiece(start);
    const endPiece = this._findPiece(start + deleteCount);

    if (deleteCount <= 0) return;

    // 2. Deletion is within a single piece
    if (piece.pieceIndex === endPiece.pieceIndex) {
      // Split the piece into up to two pieces, excluding the deleted segment.
      const oldPiece = this.pieces[piece.pieceIndex];

      // If deletion starts at the beginning of the piece
      if (piece.offsetInPiece === 0) {
        if (deleteCount >= oldPiece.length) {
          // Deletion covers the entire piece, remove it
          this.pieces.splice(piece.pieceIndex, 1);
        } else {
          // Truncate the piece from the start
          oldPiece.offset += deleteCount;
          oldPiece.length -= deleteCount;
        }
        this.updateLength(-deleteCount);
        this._version++;
        return;
      }
      // If deletion ends at the end of the piece
      if (piece.offsetInPiece + deleteCount === oldPiece.length) {
        // Truncate the piece from the end
        oldPiece.length -= deleteCount;
        this.updateLength(-deleteCount);
        this._version++;
        return;
      }
    }

    // 3. Deletion spans multiple pieces


    // Remove fully covered pieces
    this.pieces.splice(
      piece.pieceIndex + 1,
      endPiece.pieceIndex - piece.pieceIndex - 1,
    );

    // Truncate the starting piece
    const startPiece = this.pieces[piece.pieceIndex];
    if (piece.offsetInPiece === 0) {
      // Deletion starts at the beginning of the piece, remove it
      this.pieces.splice(piece.pieceIndex, 1);
    } else {
      // Truncate the piece to exclude the deleted segment
      startPiece.length = piece.offsetInPiece;
    }

    // Truncate the ending piece
    const endPieceObj = this.pieces[piece.pieceIndex + 1];
    if (endPiece.offsetInPiece === endPieceObj.length) {
      // Deletion ends at the end of the piece, remove it
      this.pieces.splice(piece.pieceIndex + 1, 1);
    } else {
      // Adjust the offset and length to exclude the deleted segment
      const deleteUpTo = endPiece.offsetInPiece;

      // The new offset is the old offset plus the number of characters deleted from the start
      const newOffset = endPieceObj.offset + deleteUpTo;

      //...and the new length is the old length minus the deleted characters
      const newLength = endPieceObj.length - deleteUpTo;
      this.pieces[piece.pieceIndex + 1] = {
        source: endPieceObj.source,
        offset: newOffset,
        length: newLength,
      };
    }



    // Increment version to track changes (when delete is implemented)
    this._version++;
  }

  // PRIVATE HELPER METHODS

  /**
   * Finds which piece a given character position falls into.
   * @returns The index of the piece in the `this.pieces` array and the offset within that piece's text.
   * @private
   */
  private _findPiece(position: number): { pieceIndex: number; offsetInPiece: number } {
    if (this.pieces.length === 0) {
      return { pieceIndex: -1, offsetInPiece: 0 };
    }

    let currentPos = 0;
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];

      if (position >= currentPos && position <= currentPos + piece.length) {
        // Check how many line breaks are before the position
        const offsetInPiece = position - currentPos;

        // Return the piece index and the offset within that piece

        return {
          pieceIndex: i,
          offsetInPiece: offsetInPiece,
        };
      }
      currentPos += piece.length; // Adjust for line breaks
    }

    // Should only happen if position === this.length and the last piece has length > 0
    if (position === this.length) {
      return {
        pieceIndex: this.pieces.length - 1,
        offsetInPiece: this.pieces[this.pieces.length - 1].length,
      };
    }

    return { pieceIndex: -1, offsetInPiece: 0 }; // Not found (e.g., empty doc)
  }
}
