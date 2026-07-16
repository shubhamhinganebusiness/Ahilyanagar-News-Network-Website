import React, { useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';

interface AdSenseUnitProps {
  slotType: 'header' | 'sidebar' | 'paragraph';
  adCode?: string;
  clientId?: string;
}

const AdSenseUnit: React.FC<AdSenseUnitProps> = ({ slotType, adCode, clientId }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adCode || !containerRef.current) return;

    // Safely inject and execute scripts from the pasted AdSense/HTML code
    const container = containerRef.current;
    container.innerHTML = adCode;

    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach((elem) => {
      const oldScript = elem as HTMLScriptElement;
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Run adsbygoogle push if needed
    try {
      if (adCode.includes('adsbygoogle') && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (e) {
      console.warn('AdSense push error:', e);
    }
  }, [adCode]);

  // Inject Auto Ads code globally in document head if clientId exists and is changed
  useEffect(() => {
    if (slotType === 'header' && clientId) {
      const scriptId = 'adsense-auto-ads-script';
      let scriptEl = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.async = true;
        scriptEl.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
        scriptEl.crossOrigin = 'anonymous';
        document.head.appendChild(scriptEl);
      }
    }
  }, [clientId, slotType]);

  const placeholderLabels = {
    header: {
      title: 'गूगल ॲडसेन्स हेडर जाहिरात (Google AdSense Header Unit)',
      size: '970 × 90 किंवा रेस्पॉन्सिव्ह बॅनर',
      style: 'w-full min-h-[90px] md:min-h-[100px] flex items-center justify-center p-4'
    },
    sidebar: {
      title: 'गूगल ॲडसेन्स साईडबार जाहिरात (Google AdSense Sidebar Unit)',
      size: '300 × 250 किंवा रेस्पॉन्सिव्ह चौकोन',
      style: 'w-full min-h-[250px] flex flex-col items-center justify-center p-6'
    },
    paragraph: {
      title: 'बातमीच्या परिच्छेदांच्या मध्यभागी जाहिरात (Google AdSense Content-In-Article)',
      size: 'रेस्पॉन्सिव्ह इन-आर्टिकल युनिट',
      style: 'w-full min-h-[120px] flex items-center justify-center p-5 my-6'
    }
  };

  const currentLabel = placeholderLabels[slotType];

  if (adCode && adCode.trim() !== '') {
    return (
      <div className="w-full overflow-hidden flex justify-center my-4">
        <div ref={containerRef} className="w-full flex justify-center" />
      </div>
    );
  }

  // Display beautiful developer-friendly ad-space placeholders when not configured in admin panel
  return (
    <div className="w-full my-4 select-none">
      <div className={`relative overflow-hidden rounded-2xl bg-slate-50/50 border border-dashed border-slate-200/90 text-slate-400/90 ${currentLabel.style} transition-all duration-300 hover:border-rose-350 hover:bg-rose-50/10`}>
        {/* Background mesh glow */}
        <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(244,63,94,0.02)_0%,transparent_70%) pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="flex items-center space-x-1.5">
            <Megaphone className="h-4 w-4 text-slate-400 shrink-0 animate-bounce" />
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-sans">जाहिरात जागा</span>
          </div>
          <p className="text-[11px] font-black text-slate-800 leading-normal font-sans">
            {currentLabel.title}
          </p>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {currentLabel.size}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 font-medium font-sans">
            (ॲडमिन डॅशबोर्डवरील "साइट लोगो & जाहिराती" मधून ॲडसेन्स कोड पेस्ट करा)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdSenseUnit;
