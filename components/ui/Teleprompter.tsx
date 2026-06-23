import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  RotateCcw, 
  ShieldCheck, 
  Mic, 
  Volume2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Language } from '../../types';

interface TeleprompterProps {
  language: Language;
  onRecordingComplete: (audioBlob: Blob, scriptUsed: string, wpm?: number) => void;
  userName?: string;
}

const DEFAULT_SCRIPT_ES = `Yo, [NOMBRE], doy mi consentimiento expreso e informado a INsitu AI para clonar mi voz utilizando tecnología de inteligencia artificial. Entiendo que esta clonación se utilizará exclusivamente para la generación de contenidos publicitarios dentro de la plataforma INsitu AI. Confirmo que soy el titular legítimo de esta identidad vocal y que autorizo su uso bajo los términos de seguridad y privacidad establecidos.`;

const DEFAULT_SCRIPT_EN = `I, [NAME], give my express and informed consent to INsitu AI to clone my voice using artificial intelligence technology. I understand that this cloning will be used exclusively for generating advertising content within the INsitu AI platform. I confirm that I am the legitimate holder of this vocal identity and that I authorize its use under the established security and privacy terms.`;

export const Teleprompter: React.FC<TeleprompterProps> = ({ 
  language, 
  onRecordingComplete,
  userName = 'FRANKLIN SANCHEZ' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [script, setScript] = useState(language === 'es' ? DEFAULT_SCRIPT_ES.replace('[NOMBRE]', userName) : DEFAULT_SCRIPT_EN.replace('[NAME]', userName));
  const [progress, setProgress] = useState(0);
  const [teleprompterMs, setTeleprompterMs] = useState(0);
  const [spokenWordCount, setSpokenWordCount] = useState(0);
  const [isSpeechTracking, setIsSpeechTracking] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Visualization logic
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        if (!analyserRef.current) return;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff477b';
        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * canvas.height / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        onRecordingComplete(blob, script, wpm);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTeleprompterMs(0);
      setSpokenWordCount(0);
      
      // Initialize Speech Recognition if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = language === 'es' ? 'es-ES' : 'en-US';
          
          recognition.onresult = (e: any) => {
            let allText = '';
            for (let i = 0; i < e.results.length; ++i) {
              allText += e.results[i][0].transcript + ' ';
            }
            const currentText = allText.trim();
            const words = currentText.split(/\s+/).filter(Boolean);
            const wordCount = words.length;
            
            setSpokenWordCount(wordCount);
            
            // Calculate dynamic WPM
            const elapsedMins = (Date.now() - startMs) / 60000;
            if (elapsedMins > 0.05) {
              setWpm(Math.round(wordCount / elapsedMins));
            }

            // Simple accuracy check (first few words)
            const scriptWords = script.split(' ');
            let matches = 0;
            const checkLimit = Math.min(words.length, 10);
            for (let j = 0; j < checkLimit; j++) {
              if (words[j]?.toLowerCase() === scriptWords[j]?.toLowerCase()) matches++;
            }
            if (checkLimit > 0) setAccuracy(Math.round((matches / checkLimit) * 100));
          };
          
          recognition.onstart = () => setIsSpeechTracking(true);
          recognition.onnomatch = () => console.log('No speech match found');
          recognition.onerror = (e: any) => {
             console.log('Speech recognition error:', e.error);
             if (e.error === 'no-speech') setIsSpeechTracking(false);
          };
          recognition.onend = () => {
             // Restart if still recording to maintain state
             if (isRecording) {
               try { recognition.start(); } catch(err) {}
             } else {
               setIsSpeechTracking(false);
             }
          };
          
          speechRecognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          console.error("Speech recognition could not start:", e);
        }
      }

      const startMs = Date.now();
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        setRecordingTime(Math.floor((now - startMs) / 1000));
        setTeleprompterMs(now - startMs);
      }, 100);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert(language === 'es' ? "No se pudo acceder al micrófono." : "Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch(e) {}
      }
      setIsRecording(false);
      setIsSpeechTracking(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setTeleprompterMs(0);
    setSpokenWordCount(0);
    setProgress(0);
  };

  const activeWordRef = useRef<HTMLSpanElement>(null);

  const wordsPerSecond = 2.2; 
  const highlightIndex = isSpeechTracking 
    ? spokenWordCount 
    : Math.floor((teleprompterMs / 1000) * wordsPerSecond);

  useEffect(() => {
    // Only auto-scroll when recording
    if (isRecording && activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightIndex, isRecording]);

  return (
    <div className="w-full space-y-8">
      {/* Teleprompter Screen */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#ff477b] to-purple-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <div className="relative bg-[#090c10] border border-white/10 rounded-[2rem] p-4 md:p-6 overflow-hidden">
          {/* Progress Bar */}
          {isRecording && (
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#ff477b] to-purple-600 transition-all duration-1000 ease-linear" style={{ width: `${Math.min((recordingTime / 30) * 100, 100)}%` }} />
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-white/20'}`} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                {isRecording ? (language === 'es' ? 'GRABANDO CONSENTIMIENTO...' : 'RECORDING CONSENT...') : (language === 'es' ? 'LISTO PARA GRABAR' : 'READY TO RECORD')}
              </span>
            </div>
            <div className="flex items-center gap-6">
              {isRecording && (
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/30 truncate">RITMO</span>
                      <span className="text-sm font-black text-[#ff477b]">{wpm || '--'}</span>
                   </div>
                   <div className="w-[1px] h-6 bg-white/10" />
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/30 truncate">PRECISIÓN</span>
                      <span className="text-sm font-black text-emerald-400">{accuracy}%</span>
                   </div>
                </div>
              )}
              <div className="text-lg font-mono font-black text-white/80 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                00:{recordingTime.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="max-h-[350px] md:max-h-[420px] overflow-y-auto pr-4 scrollbar-hide py-6 px-6">
            {!isRecording && !audioBlob ? (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full bg-transparent border-none p-0 text-lg md:text-xl lg:text-2xl font-semibold text-white/90 leading-relaxed focus:ring-0 resize-none min-h-[180px]"
                disabled={isRecording}
              />
            ) : (
              <div className="text-lg md:text-xl lg:text-2xl font-semibold leading-relaxed min-h-[180px]">
                {script.split(' ').map((word, i) => {
                  let stateClass = "text-white/10 blur-[1px]"; // unread
                  if (i < highlightIndex) stateClass = "text-white/40"; // already read
                  if (i === highlightIndex) stateClass = "text-[#ff477b] font-black scale-110 drop-shadow-[0_0_35px_rgba(255,71,123,0.8)] z-10"; // currently reading
                  
                  return (
                    <span 
                      key={i} 
                      ref={i === highlightIndex ? activeWordRef : null}
                      className={`inline-block mr-[0.4em] mb-4 transition-all duration-300 origin-bottom ${stateClass}`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visualizer Overlay */}
          <div className="mt-4 h-12 relative">
            <canvas ref={canvasRef} width={800} height={80} className="w-full h-full opacity-50" />
            {!isRecording && !audioBlob && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <p className="text-[11px] font-black uppercase tracking-widest text-white/20">Espera de señal vocal...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        {!audioBlob ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`group relative flex items-center gap-4 px-12 py-6 rounded-3xl font-black uppercase tracking-widest transition-all ${
              isRecording 
                ? 'bg-rose-500 text-white hover:scale-105' 
                : 'bg-white text-black hover:scale-105 shadow-2xl shadow-white/10'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            <span>{isRecording ? (language === 'es' ? 'Detener y Procesar' : 'Stop & Process') : (language === 'es' ? 'Iniciar Grabación' : 'Start Recording')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={resetRecording}
              className="flex items-center gap-3 px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {language === 'es' ? 'Repetir' : 'Retry'}
            </button>
            <div className="flex items-center gap-3 px-8 py-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black uppercase tracking-widest text-xs">
              <CheckCircle2 className="w-4 h-4" />
              {language === 'es' ? 'Grabación Exitosa' : 'Recording Successful'}
            </div>
          </div>
        )}
      </div>

      {/* Legal Notice */}
      <div className="flex items-start gap-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
        <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
        <p className="text-[11px] text-blue-400/60 leading-relaxed uppercase font-bold tracking-wider">
          {language === 'es' 
            ? 'IMPORTANTE: Google Ads requiere que todo contenido sintético con voz humana real posea evidencia de consentimiento. Esta grabación se almacenará con un sello de tiempo criptográfico para tu protección legal.'
            : 'IMPORTANT: Google Ads requires that all synthetic content with real human voice has evidence of consent. This recording will be stored with a cryptographic timestamp for your legal protection.'}
        </p>
      </div>
    </div>
  );
};
