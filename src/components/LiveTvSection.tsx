import React from 'react';
import { Tv, AlertTriangle, MonitorPlay } from 'lucide-react';
import { SiteCustomization } from '../types';

interface LiveTvSectionProps {
  settings: SiteCustomization;
}

// Robust YouTube URL Parser
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    // Match regular expressions for normal watch, embebed, short, live and short links
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|live\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  } catch (e) {
    console.error('YouTube ID parsing error:', e);
  }
  return null;
}

export default function LiveTvSection({ settings }: LiveTvSectionProps) {
  const videoUrl = settings.liveTvUrl || '';
  const parsedId = getYouTubeId(videoUrl);

  return (
    <div id="home-live-tv" className="w-full max-w-7xl mx-auto px-4 mt-6">
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-850 shadow-md p-5 sm:p-6 space-y-4">
        
        {/* Header containing pulsing LIVE dot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>लाइव्ह टीव्ही रिपोर्ट</span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">महाराष्ट्रातील आणि देशातील महत्वाच्या घडामोडींचे थेट प्रक्षेपण</p>
            </div>
          </div>
          
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 self-start sm:self-center">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>LIVE STREAM</span>
          </div>
        </div>

        {/* Embedded Player Section */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-inner">
          {parsedId ? (
            <iframe
              src={`https://www.youtube.com/embed/${parsedId}?autoplay=0&rel=0`}
              title="Live TV Broadcast"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-xl"
            ></iframe>
          ) : (
            <div className="p-8 text-center max-w-md mx-auto space-y-3.5">
              <div className="bg-amber-500/10 text-amber-500 p-4 rounded-full border border-amber-500/20 inline-flex items-center justify-center animate-bounce">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-200">थेट प्रक्षेपण (Live TV) चॅनेल उपलब्ध नाही</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {videoUrl ? (
                    <>
                      प्रविष्ट केलेली लिंक <code className="text-amber-400 font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded">{videoUrl}</code> वैध यूट्यूब व्हिडिओ किंवा लाईव्ह स्ट्रीम आयडी दर्शवत नाही. कृपया ॲडमीन पॅनल मध्ये जाऊन दुरुस्त करा.
                    </>
                  ) : (
                    'ॲडमिन पॅनेलमध्ये यूट्यूब लाईव्ह व्हिडिओ लिंक संपादित करून येथे दाखवा.'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
