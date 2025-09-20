import React from 'react';
import { Editor } from '@renderer/Editor/Editor';

type ToolbarProps = {
  editor: Editor | null;
  currentParagraphIndex: number;
  boldActive: boolean;
  italicActive: boolean;
  currentColor: string;
  currentFontFamily: string; // '__mixed__' used for mixed state
  currentFontSize: number | null; // null used for mixed state
  syncToolbarFromEditor: (ed: Editor) => void;
};

const ToolbarButton: React.FC<{
  active?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ active, title, onClick, children }) => {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        `px-2.5 py-1.5 rounded-md border bg-white/85 hover:bg-white focus:bg-white ` +
        `border-white/60 shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] ` +
        `transition ${active ? 'ring-2 ring-emerald-300' : ''}`
      }
    >
      {children}
    </button>
  );
};

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  currentParagraphIndex,
  boldActive,
  italicActive,
  currentColor,
  currentFontFamily,
  currentFontSize,
  syncToolbarFromEditor,
}) => {
  const currentLineHeight = (() => {
    if (!editor) return 0;
    const s = editor.getParagraphStyle(currentParagraphIndex);
    return s?.lineHeight || editor.getDefaultLineHeight();
  })();

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white/60 backdrop-blur-md border-b border-white/30 sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Font family */}
      <select
        className="px-2 py-1 text-sm rounded-md bg-white/85 hover:bg-white focus:bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] border border-white/60 focus:outline-none"
        value={currentFontFamily === '__mixed__' ? '__mixed__' : currentFontFamily}
        onChange={(e) => {
          if (!editor) return;
          const val = e.target.value;
          editor.applyStyleToRange({ fontFamily: val }, 'set');
          syncToolbarFromEditor(editor);
        }}
        title="Font family (range)"
      >
        <option value="__mixed__" disabled>
          Mixed
        </option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="Inter">Inter</option>
        <option value="System UI">System UI</option>
      </select>

      {/* Font size */}
      <select
        className="px-2 py-1 text-sm rounded-md bg-white/85 hover:bg-white focus:bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] border border-white/60 focus:outline-none w-20"
        value={currentFontSize ?? ''}
        onChange={(e) => {
          if (!editor) return;
          const n = parseInt(e.target.value, 10);
          const size = Number.isFinite(n) ? n : editor.getBaseFontSize();
          editor.applyStyleToRange({ fontSize: size }, 'set');
          syncToolbarFromEditor(editor);
        }}
        title="Font size (range)"
      >
        <option value="" disabled>
          Mixed
        </option>
        {[12, 14, 16, 18, 20, 24, 28, 32].map((s) => (
          <option key={s} value={s}>
            {s}px
          </option>
        ))}
      </select>

      {/* Paragraph line-height */}
      <select
        className="px-2 py-1 text-sm rounded-md bg-white/85 hover:bg-white focus:bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] border border-white/60 focus:outline-none w-28"
        value={currentLineHeight}
        onChange={(e) => {
          if (!editor) return;
          const lh = parseInt(e.target.value, 10) || editor.getDefaultLineHeight();
          editor.setParagraphLineHeight(currentParagraphIndex, lh);
          syncToolbarFromEditor(editor);
        }}
        title="Paragraph line height"
      >
        {[14, 16, 18, 20, 22, 24, 28, 32, 36].map((lh) => (
          <option key={lh} value={lh}>
            {lh}px
          </option>
        ))}
      </select>

      {/* Bold */}
      <ToolbarButton
        active={boldActive}
        title="Bold"
        onClick={() => {
          if (!editor) return;
          editor.applyStyleToRange({ bold: true }, 'toggle');
          syncToolbarFromEditor(editor);
        }}
      >
        Bold
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        active={italicActive}
        title="Italic"
        onClick={() => {
          if (!editor) return;
          editor.applyStyleToRange({ italic: true }, 'toggle');
          syncToolbarFromEditor(editor);
        }}
      >
        Italic
      </ToolbarButton>

      {/* Color */}
      <input
        type="color"
        value={currentColor || '#000000'}
        onChange={(e) => {
          if (!editor) return;
          editor.applyStyleToRange({ color: e.target.value }, 'set');
          syncToolbarFromEditor(editor);
        }}
        className="h-8 w-10 rounded-md border border-white/60 bg-white/85 hover:bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]"
        title="Text color"
      />

      <ToolbarButton
        title="Clear color"
        onClick={() => {
          if (!editor) return;
          editor.clearStyleFromRange(['color']);
          syncToolbarFromEditor(editor);
        }}
      >
        Clear color
      </ToolbarButton>
    </div>
  );
};

export default Toolbar;
