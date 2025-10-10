import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@99draft/editor-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
} from '@fortawesome/free-solid-svg-icons';

interface ToolbarProps {
  editor: Editor;
}

/**
 * Toolbar component with text alignment and style controls
 * Provides buttons for setting text alignment (left, center, right, justify)
 * and toggling text styles (bold, italic, underline, strikethrough)
 */
const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  // Track the current alignment based on cursor position
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>(
    'left',
  );

  // Track active text styles
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  // Update current alignment and styles when cursor position changes
  useEffect(() => {
    const updateToolbarState = () => {
      const { align } = editor.paragraphStylesManager.getParagraphStyles(
        editor.cursorManager.structurePosition.paragraphIndex,
      );
      setCurrentAlignment(align);

      // Update active styles
      setActiveStyles(editor.getActiveStyles());
    };

    // Initial update
    updateToolbarState();

    // Subscribe to cursor changes
    const unsubscribe = editor.cursorManager.on('cursorChange', () => {
      updateToolbarState();
    });

    return () => {
      unsubscribe();
    };
  }, [editor]);

  // Update toolbar state when selection changes
  useEffect(() => {
    const updateToolbarState = () => {
      // Update active styles based on current selection or cursor position
      setActiveStyles(editor.getActiveStyles());

      // Update alignment based on current paragraph
      const { align } = editor.paragraphStylesManager.getParagraphStyles(
        editor.cursorManager.structurePosition.paragraphIndex,
      );
      setCurrentAlignment(align);
    };

    // Subscribe to selection changes
    const unsubscribe = editor.selectionManager.on('selectionChange', () => {
      updateToolbarState();
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
   * Handle style toggle button clicks
   */
  const handleToggleBold = useCallback(() => {
    editor.toggleBold();
    setActiveStyles(editor.getActiveStyles());
  }, [editor]);

  const handleToggleItalic = useCallback(() => {
    editor.toggleItalic();
    setActiveStyles(editor.getActiveStyles());
  }, [editor]);

  const handleToggleUnderline = useCallback(() => {
    editor.toggleUnderline();
    setActiveStyles(editor.getActiveStyles());
  }, [editor]);

  const handleToggleStrikethrough = useCallback(() => {
    editor.toggleStrikethrough();
    setActiveStyles(editor.getActiveStyles());
  }, [editor]);

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

  /**
   * Generate style toggle button with active state styling
   */
  const StyleButton: React.FC<{
    onClick: () => void;
    isActive: boolean;
    icon: any;
    title: string;
  }> = ({ onClick, isActive, icon, title }) => {
    return (
      <button
        onClick={onClick}
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
      {/* Style buttons */}
      <StyleButton
        onClick={handleToggleBold}
        isActive={activeStyles.bold}
        icon={faBold}
        title="Bold (Ctrl+B)"
      />

      <StyleButton
        onClick={handleToggleItalic}
        isActive={activeStyles.italic}
        icon={faItalic}
        title="Italic (Ctrl+I)"
      />

      <StyleButton
        onClick={handleToggleUnderline}
        isActive={activeStyles.underline}
        icon={faUnderline}
        title="Underline (Ctrl+U)"
      />

      <StyleButton
        onClick={handleToggleStrikethrough}
        isActive={activeStyles.strikethrough}
        icon={faStrikethrough}
        title="Strikethrough"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Alignment buttons */}
      <AlignmentButton alignment="left" icon={faAlignLeft} title="Align Left" />

      <AlignmentButton alignment="center" icon={faAlignCenter} title="Align Center" />

      <AlignmentButton alignment="right" icon={faAlignRight} title="Align Right" />

      <AlignmentButton alignment="justify" icon={faAlignJustify} title="Justify" />
    </div>
  );
};

export default Toolbar;
