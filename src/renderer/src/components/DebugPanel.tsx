import React, { useState } from 'react';
import { PieceTable } from '@renderer/Editor/PieceTable/PieceTable';
import { TextRenderer } from '@renderer/Editor/TextRenderer';
import { motion } from 'framer-motion';

/**
 * Type definition for debugging piece table structure
 */
type PieceDebug = {
  source: 'original' | 'add';
  offset: number;
  length: number;
  text: string;
};

interface DebugPanelProps {
  cursorPosition: number;
  pieceTable: PieceTable | null;
  textRenderer: TextRenderer | null;
  piecesForDebug: PieceDebug[];
}

/**
 * DebugPanel component that shows piece table internals
 * Positioned as a floating panel in the bottom right corner
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  cursorPosition,
  pieceTable,
  textRenderer,
  piecesForDebug,
}) => {
  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    cursor: true,
    buffer: true,
    structure: true,
  });

  // State for the whole panel
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Toggle function for collapsible sections
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <motion.div className="fixed bottom-2 right-2 w-180  overflow-auto bg-gray-900 text-white p-2 rounded-lg shadow-2xl z-50">
      {/* Main panel header */}
      <div
        className="flex items-center gap-1 mb-2 cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
        <h2 className="font-medium text-sm text-gray-100 flex-1">Debug Panel</h2>
        <div
          className={`text-gray-300 transition-transform duration-200 text-sm ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
        >
          ▼
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-2">
          {/* Cursor position debug info */}
          <div className="bg-gray-800 rounded-md p-1.5 border border-green-500/30">
            <div
              className="flex items-center gap-1 mb-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors"
              onClick={() => toggleSection('cursor')}
            >
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-medium text-xs text-gray-100 flex-1">Cursor Position</h3>
              <div
                className={`text-gray-300 transition-transform duration-200 text-xs ${collapsedSections.cursor ? 'rotate-0' : 'rotate-180'}`}
              >
                ▼
              </div>
            </div>

            {!collapsedSections.cursor && (
              <>
                {/* Stats grid with modern cards */}
                <div className="grid grid-cols-3 gap-1 mb-1">
                  <div className="bg-gray-700 rounded p-1.5 text-center border border-green-400/30">
                    <div className="text-green-400 font-bold text-xs">{cursorPosition}</div>
                    <div className="text-gray-300 text-xs">Pos</div>
                  </div>
                  <div className="bg-gray-700 rounded p-1.5 text-center border border-blue-400/30">
                    <div className="text-blue-400 font-bold text-xs">
                      {pieceTable ? pieceTable.length : 0}
                    </div>
                    <div className="text-gray-300 text-xs">Len</div>
                  </div>
                  <div className="bg-gray-700 rounded p-1.5 text-center border border-purple-400/30">
                    <div className="text-purple-400 font-bold text-xs">
                      {cursorPosition === (pieceTable ? pieceTable.length : 0) ? '✓' : '✗'}
                    </div>
                    <div className="text-gray-300 text-xs">End</div>
                  </div>
                </div>

                {/* Rendering position info */}
                {textRenderer && (
                  <div className="bg-gray-700 rounded p-1.5 border border-orange-400/30">
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="flex flex-col items-center">
                        <span className="text-orange-400 font-medium text-xs">
                          {(textRenderer as any)._renderedCursorPosition[0]}
                        </span>
                        <span className="text-gray-400 text-xs">Para</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-cyan-400 font-medium text-xs">
                          {(textRenderer as any)._renderedCursorPosition[1]}
                        </span>
                        <span className="text-gray-400 text-xs">Line</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-pink-400 font-medium text-xs">
                          {(textRenderer as any)._renderedCursorPosition[2]}px
                        </span>
                        <span className="text-gray-400 text-xs">Off</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Add buffer contents */}
          <div className="bg-gray-800 rounded-md p-1.5 border border-yellow-500/30">
            <div
              className="flex items-center gap-1 mb-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors"
              onClick={() => toggleSection('buffer')}
            >
              <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
              <h3 className="font-medium text-xs text-gray-100 flex-1">Add Buffer</h3>
              <div
                className={`text-gray-300 transition-transform duration-200 text-xs ${collapsedSections.buffer ? 'rotate-0' : 'rotate-180'}`}
              >
                ▼
              </div>
            </div>
            {!collapsedSections.buffer && (
              <div className="bg-gray-900 rounded px-2 py-1 border border-yellow-400/20 font-mono text-xs w-full overflow-y-auto">
                <div className="text-yellow-300 ">
                  {pieceTable
                    ? pieceTable.addBuffer.replace(/[\n\r]/g, '\\n') || '<empty>'
                    : 'Loading...'}
                </div>
              </div>
            )}
          </div>

          {/* Piece table structure debug info */}
          <div className="bg-gray-800 rounded-md p-1.5 border border-blue-500/30">
            <div
              className="flex items-center gap-1 mb-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors"
              onClick={() => toggleSection('structure')}
            >
              <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
              <h3 className="font-medium text-xs text-gray-100 flex-1">Piece Table Structure</h3>
              <div
                className={`text-gray-300 transition-transform duration-200 text-xs ${collapsedSections.structure ? 'rotate-0' : 'rotate-180'}`}
              >
                ▼
              </div>
            </div>
            {!collapsedSections.structure && (
              <div className="bg-gray-900 rounded p-1.5 border border-blue-400/20  overflow-auto custom-scrollbar">
                <div className="space-y-1">
                  {piecesForDebug.map((piece, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded p-1.5 border border-gray-500/30 hover:border-gray-400/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">#{index}</span>
                          <span className="text-xs">
                            {piece.source === 'original' ? '📄' : '✏️'}
                          </span>
                          <span className="text-xs bg-gray-600 px-1 py-0.5 rounded text-gray-200 border border-gray-400/20">
                            {piece.source}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          @{piece.offset} ({piece.length})
                        </div>
                      </div>
                      <div className="font-mono text-xs text-gray-300 bg-gray-900 rounded p-1 border border-gray-600/30">
                        "{piece.text || '<empty>'}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DebugPanel;
