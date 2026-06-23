import React from "react";
import LogoIsotype from "./LogoIsotype";
import { Language } from "../types";

interface FooterProps {
  language: Language;
}

const Footer: React.FC<FooterProps> = ({ language }) => {
  return (
    <footer className="mt-auto py-12 px-6 border-t border-white/5 bg-[#0a0507]/50" id="contacto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
          <LogoIsotype className="w-7 h-7 text-[#ff477b]" />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-100 leading-tight">insitu.company</span>
            <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase leading-none">by Franklin Sanchez</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-slate-500 text-sm">
          <a href="/privacy" className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{language === "es" ? "Política de Privacidad" : "Privacy Policy"}</a>
          <a href="/terms" className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{language === "es" ? "Términos y Condiciones" : "Terms & Conditions"}</a>
          <a className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/security'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{language === "es" ? "Seguridad" : "Security"}</a>
          <a className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/glossary'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{language === "es" ? "Glosario" : "Glossary"}</a>
          <a className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/blog'); window.dispatchEvent(new CustomEvent('nav-to-blog')); }}>{language === "es" ? "Recursos" : "Resources"}</a>
          <a className="hover:text-[#ff477b] transition-colors cursor-pointer" href="https://engagement.insitu.company/" target="_blank" rel="noopener noreferrer">Engagement AI INsitu</a>
          <a className="hover:text-[#ff477b] transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/contact'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{language === "es" ? "Contacto" : "Contact"}</a>
        </div>
        <div className="text-slate-500 text-sm">
          © {new Date().getFullYear()} insitu.company. {language === "es" ? "Todos los derechos reservados." : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
