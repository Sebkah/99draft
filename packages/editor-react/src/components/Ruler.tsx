import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from '@99draft/editor-core';
import RulerPin from './RulerPin';

interface RulerProps {
  width: number;
  editor: Editor;
  // Default margin values (optional)
  defaultLeftMargin?: number;
  defaultRightMargin?: number;
}

/**
 * Ruler component with draggable margin pins
 * Displays a horizontal ruler with measurement marks and draggable pins for setting margins
 */
const Ruler: React.FC<RulerProps> = ({ width, editor }) => {
  // Internal state for margins
  const [leftMargin, setLeftMargin] = useState<number>(editor.margins.left);
  const [rightMargin, setRightMargin] = useState<number>(editor.margins.right);

  // single dragging state: 'left' | 'right' | null
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = editor.cursorManager.on('cursorChange', (event) => {
      const { marginLeft, marginRight } = editor.paragraphStylesManager.getParagraphStyles(
        event.structurePosition.paragraphIndex,
      );
      if (marginLeft) setLeftMargin(marginLeft);

      if (marginRight) setRightMargin(marginRight);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Calculate position from mouse event relative to ruler
   */
  const getPositionFromEvent = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      if (!rulerRef.current) return 0;
      const rect = rulerRef.current.getBoundingClientRect();
      const position = event.clientX - rect.left;
      return Math.max(0, Math.min(width, position));
    },
    [width],
  );

  /**
   * Handle mouse down on left margin pin
   */
  const handleLeftPinMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setDragging('left');
  }, []);

  /**
   * Handle mouse down on right margin pin
   */
  const handleRightPinMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setDragging('right');
  }, []);

  /**
   * Handle mouse move for dragging pins
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const pos = getPositionFromEvent(event);
      // Convert pos (pixels from left) to left/right margins
      const rightPos = width - pos; // pixels from right edge

      const minGap = 20;
      if (dragging === 'left') {
        // new left margin must be <= width - rightMargin - minGap
        const maxLeft = width - rightMargin - minGap;
        const newLeft = Math.max(0, Math.min(pos, maxLeft));
        setLeftMargin(newLeft);
        editor.setMarginsForCurrentParagraph(newLeft, rightMargin);
      } else if (dragging === 'right') {
        // rightMargin is distance from right edge. newRight must be <= width - leftMargin - minGap
        const maxRight = width - leftMargin - minGap;
        const newRight = Math.max(0, Math.min(rightPos, maxRight));
        setRightMargin(newRight);
        editor.setMarginsForCurrentParagraph(leftMargin, newRight);
      }
    },
    [dragging, getPositionFromEvent, leftMargin, rightMargin, width, editor],
  );

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [dragging, handleMouseMove, handleMouseUp]);

  /**
   * Generate ruler tick marks
   */
  const generateTicks = () => {
    const ticks: React.ReactNode[] = [];
    const pixelsPerInch = 96; // Standard web DPI
    const majorTickInterval = pixelsPerInch; // Every inch
    const minorTickInterval = pixelsPerInch / 8; // Every 1/8 inch

    for (let i = 0; i <= width; i += minorTickInterval) {
      const isMajorTick = i % majorTickInterval === 0;
      const tickHeight = isMajorTick ? 4 : 2; // Reduced height
      const showLabel = isMajorTick && i > 0;

      ticks.push(
        <div
          key={i}
          className="absolute bg-gray-600"
          style={{
            left: `${i}px`,
            top: '0px',
            width: '1px',
            height: `${tickHeight}px`,
          }}
        >
          {showLabel && (
            <span
              className="absolute text-xs text-gray-700 -translate-x-1/2"
              style={{ top: `${tickHeight + 1}px`, fontSize: '9px' }}
            >
              {Math.round(i / pixelsPerInch)}
            </span>
          )}
        </div>,
      );
    }

    return ticks;
  };

  return (
    <div
      ref={rulerRef}
      className="relative bg-white border-b border-gray-300 select-none shadow-lg"
      style={{ width: `${width}px`, height: '20px' }} // Reduced height
    >
      {/* Ruler background and ticks */}
      <div className="absolute inset-0">{generateTicks()}</div>

      {/* Left margin pin */}
      <RulerPin
        position={leftMargin}
        isDragging={dragging === 'left'}
        onMouseDown={handleLeftPinMouseDown}
        title={`Left margin: ${Math.round(leftMargin)}px`}
      />

      {/* Right margin pin (position measured from left) */}
      <RulerPin
        position={width - rightMargin}
        isDragging={dragging === 'right'}
        onMouseDown={handleRightPinMouseDown}
        title={`Right margin: ${Math.round(rightMargin)}px`}
      />
    </div>
  );
};

export default Ruler;
