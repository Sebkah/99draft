import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@99draft/editor-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
} from '@fortawesome/free-solid-svg-icons';

interface ToolbarProps {
  editor: Editor;
}

/**
 * Toolbar component with text alignment controls
 * Provides buttons for setting text alignment (left, center, right, justify)
 */
const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  // Track the current alignment based on cursor position
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>(
    'left',
  );

  // Update current alignment when cursor position changes
  useEffect(() => {
    const unsubscribe = editor.cursorManager.on('cursorChange', (event) => {
      const { align } = editor.paragraphStylesManager.getParagraphStyles(
        event.structurePosition.paragraphIndex,
      );
      setCurrentAlignment(align);
    });

    return () => {
      unsubscribe();
    };
  }, [editor]);

  /**
   * Handle alignment button clicks
   */
  const handleAlignmentChange = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'justify') => {
      editor.setAlignmentForCurrentParagraph(alignment);
      setCurrentAlignment(alignment);
    },
    [editor],
  );

  /**
   * Generate alignment button with active state styling
   */
  const AlignmentButton: React.FC<{
    alignment: 'left' | 'center' | 'right' | 'justify';
    icon: any;
    title: string;
  }> = ({ alignment, icon, title }) => {
    const isActive = currentAlignment === alignment;

    return (
      <button
        onClick={() => handleAlignmentChange(alignment)}
        className={`
          px-1 py-1 text-sm font-medium rounded-md transition-colors duration-200
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${
            isActive
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white text-gray-700 border border-gray-300'
          }
        `}
        title={title}
        type="button"
      >
        <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-white border border-gray-300 rounded-lg shadow-sm">
      <AlignmentButton alignment="left" icon={faAlignLeft} title="Align Left" />

      <AlignmentButton alignment="center" icon={faAlignCenter} title="Align Center" />

      <AlignmentButton alignment="right" icon={faAlignRight} title="Align Right" />

      <AlignmentButton alignment="justify" icon={faAlignJustify} title="Justify" />
    </div>
  );
};

export default Toolbar;
