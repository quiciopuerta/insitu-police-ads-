import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  elongation: number;
  vx: number;
  vy: number;
}

const PARTICLE_COLORS = [
  '#ff477b',           // brand magenta
  '#ff477b88',         // magenta subtle
  '#00F2FE',           // brand cyan
  '#00F2FE66',         // cyan subtle
  '#8b5cf6',           // purple
  '#8b5cf666',         // purple subtle
  'rgba(255,255,255,0.2)', // white dots
];

function generateParticles(width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      elongation: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    });
  }
  return particles;
}

interface ParticleFieldProps {
  rotateX?: number;
  rotateY?: number;
  className?: string;
}

export default function ParticleField({ rotateX = 0, rotateY = 0, className = "" }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const currentRotation = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = dimensionsRef.current.width;
    const h = dimensionsRef.current.height;

    // Smoothly interpolate rotation from props
    currentRotation.current.x += (rotateX - currentRotation.current.x) * 0.1;
    currentRotation.current.y += (rotateY - currentRotation.current.y) * 0.1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = w / 2;
    const cy = h / 2;
    const perspective = 1000;
    const rotXRad = (currentRotation.current.x * Math.PI) / 180;
    const rotYRad = (currentRotation.current.y * Math.PI) / 180;

    const cosY = Math.cos(rotYRad);
    const sinY = Math.sin(rotYRad);
    const cosX = Math.cos(rotXRad);
    const sinX = Math.sin(rotXRad);

    for (const p of particlesRef.current) {
      // Gentle movement
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const dx = p.x - cx;
      const dy = p.y - cy;

      // Y-axis rotation
      const rx = dx * cosY;
      const rz1 = dx * sinY;

      // X-axis rotation
      const ry = dy * cosX - rz1 * sinX;
      const rz2 = dy * sinX + rz1 * cosX;

      // Perspective projection
      const scale = perspective / (perspective + rz2);
      const screenX = cx + rx * scale;
      const screenY = cy + ry * scale;

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(0.6, scale * 0.5));
      ctx.translate(screenX, screenY);
      ctx.rotate(p.rotation);
      ctx.scale(1, p.elongation);
      ctx.beginPath();
      ctx.arc(0, 0, p.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [rotateX, rotateY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      dimensionsRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      particlesRef.current = generateParticles(rect.width, rect.height, 150);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.8, zIndex: 0 }}
    />
  );
}
