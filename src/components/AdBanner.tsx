import React from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { SiteCustomization, resolveDriveUrl } from '../types';

interface AdBannerProps {
  settings: SiteCustomization;
}

export default function AdBanner({ settings }: AdBannerProps) {
  // Respect the enable/disable toggle
  if (!settings.adBannerEnabled) {
    return null;
  }

  const defaultBg = '#be123c'; // fallback rose-700
  const bgColor = settings.adBannerBgColor || defaultBg;
  
  // Custom text color based on background tone is automatic because we use light-colored high contrast text or dark-colored backing overlays
  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6">
      <div 
        id="home-ad-banner"
        className="relative overflow-hidden rounded-2xl shadow-sm border border-slate-100/20 transition-all duration-300 hover:shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        {/* Decorative Grid Accents */}
        <div className="absolute inset-0 bg-linear-to-r from-black/50 via-black/20 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-10"></div>
        
        <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-5 p-5 md:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Mega icon */}
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/25 shadow-sm text-yellow-300 shrink-0 self-center hidden sm:flex items-center justify-center animate-pulse">
              <Megaphone className="h-6 w-6" />
            </div>
            
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center space-x-1 bg-yellow-400 text-slate-900 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase select-none mb-1">
                <span>जाहिरात</span>
              </div>
              <h3 className="text-sm md:text-base font-bold leading-relaxed text-slate-50 tracking-wide font-sans">
                {settings.adBannerText || 'आमच्यासोबत जाहिरात करून तुमचा व्यवसाय लाखो वाचकांपर्यंत पोहचवा!'}
              </h3>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto shrink-0">
            {/* Thumbnail preview if exists */}
            {settings.adBannerImageUrl && (
              <div className="w-full sm:w-[115px] aspect-[1290/720] rounded-lg overflow-hidden bg-black/20 border border-white/10 shrink-0">
                <img 
                  src={resolveDriveUrl(settings.adBannerImageUrl)} 
                  alt="Advertise"
                  className="w-full h-full max-w-[1290px] max-h-[720px] object-cover aspect-[1290/720]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <a
              href={settings.adBannerLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 w-full sm:w-auto hover:scale-103 whitespace-nowrap cursor-pointer active:scale-97 border border-slate-200"
            >
              <span>अधिक माहिती</span>
              <ExternalLink className="h-4 w-4 text-slate-600" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
