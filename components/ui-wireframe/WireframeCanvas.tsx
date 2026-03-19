import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Share2, Clipboard, Check, Figma } from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const FIGMA_PLUGIN_ID = import.meta.env.VITE_FIGMA_PLUGIN_ID || "ai-design-bridge";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface WireframeScreen {
  id: string;
  title: string;
  html: string;
  connections: Array<{ to: string; label: string }>;
}

export interface MultiScreenWireframe {
  appName: string;
  screens: WireframeScreen[];
}

export type WireframeData = MultiScreenWireframe;

// ── Layout constants ───────────────────────────────────────────────────────────
const SCREEN_W = 640;
const SCREEN_H = 400;
const IFRAME_W = 1280;
const IFRAME_H = 800;
const IFRAME_SCALE = SCREEN_W / IFRAME_W;
const COL_GAP = 120;
const ROW_GAP = 80;
const COLS = 2;
const LABEL_H = 32;

function screenPos(i: number) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: col * (SCREEN_W + COL_GAP),
    y: row * (SCREEN_H + ROW_GAP + LABEL_H),
  };
}

function boundingBox(count: number) {
  const rows = Math.ceil(count / COLS);
  const cols = Math.min(count, COLS);
  return {
    w: cols * SCREEN_W + (cols - 1) * COL_GAP,
    h: rows * (SCREEN_H + LABEL_H) + (rows - 1) * ROW_GAP,
  };
}

// ── Connection Arrows ──────────────────────────────────────────────────────────
interface ArrowProps {
  fromScreen: WireframeScreen;
  fromIdx: number;
  toIdx: number;
  label: string;
}

function ConnectionArrow({ fromIdx, toIdx, label }: ArrowProps) {
  const from = screenPos(fromIdx);
  const to = screenPos(toIdx);
  const sx = from.x + SCREEN_W;
  const sy = from.y + LABEL_H + SCREEN_H / 2;
  const tx = to.x;
  const ty = to.y + LABEL_H + SCREEN_H / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const isSameRow = Math.abs(dy) < 50;
  let d: string;
  let lx: number, ly: number;

  if (isSameRow) {
    d = `M ${sx} ${sy} L ${tx} ${ty}`;
    lx = (sx + tx) / 2;
    ly = sy;
  } else {
    const cp1x = sx + Math.max(dx * 0.4, 40);
    const cp2x = tx - Math.max(dx * 0.4, 40);
    d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ty}, ${tx} ${ty}`;
    lx = (sx + tx) / 2;
    ly = (sy + ty) / 2;
  }
  return (
    <g>
      <defs>
        <marker id={`arrow-${fromIdx}-${toIdx}`} markerWidth="10" markerHeight="10"
          refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,5 L0,10 Z" fill="#cbd5e1" />
        </marker>
      </defs>
      <path d={d} fill="none" stroke="#cbd5e1" strokeWidth="1.5"
        markerEnd={`url(#arrow-${fromIdx}-${toIdx})`} className="transition-all duration-300" />
      {label && (
        <g transform={`translate(${lx}, ${ly})`}>
          <rect x={-label.length * 3 - 6} y={-10} width={label.length * 6 + 12} height={20}
            rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <text x="0" y="3" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="500" className="select-none">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

// ── Main Canvas ────────────────────────────────────────────────────────────────
type FigmaExportState = "idle" | "generating" | "opening" | "done" | "error";

interface WireframeCanvasProps {
  data: WireframeData | null;
}

const WireframeCanvas: React.FC<WireframeCanvasProps> = ({ data }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 40, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [figmaStates, setFigmaStates] = useState<Record<string, FigmaExportState>>({});
  const [figmaErrors, setFigmaErrors] = useState<Record<string, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit on data change
  useLayoutEffect(() => {
    if (!data || !data.screens?.length || !containerRef.current) return;
    const { w, h } = boundingBox(data.screens.length);
    const pad = 40;
    const cw = containerRef.current.clientWidth || 800;
    const ch = containerRef.current.clientHeight || 600;
    const s = Math.min((cw - pad * 2) / w, (ch - pad * 2) / h, 1);
    setScale(s);
    setPosition({ x: (cw - w * s) / 2, y: pad });
  }, [data]);

  // Native non-passive wheel listener to prevent browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.min(Math.max(s * delta, 0.1), 4));
      } else {
        // Pan
        setPosition(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleCopySVG = (screen: WireframeScreen) => {
    const svgString = `<svg width="${IFRAME_W}" height="${IFRAME_H}" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">${screen.html}</div>
  </foreignObject>
</svg>`.trim();
    navigator.clipboard.writeText(svgString).then(() => {
      setCopiedId(screen.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleExportToFigma = async (screen: WireframeScreen) => {
    setFigmaStates(s => ({ ...s, [screen.id]: "generating" }));
    setFigmaErrors(e => ({ ...e, [screen.id]: "" }));

    try {
      const resp = await fetch(`${BACKEND_URL}/figma/generate-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: screen.html, title: screen.title }),
      });

      if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
      const responseData = await resp.json();

      if (!responseData.success || !responseData.session_id) {
        throw new Error(responseData.error || "Schema generation failed");
      }

      setFigmaStates(s => ({ ...s, [screen.id]: "opening" }));
      const figmaUrl = `figma://run-plugin?id=${FIGMA_PLUGIN_ID}&payload=${encodeURIComponent(responseData.session_id)}`;
      window.open(figmaUrl, "_blank");

      setFigmaStates(s => ({ ...s, [screen.id]: "done" }));
      setTimeout(() => setFigmaStates(s => ({ ...s, [screen.id]: "idle" })), 3000);

    } catch (err: any) {
      console.error("Export to Figma failed:", err);
      setFigmaStates(s => ({ ...s, [screen.id]: "error" }));
      setFigmaErrors(e => ({ ...e, [screen.id]: err.message }));
      setTimeout(() => setFigmaStates(s => ({ ...s, [screen.id]: "idle" })), 4000);
    }
  };

  const handleExportAllToFigma = async () => {
    if (!data?.screens.length) return;
    setFigmaStates(s => ({ ...s, "__ALL__": "generating" }));
    setFigmaErrors(e => ({ ...e, "__ALL__": "" }));

    try {
      const resp = await fetch(`${BACKEND_URL}/figma/generate-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screens: data.screens.map(s => ({ title: s.title, html: s.html }))
        }),
      });

      if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
      const responseData = await resp.json();

      if (!responseData.success || !responseData.session_id) {
        throw new Error(responseData.error || "Schema generation failed");
      }

      setFigmaStates(s => ({ ...s, "__ALL__": "opening" }));
      const figmaUrl = `figma://run-plugin?id=${FIGMA_PLUGIN_ID}&payload=${encodeURIComponent(responseData.session_id)}`;
      window.open(figmaUrl, "_blank");

      setFigmaStates(s => ({ ...s, "__ALL__": "done" }));
      setTimeout(() => setFigmaStates(s => ({ ...s, "__ALL__": "idle" })), 3000);

    } catch (err: any) {
      console.error("Export all to Figma failed:", err);
      setFigmaStates(s => ({ ...s, "__ALL__": "error" }));
      setFigmaErrors(e => ({ ...e, "__ALL__": err.message }));
      setTimeout(() => setFigmaStates(s => ({ ...s, "__ALL__": "idle" })), 4000);
    }
  };

  if (!data || !data.screens?.length) {
    return (
      <div className="w-full h-full bg-[#f1f3f5] flex items-center justify-center">
        <div className="text-center text-zinc-400">
          <div className="text-4xl mb-4 font-thin opacity-30">⬡</div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">No Design Blueprint</p>
        </div>
      </div>
    );
  }

  const screens = data.screens;
  const idToIdx = Object.fromEntries(screens.map((s, i) => [s.id, i]));
  const { w: totalW, h: totalH } = boundingBox(screens.length);

  const arrows: { from: WireframeScreen; fromIdx: number; toIdx: number; label: string }[] = [];
  screens.forEach((screen, fromIdx) => {
    screen.connections?.forEach(conn => {
      const toIdx = idToIdx[conn.to];
      if (toIdx !== undefined && toIdx !== fromIdx) {
        arrows.push({ from: screen, fromIdx, toIdx, label: conn.label });
      }
    });
  });

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#eef0f3] overflow-hidden relative select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Subtle Dot Grid matching new design */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: `${24 * scale}px ${24 * scale}px`,
        backgroundPosition: `${position.x}px ${position.y}px`,
      }} />

      {/* Subtle Top App Label */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full
        bg-white/50 backdrop-blur-md border border-white/40 shadow-sm text-[10px] font-semibold text-zinc-600 tracking-wider uppercase">
        {data.appName}
      </div>

      {/* Canvas Area */}
      <div className="absolute origin-top-left" style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        width: totalW,
        height: totalH + LABEL_H,
      }}>
        {/* Arrows */}
        <svg className="absolute top-0 left-0 pointer-events-none overflow-visible"
          style={{ width: totalW, height: totalH + LABEL_H }}>
          {arrows.map(({ from, fromIdx, toIdx, label }, i) => (
            <ConnectionArrow key={i} fromScreen={from} fromIdx={fromIdx} toIdx={toIdx} label={label} />
          ))}
        </svg>

        {/* Screens */}
        {screens.map((screen, i) => {
          const { x, y } = screenPos(i);
          const figmaState = figmaStates[screen.id] || "idle";
          const figmaError = figmaErrors[screen.id] || "";

          return (
            <div key={screen.id} className="group"
              style={{ position: 'absolute', left: x, top: y, width: SCREEN_W }}>

              {/* Minimalist Label Bar (Realigned to match screenshot) */}
              <div style={{ height: LABEL_H }} className="flex items-end pb-2 px-1 justify-between w-full">
                <span className="text-[13px] font-medium text-blue-500 tracking-wide select-none">
                  {screen.title || `Page ${i + 1}`}
                </span>

                {/* Hover Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopySVG(screen)}
                    className="p-1.5 rounded bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-900 transition-colors"
                    title="Copy as SVG"
                  >
                    {copiedId === screen.id ? <Check size={12} className="text-emerald-500" /> : <Clipboard size={12} />}
                  </button>

                  <button
                    onClick={() => handleExportToFigma(screen)}
                    disabled={figmaState === "generating" || figmaState === "opening"}
                    className={`
                      flex items-center gap-1.5 px-3 h-[26px] rounded bg-white border shadow-sm text-[11px] font-medium transition-all
                      ${figmaState === "done"
                        ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                        : figmaState === "error"
                          ? "border-red-200 text-red-600 bg-red-50"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"}
                      disabled:opacity-60
                    `}
                  >
                    {figmaState === "generating" || figmaState === "opening" ? (
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : figmaState === "done" ? (
                      <Check size={12} />
                    ) : figmaState === "error" ? (
                      <span className="text-[10px]">✕</span>
                    ) : (
                      <Figma size={12} />
                    )}
                    <span>
                      {figmaState === "generating" ? "Exporting..."
                        : figmaState === "opening" ? "Opening..."
                          : figmaState === "done" ? "Exported"
                            : "Figma"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tooltip for Figma Error */}
              {figmaState === "error" && figmaError && (
                <div className="absolute top-8 right-0 z-50 bg-red-50 border border-red-200 text-red-700
                  text-[10px] px-3 py-2 rounded-lg shadow-lg max-w-[280px]">
                  {figmaError}
                </div>
              )}

              {/* Clean Screen Iframe */}
              <div style={{ width: SCREEN_W, height: SCREEN_H }}
                className="overflow-hidden bg-white ring-1 ring-black/5 shadow-sm">
                <div style={{
                  width: IFRAME_W, height: IFRAME_H,
                  transform: `scale(${IFRAME_SCALE})`, transformOrigin: 'top left',
                  pointerEvents: 'none'
                }}>
                  <iframe
                    title={screen.title}
                    srcDoc={screen.html}
                    sandbox="allow-same-origin"
                    style={{ width: IFRAME_W, height: IFRAME_H, border: 'none', display: 'block' }}
                    scrolling="no"
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Redesigned Bottom Pill Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3">

        {/* Actions Pill */}
        <div className="bg-white border border-gray-200 rounded-full flex items-center h-10 px-1 shadow-sm">
          <button
            onClick={handleExportAllToFigma}
            disabled={figmaStates["__ALL__"] === "generating" || figmaStates["__ALL__"] === "opening"}
            className={`
              px-3 h-full flex items-center gap-1.5 text-xs font-medium transition-colors
              ${figmaStates["__ALL__"] === "done" ? "text-emerald-500" : figmaStates["__ALL__"] === "error" ? "text-red-500" : "text-gray-500 hover:text-gray-900"}
              disabled:opacity-50
            `}
          >
            {figmaStates["__ALL__"] === "generating" || figmaStates["__ALL__"] === "opening" ? (
              <div className="w-3.5 h-3.5 border-2 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
            ) : (
              <Figma size={13} />
            )}
            <span className="hidden sm:inline">
              {figmaStates["__ALL__"] === "generating" ? "Generating..." : figmaStates["__ALL__"] === "done" ? "Exported" : "Export All to Figma"}
            </span>
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={() => {
              if (!data || !containerRef.current) return;
              const { w, h } = boundingBox(data.screens.length);
              const cw = containerRef.current.clientWidth;
              const ch = containerRef.current.clientHeight;
              const s = Math.min((cw - 120) / w, (ch - 120) / h, 1);
              setScale(s);
              setPosition({ x: (cw - w * s) / 2, y: 60 });
            }}
            className="w-9 h-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Zoom Pill (Matches Screenshot) */}
        <div className="bg-white border border-gray-200 rounded-full flex items-center h-10 px-1 shadow-sm">
          <button
            onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}
            className="w-9 h-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ZoomOut size={14} strokeWidth={2.5} />
          </button>

          <span className="text-xs font-medium text-gray-500 w-11 text-center select-none">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale(s => Math.min(s + 0.1, 4))}
            className="w-9 h-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ZoomIn size={14} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default WireframeCanvas;