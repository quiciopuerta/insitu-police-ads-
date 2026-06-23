import React from 'react';
import { motion } from 'framer-motion';

/**
 * DesignTokens: A collection of shared UI patterns based on the Stitch redesign.
 */

export const GlassPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}> = ({ children, className = '', intensity = 'medium' }) => {
  const blurClasses = {
    low: 'backdrop-blur-md',
    medium: 'backdrop-blur-xl',
    high: 'backdrop-blur-2xl',
  };

  return (
    <div className={`glass-panel ${blurClasses[intensity]} ${className}`}>
      {children}
    </div>
  );
};

export const NeonButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'magenta' | 'cyan' | 'white';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, onClick, className = '', variant = 'magenta', size = 'md', disabled = false, type = 'button' }) => {
  const baseStyles = "relative overflow-hidden font-bold transition-all duration-300 flex items-center justify-center gap-2 rounded-xl group";
  
  const variants = {
    magenta: "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 animate-neon-pulse",
    cyan: "bg-cyan text-slate-900 shadow-lg shadow-cyan/20 hover:shadow-cyan/40",
    white: "bg-white/5 border border-white/10 text-white hover:bg-primary hover:text-white hover:border-primary",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const disabledStyles = "opacity-50 grayscale cursor-not-allowed pointer-events-none";

  return (
    <motion.button
      type={type}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? disabledStyles : ''} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
    </motion.button>
  );
};

export const BackgroundGlows: React.FC = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-24 -left-24 w-[600px] h-[600px] glow-indigo rounded-full animate-blob-pulse" style={{ animationDelay: '0s' }} />
    <div className="absolute top-1/2 -right-24 w-[700px] h-[700px] glow-emerald rounded-full animate-blob-pulse" style={{ animationDelay: '-2s' }} />
    <div className="absolute bottom-0 left-1/4 w-96 h-96 glow-indigo rounded-full opacity-50 animate-blob-pulse" style={{ animationDelay: '-4s' }} />
  </div>
);

export const AnimatedGradientHeading: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}> = ({ children, className = '', as = 'h1' }) => {
  const Component = as;
  return (
    <Component className={`animated-gradient-text text-transparent bg-gradient-to-r from-primary via-[#ff8fb1] to-indigo-400 font-bold ${className}`}>
      {children}
    </Component>
  );
};

export const RedesignCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
}> = ({ children, className = '', icon, title, subtitle }) => (
  <div className={`sweep-card glass-panel p-8 rounded-2xl group border border-white/5 ${className}`}>
    {icon && (
      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    )}
    {title && <h3 className="text-slate-400 font-medium mb-1 tracking-tight">{title}</h3>}
    {subtitle && <p className="text-4xl font-bold text-slate-100">{subtitle}</p>}
    <div className="mt-4">
      {children}
    </div>
  </div>
);
