import React from 'react';
import { HelpCircle, Mail, MessageSquare, BookOpen } from 'lucide-react';

interface SupportPageProps {
  onClose?: () => void;
  language?: 'es' | 'en';
}

const SupportPage: React.FC<SupportPageProps> = ({ onClose, language = 'es' }) => {
  const content = language === 'en' ? {
    title: 'Support & Help',
    subtitle: 'Get help with insitu.company',
    resources: 'Resources',
    contact: 'Contact Us',
    documentation: 'Documentation',
    getHelp: [
      {
        icon: BookOpen,
        title: 'Knowledge Base',
        description: 'Browse our documentation and tutorials',
        action: 'View Docs',
        href: 'https://docs.insitu.company'
      },
      {
        icon: Mail,
        title: 'Email Support',
        description: 'Get help from our support team',
        action: 'support@insitu.company',
        href: 'mailto:support@insitu.company'
      },
      {
        icon: MessageSquare,
        title: 'Live Chat',
        description: 'Chat with our team during business hours',
        action: 'Start Chat',
        href: 'https://insitu.company/chat'
      }
    ]
  } : {
    title: 'Centro de Soporte',
    subtitle: 'Obtén ayuda con insitu.company',
    resources: 'Recursos',
    contact: 'Contáctanos',
    documentation: 'Documentación',
    getHelp: [
      {
        icon: BookOpen,
        title: 'Base de Conocimiento',
        description: 'Consulta nuestra documentación y tutoriales',
        action: 'Ver Docs',
        href: 'https://docs.insitu.company'
      },
      {
        icon: Mail,
        title: 'Soporte por Email',
        description: 'Obtén ayuda de nuestro equipo de soporte',
        action: 'support@insitu.company',
        href: 'mailto:support@insitu.company'
      },
      {
        icon: MessageSquare,
        title: 'Chat en Vivo',
        description: 'Chatea con nuestro equipo en horario de oficina',
        action: 'Iniciar Chat',
        href: 'https://insitu.company/chat'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-[#E5007D]" />
            <div>
              <h1 className="text-2xl font-bold">{content.title}</h1>
              <p className="text-sm text-white/60">{content.subtitle}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Support Resources */}
        <div className="mb-16">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#E5007D] rounded-full"></span>
            {content.resources}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.getHelp.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a
                  key={idx}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-6 rounded-xl border border-white/10 hover:border-[#E5007D]/50 bg-white/5 hover:bg-white/10 transition-all duration-300"
                >
                  <Icon className="w-8 h-8 text-[#E5007D] mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/60 mb-4">{item.description}</p>
                  <span className="text-sm text-[#E5007D] font-medium group-hover:translate-x-1 transition-transform inline-block">
                    {item.action} →
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#E5007D] rounded-full"></span>
            {language === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}
          </h2>

          <div className="space-y-4">
            {[
              {
                q: language === 'en' ? 'How do I reset my password?' : '¿Cómo restablezco mi contraseña?',
                a: language === 'en'
                  ? 'Click "Forgot password?" on the login page and follow the email instructions.'
                  : 'Haz clic en "Olvidé mi contraseña" en la página de inicio de sesión y sigue las instrucciones por correo.'
              },
              {
                q: language === 'en' ? 'What payment methods do you accept?' : '¿Qué métodos de pago aceptan?',
                a: language === 'en'
                  ? 'We accept credit cards, debit cards, and PayPal through our secure payment processor.'
                  : 'Aceptamos tarjetas de crédito, débito y PayPal a través de nuestro procesador de pagos seguro.'
              },
              {
                q: language === 'en' ? 'Is my data encrypted?' : '¿Están encriptados mis datos?',
                a: language === 'en'
                  ? 'Yes, all data is encrypted in transit (HTTPS) and at rest (AES-256).'
                  : 'Sí, todos los datos están encriptados en tránsito (HTTPS) y en reposo (AES-256).'
              }
            ].map((item, idx) => (
              <details key={idx} className="group p-4 rounded-xl border border-white/10 hover:border-[#E5007D]/30 bg-white/5 cursor-pointer">
                <summary className="font-semibold flex items-center justify-between">
                  {item.q}
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="text-sm text-white/60 mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="p-8 rounded-xl border border-[#E5007D]/20 bg-gradient-to-r from-[#E5007D]/10 to-transparent">
          <h3 className="font-bold mb-3">
            {language === 'en' ? "Didn't find what you're looking for?" : '¿No encontraste lo que buscas?'}
          </h3>
          <p className="text-white/70 mb-4">
            {language === 'en'
              ? 'Reach out to our support team. We\'re here to help.'
              : 'Ponte en contacto con nuestro equipo de soporte. Estamos aquí para ayudarte.'}
          </p>
          <a
            href="mailto:support@insitu.company"
            className="inline-block px-6 py-2 bg-[#E5007D] hover:bg-[#C2006A] text-white font-semibold rounded-lg transition-colors"
          >
            {language === 'en' ? 'Contact Support' : 'Contactar Soporte'}
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 mt-16 pt-8 pb-8 text-center text-sm text-white/60">
        <p>© 2026 insitu.company. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
      </div>
    </div>
  );
};

export default SupportPage;
