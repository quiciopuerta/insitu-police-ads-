import * as React from "react";

interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => (
  <span className="relative group/tooltip inline-block ml-3 align-middle">
    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[12px] font-black text-slate-300 cursor-help hover:text-white hover:bg-[#ff477b] hover:border-[#ff477b] transition-all shadow-sm tracking-normal">
      ?
    </span>
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[240px] md:w-72 p-4 bg-slate-900 border border-slate-600 rounded-2xl text-[13px] md:text-[14px] font-medium text-white opacity-0 group-hover/tooltip:opacity-100 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none z-[9999] text-center leading-relaxed normal-case tracking-normal">
      {text}
      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-600 rotate-45"></span>
    </span>
  </span>
);
