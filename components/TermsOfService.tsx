
import React, { useState } from 'react';

interface TermsOfServiceProps {
    onClose: () => void;
    language?: 'es' | 'en';
}

type TermSection = 'general' | 'platforms' | 'conduct' | 'liability' | 'subscription';

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onClose, language = 'es' }) => {
    const [active, setActive] = useState<TermSection>('general');

    const es: Record<TermSection, { title: string; content: string }> = {
        general: {
            title: 'General',
            content: `**Términos de Servicio — insitu.company**
Versión 2.0 — Última actualización: 22 de febrero de 2026

**1. ACEPTACIÓN DE LOS TÉRMINOS**
Al acceder o usar insitu.company ("Plataforma", "Servicio"), usted acepta estos Términos en su totalidad. Si no está de acuerdo, no use el Servicio.

**2. DESCRIPCIÓN DEL SERVICIO**
insitu.company es una plataforma de auditoría creativa publicitaria impulsada por IA que permite a marketers y agencias analizar creatividades publicitarias, métricas de campañas y rendimiento en múltiples plataformas digitales (Google, Meta, TikTok, LinkedIn, Pinterest, DV360 y más).

**3. ELEGIBILIDAD**
Debe tener al menos 18 años y contar con autorización de la empresa o agencia a la que representa para conectar cuentas publicitarias.

**4. CUENTA DE USUARIO**
- Usted es responsable de mantener la confidencialidad de sus credenciales
- Notifíquenos inmediatamente ante cualquier acceso no autorizado: security@insitu.company
- Una cuenta no puede ser compartida entre múltiples usuarios simultáneamente sin un plan del tipo adecuado

**5. PROPIEDAD INTELECTUAL**
Todo el contenido generado por la IA, informes, análisis y metodologías de insitu.company son propiedad de insitu.company o sus licenciantes. Los datos de sus campañas permanecen siendo de su propiedad.

**6. MODIFICACIONES**
Nos reservamos el derecho de modificar estos Términos con un preaviso de 30 días. El uso continuado del Servicio constituye aceptación de los Términos actualizados.

**7. LEY APLICABLE**
Estos Términos se rigen por las leyes de Ecuador, sin perjuicio de los derechos que correspondan según la legislación de su país de residencia.

**8. CONTACTO**
legal@insitu.company | insitu.company — Quito, Ecuador`
        },
        platforms: {
            title: 'Plataformas Publicitarias',
            content: `**Términos de Uso con Plataformas Publicitarias**

Al conectar sus cuentas de plataformas externas, usted declara y garantiza que:
- Tiene autorización legal para conectar y compartir datos de esas cuentas con insitu.company
- Ha leído y acepta los términos de cada plataforma aplicables a las integraciones de terceros
- Los datos de campaña compartidos son de su propiedad o cuenta con licencia para usarlos

---

**GOOGLE (Google Ads, GA4, DV360, YouTube)**

Uso de APIs: Nuestro servicio utiliza las APIs de Google bajo la [Política de Datos del Usuario de los Servicios de API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluyendo el requisito de **Uso Limitado**:

Los datos obtenidos de Google APIs se usan exclusivamente para:
- Auditoría y optimización de sus campañas dentro de insitu.company
- Generación de informes de rendimiento para el anunciante conectado
- Mejora de los modelos de IA de la plataforma (de forma anonimizada y agregada)

Usted reconoce que:
- insitu.company no es un producto o servicio de Google
- Google puede revocar el acceso a sus APIs en cualquier momento
- El uso de Google Ads API está sujeto a las [Políticas del Programa de Google Ads](https://support.google.com/adspolicies/)
- El uso de GA4 está sujeto a los [Términos de Servicio de Google Analytics](https://marketingplatform.google.com/about/analytics/terms/us/)
- El uso de DV360 está sujeto a los [Términos de Display & Video 360](https://support.google.com/displayvideo/)

Google Consent Mode v2: Si usa la plataforma en territorio UE/EEE, le recomendamos implementar Google Consent Mode v2 en sus propiedades.

---

**META (Facebook & Instagram Ads)**

El acceso a la Marketing API de Meta se realiza bajo los [Términos de la Plataforma de Meta](https://developers.facebook.com/terms/) y los [Términos de Herramientas de Negocio](https://www.facebook.com/legal/technology_terms).

Al conectar Meta:
- Autoriza a insitu.company a acceder a métricas de campaña, metadatos de creatividades e insights de audiencia de su Business Manager
- insitu.company no publicará contenido, realizará cambios en campañas ni accederá a datos de usuarios finales de Meta sin su instrucción explícita
- Cumplimos con la [Política de Publicidad de Meta](https://www.facebook.com/policies/ads/)

---

**TIKTOK (TikTok for Business)**

La integración con TikTok se realiza bajo los [Términos para Desarrolladores de TikTok](https://developers.tiktok.com/doc/developer-terms-of-service/) y la [Política de Contenido Comercial](https://ads.tiktok.com/help/article/commercial-content-policy).

insitu.company cumple con las [Políticas de Publicidad de TikTok](https://ads.tiktok.com/help/article/tiktok-advertising-policies-brand-safety-partner) y solo accede a métricas del anunciante, nunca a datos personales de usuarios de la plataforma.

---

**LINKEDIN (LinkedIn Marketing Solutions)**

La integración con LinkedIn se realiza bajo los [Términos de uso de la API de LinkedIn](https://legal.linkedin.com/api-terms-of-use) y las [Políticas de Publicidad de LinkedIn](https://www.linkedin.com/legal/ads-policy).

---

**PINTEREST (Pinterest Ads)**

La integración con Pinterest se realiza bajo los [Términos para Desarrolladores de Pinterest](https://developers.pinterest.com/terms/) y las [Normas Publicitarias de Pinterest](https://policy.pinterest.com/es/advertising-guidelines).

---

**PUBLICIDAD PROGRAMÁTICA (DV360 / The Trade Desk / Xandr)**

El análisis de campañas programáticas cumple con:
- [Políticas de compra de medios de Google DV360](https://support.google.com/displayvideo/answer/7515073)
- Estándares del IAB (Interactive Advertising Bureau) para seguridad de marca y viewability
- Principios de transparencia de la Alianza para la Medición de Audiencia Digital (AMDA)

No procesamos datos de puja (bid-stream) que contengan PII sin consentimiento explícito.`
        },
        conduct: {
            title: 'Uso Aceptable',
            content: `**Política de Uso Aceptable**

**USOS PERMITIDOS**
- Auditoría y análisis de sus propias campañas publicitarias
- Generación de informes para clientes bajo su gestión
- Benchmarking creativo con datos propios o con datasets autorizados
- Pruebas A/B de creatividades y mensajes publicitarios

**USOS PROHIBIDOS**
Está terminantemente prohibido:
- Usar insitu.company para crear o analizar contenido publicitario que viole las políticas de cualquier plataforma conectada
- Intentar acceder a datos de cuentas publicitarias para las que no tiene autorización
- Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la plataforma
- Usar los servicios para análisis competitivo espía sin autorización del anunciante auditado
- Transmitir malware, realizar ataques de denegación de servicio o intentar vulnerar la seguridad
- Usar la IA para generar contenido fraudulento, engañoso o que infrinja los Derechos de Propiedad Intelectual
- Revender o sublicenciar los servicios sin acuerdo escrito de insitu.company
- Violar las políticas publicitarias de Google, Meta, TikTok, LinkedIn o Pinterest a través de la plataforma

**CUMPLIMIENTO PUBLICITARIO**
Usted es el único responsable de garantizar que las creatividades analizadas y las campañas lanzadas a través de la plataforma cumplen con:
- [Políticas de Publicidad de Google](https://support.google.com/adspolicy/)
- [Políticas de Publicidad de Meta](https://www.facebook.com/policies/ads/)
- [Políticas de Publicidad de TikTok](https://ads.tiktok.com/help/article/tiktok-advertising-policies-brand-safety-partner)
- [Políticas de Publicidad de LinkedIn](https://www.linkedin.com/legal/ads-policy)
- [Normas Publicitarias de Pinterest](https://policy.pinterest.com/es/advertising-guidelines)
- Leyes de publicidad aplicables en su jurisdicción (incluyendo regulaciones de ASA, FTC, CONAR, entre otras)`
        },
        liability: {
            title: 'Limitación de Responsabilidad',
            content: `**Limitación de Responsabilidad y Garantías**

**EXENCIÓN DE GARANTÍAS**
El Servicio se proporciona "tal cual" y "según disponibilidad". insitu.company no garantiza que:
- El Servicio sea ininterrumpido, libre de errores o que los análisis de IA sean 100% precisos
- Los resultados de auditoría reflejen con exactitud el desempeño real de campañas
- La disponibilidad de las integraciones con plataformas de terceros sea continua (sujeto a cambios en las APIs de dichas plataformas)

**PRECISIÓN DE LA IA**
Los análisis, puntuaciones y recomendaciones generados por IA son de naturaleza orientativa. Las decisiones de inversión publicitaria deben realizarse con la supervisión de un profesional cualificado. insitu.company no se hace responsable de pérdidas en inversión publicitaria basadas en las recomendaciones de la IA.

**LÍMITE DE RESPONSABILIDAD**
En ningún caso la responsabilidad total de insitu.company excederá el importe pagado por el usuario en los 12 meses anteriores al evento que dio lugar a la reclamación. insitu.company no será responsable por daños indirectos, incidentales, especiales o consecuentes.

**INDEMNIZACIÓN**
Usted acepta indemnizar y mantener indemne a insitu.company frente a reclamaciones derivadas de:
- Su uso del Servicio en violación de estos Términos
- El incumplimiento de las políticas publicitarias de plataformas de terceros
- El uso no autorizado de datos publicitarios de terceros a través de la plataforma

**FUERZA MAYOR**
insitu.company no será responsable por interrupciones causadas por cambios en las APIs de Google, Meta, TikTok, LinkedIn, Pinterest u otras plataformas de terceros fuera de nuestro control.`
        },
        subscription: {
            title: 'Suscripción y Pagos',
            content: `**Términos de Suscripción y Pagos**

**PLANES**
insitu.company ofrece planes de suscripción mensual y anual. Los precios actuales están disponibles en la página de precios de la plataforma.

**PERÍODO DE PRUEBA (TRIAL)**
Los nuevos usuarios tienen acceso a un período de prueba gratuito con funcionalidades limitadas. Al finalizar el período de prueba, se requiere una suscripción de pago para continuar usando el servicio.

**FACTURACIÓN**
- La facturación es mensual o anual según el plan seleccionado
- Los pagos se procesan de forma segura a través de Stripe
- Los cargos se realizan al inicio de cada período de facturación
- No almacenamos información de tarjeta de crédito

**CANCELACIÓN**
- Puede cancelar su suscripción en cualquier momento desde su perfil
- La cancelación entra en vigor al final del período de facturación actual
- No se realizan reembolsos proporcionales por períodos no utilizados, salvo error de facturación o incumplimiento por nuestra parte

**CAMBIOS DE PRECIO**
Nos reservamos el derecho de modificar los precios con 30 días de preaviso. El nuevo precio se aplicará en el siguiente ciclo de facturación tras la notificación.

**IMPUESTOS**
Los precios pueden no incluir impuestos aplicables (IVA, GST, sales tax) según su jurisdicción. Los impuestos serán añadidos según corresponda en el momento del pago.

**CUENTAS INACTIVAS**
Las cuentas con planes activos que no registren actividad durante 12 meses podrán ser archivadas previo aviso por email. Los datos serán conservados conforme a nuestra Política de Privacidad.`
        }
    };

    const en: Record<TermSection, { title: string; content: string }> = {
        general: {
            title: 'General',
            content: `**Terms of Service — insitu.company**
Version 2.0 — Last Updated: February 22, 2026

**1. ACCEPTANCE**
By accessing or using insitu.company ("Platform", "Service"), you agree to these Terms in full.

**2. SERVICE DESCRIPTION**
insitu.company is an AI-powered advertising creative audit platform enabling marketers and agencies to analyze ad creatives, campaign metrics and performance across digital platforms (Google, Meta, TikTok, LinkedIn, Pinterest, DV360 and more).

**3. ELIGIBILITY**
You must be at least 18 years old and authorized by the company or agency you represent to connect advertising accounts.

**4. USER ACCOUNT**
- You are responsible for maintaining the confidentiality of your credentials
- Notify us immediately of unauthorized access: security@insitu.company
- Accounts may not be shared between multiple simultaneous users without an appropriate plan

**5. INTELLECTUAL PROPERTY**
All AI-generated content, reports, analyses and methodologies are property of insitu.company or its licensors. Your campaign data remains your property.

**6. MODIFICATIONS**
We reserve the right to modify these Terms with 30 days' notice. Continued use constitutes acceptance.

**7. GOVERNING LAW**
These Terms are governed by the laws of Ecuador, without prejudice to rights under your local legislation.

**8. CONTACT**
legal@insitu.company | insitu.company — Quito, Ecuador`
        },
        platforms: {
            title: 'Ad Platforms',
            content: `**Advertising Platform Terms**

By connecting external platform accounts, you represent and warrant that:
- You have legal authorization to connect and share data from those accounts with insitu.company
- You have read and accept each platform's terms applicable to third-party integrations
- Campaign data shared is owned by you or properly licensed

**GOOGLE (Google Ads, GA4, DV360, YouTube)**
Our service uses Google APIs under the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) including Limited Use requirements. Data from Google APIs is used solely for auditing and optimizing your campaigns within insitu.company.

Platform terms:
- [Google Ads Policies](https://support.google.com/adspolicies/)
- [Google Analytics Terms](https://marketingplatform.google.com/about/analytics/terms/us/)
- [DV360 Terms](https://support.google.com/displayvideo/)

**META (Facebook & Instagram Ads)**
Access under [Meta Platform Terms](https://developers.facebook.com/terms/) and [Business Tools Terms](https://www.facebook.com/legal/technology_terms). insitu.company will not publish content or modify campaigns without your explicit instruction.

**TIKTOK** — Under [TikTok Developer Terms](https://developers.tiktok.com/doc/developer-terms-of-service/) and [Commercial Content Policy](https://ads.tiktok.com/help/article/commercial-content-policy).

**LINKEDIN** — Under [LinkedIn API Terms](https://legal.linkedin.com/api-terms-of-use) and [Advertising Policies](https://www.linkedin.com/legal/ads-policy).

**PINTEREST** — Under [Pinterest Developer Terms](https://developers.pinterest.com/terms/) and [Advertising Standards](https://policy.pinterest.com/en/advertising-guidelines).

**PROGRAMMATIC (DV360 / TTD / Xandr)** — Analysis complies with IAB standards and Google DV360 policies. No PII from bid-stream data is processed without explicit consent.`
        },
        conduct: {
            title: 'Acceptable Use',
            content: `**Acceptable Use Policy**

**PERMITTED USES**
- Auditing and analyzing your own advertising campaigns
- Generating reports for clients under your management
- Creative benchmarking with your own or authorized datasets
- A/B testing of creatives and ad messages

**PROHIBITED USES**
- Creating or analyzing ad content that violates any connected platform's policies
- Attempting to access ad accounts you are not authorized to manage
- Reverse engineering, decompiling or attempting to extract source code
- Competitive intelligence gathering without the audited advertiser's authorization
- Transmitting malware or attempting security breaches
- Using the AI to generate fraudulent, deceptive or IP-infringing content
- Reselling or sublicensing services without written agreement from insitu.company

**ADVERTISING COMPLIANCE**
You are solely responsible for ensuring campaigns analyzed through the platform comply with:
- [Google Advertising Policies](https://support.google.com/adspolicy/)
- [Meta Advertising Policies](https://www.facebook.com/policies/ads/)
- [TikTok Advertising Policies](https://ads.tiktok.com/help/article/tiktok-advertising-policies-brand-safety-partner)
- [LinkedIn Advertising Policies](https://www.linkedin.com/legal/ads-policy)
- [Pinterest Advertising Standards](https://policy.pinterest.com/en/advertising-guidelines)
- Applicable advertising laws in your jurisdiction`
        },
        liability: {
            title: 'Liability',
            content: `**Limitation of Liability & Warranties**

**DISCLAIMER OF WARRANTIES**
The Service is provided "as is" and "as available". insitu.company does not warrant that the Service will be uninterrupted, error-free or that AI analyses will be 100% accurate.

**PRECISIÓN DE LA IA**
AI-generated analyses, scores and recommendations are advisory in nature. Advertising investment decisions should be made under the supervision of a qualified professional. insitu.company is not liable for advertising losses based on AI recommendations.

**LIABILITY CAP**
insitu.company's total liability will not exceed the amount paid by the user in the 12 months preceding the claim. insitu.company will not be liable for indirect, incidental, special or consequential damages.

**INDEMNIFICATION**
You agree to indemnify insitu.company against claims arising from your use of the Service in violation of these Terms, non-compliance with advertising platform policies, or unauthorized use of third-party advertising data.

**FORCE MAJEURE**
insitu.company is not liable for interruptions caused by changes in Google, Meta, TikTok, LinkedIn, Pinterest or DV360 APIs outside our control.`
        },
        subscription: {
            title: 'Subscription',
            content: `**Subscription & Payment Terms**

**PLANS**
insitu.company offers monthly and annual subscription plans. Current pricing is available on the platform's pricing page.

**TRIAL PERIOD**
New users have access to a free trial with limited features. A paid subscription is required to continue after the trial.

**BILLING**
- Monthly or annual billing based on selected plan
- Payments processed securely through Stripe
- Charges are made at the start of each billing period
- We do not store credit card information

**CANCELLATION**
- Cancel anytime from your profile
- Cancellation takes effect at the end of the current billing period
- No pro-rata refunds for unused periods, except for billing errors or our breach

**PRICE CHANGES**
We reserve the right to change prices with 30 days' notice. New prices apply to the next billing cycle.

**TAXES**
Prices may not include applicable taxes (VAT, GST, sales tax) based on your jurisdiction.`
        }
    };

    const sections = language === 'es' ? es : en;
    const sectionKeys: TermSection[] = ['general', 'platforms', 'conduct', 'liability', 'subscription'];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight mb-1">
                                {language === 'es' ? 'Términos de Servicio' : 'Terms of Service'}
                            </h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                {language === 'es' ? 'Versión 2.0 — 22 feb 2026' : 'Version 2.0 — Feb 22 2026'}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
                        {sectionKeys.map((key) => (
                            <button
                                key={key}
                                onClick={() => setActive(key)}
                                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${active === key
                                    ? 'bg-[#ff477b] text-white shadow-lg'
                                    : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                    }`}
                            >
                                {sections[key].title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-8 overflow-y-auto grow">
                    <div className="whitespace-pre-line text-slate-700 leading-relaxed text-sm">
                        {sections[active].content}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        © 2026 insitu.company.{' '}
                        <a href="/privacy" className="underline hover:text-slate-800">
                            {language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
                        </a>
                    </p>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all">
                        {language === 'es' ? 'Cerrar' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
