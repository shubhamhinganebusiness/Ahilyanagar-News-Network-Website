import React, { useState, useEffect } from 'react';
import { resolveDriveUrl } from '../types';

interface ImageLivePreviewProps {
  url: string;
  label?: string;
  type?: 'rect' | 'circle';
  fallbackText?: string;
}

export default function ImageLivePreview({ url, label, type = 'rect', fallbackText = 'चित्र' }: ImageLivePreviewProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (url && url.trim()) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [url]);

  if (!url || !url.trim()) return null;

  const resolved = resolveDriveUrl(url);

  return (
    <div className="mt-2 select-none animate-fade-in space-y-1">
      {label && <span className="text-[10px] text-slate-500 font-bold block">{label}</span>}
      <div 
        className={`relative overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center transition-all shadow-xs group ${
          type === 'circle' ? 'w-16 h-16 rounded-full' : 'aspect-video w-full max-w-[280px] rounded-xl'
        }`}
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-slate-50/75 flex items-center justify-center z-10">
            <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 bg-rose-50 flex flex-col items-center justify-center text-center p-2">
            <span className="text-rose-500 text-[10px] font-bold">लोड करण्यात अडचण</span>
            <span className="text-[9px] text-slate-400">अयोग्य दुवा (Invalid Link)</span>
          </div>
        ) : (
          <img
            src={resolved}
            alt="पूर्वदृश्य"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute bottom-1 right-1 bg-slate-900/85 text-white font-extrabold text-[7px] px-1.5 py-0.5 rounded-xs uppercase tracking-wider">
          LIVE PREVIEW
        </div>
      </div>
    </div>
  );
}
