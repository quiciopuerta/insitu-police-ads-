
import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface PrivacyPolicyProps {
    onClose: () => void;
    language?: 'es' | 'en';
}

type SectionKey = 'general' | 'advertising' | 'gdpr' | 'ccpa' | 'lgpd' | 'ecuador';

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose, language = 'es' }) => {
    const [activeSection, setActiveSection] = useState<SectionKey>('general');

    const sections: Record<SectionKey, { title: string; content: string }> = language === 'en' ? {
        general: {
            title: 'General Policy',
            content: `**Privacy Policy — insitu.company**
Version 2.0 — Last Updated: February 22, 2026

insitu.company ("Platform", "we", "our") is committed to protecting your privacy. This policy explains how we collect, use and protect your personal data.

**1. DATA WE COLLECT**
- Account information: name, email, phone number, username, password (hashed)
- Advertising data: campaign metrics, creatives, performance reports from connected ad accounts
- Usage data: browsing behavior within the platform, session times, feature interactions
- Device data: IP address, browser, operating system, device type
- Analytics data: event tracking, funnel interactions, A/B test signals
- Payment information: processed securely by third-party providers (Stripe); we do not store card numbers

**2. HOW WE USE YOUR DATA**
- Provide, personalize and improve our AI-powered ad audit services
- Analyze and optimize advertising campaigns across connected platforms
- Send transactional and service communications
- Fraud prevention and security
- Legal compliance
- Aggregate, anonymized analytics to improve our models

**3. DATA SHARING**
We share data only as necessary:
- With advertising platforms you explicitly connect (see section "Advertising Platforms")
- With service providers (cloud hosting, email delivery, analytics) under data processing agreements
- As required by law or to enforce our terms
- We DO NOT sell your personal data to third parties

**4. DATA RETENTION**
- Account data: retained while your account is active + 12 months after closure
- Campaign data: 24 months unless earlier deletion is requested
- Logs: 90 days
- You may request deletion at any time at: privacy@insitu.company

**5. SECURITY**
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- Role-based access controls
- Regular penetration testing
- SOC 2-aligned practices

**6. COOKIES & TRACKING**
We use first-party and third-party cookies for authentication, analytics and advertising measurement. You can manage cookie preferences in your browser settings.

**7. CONTACT**
privacy@insitu.company | dpo@insitu.company
insitu.company — Quito, Ecuador`
        },
        advertising: {
            title: 'Advertising Platforms',
            content: `**Advertising Platform Data Practices**

insitu.company integrates with the following platforms to provide AI-powered creative audits and campaign analytics. By connecting your accounts, you agree to the respective platform's terms alongside this policy.

---

**GOOGLE (Google Ads, Google Analytics 4, DV360, YouTube)**

Use of Google APIs: The platform uses Google APIs (Google Ads API, Google Analytics Data API, Display & Video 360 API, YouTube Data API) to retrieve campaign data, creatives and performance metrics.

Our use complies with the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements:
- We only request data necessary to provide the service you requested
- We do not use your Google data to serve ads in other products unrelated to insitu.company
- We do not allow humans to read your data unless you explicitly consent, it is required for security, or required by law
- We do not sell Google user data

Google Analytics 4 (GA4): We use GA4 to measure engagement within the platform. You can opt out via [Google Analytics Opt-Out](https://tools.google.com/dlpage/gaoptout).

DV360: Integration with Display & Video 360 is used exclusively for campaign creative analysis. Data access is governed by your DV360 advertiser agreement with Google.

Consent Mode: Where applicable, we implement Google Consent Mode v2 to respect user consent signals.

Relevant Google Policies:
- [Google Advertising Policies](https://support.google.com/adspolicy/answer/6008942)
- [Google Analytics Terms](https://marketingplatform.google.com/about/analytics/terms/)
- [DV360 Terms](https://support.google.com/displayvideo/)

---

**META (Facebook & Instagram Ads)**

We access Meta's Marketing API only with your explicit permission via OAuth. Data retrieved includes campaign performance, ad creative metadata and audience insights.

Our use complies with [Meta's Platform Terms](https://developers.facebook.com/terms/) and [Business Tools Terms](https://www.facebook.com/legal/technology_terms). We do not:
- Use Meta data to target users in third-party advertising
- Share Meta user data with other clients
- Retain raw API responses beyond 30 days

Pixel: If you implement the Meta Pixel through guidance from our platform, you remain the data controller for that pixel. Ensure your website's cookie consent covers Pixel activity.

---

**TIKTOK (TikTok for Business)**

Integration with TikTok's Marketing API is used to analyze ad creatives and campaign performance. We comply with [TikTok's Commercial Content Policy](https://ads.tiktok.com/help/article/commercial-content-policy) and [Developer Terms](https://developers.tiktok.com/doc/developer-terms-of-service/).

We do not access personal data of TikTok users—only advertiser-level campaign metrics.

---

**LINKEDIN (LinkedIn Marketing Solutions)**

LinkedIn API access is used to retrieve campaign and creative performance data. We comply with [LinkedIn's API Terms of Use](https://legal.linkedin.com/api-terms-of-use) and [Advertising Policies](https://www.linkedin.com/legal/ads-policy).

---

**PINTEREST (Pinterest Ads)**

Pinterest API integration retrieves campaign and Pin performance data. We comply with [Pinterest's Developer Terms](https://developers.pinterest.com/terms/) and [Advertising Standards](https://policy.pinterest.com/en/advertising-guidelines).

---

**PROGRAMMATIC (DV360 / The Trade Desk / Xandr)**

Analysis of programmatic campaigns is performed using aggregated, anonymized impression, click and conversion data. We do not process Personally Identifiable Information (PII) from programmatic bid-stream data without explicit consent. All retargeting analysis relies on aggregated, hashed identifiers only.

---

**DATA PROCESSORS**
All third-party processors are bound by Data Processing Agreements (DPAs) ensuring GDPR-equivalent protections:
- Google Cloud Platform (hosting)
- Netlify (CDN & deployment)
- Supabase (database)
- Resend / SendGrid (transactional email)
- Stripe (payment processing)`
        },
        gdpr: {
            title: 'GDPR — EU',
            content: `**General Data Protection Regulation (GDPR) — EU Compliance**

Legal bases for processing (Art. 6 GDPR):
- Consent (Art. 6(1)(a)): Advertising platform connections, marketing communications
- Contract (Art. 6(1)(b)): Providing the AI audit service you subscribed to
- Legal obligation (Art. 6(1)(c)): Tax records, fraud prevention
- Legitimate interests (Art. 6(1)(f)): Security, platform improvement

Special categories: We do not process special category data (Art. 9 GDPR).

**Your GDPR Rights:**
- Access (Art. 15): Request a copy of all data we hold about you
- Rectification (Art. 16): Correct inaccurate data
- Erasure (Art. 17): "Right to be forgotten"
- Restriction (Art. 18): Limit how we use your data
- Portability (Art. 20): Receive data in a machine-readable format
- Object (Art. 21): Opt out of legitimate interest processing
- Automated decisions (Art. 22): Not subject to decisions based solely on automated processing

**International Transfers:**
Transfers to countries outside the EEA are conducted under Standard Contractual Clauses (SCCs) approved by the European Commission, or to countries with an adequacy decision.

**DPO Contact:** dpo@insitu.company
**Supervisory Authority:** You may lodge a complaint with your local data protection authority (e.g., AEPD in Spain, CNIL in France, ICO in the UK).`
        },
        ccpa: {
            title: 'CCPA — California',
            content: `**California Consumer Privacy Act (CCPA / CPRA) Compliance**

Categories of personal information collected:
- Identifiers: name, email, IP address, device ID
- Commercial info: subscription plan, billing history
- Internet/network activity: platform usage logs
- Inferences: predicted preferences based on usage

**Your CCPA Rights:**
- Right to Know: Request disclosure of categories and specific pieces of PI collected
- Right to Delete: Request deletion of your PI (subject to exceptions)
- Right to Opt-Out: We do not sell PI. We do not share PI for cross-context behavioral advertising outside of the platform
- Right to Correct: Request correction of inaccurate PI
- Right to Limit: Limit use and disclosure of sensitive PI
- Right to Non-Discrimination: Exercise of these rights will not result in denial of services

**Do Not Sell or Share:** insitu.company does not sell personal information as defined by CCPA/CPRA.

**Shine the Light:** California Civil Code § 1798.83 allows California customers to request disclosure of PI shared with third parties for direct marketing. We do not share PI for direct marketing without consent.

To exercise rights: privacy@insitu.company | reference "CCPA Request"`
        },
        lgpd: {
            title: 'LGPD — Brasil',
            content: `**Lei Geral de Proteção de Dados (LGPD) — Conformidade**

Bases legais para o tratamento (Art. 7 LGPD):
- Consentimento (Art. 7, I): conexões com plataformas de publicidade
- Execução de contrato (Art. 7, V): prestação do serviço contratado
- Legítimo interesse (Art. 7, IX): segurança e melhoria da plataforma
- Cumprimento de obrigação legal (Art. 7, II)

**Seus Direitos (Art. 18 LGPD):**
- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários
- Portabilidade dos dados
- Eliminação dos dados tratados com consentimento
- Informação sobre compartilhamento com terceiros
- Revogação do consentimento

**Encarregado (DPO):** lgpd@insitu.company
**ANPD:** Você pode apresentar reclamações à Autoridade Nacional de Proteção de Dados.

**Retenção:** conforme descrito na Política Geral.`
        },
        ecuador: {
            title: 'Ecuador — LOPDP',
            content: `**Ley Orgánica de Protección de Datos Personales (LOPDP) — Ecuador**

Bases legales para el tratamiento (Art. 15 LOPDP):
- Consentimiento libre, previo, específico, informado e inequívoco
- Ejecución de contrato o relación pre-contractual
- Cumplimiento de obligación legal
- Interés legítimo del responsable

**Sus Derechos (Arts. 19-29 LOPDP):**
- Acceso a sus datos personales
- Rectificación de datos inexactos
- Eliminación/supresión
- Oposición al tratamiento
- Portabilidad de datos
- No ser objeto de decisiones automatizadas (incluido el perfilado)
- Revocación del consentimiento en cualquier momento

**Responsable del Tratamiento:**
insitu.company | dpo@insitu.company | Quito, Ecuador

**Autoridad de Control:** Superintendencia de Protección de Datos Personales (Ecuador)

**Transferencias Internacionales:** Las transferencias fuera de Ecuador se realizan únicamente hacia países con nivel adecuado de protección o mediante garantías apropiadas (cláusulas contractuales estándar).`
        }
    } : {
        general: {
            title: 'Política General',
            content: `**Política de Privacidad — insitu.company**
Versión 2.0 — Última actualización: 22 de febrero de 2026

insitu.company ("Plataforma", "nosotros", "nuestro") se compromete a proteger su privacidad. Esta política explica cómo recopilamos, usamos y protegemos sus datos personales. Nuestra plataforma utiliza inteligencia artificial para auditar y optimizar campañas publicitarias digitales, proporcionando análisis de rendimiento y recomendaciones creativas basadas en los datos de las cuentas publicitarias que usted decide conectar.

**1. DATOS QUE RECOPILAMOS**
- Datos de cuenta: nombre, correo, teléfono, usuario, contraseña (cifrada)
- Datos publicitarios: métricas de campañas, creatividades, informes de rendimiento de cuentas conectadas
- Datos de uso: comportamiento dentro de la plataforma, tiempos de sesión, interacciones con funciones
- Datos de dispositivo: IP, navegador, sistema operativo, tipo de dispositivo
- Datos analíticos: seguimiento de eventos, interacciones de embudo, señales de pruebas A/B
- Información de pago: procesada de forma segura por Stripe; no almacenamos números de tarjeta

**2. CÓMO USAMOS SUS DATOS**
- Proveer, personalizar y mejorar nuestros servicios de auditoría de anuncios con IA
- Analizar y optimizar campañas en las plataformas conectadas
- Enviar comunicaciones transaccionales y de servicio
- Prevención de fraude y seguridad
- Cumplimiento legal
- Análisis agregado y anonimizado para mejorar nuestros modelos

**3. COMPARTICIÓN DE DATOS**
Compartimos datos solo cuando es necesario:
- Con plataformas publicitarias que usted conecta explícitamente (ver sección "Plataformas Publicitarias")
- Con proveedores de servicios (hosting, email, analytics) bajo acuerdos de procesamiento
- Cuando lo exige la ley o para hacer cumplir nuestros términos
- NO vendemos sus datos personales a terceros

**4. RETENCIÓN DE DATOS**
- Datos de cuenta: mientras la cuenta esté activa + 12 meses tras el cierre
- Datos de campaña: 24 meses salvo solicitud de eliminación anticipada
- Logs: 90 días
- Puede solicitar eliminación en cualquier momento: privacy@insitu.company

**5. SEGURIDAD**
- Cifrado TLS 1.3 en tránsito
- Cifrado AES-256 en reposo
- Controles de acceso basados en roles
- Pruebas de penetración regulares
- Prácticas alineadas con SOC 2

**6. COOKIES Y SEGUIMIENTO**
Usamos cookies propias y de terceros para autenticación, analítica y medición publicitaria. Puede gestionar las preferencias en la configuración de su navegador.

**7. CONTACTO**
privacy@insitu.company | dpo@insitu.company
insitu.company — Quito, Ecuador`
        },
        advertising: {
            title: 'Plataformas Publicitarias',
            content: `**Prácticas de Datos con Plataformas Publicitarias**

insitu.company se integra con las siguientes plataformas para proveer auditorías creativas y analítica de campañas con IA. Al conectar sus cuentas, acepta los términos de cada plataforma junto con esta política.

---

**GOOGLE (Google Ads, Google Analytics 4, DV360, YouTube)**

Uso de APIs de Google: La plataforma utiliza las APIs de Google (Google Ads API, Google Analytics Data API, Display & Video 360 API, YouTube Data API) para obtener datos de campañas, creatividades y métricas de rendimiento.

Nuestro uso cumple con la [Política de datos del usuario de los servicios de API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluyendo los requisitos de **Uso Limitado**:
- Solo solicitamos los datos necesarios para el servicio que usted solicitó
- No usamos sus datos de Google para mostrar anuncios en otros productos ajenos a insitu.company
- No permitimos que personas lean sus datos salvo consentimiento explícito, requisitos de seguridad o mandato legal
- No vendemos datos de usuarios de Google

Google Analytics 4 (GA4): Usamos GA4 para medir la interacción dentro de la plataforma. Puede optar por no participar en [Google Analytics Opt-Out](https://tools.google.com/dlpage/gaoptout).

DV360: La integración con Display & Video 360 se utiliza exclusivamente para el análisis creativo de campañas programáticas. El acceso a datos se rige por su acuerdo de anunciante DV360 con Google.

Consent Mode: Donde aplica, implementamos Google Consent Mode v2 para respetar las señales de consentimiento del usuario.

Políticas relevantes de Google:
- [Políticas de Publicidad de Google](https://support.google.com/adspolicy/answer/6008942)
- [Términos de Google Analytics](https://marketingplatform.google.com/about/analytics/terms/)
- [Términos de DV360](https://support.google.com/displayvideo/)

---

**META (Facebook & Instagram Ads)**

Accedemos a la Marketing API de Meta solo con su permiso explícito mediante OAuth. Los datos incluyen métricas de campañas, metadatos de creatividades e insights de audiencias.

Cumplimos con los [Términos de Plataforma de Meta](https://developers.facebook.com/terms/) y los [Términos de Herramientas de Negocio](https://www.facebook.com/legal/technology_terms). No:
- Usamos datos de Meta para segmentar usuarios en publicidad de terceros
- Compartimos datos de Meta con otros clientes
- Retenemos respuestas de API sin procesar más de 30 días

Pixel: Si implementa el Meta Pixel siguiendo la orientación de nuestra plataforma, usted es el controlador de datos de ese pixel. Asegúrese de que su consentimiento de cookies cubra la actividad del Pixel.

---

**TIKTOK (TikTok for Business)**

La integración con la Marketing API de TikTok analiza creatividades y rendimiento de campañas. Cumplimos con la [Política de Contenido Comercial de TikTok](https://ads.tiktok.com/help/article/commercial-content-policy) y los [Términos para Desarrolladores](https://developers.tiktok.com/doc/developer-terms-of-service/).

No accedemos a datos personales de usuarios de TikTok; solo a métricas de campaña a nivel de anunciante.

---

**LINKEDIN (LinkedIn Marketing Solutions)**

El acceso a la API de LinkedIn obtiene datos de rendimiento de campañas y creatividades. Cumplimos con los [Términos de uso de la API de LinkedIn](https://legal.linkedin.com/api-terms-of-use) y las [Políticas de Publicidad](https://www.linkedin.com/legal/ads-policy).

---

**PINTEREST (Pinterest Ads)**

La integración con la API de Pinterest obtiene datos de rendimiento de campañas y Pines. Cumplimos con los [Términos para Desarrolladores de Pinterest](https://developers.pinterest.com/terms/) y las [Normas Publicitarias](https://policy.pinterest.com/es/advertising-guidelines).

---

**PROGRAMÁTICA (DV360 / The Trade Desk / Xandr)**

El análisis de campañas programáticas se realiza con datos de impresiones, clics y conversiones agregados y anonimizados. No procesamos Información de Identificación Personal (PII) de datos de puja programática sin consentimiento explícito. Todo análisis de retargeting se basa únicamente en identificadores agregados y cifrados.

---

**ENCARGADOS DE DATOS**
Todos los encargados de procesamiento de terceros están vinculados por Acuerdos de Procesamiento de Datos (APD) que garantizan protecciones equivalentes al GDPR:
- Google Cloud Platform (hosting)
- Netlify (CDN y despliegue)
- Supabase (base de datos)
- Resend / SendGrid (correo transaccional)
- Stripe (procesamiento de pagos)`
        },
        gdpr: {
            title: 'GDPR — UE',
            content: `**Reglamento General de Protección de Datos (GDPR) — Cumplimiento UE**

Bases legales para el tratamiento (Art. 6 GDPR):
- Consentimiento (Art. 6(1)(a)): conexiones con plataformas publicitarias, comunicaciones de marketing
- Contrato (Art. 6(1)(b)): prestación del servicio de auditoría de IA suscrito
- Obligación legal (Art. 6(1)(c)): registros fiscales, prevención de fraude
- Interés legítimo (Art. 6(1)(f)): seguridad, mejora de la plataforma

Categorías especiales: No tratamos datos de categorías especiales (Art. 9 GDPR).

**Sus derechos GDPR:**
- Acceso (Art. 15): Solicitar copia de todos los datos que conservamos sobre usted
- Rectificación (Art. 16): Corregir datos inexactos
- Supresión (Art. 17): "Derecho al olvido"
- Limitación (Art. 18): Limitar el uso de sus datos
- Portabilidad (Art. 20): Recibir datos en formato legible por máquina
- Oposición (Art. 21): Oponerse al tratamiento basado en interés legítimo
- Decisiones automatizadas (Art. 22): No ser sujeto de decisiones basadas exclusivamente en tratamiento automatizado

**Transferencias internacionales:**
Se realizan bajo Cláusulas Contractuales Estándar (CCE) aprobadas por la Comisión Europea, o hacia países con decisión de adecuación.

**DPO:** dpo@insitu.company
**Autoridad de control:** Puede presentar una reclamación ante su autoridad local (ej. AEPD en España, CNIL en Francia, ICO en el Reino Unido).`
        },
        ccpa: {
            title: 'CCPA — California',
            content: `**California Consumer Privacy Act (CCPA / CPRA) — Cumplimiento**

Categorías de información personal recopilada:
- Identificadores: nombre, correo, dirección IP, ID de dispositivo
- Información comercial: plan de suscripción, historial de facturación
- Actividad en internet/red: registros de uso de la plataforma
- Inferencias: preferencias predichas basadas en el uso

**Sus derechos CCPA:**
- Derecho a saber: Solicitar divulgación de categorías y piezas específicas de PI recopiladas
- Derecho a eliminar: Solicitar la eliminación de su PI (sujeto a excepciones)
- Derecho a optar por no participar: No vendemos PI ni la compartimos para publicidad conductual fuera de la plataforma
- Derecho a corregir: Solicitar corrección de PI inexacta
- Derecho a limitar: Limitar el uso y divulgación de PI sensible
- Derecho a no discriminación: El ejercicio de estos derechos no resultará en denegación de servicios

**No vendemos ni compartimos datos:** insitu.company no vende información personal según la definición de CCPA/CPRA.

Para ejercer sus derechos: privacy@insitu.company | indique "CCPA Request"`
        },
        lgpd: {
            title: 'LGPD — Brasil',
            content: `**Lei Geral de Proteção de Dados (LGPD) — Conformidade**

Bases legais para o tratamento (Art. 7 LGPD):
- Consentimento (Art. 7, I): conexões com plataformas de publicidade
- Execução de contrato (Art. 7, V): prestação do serviço contratado
- Legítimo interesse (Art. 7, IX): segurança e melhoria da plataforma
- Cumprimento de obrigação legal (Art. 7, II)

**Seus Direitos (Art. 18 LGPD):**
- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários
- Portabilidade dos dados
- Eliminação dos dados tratados com consentimento
- Informação sobre compartilhamento com terceiros
- Revogação do consentimento

**Encarregado (DPO):** lgpd@insitu.company
**ANPD:** Você pode apresentar reclamações à Autoridade Nacional de Proteção de Dados.`
        },
        ecuador: {
            title: 'Ecuador — LOPDP',
            content: `**Ley Orgánica de Protección de Datos Personales (LOPDP) — Ecuador**

Bases legales para el tratamiento (Art. 15 LOPDP):
- Consentimiento libre, previo, específico, informado e inequívoco
- Ejecución de contrato o relación pre-contractual
- Cumplimiento de obligación legal
- Interés legítimo del responsable

**Sus Derechos (Arts. 19-29 LOPDP):**
- Acceso a sus datos personales
- Rectificación de datos inexactos
- Eliminación/supresión
- Oposición al tratamiento
- Portabilidad de datos
- No ser objeto de decisiones automatizadas (incluido el perfilado)
- Revocación del consentimiento en cualquier momento

**Responsable del Tratamiento:**
insitu.company | dpo@insitu.company | Quito, Ecuador

**Autoridad de Control:** Superintendencia de Protección de Datos Personales (Ecuador)

**Transferencias Internacionales:** Las transferencias fuera de Ecuador se realizan únicamente hacia países con nivel adecuado de protección o mediante garantías apropiadas (cláusulas contractuales estándar).`
        }
    };

    const sectionKeys: SectionKey[] = ['general', 'advertising', 'gdpr', 'ccpa', 'lgpd', 'ecuador'];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0507] rounded-[3rem] shadow-2xl overflow-hidden border border-white/5">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/40 backdrop-blur-2xl p-8 border-b border-white/5 z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#ff477b]/10 flex items-center justify-center border border-[#ff477b]/20">
                                <ShieldCheck className="w-6 h-6 text-[#ff477b]" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">
                                    {language === 'es' ? 'Privacidad' : 'Privacy'}
                                </h2>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                    {language === 'es' ? 'Versión 2.0 — 22 feb 2026' : 'Version 2.0 — Feb 22 2026'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center text-white/50 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-8 overflow-x-auto pb-2 no-scrollbar">
                        {sectionKeys.map((key) => (
                            <button
                                key={key}
                                onClick={() => setActiveSection(key)}
                                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${activeSection === key
                                    ? 'bg-[#ff477b] text-white border-[#ff477b] shadow-lg shadow-[#ff477b]/20'
                                    : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
                                    }`}
                            >
                                {sections[key].title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-10 overflow-y-auto max-h-[calc(90vh-240px)] custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-line text-slate-300 leading-relaxed text-sm font-medium">
                            {sections[activeSection].content}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-900/60 backdrop-blur-2xl p-8 border-t border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center sm:text-left">
                            © 2026 insitu.company. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
                            <br className="sm:hidden" />
                            <span className="mx-2 hidden sm:inline opacity-20">|</span>
                            <a href="/terms" className="text-[#ff477b] hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("nav-to-terms")); }}>
                                {language === 'es' ? 'Términos de Servicio' : 'Terms of Service'}
                            </a>
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-10 py-4 bg-[#ff477b] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#ff477b]/90 transition-all shadow-xl shadow-[#ff477b]/20"
                        >
                            {language === 'es' ? 'Entendido' : 'Got it'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
