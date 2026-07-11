import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Download, Clipboard, Undo, Trash2, Camera,
  Palette, Type, Square, ArrowUpRight, Eraser, Check, Info, Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';

// Helper functions to convert unsupported CSS color functions oklch() and oklab() to rgb()/rgba()
function oklabToRgb(L: number, a: number, b: number, aStr: string = '1'): string {
  if (isNaN(L) || isNaN(a) || isNaN(b)) {
    return 'rgb(120, 120, 120)';
  }

  // Lab to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS cubic non-linearity
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS to Linear RGB
  const rL = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gL = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bL = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear RGB to sRGB gamma correction
  const gamma = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const finalR = Math.max(0, Math.min(255, Math.round(gamma(rL) * 255)));
  const finalG = Math.max(0, Math.min(255, Math.round(gamma(gL) * 255)));
  const finalB = Math.max(0, Math.min(255, Math.round(gamma(bL) * 255)));

  // Parse Alpha
  let alpha = 1;
  if (aStr) {
    if (aStr.includes('%')) {
      alpha = parseFloat(aStr) / 100;
    } else {
      alpha = parseFloat(aStr);
    }
    if (isNaN(alpha)) alpha = 1;
  }

  if (alpha < 1) {
    return `rgba(${finalR}, ${finalG}, ${finalB}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${finalR}, ${finalG}, ${finalB})`;
}

function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr: string = '1'): string {
  // Parse L
  let L = parseFloat(lStr);
  if (lStr.includes('%')) {
    L = L / 100;
  }
  // Parse C
  let C = parseFloat(cStr);
  if (cStr.includes('%')) {
    C = C / 100;
  }
  // Parse H (can be deg, rad, or turn)
  let H = parseFloat(hStr);
  if (hStr.includes('rad')) {
    H = (parseFloat(hStr) * 180) / Math.PI;
  } else if (hStr.includes('turn')) {
    H = parseFloat(hStr) * 360;
  }

  if (isNaN(L) || isNaN(C) || isNaN(H)) {
    return 'rgb(120, 120, 120)'; // safe fallback
  }

  // Convert H to radians
  const hRad = (H * Math.PI) / 180;
  
  // Convert LCH to Lab
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  return oklabToRgb(L, a, b, aStr);
}

function replaceOklchInCss(cssText: string): string {
  // Replace oklch(...) - handles up to 1 level of nested parentheses (e.g. var(--color-bg))
  let converted = cssText.replace(/oklch\(((?:[^()]+|\([^()]*\))*)\)/g, (match, inner) => {
    // split by space, slash, or comma
    const parts = inner.trim().split(/[\s,/\\]+/);
    if (parts.length >= 3) {
      const l = parts[0];
      const c = parts[1];
      const h = parts[2];
      const a = parts[3] || '1';
      return oklchToRgb(l, c, h, a);
    }
    return 'rgb(120, 120, 120)';
  });

  // Replace oklab(...) - handles up to 1 level of nested parentheses
  converted = converted.replace(/oklab\(((?:[^()]+|\([^()]*\))*)\)/g, (match, inner) => {
    const parts = inner.trim().split(/[\s,/\\]+/);
    if (parts.length >= 3) {
      const lStr = parts[0];
      const aStrVal = parts[1];
      const bStrVal = parts[2];
      const alphaStr = parts[3] || '1';

      let L = parseFloat(lStr);
      if (lStr.includes('%')) L /= 100;
      let a = parseFloat(aStrVal);
      if (aStrVal.includes('%')) a /= 100;
      let b = parseFloat(bStrVal);
      if (bStrVal.includes('%')) b /= 100;

      return oklabToRgb(L, a, b, alphaStr);
    }
    return 'rgb(120, 120, 120)';
  });

  return converted;
}

interface ScreenshotToolProps {
  isCapturing: boolean;
  setIsCapturing: (val: boolean) => void;
  darkMode: boolean;
}

type DrawTool = 'brush' | 'arrow' | 'rect' | 'text' | 'eraser' | 'redact';

export default function ScreenshotTool({ isCapturing, setIsCapturing, darkMode }: ScreenshotToolProps) {
  // Crop overlay drag states
  const [captureStartPos, setCaptureStartPos] = useState<{ x: number; y: number } | null>(null);
  const [captureCurrentPos, setCaptureCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCapture, setIsDraggingCapture] = useState(false);

  // Editor modal states
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Canvas drawing states
  const [activeTool, setActiveTool] = useState<DrawTool>('brush');
  const [strokeColor, setStrokeColor] = useState<string>('#ef4444'); // Default RED
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [stampText, setStampText] = useState<string>('IMPORTANT');

  // Drawing undo states
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Refs
  const baseImageRef = useRef<HTMLImageElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSnapshotRef = useRef<ImageData | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const drawingLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Key listening for escape to cancel capturing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCapturing) {
          setIsCapturing(false);
          resetCaptureStates();
        } else if (showEditModal) {
          setShowEditModal(false);
          setCapturedImageBase64(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapturing, showEditModal]);

  const resetCaptureStates = () => {
    setCaptureStartPos(null);
    setCaptureCurrentPos(null);
    setIsDraggingCapture(false);
  };

  // Mouse selection event handlers
  const handleCaptureMouseDown = (e: React.MouseEvent) => {
    // Avoid starting capture selection if clicking on the control helper banner
    if ((e.target as HTMLElement).closest('#capture-helper-banner')) return;

    setCaptureStartPos({ x: e.clientX, y: e.clientY });
    setCaptureCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDraggingCapture(true);
  };

  const handleCaptureMouseMove = (e: React.MouseEvent) => {
    if (!isCapturing) return;
    setCaptureCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleCaptureMouseUp = async () => {
    if (!isDraggingCapture || !captureStartPos || !captureCurrentPos) return;

    const left = Math.min(captureStartPos.x, captureCurrentPos.x);
    const top = Math.min(captureStartPos.y, captureCurrentPos.y);
    const width = Math.abs(captureCurrentPos.x - captureStartPos.x);
    const height = Math.abs(captureCurrentPos.y - captureStartPos.y);

    // Cancel if region is tiny (could be a random normal click)
    if (width < 8 || height < 8) {
      resetCaptureStates();
      return;
    }

    // Capture immediately! Turn off capturing screen elements first to hide them from the overlay
    setIsDraggingCapture(false);
    setIsCapturing(false);
    resetCaptureStates();

    // Small delay to ensure browser repoints layouts without overlay before capturing DOM
    setTimeout(async () => {
      try {
        // Capture standard viewport/scrolled elements
        const fullCanvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: darkMode ? '#0f1117' : '#f0f2f8',
          logging: false,
          scale: window.devicePixelRatio || 2, // Retain crystal high-dpi resolution
          onclone: (clonedDoc) => {
            // Compile and pre-clean all available CSS rules currently loaded in real document style sheets
            let consolidatedCleanCss = '';
            
            for (let i = 0; i < document.styleSheets.length; i++) {
              const sheet = document.styleSheets[i];
              try {
                const rules = sheet.cssRules || (sheet as any).rules;
                if (rules) {
                  let sheetCss = '';
                  for (let j = 0; j < rules.length; j++) {
                    sheetCss += rules[j].cssText + '\n';
                  }
                  consolidatedCleanCss += replaceOklchInCss(sheetCss) + '\n';
                  
                  // If this stylesheet references an external same-origin linked CSS stylesheet,
                  // remove its link node from cloned element tree to prevent html2canvas's internal fetcher 
                  // from downloading and parsing uncleaned color formats
                  const ownerNode = sheet.ownerNode;
                  if (ownerNode && ownerNode.nodeName === 'LINK') {
                    const href = (ownerNode as HTMLLinkElement).getAttribute('href');
                    if (href) {
                      const clonedLink = clonedDoc.querySelector(`link[href="${href}"]`);
                      if (clonedLink) {
                        clonedLink.remove();
                      }
                    }
                  }
                }
              } catch (e) {
                // Cross-origin stylesheet rules are kept standard; Google Fonts references do not contain oklch/oklab
              }
            }

            // Remove all source style tags to eliminate duplication or conflict
            const originalStyleTags = clonedDoc.querySelectorAll('style');
            originalStyleTags.forEach((styleTag) => {
              styleTag.remove();
            });

            // Append our pristine consolidated inlined style tag
            const cleanStyleTag = clonedDoc.createElement('style');
            cleanStyleTag.textContent = consolidatedCleanCss;
            clonedDoc.head.appendChild(cleanStyleTag);

            // Strip any unsupported inline styles from individual elements
            const elementsWithStyles = clonedDoc.querySelectorAll('[style]');
            elementsWithStyles.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const currentStyle = htmlEl.getAttribute('style');
              if (currentStyle && (currentStyle.includes('oklch') || currentStyle.includes('oklab'))) {
                htmlEl.setAttribute('style', replaceOklchInCss(currentStyle));
              }
            });
          }
        });

        // Exact compensation matching viewport positions (inclusive of scroll)
        const scale = window.devicePixelRatio || 2;
        const cropX = (left + window.scrollX) * scale;
        const cropY = (top + window.scrollY) * scale;
        const cropW = width * scale;
        const cropH = height * scale;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;

        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const base64Data = cropCanvas.toDataURL('image/png');
          setCapturedImageBase64(base64Data);
          setUndoStack([]); // Clear older canvas draw edits
          setShowEditModal(true);
        }
      } catch (err: any) {
        console.error('Erreur capturing viewport:', err);
        alert(`Échec de capture d'écran: ${err.message}`);
      }
    }, 80);
  };

  // Setup/Render drawing layers inside modal
  useEffect(() => {
    if (!showEditModal || !capturedImageBase64 || !drawCanvasRef.current) return;

    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = capturedImageBase64;
    img.onload = () => {
      // Set canvas core coordinates match original high-res capture size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw initial clean frame status inside context (transparent canvas)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [showEditModal, capturedImageBase64]);

  // Handle freehand/shapes draws
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getCanvasMousePos(e);
    isDrawingRef.current = true;
    drawingLastPosRef.current = pos;

    // Save state snapshot for shape outlines previewing while dragging
    canvasSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If it's the Text Tool stamp immediately on click/press
    if (activeTool === 'text') {
      drawTextStamp(ctx, stampText, pos.x, pos.y, strokeColor);
      handleSaveDrawHistory();
      isDrawingRef.current = false;
    }
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasMousePos(e);
    const startPos = drawingLastPosRef.current;

    if (activeTool === 'brush') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * (window.devicePixelRatio || 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();
      ctx.restore();
      drawingLastPosRef.current = pos;
    } else if (activeTool === 'redact') {
      // solid black redaction tape brush
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeWidth * 3 * (window.devicePixelRatio || 2);
      ctx.lineCap = 'square';
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();
      ctx.restore();
      drawingLastPosRef.current = pos;
    } else if (activeTool === 'eraser') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = strokeWidth * 4 * (window.devicePixelRatio || 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out'; // erase only transparent canvas top drawings
      ctx.stroke();
      ctx.restore();
      drawingLastPosRef.current = pos;
    } else if (activeTool === 'rect') {
      // shapes preview requires drawing restore on snapshot
      if (canvasSnapshotRef.current) {
        ctx.putImageData(canvasSnapshotRef.current, 0, 0);
      }
      drawRect(ctx, startPos.x, startPos.y, pos.x, pos.y, strokeColor, strokeWidth * (window.devicePixelRatio || 2));
    } else if (activeTool === 'arrow') {
      if (canvasSnapshotRef.current) {
        ctx.putImageData(canvasSnapshotRef.current, 0, 0);
      }
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y, strokeColor, strokeWidth * (window.devicePixelRatio || 2));
    }
  };

  const handleDrawEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    handleSaveDrawHistory();
  };

  // Helper drawing templates
  const drawRect = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, width: number) => {
    ctx.save();
    ctx.beginPath();
    const x = Math.min(fromX, toX);
    const y = Math.min(fromY, toY);
    const w = Math.abs(toX - fromX);
    const h = Math.abs(toY - fromY);
    ctx.rect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.restore();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, width: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Arrowhead calculations
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = Math.max(width * 3.5, 14);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  const drawTextStamp = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) => {
    ctx.save();
    const size = Math.round(18 * (window.devicePixelRatio || 2));
    ctx.font = `bold ${size}px sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const paddingH = Math.round(12 * (window.devicePixelRatio || 2));
    const paddingV = Math.round(8 * (window.devicePixelRatio || 2));
    const boxWidth = textWidth + paddingH * 2;
    const boxHeight = size + paddingV * 2;

    const rx = x - boxWidth / 2;
    const ry = y - boxHeight / 2;
    const radius = Math.round(8 * (window.devicePixelRatio || 2));

    // Custom stamp shadow label block
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, boxWidth, boxHeight, radius);
    } else {
      ctx.rect(rx, ry, boxWidth, boxHeight);
    }
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = Math.round(6 * (window.devicePixelRatio || 2));
    ctx.shadowOffsetY = Math.round(3 * (window.devicePixelRatio || 2));
    ctx.fill();

    // Text details inside stamp shape
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), x, y + (window.devicePixelRatio || 2));
    ctx.restore();
  };

  // Undo manager
  const handleSaveDrawHistory = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const currentData = canvas.toDataURL();
    setUndoStack(prev => [...prev, currentData]);
  };

  const handleUndoDraw = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const newStack = [...undoStack];
    newStack.pop(); // Remove current state
    setUndoStack(newStack);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (newStack.length > 0) {
      const prevImg = new Image();
      prevImg.src = newStack[newStack.length - 1];
      prevImg.onload = () => {
        ctx.drawImage(prevImg, 0, 0);
      };
    }
  };

  const handleClearDraw = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev, canvas.toDataURL()]); // push cleared state to stack
  };

  // Process combined layers for copy/downloads
  const getCompiledCanvas = (): HTMLCanvasElement | null => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas || !baseImageRef.current) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = drawCanvas.width;
    exportCanvas.height = drawCanvas.height;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Layer 1: original captured layout underneath
    ctx.drawImage(baseImageRef.current, 0, 0);

    // Layer 2: top transparent edited annotations
    ctx.drawImage(drawCanvas, 0, 0);

    return exportCanvas;
  };

  const handleDownload = () => {
    const finalCanvas = getCompiledCanvas();
    if (!finalCanvas) return;

    const dataUrl = finalCanvas.toDataURL('image/png');
    const tempLink = document.createElement('a');
    tempLink.download = `packing-list-screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    tempLink.href = dataUrl;
    tempLink.click();

    triggerToast('✓ Capture d\'écran téléchargée avec succès!');
  };

  const handleCopyToClipboard = () => {
    const finalCanvas = getCompiledCanvas();
    if (!finalCanvas) return;

    finalCanvas.toBlob((blob) => {
      if (!blob) {
        alert('Échec de compilation pour le presse-papiers.');
        return;
      }
      
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        triggerToast('⚡ Succès! Capture copiée dans le presse-papiers.');
      }).catch((err) => {
        console.error('Clipboard copy error:', err);
        alert(`Échec de la copie au presse-papiers: ${err.message}. Essayez le téléchargement.`);
      });
    }, 'image/png');
  };

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Preset Labels
  const labelsTextPresets = ['IMPORTANT', 'VÉRIFIÉ', 'ATTENTION', 'À REVOIR', 'CIBLE', 'TOTAL FAUX'];

  // Theme support
  const activeBgClass = darkMode ? 'bg-[#0a0d14] text-white border-slate-800' : 'bg-[#f8fafc] text-slate-800 border-slate-200';

  return (
    <>
      {/* 1. SELECTION CROP OVERLAY VIEW (WHEN TRIGGERED) */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 cursor-crosshair select-none overflow-hidden"
            onMouseDown={handleCaptureMouseDown}
            onMouseMove={handleCaptureMouseMove}
            onMouseUp={handleCaptureMouseUp}
          >
            {/* Guide floating instructions bar */}
            <div
              id="capture-helper-banner"
              className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 px-6 py-3.5 rounded-full flex items-center gap-3.5 shadow-2xl backdrop-blur-md text-white select-none scale-100 transition-transform hover:scale-[1.01]"
            >
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
              <span className="text-xs md:text-sm font-black font-mono tracking-wide text-slate-200 uppercase">
                Maintenez et glissez sur l'écran pour capturer la zone souhaitée
              </span>
              <div className="h-6 w-px bg-slate-800 flex-shrink-0"></div>
              <button
                onClick={() => {
                  setIsCapturing(false);
                  resetCaptureStates();
                }}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-mono text-[10px] md:text-xs font-black rounded-full transition-colors cursor-pointer outline-none uppercase"
              >
                Annuler (Échap)
              </button>
            </div>

            {/* Display width and height at cursor before drawing */}
            {captureCurrentPos && !isDraggingCapture && (
              <div
                className="absolute text-[10px] font-black font-mono text-amber-400 bg-slate-950/90 border border-slate-800 px-2 py-1 rounded shadow-lg pointer-events-none"
                style={{
                  left: captureCurrentPos.x + 18,
                  top: captureCurrentPos.y + 18,
                }}
              >
                Cliquer et glisser
              </div>
            )}

            {/* Glowing drag selector borders with blackout overlay shields */}
            {isDraggingCapture && captureStartPos && captureCurrentPos && (() => {
              const x1 = captureStartPos.x;
              const y1 = captureStartPos.y;
              const x2 = captureCurrentPos.x;
              const y2 = captureCurrentPos.y;

              const left = Math.min(x1, x2);
              const top = Math.min(y1, y2);
              const width = Math.abs(x2 - x1);
              const height = Math.abs(y2 - y1);

              return (
                <>
                  {/* Surrounding background shadows isolate targeted zone */}
                  <div className="absolute bg-black/45 left-0 top-0 right-0 pointer-events-none" style={{ height: `${top}px` }} />
                  <div className="absolute bg-black/45 left-0 right-0 bottom-0 pointer-events-none" style={{ top: `${top + height}px` }} />
                  <div className="absolute bg-black/45 left-0 bottom-0 pointer-events-none" style={{ width: `${left}px`, top: `${top}px`, height: `${height}px` }} />
                  <div className="absolute bg-black/45 right-0 bottom-0 pointer-events-none" style={{ left: `${left + width}px`, top: `${top}px`, height: `${height}px` }} />

                  {/* High contrast drawing rectangle */}
                  <div
                    className="absolute border-2 border-dashed border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.4)] pointer-events-none"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    {/* Size tracker badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-amber-500 text-black text-[10px] font-black font-mono px-2 py-0.5 rounded shadow-md select-none">
                      {width} × {height} px
                    </div>
                    <div className="absolute -top-6 left-0 bg-slate-950 text-amber-500 text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-slate-800 shadow-md">
                      ZONE DE CAPTURE active
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synchronous cached base picture for drawing background */}
      {capturedImageBase64 && (
        <img
          ref={baseImageRef}
          src={capturedImageBase64}
          style={{ display: 'none' }}
          alt="base-loaded-source"
          crossOrigin="anonymous"
        />
      )}

      {/* 2. MAIN ANNOTATIONS EDIT MODAL WINDOW */}
      <AnimatePresence>
        {showEditModal && capturedImageBase64 && (
          <div className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`w-full max-w-6xl rounded-2xl border flex flex-col shadow-2xl overflow-hidden leading-relaxed ${activeBgClass}`}
              style={{ maxHeight: '92vh' }}
              id="screenshot-edit-window"
            >
              {/* Header Title Bar */}
              <div className={`px-4 py-3.5 border-b flex items-center justify-between gap-4 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-205'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow shadow-amber-500/25">
                    <Camera className="w-4 h-4 text-slate-950" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight font-mono text-amber-500">📸 PREVIEW & DRAWING SHOT EDITOR</h2>
                    <p className={`text-[10px] font-mono leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Personnalisez les annotations et masquez les confidentialité avant l'envoi
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setCapturedImageBase64(null);
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-250 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success Toast banner */}
              {successToast && (
                <div className="bg-emerald-500 text-slate-955 font-mono text-xs font-black text-center py-2 relative flex items-center justify-center gap-1.5 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  {successToast}
                </div>
              )}

              {/* Main Content Pane Split (Controls left/top - canvas workspace right) */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-[450px]">
                {/* TOOLBAR CONTROLS sidebar */}
                <div className={`p-4 border-b lg:border-b-0 lg:border-r w-full lg:w-64 shrink-0 overflow-y-auto space-y-5 ${
                  darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  
                  {/* Drawing Tools Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold font-mono tracking-wider text-amber-500 block uppercase">
                      🛠️ Outils d'annotation
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setActiveTool('brush')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'brush'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow shadow-amber-500/10'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Dessiner librement (Crayon)"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        Pinceau
                      </button>

                      <button
                        onClick={() => setActiveTool('arrow')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'arrow'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow shadow-amber-500/10'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Dessiner une flèche indicatrice"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Flèche
                      </button>

                      <button
                        onClick={() => setActiveTool('rect')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'rect'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow shadow-amber-500/10'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Dessiner un cadre rectangulaire"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Cadre
                      </button>

                      <button
                        onClick={() => setActiveTool('text')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'text'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow shadow-amber-500/10'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Stamper un badge de texte"
                      >
                        <Type className="w-3.5 h-3.5" />
                        Texte
                      </button>

                      <button
                        onClick={() => setActiveTool('redact')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'redact'
                            ? 'bg-slate-950 border-slate-800 text-red-400 font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Biffer ou cacher des informations sensibles en noir"
                      >
                        <div className="w-3.5 h-3.5 bg-black border border-slate-700 rounded-sm"></div>
                        Cacher
                      </button>

                      <button
                        onClick={() => setActiveTool('eraser')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all ${
                          activeTool === 'eraser'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow shadow-amber-500/10'
                            : (darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-220 hover:bg-slate-100 text-slate-700')
                        }`}
                        title="Gommer les tracés d'annotations"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        Gomme
                      </button>
                    </div>
                  </div>

                  {/* Stamp Text Editor Sub-panel (Only when text active) */}
                  {activeTool === 'text' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3.5 rounded-xl border border-dashed text-slate-400 border-slate-800 space-y-2 bg-slate-900/15"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase text-sky-400">
                        <Info className="w-3 h-3" />
                        Option Texte à stamper
                      </div>
                      <input
                        type="text"
                        value={stampText}
                        onChange={(e) => setStampText(e.target.value.substring(0, 24))}
                        placeholder="Ex: IMPORTANT, VALIDE..."
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-semibold font-mono uppercase focus:border-amber-500 outline-none"
                      />
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 font-mono block">SUGGESTIONS :</span>
                        <div className="flex flex-wrap gap-1">
                          {labelsTextPresets.map(lbl => (
                            <button
                              key={lbl}
                              onClick={() => setStampText(lbl)}
                              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                                stampText === lbl ? 'bg-amber-500/20 text-amber-500 font-extrabold border border-amber-500/40' : 'bg-slate-850 text-slate-400 hover:text-white'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] font-medium text-slate-500 font-mono block italic leading-snug">
                        * Cliquez n'importe où sur l'image pour stamper ce texte.
                      </span>
                    </motion.div>
                  )}

                  {/* Color Swatch Picker */}
                  {activeTool !== 'eraser' && activeTool !== 'redact' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold font-mono tracking-wider text-amber-500 block uppercase">
                        🎨 Couleur de tracé
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { hex: '#ef4444', label: 'Rouge' },
                          { hex: '#f59e0b', label: 'Ambre' },
                          { hex: '#10b981', label: 'Vert' },
                          { hex: '#3b82f6', label: 'Bleu' },
                          { hex: '#8b5cf6', label: 'Violet' },
                          { hex: '#ffffff', label: 'Blanc' },
                        ].map(c => (
                          <button
                            key={c.hex}
                            onClick={() => setStrokeColor(c.hex)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-transform relative hover:scale-110 active:scale-90`}
                            style={{ backgroundColor: c.hex, border: strokeColor === c.hex ? '2px solid #f59e0b' : '1px solid rgba(128,128,128,0.4)' }}
                            title={c.label}
                          >
                            {strokeColor === c.hex && (
                              <Check className={`w-3.5 h-3.5 font-bold ${c.hex === '#ffffff' ? 'text-black' : 'text-white'}`} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stroke size adjust slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-mono text-[9px] font-bold text-amber-500">
                      <span>📏 TAILLE DU PINCEAU</span>
                      <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">{strokeWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />

                    {/* Previews size indicator */}
                    <div className="h-4 flex items-center justify-center">
                      <div
                        className="rounded-full bg-slate-400 transition-all shadow"
                        style={{
                          width: `${Math.max(3, strokeWidth)}px`,
                          height: `${Math.max(3, strokeWidth)}px`,
                          backgroundColor: activeTool === 'redact' ? '#000000' : (activeTool === 'eraser' ? '#ffffff' : strokeColor),
                          border: activeTool === 'eraser' ? '1px dashed #ef4444' : 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-slate-800/60 lg:my-2"></div>

                  {/* Drawing History actions (Undo / Clear) */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUndoDraw}
                      disabled={undoStack.length === 0}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[11px] font-bold font-mono border cursor-pointer transition-all ${
                        undoStack.length === 0
                          ? 'opacity-40 cursor-not-allowed text-slate-600 border-slate-900 bg-transparent'
                          : (darkMode ? 'text-slate-300 border-slate-800 bg-slate-900 hover:bg-slate-800' : 'text-slate-800 border-slate-200 bg-white hover:bg-slate-100')
                      }`}
                      title="Annuler le dernier tracé"
                    >
                      <Undo className="w-3 h-3" />
                      Undo ({undoStack.length})
                    </button>

                    <button
                      onClick={handleClearDraw}
                      className={`p-1.5 rounded text-red-500 border border-transparent hover:border-red-500/25 cursor-pointer hover:bg-red-500/10 transition-all`}
                      title="Effacer tous les tracés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* THE VIEWPORT WORKSPACE (CANVAS DRAW LAYER) */}
                <div className="flex-1 p-4 flex items-center justify-center bg-slate-950/70 overflow-auto">
                  {/* Canvas core frame container adhering to responsive layout restrictions */}
                  <div
                    className="relative max-h-[60vh] md:max-h-[65vh] border border-slate-800 shadow-2xl rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      aspectRatio: baseImageRef.current 
                        ? `${baseImageRef.current.naturalWidth} / ${baseImageRef.current.naturalHeight}`
                        : 'auto'
                    }}
                  >
                    {/* Raw Captured Image Layer underlay */}
                    <img
                      src={capturedImageBase64}
                      alt="captured-background"
                      className="max-h-[60vh] md:max-h-[65vh] w-auto h-auto block select-none"
                    />

                    {/* Highly interactive translucent Drawing canvas layer stacked directly on top */}
                    <canvas
                      ref={drawCanvasRef}
                      onMouseDown={handleDrawStart}
                      onMouseMove={handleDrawMove}
                      onMouseUp={handleDrawEnd}
                      onMouseLeave={handleDrawEnd}
                      className="absolute inset-0 w-full h-full block cursor-crosshair select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer bar with Download/Copy/Cancel controls */}
              <div className={`px-4 py-4 border-t flex flex-wrap gap-3 items-center justify-between ${
                darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-205'
              }`}>
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Dessinez sur la capture pour commenter ou masquer
                </div>

                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {/* Option 3: Cancel */}
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setCapturedImageBase64(null);
                    }}
                    className={`px-4 py-2 text-xs font-bold font-mono rounded-lg border cursor-pointer transition-all ${
                      darkMode ? 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-250 bg-white text-slate-600 hover:bg-slate-100 hover:text-black'
                    }`}
                  >
                    Annuler (Fermer)
                  </button>

                  {/* Option 2: Copy to Clipboard */}
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-4 py-2 text-xs font-bold font-mono bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/15"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Copier l'image
                  </button>

                  {/* Option 1: Download */}
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 text-xs font-bold font-mono bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-black shadow-lg shadow-amber-500/15"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger PNG
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
