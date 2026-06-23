import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlossaryViewProps {
    onClose: () => void;
    language?: 'es' | 'en';
}

const GlossaryView: React.FC<GlossaryViewProps> = ({ onClose, language = 'es' }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const allTerms = [
        {
            category: language === 'es' ? "Neurociencia Aplicada" : "Applied Neuroscience",
            items: [
                {
                    term: language === 'es' ? "Demanda Cognitiva" : "Cognitive Demand",
                    definition: language === 'es'
                        ? "Es el esfuerzo mental que necesita una persona para entender tu anuncio. Menos es mejor: si es muy alto, la gente ignora el anuncio porque es difícil de procesar."
                        : "The mental effort required to understand your ad. Lower is usually better: if it's too high, people might ignore the ad because it's too hard to process."
                },
                {
                    term: language === 'es' ? "Análisis Neuronal" : "Neuronal Analysis",
                    definition: language === 'es'
                        ? "Métricas predictivas generadas por IA que simulan la respuesta cognitiva y emocional del cerebro humano al escanear y percibir una pieza gráfica."
                        : "AI-generated predictive metrics that simulate the cognitive and emotional response of the human brain when scanning and perceiving a graphical piece."
                },
                {
                    term: language === 'es' ? "Claridad" : "Clarity",
                    definition: language === 'es'
                        ? "Mide qué tan limpio y directo es el diseño. Un puntaje alto significa que el mensaje principal se entiende en menos de 2 segundos."
                        : "Measures how clean and direct the design is. A high score means the main message is understood in less than 2 seconds."
                },
                {
                    term: language === 'es' ? "Foco de Atención" : "Focus Score",
                    definition: language === 'es'
                        ? "Indica si las personas están mirando lo que realmente importa (como tu producto o el botón de compra) o si se distraen con elementos secundarios."
                        : "Indicates if people are looking at what really matters (like your product or the buy button) or if they are distracted by secondary elements."
                },
                {
                    term: language === 'es' ? "Face Bias (Sesgo de Rostros)" : "Face Bias",
                    definition: language === 'es'
                        ? "Nuestro cerebro está programado para mirar caras automáticamente. Analizamos si el rostro en tu anuncio ayuda a vender o si 'se roba' toda la atención del producto."
                        : "Our brains are programmed to look at faces automatically. We analyze if the face in your ad helps sell or if it 'steals' all the attention away from the product."
                },
                {
                    term: language === 'es' ? "Engagement (Conexión)" : "Engagement",
                    definition: language === 'es'
                        ? "La capacidad del anuncio para generar interés inmediato y mantener a la persona conectada con la pieza visual."
                        : "The ad's ability to generate immediate interest and keep the person connected with the visual piece."
                },
                {
                    term: language === 'es' ? "Recuerdo (Recall)" : "Memory Recall",
                    definition: language === 'es'
                        ? "Probabilidad de que el usuario recuerde tu marca o mensaje después de haber visto el anuncio."
                        : "The likelihood that a user will remember your brand or message after having seen the ad."
                },
                {
                    term: language === 'es' ? "Áreas de Interés (AOI)" : "Areas of Interest (AOI)",
                    definition: language === 'es'
                        ? "Zonas específicas del anuncio que medimos por separado, como tu logo (Marca), tu artículo (Producto) o el botón (CTA). Así sabes si cada parte está cumpliendo su función."
                        : "Specific zones of the ad that we measure separately, such as your logo (Brand), your item (Product), or the button (CTA). This way you know if each part is doing its job."
                },
                {
                    term: language === 'es' ? "Simulación de Seguimiento Ocular" : "Eye-Tracking Simulation",
                    definition: language === 'es'
                        ? "Simulación mediante IA de cómo viajaría la mirada de un humano real por tu diseño. Identifica si el recorrido visual es lógico o si el usuario se pierde."
                        : "AI-based simulation of how a real human's gaze would travel through your design. Identifies if the visual path is logical or if the user gets lost."
                },
                {
                    term: language === 'es' ? "Zonas Calientes (Mapas de Calor)" : "Hot Spots (Heatmaps)",
                    definition: language === 'es'
                        ? "Zonas de calor extremo donde se concentra la mayor probabilidad de atención. Un anuncio ideal tiene el Hot Spot sobre el beneficio o el producto principal."
                        : "Extreme heat zones where the highest probability of attention is concentrated. An ideal ad has the Hot Spot over the main benefit or product."
                }
            ]
        },
        {
            category: language === 'es' ? "White Label & Agencia" : "White Label & Agency",
            items: [
                {
                    term: language === 'es' ? "White Label (Marca Blanca)" : "White Label",
                    definition: language === 'es'
                        ? "Función para agencias que permite ocultar la marca de INsitu AI y reemplazarla por el logo y nombre de su propia consultora en todos los reportes descargables."
                        : "Agency feature that allows hiding the INsitu AI brand and replacing it with their own consultancy's logo and name on all downloadable reports."
                },
                {
                    term: language === 'es' ? "Identidad de Consultora" : "Consultancy Identity",
                    definition: language === 'es'
                        ? "Configuración avanzada donde la agencia carga su 'isotipo' y nombre legal para que el sistema actúe como un motor tecnológico privado para sus clientes."
                        : "Advanced setting where the agency uploads its 'isotype' and legal name so the system acts as a private technological engine for their clients."
                },
                {
                    term: language === 'es' ? "Modo Consultoría" : "Consulting Mode",
                    definition: language === 'es'
                        ? "Estado del sistema donde el lenguaje de los reportes cambia de 'Auditoría Directa' a 'Reporte de Consultoría', elevando la autoridad frente al cliente final."
                        : "System state where the report language changes from 'Direct Audit' to 'Consultancy Report', increasing authority in front of the final client."
                }
            ]
        },
        {
            category: language === 'es' ? "SEO y Tráfico" : "SEO and Traffic",
            items: [
                {
                    term: language === 'es' ? "Autoridad de Dominio (DA)" : "Domain Authority (DA)",
                    definition: language === 'es'
                        ? "Es una puntuación que predice qué tan bien se posicionará un sitio web en los buscadores. Entre más alto, más 'confianza' le tienen Google y otros buscadores."
                        : "A score that predicts how well a website will rank on search engines. The higher it is, the more 'trust' Google and other search engines have in it."
                },
                {
                    term: language === 'es' ? "Tráfico Orgánico" : "Organic Traffic",
                    definition: language === 'es'
                        ? "Visitas de personas que llegan a tu web a través de buscadores de forma natural, sin que hayas tenido que pagar por ese clic específico."
                        : "Visits from people who reach your website through search engines naturally, without you having to pay for that specific click."
                },
                {
                    term: language === 'es' ? "Backlinks (Enlaces Externos)" : "Backlinks",
                    definition: language === 'es'
                        ? "Son otros sitios web que ponen un link hacia el tuyo. Funcionan como 'votos de confianza' que mejoran tu reputación en internet."
                        : "These are other websites that link to yours. They act as 'votes of confidence' that improve your reputation on the internet."
                },
                {
                    term: language === 'es' ? "Intención de Búsqueda" : "Search Intent",
                    definition: language === 'es'
                        ? "El 'por qué' detrás de una búsqueda. ¿El usuario quiere comprar, informarse o solo encontrar una página específica?"
                        : "The 'why' behind a search. Does the user want to buy, inform themselves, or just find a specific page?"
                },
                {
                    term: language === 'es' ? "Palabras Clave (Keywords)" : "Keywords",
                    definition: language === 'es'
                        ? "Las palabras o frases que los usuarios escriben en Google. Posicionarte en las correctas significa aparecer cuando tu cliente potencial te está buscando."
                        : "The words or phrases users type into Google. Ranking for the right ones means appearing when your potential customer is searching for you."
                },
                {
                    term: language === 'es' ? "KD% (Dificultad de Keyword)" : "KD% (Keyword Difficulty)",
                    definition: language === 'es'
                        ? "Un porcentaje del 0 al 100 que indica qué tan difícil es posicionarse en la primera página de Google para esa palabra clave. Menor número = más fácil de ganar."
                        : "A percentage from 0 to 100 indicating how hard it is to rank on Google's first page for that keyword. Lower number = easier to win."
                },
                {
                    term: language === 'es' ? "SERP (Resultados de Búsqueda)" : "SERP (Search Engine Results Page)",
                    definition: language === 'es'
                        ? "La página que muestra Google cuando buscas algo. Estar en el #1 de SERP puede significar hasta 10 veces más clics que estar en el #10."
                        : "The page Google shows when you search for something. Being #1 in the SERP can mean up to 10 times more clicks than being #10."
                },
                {
                    term: language === 'es' ? "Posición Promedio" : "Average Position",
                    definition: language === 'es'
                        ? "El lugar promedio que ocupa tu sitio en los resultados de búsqueda para un conjunto de palabras clave. Una posición de 1-3 es considerada excelente."
                        : "The average position your site occupies in search results for a set of keywords. A position of 1-3 is considered excellent."
                },
                {
                    term: language === 'es' ? "PageRank Abierto" : "Open PageRank",
                    definition: language === 'es'
                        ? "Una puntuación pública creada por Google que mide la importancia de un sitio web basada en la cantidad y calidad de sus backlinks."
                        : "A public score created by Google that measures the importance of a website based on the quantity and quality of its backlinks."
                }
            ]
        },
        {
            category: language === 'es' ? "Análisis de Competencia" : "Competitive Analysis",
            items: [
                {
                    term: language === 'es' ? "Gap de Keywords" : "Keyword Gap",
                    definition: language === 'es'
                        ? "Las palabras clave para las que tu competidor rankea pero tú no. Son oportunidades directas de tráfico que estás dejando ir."
                        : "The keywords for which your competitor ranks but you don't. These are direct traffic opportunities you are letting go."
                },
                {
                    term: language === 'es' ? "Nivel de Competencia" : "Competition Level",
                    definition: language === 'es'
                        ? "Clasifica a cada competidor como Alto, Medio o Bajo según cuánto se solapan sus keywords con las tuyas y la similitud de su público objetivo."
                        : "Classifies each competitor as High, Medium, or Low based on how much their keywords overlap with yours and the similarity of their target audience."
                },
                {
                    term: language === 'es' ? "Análisis de Competidores" : "Competitor Analysis",
                    definition: language === 'es'
                        ? "Comparativa detallada de tus principales rivales en el mercado digital, analizando su tráfico, autoridad, estrategia de contenido y palabras clave para identificar oportunidades."
                        : "Detailed comparison of your main rivals in the digital market, analyzing their traffic, authority, content strategy, and keywords to identify opportunities."
                },
                {
                    term: language === 'es' ? "Estrategia del Competidor" : "Competitor Strategy",
                    definition: language === 'es'
                        ? "El patrón de acciones de marketing digital que un competidor usa para atraer tráfico: SEO agresivo, paid ads, contenido viral, etc."
                        : "The pattern of digital marketing actions a competitor uses to attract traffic: aggressive SEO, paid ads, viral content, etc."
                },
                {
                    term: language === 'es' ? "Keywords Comunes" : "Common Keywords",
                    definition: language === 'es'
                        ? "Las palabras clave para las que tanto tú como tu competidor compiten en Google. Cuantas más palabras clave en común, mayor la competencia directa."
                        : "The keywords for which both you and your competitor compete on Google. The more keywords in common, the greater the direct competition."
                },
                {
                    term: language === 'es' ? "Oportunidad de Brecha (Gap Insight)" : "Gap Insight",
                    definition: language === 'es'
                        ? "Una recomendación específica de cómo aprovechar la debilidad de un competidor para ganar posicionamiento o clientes que ellos están perdiendo."
                        : "A specific recommendation on how to exploit a competitor's weakness to gain positioning or customers they are losing."
                },
                {
                    term: language === 'es' ? "Señales de Competidor (Competitor Signals)" : "Competitor Signals",
                    definition: language === 'es'
                        ? "Sistema de alerta temprana que detecta automáticamente nuevos anuncios (Google, Meta, TikTok), cambios tecnológicos o menciones en prensa de tus competidores en tiempo real."
                        : "Early warning system that automatically detects new ads (Google, Meta, TikTok), technological changes, or press mentions of your competitors in real-time."
                }
            ]
        },
        {
            category: language === 'es' ? "Google Ads (SEM)" : "Google Ads (SEM)",
            items: [
                {
                    term: language === 'es' ? "Auction Insights (Subasta Interna)" : "Auction Insights",
                    definition: language === 'es'
                        ? "Datos de Google que te muestran quiénes más aparecen en las mismas subastas que tú, junto con su tasa de superposición y posición relativa."
                        : "Google data showing you who else appears in the same auctions as you, along with their overlap rate and relative position."
                },
                {
                    term: language === 'es' ? "Cuota de Impresiones (IS)" : "Impression Share (IS)",
                    definition: language === 'es'
                        ? "El porcentaje de impresiones que recibiste dividido entre las que podías haber recibido. Un IS bajo suele indicar presupuesto insuficiente o baja calidad."
                        : "The percentage of impressions you received divided by those you could have received. Low IS usually indicates insufficient budget or low quality."
                },
                {
                    term: language === 'es' ? "ROAS (Retorno sobre la inversión en Ads)" : "ROAS (Return on Ad Spend)",
                    definition: language === 'es'
                        ? "Por cada peso/dólar que inviertes en publicidad, cuánto ingreso generas. Un ROAS de 4x significa que por cada $1 invertido, recibes $4 en ventas."
                        : "For every peso/dollar you invest in advertising, how much revenue you generate. A 4x ROAS means for every $1 invested, you receive $4 in sales."
                },
                {
                    term: language === 'es' ? "Puntuación de Calidad (QS)" : "Quality Score (QS)",
                    definition: language === 'es'
                        ? "La nota (1-10) que Google le da a tu anuncio y tu landing page. Un QS alto significa que pagas menos por clic y tu anuncio aparece mejor posicionado."
                        : "The grade (1-10) Google gives to your ad and landing page. A high QS means you pay less per click and your ad appears better positioned."
                },
                {
                    term: language === 'es' ? "Landing Page (Página de Destino)" : "Landing Page",
                    definition: language === 'es'
                        ? "La página de tu web a donde llegan los usuarios después de hacer clic en tu anuncio. Su diseño y relevancia son determinantes para convertir al visitante en cliente."
                        : "The page of your website where users land after clicking on your ad. Its design and relevance are key to converting visitors into customers."
                },
                {
                    term: language === 'es' ? "Conversión" : "Conversion",
                    definition: language === 'es'
                        ? "Cuando un usuario realiza la acción que tú quieres: comprar, registrarse, llamar, descargar. El objetivo final de todos los anuncios."
                        : "When a user performs the action you want: buy, register, call, download. The ultimate goal of all advertisements."
                },
                {
                    term: language === 'es' ? "Tasa de Conversión (CVR)" : "Conversion Rate (CVR)",
                    definition: language === 'es'
                        ? "El porcentaje de visitantes que realizan la acción deseada. Si 100 personas visitaron tu landing y 3 compraron, tu CVR es 3%."
                        : "The percentage of visitors who perform the desired action. If 100 people visited your landing and 3 bought, your CVR is 3%."
                },
                {
                    term: language === 'es' ? "CPA (Costo por Adquisición)" : "CPA (Cost per Acquisition)",
                    definition: language === 'es'
                        ? "Lo que te cuesta conseguir un cliente o conversión. Se calcula dividiendo el gasto total de la campaña entre el número de conversiones. Cuanto menor el CPA, más eficiente la campaña."
                        : "What it costs you to acquire one customer or conversion. Calculated by dividing total campaign spend by the number of conversions. The lower the CPA, the more efficient the campaign."
                },
                {
                    term: language === 'es' ? "Performance Max (PMax)" : "Performance Max (PMax)",
                    definition: language === 'es'
                        ? "Tipo de campaña de Google Ads impulsada por IA que unifica todos los canales (Search, Display, YouTube, Gmail, Maps) en una sola. Automatiza puja, creativos y segmentación para maximizar conversiones."
                        : "A Google Ads AI-driven campaign type that unifies all channels (Search, Display, YouTube, Gmail, Maps) in one. It automates bidding, creatives, and targeting to maximize conversions."
                },
                {
                    term: language === 'es' ? "Smart Bidding (Puja Inteligente)" : "Smart Bidding",
                    definition: language === 'es'
                        ? "Sistema de pujas automatizado de Google que usa machine learning para ajustar la oferta en cada subasta en tiempo real, optimizando hacia un objetivo específico como tROAS o tCPA."
                        : "Google's automated bidding system that uses machine learning to adjust the bid in each auction in real time, optimizing toward a specific goal like tROAS or tCPA."
                },
                {
                    term: language === 'es' ? "tROAS / tCPA (Objetivos de Puja)" : "tROAS / tCPA (Bid Targets)",
                    definition: language === 'es'
                        ? "Parámetros que le indicas a Smart Bidding: tROAS es el retorno mínimo que esperas por cada peso invertido, y tCPA es el costo máximo que estás dispuesto a pagar por cada conversión."
                        : "Parameters you set for Smart Bidding: tROAS is the minimum return you expect per peso/dollar spent, and tCPA is the maximum cost you're willing to pay per conversion."
                },
                {
                    term: language === 'es' ? "Modelo de Atribución" : "Attribution Model",
                    definition: language === 'es'
                        ? "La regla que decide qué punto de contacto (clic, impresión) recibe el crédito de una conversión. Existen modelos como Último Clic, Primer Clic, Basado en Datos, etc. Afecta cómo evalúas el rendimiento de tus campañas."
                        : "The rule that decides which touchpoint (click, impression) gets credit for a conversion. Models include Last Click, First Click, Data-Driven, etc. It affects how you evaluate campaign performance."
                },
                {
                    term: language === 'es' ? "A/B Testing (Prueba A/B)" : "A/B Testing",
                    definition: language === 'es'
                        ? "Método que consiste en mostrar dos variantes de un anuncio (A y B) a audiencias similares para determinar cuál genera mejor rendimiento. Es la base del optimización creativa científica."
                        : "A method of showing two ad variants (A and B) to similar audiences to determine which performs better. It's the foundation of scientific creative optimization."
                },
                {
                    term: language === 'es' ? "Palabras Clave Negativas" : "Negative Keywords",
                    definition: language === 'es'
                        ? "Términos para los que explícitamente NO quieres aparecer. Añadirlas evita gastar dinero en búsquedas irrelevantes."
                        : "Terms for which you explicitly do NOT want to appear. Adding them avoids spending money on irrelevant searches."
                }
            ]
        },
        {
            category: language === 'es' ? "SEO Técnico" : "Technical SEO",
            items: [
                {
                    term: language === 'es' ? "Sitemap" : "Sitemap",
                    definition: language === 'es'
                        ? "Un archivo XML que lista todas las páginas de tu sitio para que Google pueda indexarlas más fácilmente. Es como un mapa que le das al buscador."
                        : "An XML file that lists all the pages of your site so Google can index them more easily. It's like a map you give to the search engine."
                },
                {
                    term: language === 'es' ? "HTTPS / SSL" : "HTTPS / SSL",
                    definition: language === 'es'
                        ? "Protocolo de seguridad que cifra la comunicación entre el usuario y el sitio. Google penaliza sitios sin HTTPS y los navegadores muestran advertencias."
                        : "Security protocol that encrypts communication between the user and the site. Google penalizes sites without HTTPS and browsers display warnings."
                },
                {
                    term: language === 'es' ? "Antigüedad del Dominio" : "Domain Age",
                    definition: language === 'es'
                        ? "Cuánto tiempo lleva registrado un dominio. Los dominios más antiguos generalmente tienen más autoridad acumulada ante Google."
                        : "How long a domain has been registered. Older domains generally have more accumulated authority with Google."
                },
                {
                    term: language === 'es' ? "Páginas Indexadas" : "Indexed Pages",
                    definition: language === 'es'
                        ? "El número de páginas de tu sitio que Google ha 'leído' y guardado en su base de datos. Solo las páginas indexadas pueden aparecer en búsquedas."
                        : "The number of pages from your site that Google has 'read' and saved in its database. Only indexed pages can appear in searches."
                },
                {
                    term: language === 'es' ? "Métricas Web Principales" : "Core Web Vitals",
                    definition: language === 'es'
                        ? "Métricas técnicas de Google que miden la experiencia del usuario: velocidad de carga, estabilidad visual e interactividad. Afectan directamente el posicionamiento."
                        : "Google's technical metrics measuring user experience: loading speed, visual stability, and interactivity. They directly affect rankings."
                },
                {
                    term: language === 'es' ? "Stack Tecnológico (Tech Stack)" : "Technology Stack (Tech Stack)",
                    definition: language === 'es'
                        ? "Las herramientas y plataformas que usa un sitio web: CMS (WordPress, Shopify), píxeles de seguimiento (Meta Pixel, Google Tag Manager), etc."
                        : "The tools and platforms a website uses: CMS (WordPress, Shopify), tracking pixels (Meta Pixel, Google Tag Manager), etc."
                }
            ]
        },
        {
            category: language === 'es' ? "Métricas de Negocio" : "Business Metrics",
            items: [
                {
                    term: language === 'es' ? "CPM (Costo por Mil Impresiones)" : "CPM (Cost per Mille)",
                    definition: language === 'es'
                        ? "Lo que pagas por cada 1,000 veces que se muestra tu anuncio, independientemente de si alguien hace clic."
                        : "What you pay for every 1,000 times your ad is shown, regardless of whether anyone clicks."
                },
                {
                    term: language === 'es' ? "Frecuencia" : "Frequency",
                    definition: language === 'es'
                        ? "El número promedio de veces que una misma persona ve tu anuncio. Una frecuencia muy alta (>3) puede generar fatiga publicitaria y hacer que las personas ignoren el anuncio."
                        : "The average number of times the same person sees your ad. Very high frequency (>3) can create ad fatigue and cause people to ignore the ad."
                },
                {
                    term: language === 'es' ? "Alcance (Reach)" : "Reach",
                    definition: language === 'es'
                        ? "El número de personas únicas que han visto tu anuncio al menos una vez."
                        : "The number of unique people who have seen your ad at least once."
                },
                {
                    term: language === 'es' ? "Lead (Cliente Potencial)" : "Lead",
                    definition: language === 'es'
                        ? "Una persona que ha mostrado interés en tu producto o servicio dejando sus datos de contacto. Se encuentra en la fase media del embudo de conversión, entre visitante y cliente final."
                        : "A person who has shown interest in your product or service by leaving their contact details. They are in the middle stage of the conversion funnel, between visitor and final customer."
                },
                {
                    term: language === 'es' ? "LTV / CLV (Valor de Vida del Cliente)" : "LTV / CLV (Customer Lifetime Value)",
                    definition: language === 'es'
                        ? "El ingreso total que se espera obtener de un cliente durante toda su relación con la marca. Una métrica clave para determinar cuánto puedes gastar en adquirir un cliente (CPA máximo)."
                        : "The total revenue expected from a customer throughout their relationship with the brand. A key metric for determining how much you can spend to acquire a customer (max CPA)."
                },
                {
                    term: language === 'es' ? "Embudo de Conversión" : "Conversion Funnel",
                    definition: language === 'es'
                        ? "El camino que recorre un usuario desde que ve tu anuncio por primera vez hasta que realiza la compra. Se divide en fases: conciencia, consideración y decisión."
                        : "The path a user takes from first seeing your ad to making a purchase. It's divided into phases: awareness, consideration, and decision."
                },
                {
                    term: language === 'es' ? "Benchmark de Industria" : "Industry Benchmark",
                    definition: language === 'es'
                        ? "Los valores promedio de métricas clave (CTR, CPC, CVR, CPA) para un sector específico. Se usan para comparar si el rendimiento de tu campaña está por encima o por debajo del estándar del mercado."
                        : "Average values of key metrics (CTR, CPC, CVR, CPA) for a specific industry. Used to compare whether your campaign performance is above or below the market standard."
                },
                {
                    term: language === 'es' ? "Escenario de Presupuesto" : "Budget Scenario",
                    definition: language === 'es'
                        ? "Proyección de resultados (clicks, conversiones, ROAS esperado) para diferentes niveles de inversión publicitaria: Básico, Recomendado y Agresivo. Permite planificar el retorno antes de gastar."
                        : "Projection of results (clicks, conversions, expected ROAS) for different investment levels: Basic, Recommended, and Aggressive. Allows planning returns before spending."
                },
                {
                    term: language === 'es' ? "Diagnóstico de Brecha (Growth Verdict)" : "Growth Verdict",
                    definition: language === 'es'
                        ? "Nuestra evaluación exclusiva que determina si una campaña tiene potencial de crecimiento real, combinando métricas de performance con análisis neurológico del creativo."
                        : "Our exclusive evaluation that determines if a campaign has real growth potential, combining performance metrics with neurological creative analysis."
                },
                {
                    term: language === 'es' ? "Puntuación de Afinidad de Audiencia" : "Audience Match Score",
                    definition: language === 'es'
                        ? "Un indicador de qué tan bien alineado está el mensaje y el diseño de tu anuncio con el perfil psicológico y las expectativas de tu audiencia objetivo."
                        : "An indicator of how well aligned your ad's message and design are with the psychological profile and expectations of your target audience."
                }
            ]
        },

        {
            category: language === 'es' ? "Marketing y Campañas" : "Marketing and Campaigns",
            items: [
                {
                    term: language === 'es' ? "CTR (Tasa de Clics)" : "CTR (Click Through Rate)",
                    definition: language === 'es'
                        ? "El porcentaje de personas que hacen clic en tu anuncio después de verlo. Un CTR alto suele significar que tu anuncio es muy relevante."
                        : "The percentage of people who click on your ad after seeing it. A high CTR usually means your ad is very relevant."
                },
                {
                    term: language === 'es' ? "CPC (Costo por Clic)" : "CPC (Cost per Click)",
                    definition: language === 'es'
                        ? "Es lo que te cuesta cada vez que alguien hace clic en tu anuncio. El objetivo suele ser bajar este costo manteniendo la calidad."
                        : "What it costs you every time someone clicks on your ad. The goal is usually to lower this cost while maintaining quality."
                },
                {
                    term: language === 'es' ? "D2C (Directo al Consumidor)" : "D2C (Direct-to-Consumer)",
                    definition: language === 'es'
                        ? "Modelo de negocio donde una marca vende directamente al cliente final sin intermediarios (tiendas físicas o distribuidores). Las plataformas de ads son su canal principal de adquisición."
                        : "Business model where a brand sells directly to the end customer without intermediaries (retail stores or distributors). Ad platforms are their main acquisition channel."
                },
                {
                    term: language === 'es' ? "Salud de Campaña" : "Campaign Health",
                    definition: language === 'es'
                        ? "Nuestra métrica que resume si tu configuración de anuncios sigue las mejores prácticas para no desperdiciar dinero."
                        : "Our metric that summarizes whether your ad settings follow best practices to avoid wasting money."
                },
                {
                    term: language === 'es' ? "Carga Emocional" : "Emotional Charge",
                    definition: language === 'es'
                        ? "La intensidad de las emociones que tu pieza visual es capaz de activar en el espectador."
                        : "The intensity of the emotions that your visual piece is capable of activating in the viewer."
                },
                {
                    term: language === 'es' ? "Funnel Architect (Arquitecto de Funnel)" : "Funnel Architect",
                    definition: language === 'es'
                        ? "Módulo exclusivo de INsitu AI que diseña automáticamente un embudo de ventas completo (TOFU, MOFU, BOFU) con mensajes, creativos y canales recomendados para cada etapa, usando IA generativa."
                        : "INsitu AI's exclusive module that automatically designs a complete sales funnel (TOFU, MOFU, BOFU) with messages, creatives, and recommended channels for each stage, using generative AI."
                }
            ]
        },
        {
            category: language === 'es' ? "Contenido en Video" : "Video Content",
            items: [
                {
                    term: language === 'es' ? "Hook (Gancho)" : "Hook (0-3s)",
                    definition: language === 'es'
                        ? "Son los primeros 3 segundos de tu video. Es el momento crítico donde decides si el usuario sigue viendo o hace 'scroll' hacia arriba."
                        : "The first 3 seconds of your video. It's the critical moment where the user decides to keep watching or scroll past."
                },
                {
                    term: language === 'es' ? "Retención" : "Retention",
                    definition: language === 'es'
                        ? "Qué tan efectivo es tu video para mantener a la gente mirando hasta el final. Si la retención cae rápido, tu mensaje principal no llegará."
                        : "How effective your video is at keeping people watching until the end. If retention drops quickly, your main message won't get through."
                },
                {
                    term: language === 'es' ? "Algoritmo de Virilidad" : "Virality Algorithm",
                    definition: language === 'es'
                        ? "Nuestro cálculo de qué tan probable es que tu video sea compartido o favorecido por plataformas como TikTok e Instagram Reels."
                        : "Our calculation of how likely your video is to be shared or favored by platforms like TikTok and Instagram Reels."
                },
                {
                    term: language === 'es' ? "Poder de Detención Visual" : "Thumb-Stopping Power",
                    definition: language === 'es'
                        ? "La capacidad de una imagen o los primeros segundos de un video para detener el 'scroll' infinito del usuario en redes sociales."
                        : "The ability of an image or the first few seconds of a video to stop a user's infinite scroll on social media."
                },
                {
                    term: language === 'es' ? "Tasa de Retención" : "Hold Rate",
                    definition: language === 'es'
                        ? "Mide qué tan bien retiene tu video la atención después del hook inicial. Un hold rate alto significa que el ritmo visual es correcto cada 2-3 segundos."
                        : "Measures how well your video retains attention after the initial hook. A high hold rate means the visual rhythm is correct every 2-3 seconds."
                },
                {
                    term: language === 'es' ? "Safe Zones (Zonas Seguras)" : "Safe Zones",
                    definition: language === 'es'
                        ? "Áreas del video que quedan libres de los elementos de la interfaz de TikTok o Instagram (como el nombre de usuario o botones de like). Es vital poner los textos aquí."
                        : "Video areas that are free from TikTok or Instagram interface elements (like username or like buttons). It's vital to place text here."
                }
            ]
        },
        {
            category: language === 'es' ? "Metodología Antigravity" : "Antigravity Methodology",
            items: [
                {
                    term: language === 'es' ? "Protocolo Veritas" : "Veritas Protocol",
                    definition: language === 'es'
                        ? "Nuestra capa de seguridad ética aplicada por la IA. Verifica que los anuncios no tengan promesas de dinero fácil, comparaciones prohibidas o contenido de baja calidad."
                        : "Our AI-applied ethical security layer. Verifies that ads do not have easy money promises, prohibited comparisons, or low-quality content."
                },
                {
                    term: language === 'es' ? "Scanpath (Ruta Visual)" : "Visual Scanpath",
                    definition: language === 'es'
                        ? "Es el recorrido ideal que hace el ojo humano al ver tu diseño. Optimizamos para que el recorrido sea fluido: de la imagen de gancho al beneficio y luego al CTA."
                        : "The ideal path the human eye takes when viewing your design. We optimize for a fluid path: from the hook image to the benefit and then to the CTA."
                }
            ]
        },
        {
            category: language === 'es' ? "Reportes y Diagnósticos" : "Reports and Diagnostics",
            items: [
                {
                    term: language === 'es' ? "Veredicto Algorítmico" : "Algorithmic Verdict",
                    definition: language === 'es'
                        ? "El resumen final de nuestra IA que predice si tu campaña tendrá éxito basada en cientos de patrones de diseño que sí convierten."
                        : "The final AI summary that predicts if your campaign will be successful based on hundreds of design patterns that actually convert."
                },
                {
                    term: language === 'es' ? "Diagnóstico Estratégico" : "Strategic Diagnosis",
                    definition: language === 'es'
                        ? "Un análisis profundo de los puntos fuertes y débiles de tu pieza, enfocado en cómo mejorar tu posición frente a la competencia."
                        : "An in-depth analysis of your piece's strengths and weaknesses, focused on how to improve your position against the competition."
                },
                {
                    term: language === 'es' ? "Puntos de Mejora [FIX]" : "Improvement Points [FIX]",
                    definition: language === 'es'
                        ? "Marcadores específicos en el mapa de calor que señalan elementos que están fallando visualmente y deben corregirse."
                        : "Specific markers on the heatmap that point out elements that are failing visually and must be corrected."
                },
                {
                    term: language === 'es' ? "Verificación de Cumplimiento" : "Compliance Check",
                    definition: language === 'es'
                        ? "Una revisión automática para asegurar que tu anuncio cumple con las políticas de seguridad y no será rechazado por las plataformas."
                        : "An automatic review to ensure your ad complies with security policies and won't be rejected by platforms."
                },
                {
                    term: language === 'es' ? "Prompt de Mejora" : "Improvement Prompt",
                    definition: language === 'es'
                        ? "Instrucción altamente optimizada y lista para copiar y pegar en IA generativa (como Midjourney o Stable Diffusion) para crear una variante visualmente superior del anuncio, corrigiendo sus puntos débiles."
                        : "Highly optimized prompt ready to copy and paste into generative AI (like Midjourney or Stable Diffusion) to create a visually superior variant of the ad, fixing its weak points."
                }
            ]
        },
        {
            category: language === 'es' ? "IA & Plataforma INsitu" : "AI & INsitu Platform",
            items: [
                {
                    term: language === 'es' ? "Search Grounding (Anclaje de Búsqueda)" : "Search Grounding",
                    definition: language === 'es'
                        ? "Tecnología de Google que conecta a Gemini con búsquedas en tiempo real. Permite que la IA base sus respuestas en datos actuales y verificables de la web, en lugar de solo su conocimiento de entrenamiento."
                        : "Google technology that connects Gemini to real-time web searches. It allows the AI to base its answers on current, verifiable web data rather than just its training knowledge."
                },
                {
                    term: language === 'es' ? "Deep Thinking Mode (Razonamiento Profundo)" : "Deep Thinking Mode",
                    definition: language === 'es'
                        ? "Modo de análisis avanzado de Gemini donde la IA 'piensa en voz alta' antes de responder, evaluando múltiples perspectivas y descomponiendo problemas complejos paso a paso. Ideal para análisis estratégicos."
                        : "Gemini's advanced analysis mode where the AI 'thinks out loud' before answering, evaluating multiple perspectives and breaking down complex problems step by step. Ideal for strategic analysis."
                },
                {
                    term: language === 'es' ? "AI Tokens (Tokens de IA)" : "AI Tokens",
                    definition: language === 'es'
                        ? "Unidad de crédito de uso del sistema. Cada análisis de IA consume una cantidad de tokens según su complejidad. Tu plan de suscripción incluye un cupo mensual de tokens que se renueva automáticamente."
                        : "The system's unit of usage credit. Each AI analysis consumes a number of tokens based on its complexity. Your subscription plan includes a monthly token quota that renews automatically."
                },
                {
                    term: language === 'es' ? "Research Hub" : "Research Hub",
                    definition: language === 'es'
                        ? "Módulo de INsitu AI para investigación de mercado impulsada por IA. Combina Google Search Grounding (datos en tiempo real) y Deep Thinking Mode (razonamiento estratégico profundo) para generar reportes con fuentes verificadas."
                        : "INsitu AI's market research module powered by AI. Combines Google Search Grounding (real-time data) and Deep Thinking Mode (deep strategic reasoning) to generate reports with verified sources."
                },
                {
                    term: language === 'es' ? "AI Feedback Loop (Bucle de Aprendizaje)" : "AI Feedback Loop",
                    definition: language === 'es'
                        ? "Sistema que aprende de las correcciones y preferencias del usuario. Cada calificación (CSAT) que das a un análisis retroalimenta el sistema, ajustando las respuestas futuras de la IA a tu contexto específico."
                        : "System that learns from user corrections and preferences. Each rating (CSAT) you give to an analysis feeds back into the system, adjusting future AI responses to your specific context."
                },
                {
                    term: language === 'es' ? "Protocolo Anti-Alucinación" : "Anti-Hallucination Protocol",
                    definition: language === 'es'
                        ? "Conjunto de reglas que impiden a la IA inventar datos, métricas o estadísticas. Si no hay datos reales disponibles de APIs o Search Grounding, la IA debe indicarlo explícitamente en lugar de estimar."
                        : "A set of rules that prevent the AI from fabricating data, metrics, or statistics. If real data from APIs or Search Grounding is unavailable, the AI must explicitly state this instead of estimating."
                }
            ]
        }
    ];

    const filteredTerms = allTerms.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.definition.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden relative shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex flex-col space-y-6 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {language === 'es' ? "Glosario de Términos" : "Glossary of Terms"}
                            </h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">
                                {language === 'es' ? "Entiende la ciencia detrás de tus resultados" : "Understand the science behind your results"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-400 hover:text-slate-900"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={language === 'es' ? "Buscar un término o métrica..." : "Search a term or metric..."}
                            className="block w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 font-bold focus:border-[#ff477b] focus:ring-0 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-12">
                    <AnimatePresence mode="popLayout">
                        {filteredTerms.length > 0 ? (
                            filteredTerms.map((cat, idx) => (
                                <motion.section
                                    key={cat.category}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-[11px] font-black text-[#ff477b] uppercase tracking-[0.2em] border-b border-pink-100 pb-2">
                                        {cat.category}
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {cat.items.map((item, i) => (
                                            <div key={item.term} className="space-y-2 group">
                                                <h4 className="text-lg font-black text-slate-900 group-hover:text-[#ff477b] transition-colors">
                                                    {item.term}
                                                </h4>
                                                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                                    {item.definition}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.section>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                                    {language === 'es' ? "No se encontraron términos" : "No terms found"}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'es' ? "INsitu AI • Inteligencia de Neuro-Marketing v3.0" : "INsitu AI • Neuro-Marketing Intelligence v3.0"}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default GlossaryView;
