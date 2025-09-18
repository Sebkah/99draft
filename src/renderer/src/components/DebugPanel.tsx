import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Editor, DebugConfig, PieceDebug } from '@renderer/Editor/Editor';

interface DebugPanelProps {
  editor: Editor;
}

// Reusable Section Header Component
interface SectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  indicatorColor: string;
  borderColor: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  isCollapsed,
  onToggle,
  indicatorColor,
  borderColor,
}) => (
  <div className={`bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border ${borderColor} shadow-lg`}>
    <div
      className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 rounded-lg px-3 py-2 transition-all duration-200"
      onClick={onToggle}
    >
      <div className={`w-3 h-3 ${indicatorColor} rounded-full animate-pulse shadow-sm`}></div>
      <h3 className="font-semibold text-sm text-gray-100 flex-1">{title}</h3>
      <motion.div
        className="text-gray-400 transition-transform duration-200 text-sm"
        animate={{ rotate: isCollapsed ? 0 : 180 }}
      >
        ▼
      </motion.div>
    </div>
  </div>
);

// Reusable Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-100">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
    </label>
  </div>
);

// Reusable Radio Option Component
interface RadioOptionProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}

const RadioOption: React.FC<RadioOptionProps> = ({ name, value, checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer p-3 rounded-xl hover:bg-gray-600/50 transition-all duration-200">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-indigo-500 bg-gray-600 border-gray-500 focus:ring-indigo-500 focus:ring-2"
    />
    <span className="ml-3 text-sm text-gray-200">{label}</span>
  </label>
);

/**
 * DebugPanel Component
 * A modern, transparent debug panel for editor internals
 * Features collapsible sections, real-time updates, and glassmorphism design
 */
const DebugPanel: React.FC<DebugPanelProps> = ({ editor }) => {
  // State for debug data
  const [piecesForDebug, setPiecesForDebug] = useState<PieceDebug[]>([]);
  const [debugConfig, setDebugConfig] = useState<DebugConfig>(editor.debugConfig);

  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    cursor: false,
    buffer: true,
    structure: true,
    visualization: false,
  });

  // State for panel collapse
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize debug updates
  useEffect(() => {
    if (editor) {
      editor.startDebugUpdates((pieces: PieceDebug[]) => {
        setPiecesForDebug(pieces);
      });
      setDebugConfig(editor.debugConfig);
    }
  }, [editor]);

  // Handle config changes
  const handleDebugConfigChange = (newConfig: DebugConfig) => {
    editor.debugConfig = newConfig;
    setDebugConfig(newConfig);
    const textRenderer = editor.getTextRenderer();
    if (textRenderer) {
      textRenderer.render();
    }
  };

  // Get editor data
  const cursorPosition = editor.getCursorPosition();
  const pieceTable = editor.getPieceTable();
  const textParser = editor.getTextParser();

  // Toggle section visibility
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 w-180 bg-gray-900/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-gray-700/50 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Panel Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-800/50 rounded-t-2xl transition-all duration-200 border-b border-gray-700/50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-sm"></div>
        <h2 className="font-bold text-base text-gray-100 flex-1">Debug Panel</h2>
        <motion.div
          className="text-gray-400 transition-transform duration-200 text-lg"
          animate={{ rotate: isCollapsed ? 0 : 180 }}
        >
          ▼
        </motion.div>
      </div>

      {!isCollapsed && (
        <motion.div
          className="p-4 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Cursor Position Section */}
          <SectionHeader
            title="Cursor Position"
            isCollapsed={collapsedSections.cursor}
            onToggle={() => toggleSection('cursor')}
            indicatorColor="bg-emerald-400"
            borderColor="border-emerald-500/30"
          />
          {!collapsedSections.cursor && (
            <motion.div
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/30 -mt-2 shadow-lg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-emerald-400/30 shadow-sm">
                  <div className="text-emerald-400 font-bold text-lg">{cursorPosition}</div>
                  <div className="text-gray-300 text-xs">Position</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-blue-400/30 shadow-sm">
                  <div className="text-blue-400 font-bold text-lg">
                    {pieceTable ? pieceTable.length : 0}
                  </div>
                  <div className="text-gray-300 text-xs">Length</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-purple-400/30 shadow-sm">
                  <div className="text-purple-400 font-bold text-lg">
                    {cursorPosition === (pieceTable ? pieceTable.length : 0) ? '✓' : '✗'}
                  </div>
                  <div className="text-gray-300 text-xs">At End</div>
                </div>
              </div>

              {/* Rendering Position */}
              {textParser && (
                <div className="bg-gray-700/50 rounded-xl p-4 border border-orange-400/30 shadow-sm">
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-orange-400 font-semibold text-base">
                        {textParser.cursorPositionInStructure[0]}
                      </span>
                      <span className="text-gray-400 text-xs">Paragraph</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-cyan-400 font-semibold text-base">
                        {textParser.cursorPositionInStructure[1]}
                      </span>
                      <span className="text-gray-400 text-xs">Line</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-pink-400 font-semibold text-base">
                        {textParser.cursorPositionInStructure[2]}
                      </span>
                      <span className="text-gray-400 text-xs">Character</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-red-400 font-semibold text-base">
                        {textParser.cursorPositionInStructure[3]}px
                      </span>
                      <span className="text-gray-400 text-xs">Pixel Offset</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Debug Visualization Controls */}
          <SectionHeader
            title="Debug Visualization"
            isCollapsed={collapsedSections.visualization}
            onToggle={() => toggleSection('visualization')}
            indicatorColor="bg-purple-400"
            borderColor="border-purple-500/30"
          />
          {!collapsedSections.visualization && (
            <motion.div
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 -mt-2 space-y-4 shadow-lg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Word Debug Section */}
              <div className="bg-gray-700/50 rounded-xl p-4 border border-purple-400/30 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-100 font-semibold">Word Debug</span>
                  <ToggleSwitch
                    label=""
                    checked={debugConfig.showWordOffsets}
                    onChange={(checked) =>
                      handleDebugConfigChange({
                        ...debugConfig,
                        showWordOffsets: checked,
                      })
                    }
                  />
                </div>

                {debugConfig.showWordOffsets && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-300 mb-3">Display Mode:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <RadioOption
                        name="wordDisplayMode"
                        value="index"
                        checked={debugConfig.wordDisplayMode === 'index'}
                        onChange={() =>
                          handleDebugConfigChange({
                            ...debugConfig,
                            wordDisplayMode: 'index',
                          })
                        }
                        label="Index"
                      />
                      <RadioOption
                        name="wordDisplayMode"
                        value="charOffset"
                        checked={debugConfig.wordDisplayMode === 'charOffset'}
                        onChange={() =>
                          handleDebugConfigChange({
                            ...debugConfig,
                            wordDisplayMode: 'charOffset',
                          })
                        }
                        label="Char"
                      />
                      <RadioOption
                        name="wordDisplayMode"
                        value="pixelOffset"
                        checked={debugConfig.wordDisplayMode === 'pixelOffset'}
                        onChange={() =>
                          handleDebugConfigChange({
                            ...debugConfig,
                            wordDisplayMode: 'pixelOffset',
                          })
                        }
                        label="Pixel"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Other Debug Options */}
              <div className="bg-gray-700/50 rounded-xl p-4 border border-purple-400/30 shadow-sm">
                <div className="text-sm text-gray-100 font-semibold mb-4">Other Options</div>
                <div className="grid grid-cols-1 gap-3">
                  <ToggleSwitch
                    label="Line Info"
                    checked={debugConfig.showLineInfo}
                    onChange={(checked) =>
                      handleDebugConfigChange({
                        ...debugConfig,
                        showLineInfo: checked,
                      })
                    }
                  />
                  <ToggleSwitch
                    label="Paragraphs"
                    checked={debugConfig.showParagraphBounds}
                    onChange={(checked) =>
                      handleDebugConfigChange({
                        ...debugConfig,
                        showParagraphBounds: checked,
                      })
                    }
                  />
                  <ToggleSwitch
                    label="Cursor"
                    checked={debugConfig.showCursor}
                    onChange={(checked) =>
                      handleDebugConfigChange({
                        ...debugConfig,
                        showCursor: checked,
                      })
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Add Buffer Section */}
          <SectionHeader
            title="Add Buffer"
            isCollapsed={collapsedSections.buffer}
            onToggle={() => toggleSection('buffer')}
            indicatorColor="bg-yellow-400"
            borderColor="border-yellow-500/30"
          />
          {!collapsedSections.buffer && (
            <motion.div
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 -mt-2 shadow-lg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="font-mono text-sm text-yellow-300 bg-gray-900/50 rounded-lg p-3 border border-gray-600/30">
                {pieceTable
                  ? pieceTable.addBuffer.replace(/[\n\r]/g, '\\n') || '<empty>'
                  : 'Loading...'}
              </div>
            </motion.div>
          )}

          {/* Piece Table Structure */}
          <SectionHeader
            title="Piece Table Structure"
            isCollapsed={collapsedSections.structure}
            onToggle={() => toggleSection('structure')}
            indicatorColor="bg-blue-400"
            borderColor="border-blue-500/30"
          />
          {!collapsedSections.structure && (
            <motion.div
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30 -mt-2 shadow-lg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                {piecesForDebug.map((piece, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-700/50 rounded-xl p-4 border border-gray-500/30 hover:border-gray-400/50 transition-all duration-200 shadow-sm"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm font-medium">#{index}</span>
                        <span className="text-lg">{piece.source === 'original' ? '📄' : '✏️'}</span>
                        <span className="text-sm bg-gray-600 px-3 py-1 rounded-full text-gray-100 border border-gray-500/20">
                          {piece.source}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        @{piece.offset} ({piece.length})
                      </div>
                    </div>
                    <div className="font-mono text-sm text-gray-300 bg-gray-900/50 rounded-lg p-3 border border-gray-600/30">
                      "
                      {piece.text
                        ? piece.text.split(/(\r\n|\r|\n)/).map((part, i) =>
                            /^(?:\r\n|\r|\n)$/u.test(part) ? (
                              <span key={i} className="text-yellow-300">
                                {'\\n'}
                              </span>
                            ) : (
                              <span key={i}>{part}</span>
                            ),
                          )
                        : '<empty>'}
                      "
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default DebugPanel;
