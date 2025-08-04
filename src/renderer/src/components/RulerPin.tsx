import React from 'react';

interface RulerPinProps {
  position: number;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  title: string;
}

/**
 * Simple draggable pin component for ruler margins
 */
const RulerPin: React.FC<RulerPinProps> = ({ position, isDragging, onMouseDown, title }) => {
  return (
    <div
      className={`absolute top-0 w-3 h-2 cursor-ew-resize transition-colors ${
        isDragging ? 'bg-blue-600' : 'bg-gray-500 hover:bg-blue-600'
      }`}
      style={{
        left: `${position - 4}px`,
        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
      }}
      onMouseDown={onMouseDown}
      title={title}
    />
  );
};

export default RulerPin;
