import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Editor, PieceDebug, DebugConfig } from '@renderer/Editor/Editor';
import { StructurePosition } from '@renderer/Editor/CursorManager';

type Props = {
  editor: Editor;
};

const DebugPanelNew: React.FC<Props> = ({ editor }) => {
  const [pieces, setPieces] = useState<PieceDebug[]>([]);
  const [cursor, setCursor] = useState<{
    pos: number;
    structure: StructurePosition | null;
  }>({
    pos: editor.getCursorPosition(),
    structure: editor.getStructurePosition() ?? null,
  });

  const renderer = useMemo(() => editor.getTextRenderer(), [editor]);
  const pieceTable = useMemo(() => editor.getPieceTable(), [editor]);

  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(renderer?.showDebugInfo ?? true);
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [debugConfig, setDebugConfig] = useState<DebugConfig>({ ...editor.debugConfig });

  useEffect(() => {
    editor.startDebugUpdates((newPieces) => {
      setPieces(newPieces);
      setCursor({
        pos: editor.getCursorPosition(),
        structure: editor.getStructurePosition() ?? null,
      });
    });
    return () => {
      // Clear the subscription with a noop to avoid stale callbacks
      editor.startDebugUpdates(() => {});
    };
  }, [editor]);

  const rerender = () => {
    renderer?.render();
  };

  const toggle = (key: keyof DebugConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...debugConfig, [key]: e.target.checked } as DebugConfig;
    setDebugConfig(next);
    editor.debugConfig = next;
    rerender();
  };

  const setWordMode = (mode: DebugConfig['wordDisplayMode']) => {
    const next = { ...debugConfig, wordDisplayMode: mode };
    setDebugConfig(next);
    editor.debugConfig = next;
    rerender();
  };

  const toggleShowDebugInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setShowDebugInfo(val);
    if (renderer) {
      renderer.showDebugInfo = val;
      renderer.render();
    }
  };

  const [hoverInfo, setHoverInfo] = useState<{
    pindex: number;
    lindex: number;
    x: number;
    y: number;
    offset: number;
    length: number;
    pixelLength: number;
    words: number;
  } | null>(null);

  const structuresRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className={`fixed right-4 bottom-4 w-[520px] ${collapsed ? '' : 'max-h-[70vh]'} text-xs text-white/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden z-20 bg-gradient-to-br from-slate-900/70 to-slate-800/60 flex flex-col`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <strong className="text-sm">Debug Panel</strong>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-90">
          <span className="hidden sm:inline">Overlay</span>
          <Switch checked={showDebugInfo} onChange={toggleShowDebugInfo} accent="sky" />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-white/90"
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <svg
              className={`size-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 8l5 6 5-6H5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${collapsed ? 'hidden' : 'min-h-0 overflow-auto'}`}>
        <Section title="Cursor" accent="sky" defaultOpen>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xs opacity-80">Absolute position</span>
              <span className="px-2 py-0.5 rounded-md bg-sky-400/15 text-sky-100 border border-sky-400/30">
                {cursor.pos}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="col-span-1 opacity-80">Paragraph</div>
              <div className="col-span-1 opacity-80">Line</div>
              <div className="col-span-1 opacity-80">Char</div>
              <div className="col-span-1 opacity-80">Pixel</div>
              {cursor.structure ? (
                <>
                  <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
                    {cursor.structure.paragraphIndex}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
                    {cursor.structure.lineIndex}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
                    {cursor.structure.characterIndex}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
                    {Math.round((cursor.structure.pixelOffsetInLine ?? 0) as number)}px
                  </div>
                </>
              ) : (
                <div className="col-span-4 text-center">—</div>
              )}
            </div>
          </div>
        </Section>

        <Section title="Renderer Debug" accent="emerald" defaultOpen>
          <ToggleRow label="Show cursor">
            <Switch
              checked={debugConfig.showCursor}
              onChange={toggle('showCursor')}
              accent="emerald"
            />
          </ToggleRow>
          <ToggleRow label="Paragraph bounds">
            <Switch
              checked={debugConfig.showParagraphBounds}
              onChange={toggle('showParagraphBounds')}
              accent="emerald"
            />
          </ToggleRow>
          <ToggleRow label="Line info">
            <Switch
              checked={debugConfig.showLineInfo}
              onChange={toggle('showLineInfo')}
              accent="emerald"
            />
          </ToggleRow>
          <ToggleRow label="Word offsets">
            <Switch
              checked={debugConfig.showWordOffsets}
              onChange={toggle('showWordOffsets')}
              accent="emerald"
            />
          </ToggleRow>
          <div className="mt-2">
            <div className="mb-1.5 text-xs opacity-90">Word label mode</div>
            <RadioGroup
              options={[
                { value: 'index', label: 'Index' },
                { value: 'charOffset', label: 'Char' },
                { value: 'pixelOffset', label: 'Pixels' },
              ]}
              value={debugConfig.wordDisplayMode}
              onChange={(v) => setWordMode(v)}
              accent="emerald"
            />
          </div>
        </Section>

        <Section title="Layout" accent="amber">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-xs opacity-80">Left margin</div>
            <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
              {editor.margins.left}px
            </div>
            <div className="text-xs opacity-80">Right margin</div>
            <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
              {editor.margins.right}px
            </div>
            <div className="text-xs opacity-80">Wrap width</div>
            <div className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-center">
              {editor.wrappingWidth}px
            </div>
          </div>
        </Section>

        <Section title="Stats" accent="emerald" defaultOpen>
          {(() => {
            const paragraphs = editor.getTextParser()?.getParagraphs() ?? [];
            const totalLines = paragraphs.reduce((acc, p) => acc + p.lines.length, 0);
            const originalPieces = pieces.filter((p) => p.source === 'original');
            const addPieces = pieces.filter((p) => p.source === 'add');
            const originalChars = originalPieces.reduce((acc, p) => acc + p.length, 0);
            const addChars = addPieces.reduce((acc, p) => acc + p.length, 0);
            const addBufferLen = pieceTable.addBuffer.length;
            const originalBufferLen = pieceTable.originalBuffer.length;
            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="opacity-80">Doc length</div>
                <div>{pieceTable.length}</div>
                <div className="opacity-80">Paragraphs</div>
                <div>{paragraphs.length}</div>
                <div className="opacity-80">Lines</div>
                <div>{totalLines}</div>
                <div className="opacity-80">Pieces</div>
                <div>
                  {pieces.length} (orig {originalPieces.length} / add {addPieces.length})
                </div>
                <div className="opacity-80">Chars by source</div>
                <div>
                  orig {originalChars} / add {addChars}
                </div>
                <div className="opacity-80">Buffers</div>
                <div>
                  orig {originalBufferLen} / add {addBufferLen}
                </div>
              </div>
            );
          })()}
        </Section>

        <Section title="Structures" accent="sky" defaultOpen>
          <div className="space-y-2 relative" ref={structuresRef}>
            {(editor.getTextParser()?.getParagraphs() ?? []).map((p, pindex) => (
              <div key={pindex} className="rounded-md border border-white/10 bg-white/5">
                <div
                  className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-white/10"
                  onMouseEnter={() => {
                    renderer?.setHoveredParagraph(pindex);
                    renderer?.setHoveredLine(null);
                    renderer?.render();
                  }}
                  onMouseLeave={() => {
                    renderer?.setHoveredParagraph(null);
                    renderer?.render();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-100 border border-sky-400/30">
                      P{pindex}
                    </span>
                    <span className="opacity-80 text-[10px]">
                      off {p.offset} • len {p.length}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-70">{p.lines.length} lines</span>
                </div>
                <div className="px-2 pb-2">
                  <div className="grid [grid-template-columns:repeat(auto-fill,minmax(42px,1fr))] gap-1.5">
                    {p.lines.map((l, lindex) => (
                      <div
                        key={lindex}
                        className="relative text-[10px] px-1.5 py-1 rounded border border-white/15 bg-white/8 hover:bg-white/12 cursor-pointer text-center select-none"
                        onMouseEnter={(e) => {
                          renderer?.setHoveredParagraph(pindex);
                          renderer?.setHoveredLine(pindex, lindex);
                          renderer?.render();
                          const container = structuresRef.current;
                          if (container) {
                            const tileRect = (
                              e.currentTarget as HTMLDivElement
                            ).getBoundingClientRect();
                            const containerRect = container.getBoundingClientRect();
                            const pad = 8;
                            const tooltipW = 220; // approximate
                            const tooltipH = 110; // approximate
                            const xRight = tileRect.right - containerRect.left + pad;
                            const x = Math.max(
                              pad,
                              Math.min(xRight, containerRect.width - pad - tooltipW),
                            );
                            const yTop = tileRect.top - containerRect.top;
                            const y = Math.max(
                              pad,
                              Math.min(yTop, containerRect.height - pad - tooltipH),
                            );
                            setHoverInfo({
                              pindex,
                              lindex,
                              x,
                              y,
                              offset: l.offset,
                              length: l.length,
                              pixelLength: Math.round(l.pixelLength),
                              words: l.wordpixelOffsets?.length ?? 0,
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          renderer?.setHoveredLine(null);
                          renderer?.render();
                          setHoverInfo(null);
                        }}
                        title={`Line ${lindex}`}
                      >
                        L{lindex}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {hoverInfo && (
              <div
                className="pointer-events-none absolute z-50 max-w-[260px]"
                style={{ left: hoverInfo.x, top: hoverInfo.y }}
              >
                <div className="rounded-md border border-white/20 bg-slate-900/90 backdrop-blur px-2 py-1.5 shadow-lg">
                  <div className="text-[10px] opacity-80 mb-1">
                    P{hoverInfo.pindex} • L{hoverInfo.lindex}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div className="opacity-70">offset</div>
                    <div>{hoverInfo.offset}</div>
                    <div className="opacity-70">length</div>
                    <div>{hoverInfo.length}</div>
                    <div className="opacity-70">pixels</div>
                    <div>{hoverInfo.pixelLength}</div>
                    <div className="opacity-70">words</div>
                    <div>{hoverInfo.words}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section title="Piece Table" accent="fuchsia">
          {(() => {
            const addPiecesCount = pieces.filter((p) => p.source === 'add').length;
            const originalPiecesCount = pieces.length - addPiecesCount;
            const addBufferLen = pieceTable.addBuffer.length;
            return (
              <div className="mb-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-400/20 text-fuchsia-100 border border-fuchsia-400/40">
                    add pieces {addPiecesCount}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-100 border border-sky-400/40">
                    orig pieces {originalPiecesCount}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-400/40">
                    add buffer {addBufferLen} chars
                  </span>
                </div>
                {addBufferLen > 0 && (
                  <div className="font-mono text-[11px] opacity-90 whitespace-pre-wrap break-words rounded-md bg-white/5 border border-white/15 p-2">
                    {(() => {
                      const maxPreview = 120;
                      const start = Math.max(0, addBufferLen - maxPreview);
                      const tail = pieceTable.addBuffer.slice(start);
                      const parts = tail.split('\n');
                      return (
                        <>
                          {start > 0 && <span className="opacity-60">…</span>}
                          {parts.map((part, idx) => (
                            <React.Fragment key={idx}>
                              <span>{part}</span>
                              {idx < parts.length - 1 && (
                                <span className="text-fuchsia-300">/n</span>
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="max-h-56 overflow-auto rounded-md bg-white/5 border border-white/15">
            {pieces.length === 0 && <div className="p-2.5 text-xs opacity-80">No pieces</div>}
            {pieces.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr] gap-2 px-2.5 py-2 border-b border-dashed border-white/10 last:border-b-0"
              >
                <div className="text-xs px-2 py-0.5 h-fit rounded-full bg-fuchsia-400/20 text-fuchsia-100 border border-fuchsia-400/40">
                  {i}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`${p.source === 'original' ? 'bg-sky-400/20 text-sky-100 border-sky-400/40' : 'bg-violet-400/20 text-violet-100 border-violet-400/40'} px-2 py-0.5 rounded-full border`}
                    >
                      {p.source}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                      off {p.offset}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                      len {p.length}
                    </span>
                  </div>
                  <div className="font-mono text-xs opacity-90 whitespace-pre-wrap break-words">
                    {(() => {
                      const parts = p.text.split('\n');
                      return parts.map((part, idx) => (
                        <React.Fragment key={idx}>
                          <span>{part}</span>
                          {idx < parts.length - 1 && <span className="text-fuchsia-300">/n</span>}
                        </React.Fragment>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
};

export default DebugPanelNew;

type SectionProps = {
  title: string;
  accent: 'sky' | 'emerald' | 'fuchsia' | 'amber';
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, accent, defaultOpen = false, children }) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  const accentBar =
    accent === 'sky'
      ? 'bg-sky-400'
      : accent === 'emerald'
        ? 'bg-emerald-400'
        : accent === 'amber'
          ? 'bg-amber-400'
          : 'bg-fuchsia-400';

  const accentCheckbox =
    accent === 'sky'
      ? 'accent-sky-400'
      : accent === 'emerald'
        ? 'accent-emerald-400'
        : accent === 'amber'
          ? 'accent-amber-400'
          : 'accent-fuchsia-400';

  return (
    <div className="px-3 py-2 border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className={`inline-block w-1.5 h-4 rounded-full ${accentBar}`} />
          <span className="text-sm opacity-90">{title}</span>
        </div>
        <svg
          className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
      </button>
      <div className={`${open ? 'mt-2' : 'hidden'}`}>
        {/* Ensure checkbox accents inherit section color if used inside */}
        <div className={accentCheckbox.replace('accent-', 'sr-only ')} />
        {children}
      </div>
    </div>
  );
};

type SwitchProps = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accent?: 'sky' | 'emerald' | 'fuchsia' | 'amber';
};

const Switch: React.FC<SwitchProps> = ({ checked, onChange, accent = 'sky' }) => {
  const accentBg =
    accent === 'sky'
      ? 'bg-sky-400'
      : accent === 'emerald'
        ? 'bg-emerald-400'
        : accent === 'amber'
          ? 'bg-amber-400'
          : 'bg-fuchsia-400';
  return (
    <label className="inline-flex items-center cursor-pointer select-none">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full border border-white/20 transition-colors ${checked ? `${accentBg}/30 ring-1 ring-white/30` : 'bg-white/10'}`}
      >
        <span className={`absolute inset-0 rounded-full ${checked ? `${accentBg}/30` : ''}`} />
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`z-10 inline-block h-5 w-5 rounded-full shadow ${checked ? `${accentBg}` : 'bg-white'}`}
          style={{ x: checked ? 20 : 2 }}
        />
      </span>
    </label>
  );
};

const ToggleRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2 mb-2">
    <span>{label}</span>
    {children}
  </div>
);

type RadioOption<T extends string> = { value: T; label: string };
type RadioGroupProps<T extends string> = {
  options: RadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accent?: 'sky' | 'emerald' | 'fuchsia' | 'amber';
};

const RadioGroup = <T extends string>({
  options,
  value,
  onChange,
  accent = 'sky',
}: RadioGroupProps<T>) => {
  const accentBg =
    accent === 'sky'
      ? 'bg-sky-400'
      : accent === 'emerald'
        ? 'bg-emerald-400'
        : accent === 'amber'
          ? 'bg-amber-400'
          : 'bg-fuchsia-400';
  return (
    <div className="relative inline-flex rounded-md border border-white/20 bg-white/10 overflow-hidden">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-1 text-sm transition-colors ${selected ? 'text-white' : 'text-white/80 hover:text-white'}`}
          >
            {selected && (
              <motion.span
                layoutId="radio-pill"
                className={`absolute inset-0 -z-10 ${accentBg} bg-opacity-40`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
