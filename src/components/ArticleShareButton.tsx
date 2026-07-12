import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  Check, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Send,
  MessageCircle,
  X
} from 'lucide-react';
import { News } from '../types';

interface ArticleShareButtonProps {
  article: News;
  siteName: string;
  onShareSuccess?: () => void;
  addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  className?: string;
  variant?: 'pill' | 'circular' | 'full';
}

export const ArticleShareButton: React.FC<ArticleShareButtonProps> = ({
  article,
  siteName,
  onShareSuccess,
  addToast,
  className = '',
  variant = 'circular'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanDesc = article.description || article.content.replace(/<[^>]*>/g, '').slice(0, 150);
  const shareTitle = article.title;
  const shareUrl = window.location.href;
  
  // Format for WhatsApp & general social paste to optimize crawler scraping
  const formattedShareText = `*${article.title}*\n🔗 बातमी वाचण्यासाठी येथे क्लिक करा: ${shareUrl}\n\n_${cleanDesc}..._`;

  // Detect and handle outside clicks for the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `*${shareTitle}*\n\n`,
          url: shareUrl,
        });
        if (onShareSuccess) onShareSuccess();
        addToast('बातमी यशस्वीरित्या शेअर केली!', 'success');
        return true;
      } catch (err) {
        // Handle abort gracefully (user cancelled the sheet)
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Web Share failed:', err);
          return false;
        }
        return true; // Aborted is still handled
      }
    }
    return false;
  };

  const handleClick = async () => {
    // If Web Share API is available, try invoking it first
    if (navigator.share) {
      const success = await handleNativeShare();
      if (success) return;
    }
    // Otherwise open our elegant custom share dropdown/fallback options
    setIsOpen(!isOpen);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedShareText);
      setCopied(true);
      if (onShareSuccess) onShareSuccess();
      addToast('मेटाडेटा-अनुकूल बातमी लिंक यशस्वीरित्या कॉपी केली!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      addToast('लिंक कॉपी करता आली नाही.', 'error');
    }
  };

  const triggerSocialShare = (platform: string) => {
    let url = '';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedFullText = encodeURIComponent(formattedShareText);

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedFullText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      default:
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      if (onShareSuccess) onShareSuccess();
      addToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} शेअर सुरू केले.`, 'info');
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Primary Trigger Button */}
      {variant === 'circular' && (
        <button
          onClick={handleClick}
          className={`p-3 rounded-full border transition-all flex items-center justify-center relative cursor-pointer shadow-sm hover:scale-105 duration-300 ${
            copied 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
              : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/20'
          } ${className}`}
          title="शेअर करा"
          id={`share-btn-${article._id}`}
        >
          {copied ? <Check className="h-5 w-5 text-emerald-600 animate-bounce" /> : <Share2 className="h-5 w-5" />}
        </button>
      )}

      {variant === 'pill' && (
        <button
          onClick={handleClick}
          className={`flex items-center space-x-1.5 bg-white border text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer hover:scale-[1.02] duration-300 ${
            copied 
              ? 'border-emerald-300 text-emerald-600 bg-emerald-50' 
              : 'border-slate-200 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/20 text-slate-700'
          } ${className}`}
          id={`share-pill-${article._id}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
          <span>{copied ? 'कॉपी झाले!' : 'शेअर करा'}</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-6 py-3.5 rounded-2xl transition shadow-md hover:shadow-lg hover:scale-[1.01] duration-300 cursor-pointer ${className}`}
          id={`share-full-${article._id}`}
        >
          {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
          <span>{copied ? 'लिंक कॉपी झाली!' : 'शेअर करा (WhatsApp & Social)'}</span>
        </button>
      )}

      {/* Popover/Dropdown Option List for Fallback sharing */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-72 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
            style={{ originX: 0.5 }}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-rose-500" />
                <span>बातमी शेअर करा</span>
              </span>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Platform Selection */}
            <div className="p-2.5 space-y-1 bg-white">
              <button
                onClick={() => { triggerSocialShare('whatsapp'); setIsOpen(false); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-700 transition font-medium text-sm cursor-pointer"
              >
                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                  <MessageCircle className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">व्हॉट्सॲपवर पाठवा</div>
                  <div className="text-[10px] text-slate-400">WhatsApp शेअर</div>
                </div>
              </button>

              <button
                onClick={() => { triggerSocialShare('facebook'); setIsOpen(false); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 transition font-medium text-sm cursor-pointer"
              >
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                  <Facebook className="h-4 w-4 fill-blue-600 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">फेसबुकवर शेअर करा</div>
                  <div className="text-[10px] text-slate-400">Facebook Timeline</div>
                </div>
              </button>

              <button
                onClick={() => { triggerSocialShare('twitter'); setIsOpen(false); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition font-medium text-sm cursor-pointer"
              >
                <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                  <Twitter className="h-4 w-4 fill-slate-800 text-slate-800" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">X / ट्विटरवर ट्विट करा</div>
                  <div className="text-[10px] text-slate-400">X Tweet</div>
                </div>
              </button>

              <button
                onClick={() => { triggerSocialShare('telegram'); setIsOpen(false); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 transition font-medium text-sm cursor-pointer"
              >
                <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg">
                  <Send className="h-4 w-4 fill-sky-600 text-sky-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">टेलिग्राम चॅनेलवर पाठवा</div>
                  <div className="text-[10px] text-slate-400">Telegram Channel</div>
                </div>
              </button>

              <div className="border-t border-slate-100 my-2 pt-1.5">
                <button
                  onClick={() => { copyToClipboard(); setIsOpen(false); }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-rose-50/50 hover:bg-rose-50 text-rose-700 transition font-medium text-sm cursor-pointer border border-rose-100/40"
                >
                  <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                    {copied ? <Check className="h-4 w-4 text-rose-600" /> : <Copy className="h-4 w-4" />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold leading-tight text-rose-800">बातमी लिंक कॉपी करा</div>
                    <div className="text-[10px] text-rose-500/70">मेटाडेटा-अनुकूल फॉर्मेटसह कॉपी करा</div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
