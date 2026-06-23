import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, X, MousePointer2, Eraser, Move } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LassoCanvasProps {
  sourceImage: string;
  onConfirm: (maskBase64: string, editPrompt: string) => void;
  onCancel: () => void;
  language: string;
}

export const LassoCanvas: React.FC<LassoCanvasProps> = ({
  sourceImage,
  onConfirm,
  onCancel,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<'lasso' | 'brush'>('lasso');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [editPrompt, setEditPrompt] = useState('');
  const brushPointsRef = useRef<{x:number,y:number}[][]>([]);
  const currentStrokeRef = useRef<{x:number,y:number}[]>([]);

  // Initialize Canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImage;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas dimensions to match image aspect ratio
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const scale = containerWidth / img.width;
      canvas.width = img.width;
      canvas.height = img.height;
      setImageSize({ width: img.width, height: img.height });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ff477b';
        ctx.lineWidth = 4;
        contextRef.current = ctx;
        
        // Clear canvas with transparency or black for preview?
        // Actually, we'll draw the mask on top of the image later,
        // but for now we just want to draw the lasso.
      }
    };
  }, [sourceImage]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    setIsDrawing(true);

    if (mode === 'lasso') {
      setPoints([{ x: offsetX, y: offsetY }]);
    } else {
      contextRef.current?.beginPath();
      contextRef.current?.moveTo(offsetX, offsetY);
      currentStrokeRef.current = [{ x: offsetX, y: offsetY }];
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);

    if (mode === 'lasso') {
      setPoints(prev => [...prev, { x: offsetX, y: offsetY }]);
      
      // Draw temporary path
      const ctx = contextRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, imageSize.width, imageSize.height);
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      }
    } else {
      const ctx = contextRef.current;
      if (ctx) {
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      }
      currentStrokeRef.current.push({ x: offsetX, y: offsetY });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (mode === 'lasso' && points.length > 2) {
      // Close the loop and fill
      const ctx = contextRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, imageSize.width, imageSize.height);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 71, 123, 0.3)';
        ctx.fill();
        ctx.stroke();
      }
    } else if (mode === 'brush' && currentStrokeRef.current.length > 0) {
      brushPointsRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
    }
  };

  const getCoordinates = (event: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event.touches && event.touches[0]) {
      return {
        offsetX: (event.touches[0].clientX - rect.left) * scaleX,
        offsetY: (event.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      offsetX: (event.clientX - rect.left) * scaleX,
      offsetY: (event.clientY - rect.top) * scaleY
    };
  };

  const handleClear = () => {
    const ctx = contextRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, imageSize.width, imageSize.height);
      setPoints([]);
      brushPointsRef.current = [];
      currentStrokeRef.current = [];
    }
  };

  const handleExportMask = () => {
    // We need to create a black/white mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageSize.width;
    maskCanvas.height = imageSize.height;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) return;

    // Background is Black
    mctx.fillStyle = '#000000';
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Selected area is White
    mctx.fillStyle = '#ffffff';
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = brushSize;
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';

    if (mode === 'lasso' && points.length > 2) {
      mctx.beginPath();
      mctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => mctx.lineTo(p.x, p.y));
      mctx.closePath();
      mctx.fill();
    } else if (mode === 'brush' && brushPointsRef.current.length > 0) {
      brushPointsRef.current.forEach(stroke => {
        if (stroke.length > 0) {
          mctx.beginPath();
          mctx.moveTo(stroke[0].x, stroke[0].y);
          stroke.forEach(p => mctx.lineTo(p.x, p.y));
          mctx.stroke();
        }
      });
    }

    onConfirm(maskCanvas.toDataURL('image/jpeg', 0.9), editPrompt);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff477b]/20 flex items-center justify-center">
              <MousePointer2 className="w-5 h-5 text-[#ff477b]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{language === 'es' ? 'Lasso Tool IA' : 'AI Lasso Tool'}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                {language === 'es' ? 'Dibuja el área que deseas editar' : 'Draw the area you want to edit'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClear}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'es' ? 'Limpiar' : 'Clear'}
            </button>
            <button 
              onClick={onCancel}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Main Canvas Area */}
          <div className="lg:col-span-9 relative aspect-video bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden group">
            {/* Background Image */}
            <img 
              src={sourceImage} 
              alt="Lasso Target" 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
            
            {/* Drawing Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full object-contain cursor-crosshair touch-none"
            />

            {/* Hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                {language === 'es' ? 'Cierra el lazo para seleccionar' : 'Close the lasso to select'}
              </p>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-6">
              
              <div className="space-y-4">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Herramientas</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setMode('lasso')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                      mode === 'lasso' ? "bg-[#ff477b]/10 border-[#ff477b]/50 text-[#ff477b]" : "bg-white/5 border-white/5 text-white/30 hover:text-white"
                    )}
                  >
                    <MousePointer2 className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Lasso</span>
                  </button>
                  <button
                    onClick={() => setMode('brush')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                      mode === 'brush' ? "bg-[#ff477b]/10 border-[#ff477b]/50 text-[#ff477b]" : "bg-white/5 border-white/5 text-white/30 hover:text-white"
                    )}
                  >
                    <Eraser className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Brush</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{language === 'es' ? 'Instrucción de Edición' : 'Edit Instruction'}</p>
                 <textarea
                   value={editPrompt}
                   onChange={e => setEditPrompt(e.target.value)}
                   placeholder={language === 'es' ? 'Ej: Cambia el fondo por un océano' : 'E.g. Replace background with ocean'}
                   className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/90 placeholder-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-[#ff477b]/50 transition-colors"
                   rows={3}
                 />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleExportMask}
                  disabled={(mode === 'lasso' && points.length < 3) || (mode === 'brush' && brushPointsRef.current.length === 0) || !editPrompt.trim()}
                  className="w-full py-4 rounded-2xl bg-[#ff477b] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#ff477b]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {language === 'es' ? 'Aplicar Selección' : 'Apply Selection'}
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
