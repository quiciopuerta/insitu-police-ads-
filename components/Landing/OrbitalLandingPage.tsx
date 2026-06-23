import React, { useEffect, useRef } from 'react';
import { Language } from '../../types';

interface OrbitalLandingPageProps {
  onLogin: () => void;
  language: Language;
}

export const OrbitalLandingPage: React.FC<OrbitalLandingPageProps> = ({ onLogin, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Add dark class to html to ensure colors are applied
    document.documentElement.classList.add('dark');
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      const w = canvas?.clientWidth || 1280;
      const h = canvas?.clientHeight || 720;
      if (canvas && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(syncSize);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    syncSize();

    const gl = canvas.getContext('webgl') || (canvas as any).getContext('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;
    
    // Deep obsidian base
    vec3 color = vec3(0.02, 0.01, 0.05);
    
    // Ambient glow following mouse
    float dist = distance(uv, mouse);
    float glow = 1.0 - smoothstep(0.0, 0.6, dist);
    color += vec3(0.2, 0.05, 0.4) * glow * 0.3;
    
    // Subtle pulsing spots
    vec2 p1 = vec2(0.2, 0.8) + 0.1 * vec2(sin(u_time * 0.5), cos(u_time * 0.3));
    vec2 p2 = vec2(0.8, 0.2) + 0.1 * vec2(cos(u_time * 0.4), sin(u_time * 0.6));
    
    float pulse1 = 1.0 - smoothstep(0.0, 0.4, distance(uv, p1));
    float pulse2 = 1.0 - smoothstep(0.0, 0.4, distance(uv, p2));
    
    color += vec3(0.3, 0.0, 0.5) * pulse1 * (0.5 + 0.5 * sin(u_time * 0.7));
    color += vec3(0.5, 0.0, 0.3) * pulse2 * (0.5 + 0.5 * cos(u_time * 0.8));
    
    // Very subtle noise/stars
    float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    if(n > 0.995) color += vec3(0.8, 0.7, 1.0) * 0.5;

    gl_FragColor = vec4(color, 1.0);
}`;

    function cs(type: number, src: string) {
      const s = gl.createShader(type);
      if(!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    if(!prog) return;
    const vertexShader = cs(gl.VERTEX_SHADER, vs);
    const fragmentShader = cs(gl.FRAGMENT_SHADER, fs);
    if(vertexShader) gl.attachShader(prog, vertexShader);
    if(fragmentShader) gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const render = (t: number) => {
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };
    render(0);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="bg-background text-on-background font-body min-h-screen overflow-hidden antialiased relative">
      <style>{`
        .glass-panel {
            background: rgba(36, 14, 59, 0.4);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(186, 158, 255, 0.15);
        }
        
        .orbit-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            overflow: hidden;
        }

        .orbital-node {
            position: absolute;
            pointer-events: auto;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .orbital-node:hover {
            transform: scale(1.05) translateY(-5px);
            z-index: 50;
        }

        @keyframes float-1 {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes float-2 {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes float-3 {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(1deg); }
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 40px rgba(186, 158, 255, 0.2), inset 0 0 20px rgba(186, 158, 255, 0.1); }
            50% { box-shadow: 0 0 60px rgba(186, 158, 255, 0.4), inset 0 0 30px rgba(186, 158, 255, 0.2); }
        }

        .float-1 { animation: float-1 8s ease-in-out infinite; }
        .float-2 { animation: float-2 10s ease-in-out infinite; }
        .float-3 { animation: float-3 7s ease-in-out infinite; }
        .glow-pulse { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      {/* WebGL Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen" style={{ display: 'block' }}>
          <canvas ref={canvasRef} id="shader-canvas-ANIMATION_4" style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/90 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#170529_100%)]"></div>
      </div>

      {/* Independent Brand Logo */}
      <div className="absolute top-8 left-8 z-50">
        <div className="text-2xl font-display font-black tracking-tighter text-primary">INsitu AI</div>
      </div>

      {/* Main Spatial Interface */}
      <main className="relative z-10 w-full h-screen flex items-center justify-center">
        <div className="orbit-container">
          
          {/* Center Command Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="w-80 h-80 rounded-full glass-panel flex flex-col items-center justify-center relative glow-pulse border-primary/30">
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute inset-2 rounded-full border border-secondary/20 animate-[spin_15s_linear_infinite_reverse]"></div>
              
              <img src="/isotype.png" alt="INsitu AI" className="w-24 h-24 object-contain opacity-90 mb-4" />
              <h1 className="text-3xl font-display font-black tracking-tight text-white mb-2">INsitu AI</h1>
              <p className="text-xs font-label uppercase tracking-widest text-primary-dim mb-6 text-center px-8">Inteligencia Artificial para Auditoría Publicitaria</p>
              
              <button 
                onClick={onLogin}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-bold shadow-[0_0_20px_rgba(186,158,255,0.4)] hover:shadow-[0_0_30px_rgba(186,158,255,0.6)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {language === 'es' ? 'INICIAR SESIÓN' : 'LOGIN'} <span className="material-symbols-outlined text-sm">login</span>
              </button>
            </div>
          </div>

          {/* Orbital Node 1: SEM Audit */}
          <div className="orbital-node float-1" style={{ top: '25%', left: '20%' }}>
            <div className="glass-panel p-6 rounded-2xl w-64 border-primary/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h3 className="font-display font-bold text-white mb-2">SEM Audit</h3>
              <p className="text-sm text-on-surface-variant">Auditoría profunda de campañas Google Ads con IA.</p>
            </div>
          </div>

          {/* Orbital Node 2: Neuro-Visual */}
          <div className="orbital-node float-2" style={{ top: '20%', right: '25%' }}>
            <div className="glass-panel p-6 rounded-2xl w-64 border-secondary/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary mb-4">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <h3 className="font-display font-bold text-white mb-2">Neuro-Visual</h3>
              <p className="text-sm text-on-surface-variant">Análisis cognitivo y mapas de calor para creativos.</p>
            </div>
          </div>

          {/* Orbital Node 3: Competitor Tracker */}
          <div className="orbital-node float-3" style={{ bottom: '25%', left: '25%' }}>
            <div className="glass-panel p-6 rounded-2xl w-64 border-tertiary/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary mb-4">
                <span className="material-symbols-outlined">track_changes</span>
              </div>
              <h3 className="font-display font-bold text-white mb-2">Competitors</h3>
              <p className="text-sm text-on-surface-variant">Rastreo de señales y estrategias de la competencia.</p>
            </div>
          </div>

          {/* Orbital Node 4: Optimizer */}
          <div className="orbital-node float-1" style={{ bottom: '20%', right: '20%' }}>
            <div className="glass-panel p-6 rounded-2xl w-64 border-primary-fixed/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/20 flex items-center justify-center text-primary-fixed mb-4">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <h3 className="font-display font-bold text-white mb-2">Ads Optimizer</h3>
              <p className="text-sm text-on-surface-variant">Optimización directa de presupuestos y pujas.</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
