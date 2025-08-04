import React, { useState, useRef, useCallback } from 'react';
import RulerPin from './RulerPin';

interface RulerProps {
  width: number;
  leftMargin: number;
  rightMargin: number;
  onLeftMarginChange: (position: number) => void;
  onRightMarginChange: (position: number) => void;
}

/**
 * Ruler component with draggable margin pins
 * Displays a horizontal ruler with measurement marks and draggable pins for setting margins
 */
const Ruler: React.FC<RulerProps> = ({
  width,
  leftMargin,
  rightMargin,
  onLeftMarginChange,
  onRightMarginChange,
}) => {
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);

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
    setIsDraggingLeft(true);
  }, []);

  /**
   * Handle mouse down on right margin pin
   */
  const handleRightPinMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDraggingRight(true);
  }, []);

  /**
   * Handle mouse move for dragging pins
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDraggingLeft) {
        const newPosition = getPositionFromEvent(event);
        onLeftMarginChange(Math.min(newPosition, rightMargin - 20)); // Keep 20px minimum gap
      } else if (isDraggingRight) {
        const newPosition = getPositionFromEvent(event);
        onRightMarginChange(Math.max(newPosition, leftMargin + 20)); // Keep 20px minimum gap
      }
    },
    [
      isDraggingLeft,
      isDraggingRight,
      getPositionFromEvent,
      onLeftMarginChange,
      onRightMarginChange,
      leftMargin,
      rightMargin,
    ],
  );

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

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
      className="relative bg-gray-100 border-b border-gray-300 select-none"
      style={{ width: `${width}px`, height: '20px' }} // Reduced height
    >
      {/* Ruler background and ticks */}
      <div className="absolute inset-0">{generateTicks()}</div>

      {/* Left margin pin */}
      <RulerPin
        position={leftMargin}
        isDragging={isDraggingLeft}
        onMouseDown={handleLeftPinMouseDown}
        title={`Left margin: ${Math.round(leftMargin)}px`}
      />

      {/* Right margin pin */}
      <RulerPin
        position={rightMargin}
        isDragging={isDraggingRight}
        onMouseDown={handleRightPinMouseDown}
        title={`Right margin: ${Math.round(rightMargin)}px`}
      />
    </div>
  );
};

export default Ruler;
