import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Lightbulb } from 'lucide-react';
import { Language } from '../../types';
import { LocalizedTutorialStep } from '../../constants/tutorialSteps';
import { cn } from '../../utils/cn';

interface TutorialBubbleProps {
  steps: LocalizedTutorialStep[];
  currentStep: number;
  isVisible: boolean;
  language: Language;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  onDismiss: () => void;
}

const UI_TEXT = {
  es: {
    skip: 'Saltar tutorial',
    next: 'Siguiente',
    done: '¡Entendido!',
  },
  en: {
    skip: 'Skip tutorial',
    next: 'Next',
    done: 'Got it!',
  },
} as const;

/**
 * TutorialBubble — reusable floating tutorial card with arrow connector.
 * Purely presentational. All state is managed by useTutorial hook.
 */
const TutorialBubble: React.FC<TutorialBubbleProps> = ({
  steps,
  currentStep,
  isVisible,
  language,
  onNext,
  onPrev,
  onGoTo,
  onDismiss,
}) => {
  const t = UI_TEXT[language];
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  if (!step) return null;

  const arrowStyles: Record<string, React.CSSProperties> = {
    right: {
      left: '-8px', top: '20px',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      borderRight: '8px solid rgba(255,71,123,0.5)',
    },
    left: {
      right: '-8px', top: '20px',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      borderLeft: '8px solid rgba(255,71,123,0.5)',
    },
    top: {
      bottom: '-8px', left: '20px',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid rgba(255,71,123,0.5)',
    },
    bottom: {
      top: '-8px', left: '20px',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderBottom: '8px solid rgba(255,71,123,0.5)',
    },
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="tutorial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] pointer-events-none"
        >
          {/* Semi-dark backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Floating Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="pointer-events-auto absolute"
              style={{ ...step.position }}
            >
              {/* Arrow connector */}
              {step.arrowDirection !== 'none' && (
                <div
                  className="absolute w-0 h-0"
                  style={arrowStyles[step.arrowDirection]}
                />
              )}

              {/* Card */}
              <div className="w-80 rounded-2xl bg-[#111113]/95 border border-[#ff477b]/30 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(255,71,123,0.15)] backdrop-blur-xl overflow-hidden">
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-[#ff477b] to-purple-600" />

                <div className="p-5">
                  {/* Progress dots + close */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-1.5">
                      {steps.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => onGoTo(i)}
                          className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === currentStep
                              ? 'w-5 bg-[#ff477b]'
                              : i < currentStep
                              ? 'w-3 bg-[#ff477b]/40'
                              : 'w-3 bg-white/15'
                          )}
                        />
                      ))}
                    </div>
                    <button
                      onClick={onDismiss}
                      className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#ff477b]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-4 h-4 text-[#ff477b]" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm mb-1.5">{step.title}</p>
                      <p className="text-white/60 text-xs leading-relaxed">{step.body}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={onDismiss}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      {t.skip}
                    </button>
                    <div className="flex gap-2">
                      {currentStep > 0 && (
                        <button
                          onClick={onPrev}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {isLast ? (
                        <button
                          onClick={onDismiss}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff477b] hover:bg-[#ff577b] text-white text-xs font-bold transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          {t.done}
                        </button>
                      ) : (
                        <button
                          onClick={onNext}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff477b] hover:bg-[#ff577b] text-white text-xs font-bold transition-colors"
                        >
                          {t.next}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialBubble;


// ── Companion: TutorialTrigger ─────────────────────────────────────────────────
// Small header badge to re-open or restart tutorial

interface TutorialTriggerProps {
  isDismissed: boolean;
  isVisible: boolean;
  language: Language;
  onShow: () => void;
  onRestart: () => void;
}

const TRIGGER_TEXT = {
  es: { tutorial: 'Tutorial', demo: 'Demo' },
  en: { tutorial: 'Tutorial', demo: 'Demo' },
} as const;

export const TutorialTrigger: React.FC<TutorialTriggerProps> = ({
  isDismissed,
  isVisible,
  language,
  onShow,
  onRestart,
}) => {
  const t = TRIGGER_TEXT[language];

  if (isVisible) return null;

  if (!isDismissed) {
    return (
      <button
        onClick={onShow}
        className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-colors"
      >
        <Lightbulb className="w-3 h-3" />
        {t.tutorial}
      </button>
    );
  }

  return (
    <button
      onClick={onRestart}
      className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
    >
      <Lightbulb className="w-3 h-3" />
      {t.demo}
    </button>
  );
};
