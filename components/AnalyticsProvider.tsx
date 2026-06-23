import React, { useEffect } from 'react';
import { settingsService } from '../services/auth/settingsService';
import { martechService } from '../services/martechService';

/**
 * AnalyticsProvider
 * 
 * Conditionally injects tracking scripts (GTM, Meta Pixel, TikTok, GA4, etc.)
 * based on the admin configuration (martechConfig).
 */
export const AnalyticsProvider: React.FC = () => {
  useEffect(() => {
    const initAnalytics = async () => {
      // Force fetch the latest settings from the server on load
      const settings = await settingsService.fetchSettings();
      const config = settings?.martechConfig;

      if (!config || !config.enabled) {
        return; // Analytics disabled globally
      }

      // 1. Google Tag Manager
      if (config.gtmId && !document.getElementById('gtm-script')) {
        const gtmScript = document.createElement('script');
        gtmScript.id = 'gtm-script';
        gtmScript.textContent = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${config.gtmId}');
        `;
        document.head.appendChild(gtmScript);
      }

      // 2. Meta Pixel
      if (config.metaPixelId && !document.getElementById('meta-pixel-script')) {
        const metaScript = document.createElement('script');
        metaScript.id = 'meta-pixel-script';
        metaScript.textContent = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${config.metaPixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(metaScript);
      }

      // 3. TikTok Pixel
      if (config.tiktokPixelId && !document.getElementById('tiktok-pixel-script')) {
        const tiktokScript = document.createElement('script');
        tiktokScript.id = 'tiktok-pixel-script';
        tiktokScript.textContent = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('${config.tiktokPixelId}');
            ttq.page();
          }(window, document, 'ttq');
        `;
        document.head.appendChild(tiktokScript);
      }

      // 4. GA4 (Google Analytics 4)
      if (config.ga4Id && !document.getElementById('ga4-script')) {
        const ga4Src = document.createElement('script');
        ga4Src.id = 'ga4-script';
        ga4Src.async = true;
        ga4Src.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`;
        document.head.appendChild(ga4Src);

        const ga4Init = document.createElement('script');
        ga4Init.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.ga4Id}');
        `;
        document.head.appendChild(ga4Init);
      }

      // 5. Google Ads
      if (config.googleAdsId && !document.getElementById('gads-script')) {
        // Only load if GA4 hasn't already loaded gtag.js, otherwise just config it
        if (!document.getElementById('ga4-script')) {
            const gadsSrc = document.createElement('script');
            gadsSrc.id = 'gads-script';
            gadsSrc.async = true;
            gadsSrc.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAdsId}`;
            document.head.appendChild(gadsSrc);
        }

        const gadsInit = document.createElement('script');
        gadsInit.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.googleAdsId}');
        `;
        document.head.appendChild(gadsInit);
      }

    };

    const deferInit = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => initAnalytics());
      } else {
        setTimeout(initAnalytics, 2000);
      }
    };

    deferInit();
  }, []);

  return null; // This component does not render anything visible
};
