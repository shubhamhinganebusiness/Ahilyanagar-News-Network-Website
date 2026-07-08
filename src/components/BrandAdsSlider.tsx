import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink, Megaphone } from 'lucide-react';
import { SiteCustomization } from '../types';

interface BrandAdsSliderProps {
  settings: SiteCustomization;
}

export default function BrandAdsSlider({ settings }: BrandAdsSliderProps) {
  const isEnabled = settings.brandAdsEnabled !== false; // defaults to true
  const slides = settings.brandAdsSlides || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const intervalSeconds = settings.brandAdsInterval || 5;

  const startAutoplay = () => {
    stopAutoplay();
    if (isPlaying && slides.length > 1) {
      autoplayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, intervalSeconds * 1000); // Auto change slide based on customizable interval
    }
  };

  const stopAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  useEffect(() => {
    if (!isEnabled || slides.length === 0) {
      return;
    }
    startAutoplay();
    return () => stopAutoplay();
  }, [isPlaying, currentIndex, slides.length, isEnabled]);

  if (!isEnabled || slides.length === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const currentSlide = slides[currentIndex];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-8">
      {/* Slider Outercard Frame */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-xs p-4 sm:p-5 space-y-3.5">
        
        {/* Ad Title Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 border border-amber-500/15 shrink-0">
              <Megaphone className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-sans">
                {settings.brandAdsTitle || "आमच्या प्रायोजक भागीदार आणि जाहिराती"}
              </h3>
              <p className="text-[10px] text-slate-400">
                {settings.brandAdsSubtitle || "विशेष औद्योगिक व प्रायोजित व्यावसायिक संदेश"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
              title={isPlaying ? 'स्वयंचलित स्लाइड थांबवा' : 'स्वयंचलित स्लाइड चालू करा'}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold hidden sm:inline">थांबवा</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold hidden sm:inline">प्ले</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carousel Viewport Container */}
        <div 
          className="relative aspect-[1290/720] max-w-[1290px] max-h-[720px] w-full mx-auto rounded-xl overflow-hidden group bg-slate-900 shadow-md border border-slate-950/20"
          onMouseEnter={stopAutoplay}
          onMouseLeave={startAutoplay}
        >
          {/* Animated Slide Banners */}
          <a
            href={currentSlide.linkUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full relative"
          >
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title || 'Brand Advertisement'}
              className="w-full h-full max-w-[1290px] max-h-[720px] aspect-[1290/720] object-cover transition-opacity duration-500 ease-in-out"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';
              }}
              referrerPolicy="no-referrer"
            />
            
            {/* Soft Ambient Contrast Vignette overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 sm:p-7 z-10 flex flex-col justify-end">
              <div className="max-w-3xl space-y-1.5">
                <span className="inline-flex bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                  इतर जाहिरात (SPONSOR)
                </span>
                <h4 className="text-sm sm:text-lg md:text-xl font-black text-white leading-snug drop-shadow-md">
                  {currentSlide.title || 'आमच्या सोबत जाहिरात करून व्यवसाय वाढवा'}
                </h4>
              </div>
            </div>

            {/* External link top right badge */}
            {currentSlide.linkUrl && currentSlide.linkUrl !== '#' && (
              <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 transition-all hover:bg-slate-900 shadow-sm">
                <span>भेट द्या</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
              </div>
            )}
          </a>

          {/* Dynamic Prev Button */}
          {slides.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-20 outline-none border border-white/5 active:scale-95"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Dynamic Next Button */}
          {slides.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-20 outline-none border border-white/5 active:scale-95"
              aria-label="Next Slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Carousel Dot Indicators */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex space-x-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleDotClick(idx, e)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? 'w-5 bg-amber-500' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
