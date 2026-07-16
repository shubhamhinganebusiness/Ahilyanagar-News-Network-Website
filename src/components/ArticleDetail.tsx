import React, { useEffect, useState, useRef } from 'react';
import { safeLocalStorage as localStorage } from '../utils/safeStorage';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Eye, 
  Share2, 
  Printer, 
  ThumbsUp, 
  Check, 
  Facebook, 
  Twitter, 
  Linkedin, 
  AlertCircle,
  Clock,
  Bookmark,
  ImageOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Instagram,
  Mail,
  X,
  Play,
  Maximize2,
  Images,
  Tag,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Pause,
  Type,
  Flame,
  MessageSquare,
  Send,
  Sparkles,
  Heart,
  MessageCircle,
  Phone
} from 'lucide-react';
import { News, SiteCustomization, AuthUser, resolveDriveUrl } from '../types';
import AuthorProfile from './AuthorProfile';
import { ArticleShareButton } from './ArticleShareButton';
import AdSenseUnit from './AdSenseUnit';

interface ArticleDetailProps {
  articleId: string;
  onBack: () => void;
  onSelectArticle: (id: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  channelName?: string;
  siteSettings?: SiteCustomization;
  authUser?: AuthUser | null;
}

export default function ArticleDetail({ articleId, onBack, onSelectArticle, addToast, channelName, siteSettings, authUser }: ArticleDetailProps) {
  const [article, setArticle] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(12);
  const [shareCount, setShareCount] = useState(25);
  const [relatedArticles, setRelatedArticles] = useState<News[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);

  // Reader customization state managers
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl' | '2xl'>('lg');
  const [fontStyle, setFontStyle] = useState<'font-sans' | 'font-serif'>('font-sans');
  const [readingTheme, setReadingTheme] = useState<'white' | 'cream' | 'dark'>('white');

  // Text to Speech (TTS) state managers
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Helper: Strip HTML and clean text for natural speech flow
  const cleanHtmlText = (html: string): string => {
    if (!html) return '';
    let text = html.replace(/<[^>]*>/g, ' ');
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return text.replace(/\s+/g, ' ').trim();
  };

  // Helper: Find best Marathi or Hindi voice
  const getMarathiVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    const marathiVoice = voices.find(v => v.lang.toLowerCase().startsWith('mr'));
    if (marathiVoice) return marathiVoice;
    const hindiVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
    if (hindiVoice) return hindiVoice;
    return null;
  };

  // TTS Voice Initialization & Unmount cleanup hook
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Keep Indian and common English fallback voices
      const filtered = voices.filter(v => 
        v.lang.toLowerCase().startsWith('mr') || 
        v.lang.toLowerCase().startsWith('hi') || 
        v.lang.toLowerCase().startsWith('en')
      );
      setAvailableVoices(filtered);
      
      const best = getMarathiVoice(voices);
      if (best) {
        setSelectedVoiceName(best.name);
      } else if (filtered.length > 0) {
        setSelectedVoiceName(filtered[0].name);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      }
    };
  }, [articleId]);

  // Refs to manage sentence-by-sentence reading queue
  const currentChunkIndexRef = useRef<number>(0);
  const chunksRef = useRef<string[]>([]);

  // Split clean text into manageable sentences (under 150 chars per chunk for maximum Web Speech API stability)
  const splitIntoChunks = (text: string): string[] => {
    if (!text) return [];
    // Split by Marathi/Hindi fullstop (।), standard fullstop (.), question mark (?), exclamation mark (!), semicolons, or newlines
    const rawChunks = text.split(/([।\.!\?\n\r]+)/);
    const result: string[] = [];
    let current = '';
    
    for (let i = 0; i < rawChunks.length; i++) {
      const part = rawChunks[i];
      if (!part) continue;
      
      // If it is a delimiter, attach it to the current sentence
      if (/^[।\.!\?\n\r]+$/.test(part)) {
        current += part;
        const trimmed = current.trim();
        if (trimmed) {
          result.push(trimmed);
        }
        current = '';
      } else {
        if (current.trim()) {
          result.push(current.trim());
        }
        current = part;
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }

    // Ensure all chunks are reasonably sized (under 150 characters) to prevent browser synthesis crashes
    const finalChunks: string[] = [];
    for (const chunk of result) {
      const cleanChunk = chunk.replace(/\s+/g, ' ').trim();
      if (!cleanChunk) continue;

      if (cleanChunk.length > 150) {
        // split by space or comma
        const words = cleanChunk.split(' ');
        let temp = '';
        for (const word of words) {
          if ((temp + ' ' + word).length > 150) {
            if (temp.trim()) finalChunks.push(temp.trim());
            temp = word;
          } else {
            temp = temp ? temp + ' ' + word : word;
          }
        }
        if (temp.trim()) finalChunks.push(temp.trim());
      } else {
        finalChunks.push(cleanChunk);
      }
    }

    return finalChunks;
  };

  const speakCurrentChunk = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Check if we reached the end of the queue or if queue was cleared
    if (currentChunkIndexRef.current >= chunksRef.current.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      activeUtteranceRef.current = null;
      addToast('बातमीचे वाचन पूर्ण झाले.', 'success');
      return;
    }

    const chunkText = chunksRef.current[currentChunkIndexRef.current];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    activeUtteranceRef.current = utterance; // Keep alive in ref to avoid garbage collection

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === selectedVoiceName) || getMarathiVoice(voices);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'mr-IN'; // Default to Marathi
    }

    utterance.rate = speechRate;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      // If activeUtteranceRef is cleared, it means we stopped/reset speaking
      if (!activeUtteranceRef.current) return;
      
      currentChunkIndexRef.current++;
      speakCurrentChunk();
    };

    utterance.onerror = (e) => {
      // Ignored interrupted errors as they are part of regular stop/cancel flow
      if (e.error !== 'interrupted') {
        console.warn('SpeechSynthesis chunk error, skipping to next chunk:', e.error);
        currentChunkIndexRef.current++;
        speakCurrentChunk();
      } else {
        activeUtteranceRef.current = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStartSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !article) return;

    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      addToast('वाचन पुन्हा सुरू केले.', 'info');
      return;
    }

    // Fully resume any stalled states before canceling to prevent browser Speech Lock-up
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const titleText = article.title;
    const authorText = article.author ? `लेखक: ${article.author}.` : '';
    const mainContentText = cleanHtmlText(article.content);
    
    const textToSpeak = `${titleText}. ${authorText}. ${mainContentText}`;
    chunksRef.current = splitIntoChunks(textToSpeak);
    currentChunkIndexRef.current = 0;

    if (chunksRef.current.length === 0) {
      addToast('वाचण्यासाठी कोणताही मजकूर उपलब्ध नाही.', 'error');
      return;
    }

    speakCurrentChunk();
    addToast('बातमीचे वाचन सुरू केले.', 'info');
  };

  const handlePauseSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      addToast('वाचन थांबवले.', 'info');
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    activeUtteranceRef.current = null; // Unregister before cancel to prevent onend recursion
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    addToast('वाचन बंद केले.', 'info');
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    if (isSpeaking) {
      // Seamlessly restart speaking from the current chunk with the new speed
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      activeUtteranceRef.current = null;
      window.speechSynthesis.cancel();
      setTimeout(() => {
        speakCurrentChunk();
      }, 100);
    }
  };
  
  // Reading scroll progress tracker
  const [scrollProgress, setScrollProgress] = useState(0);

  // Comments wall interactive state managers
  const [comments, setComments] = useState<{ id: string; author: string; text: string; date: string; likes: number; likedByMe?: boolean }[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Social individual button checkmarks states
  const [shareTwitterCopied, setShareTwitterCopied] = useState(false);
  const [shareFacebookCopied, setShareFacebookCopied] = useState(false);
  const [shareWhatsAppCopied, setShareWhatsAppCopied] = useState(false);
  const [shareLinkedInCopied, setShareLinkedInCopied] = useState(false);
  const [printTriggered, setPrintTriggered] = useState(false);

  // Read Later local persistence
  const [isSavedForLater, setIsSavedForLater] = useState(false);

  // Main Image States
  const [isMainImageLoading, setIsMainImageLoading] = useState(true);
  const [mainImageError, setMainImageError] = useState(false);

  // Zoom / Lightbox States
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState('');
  const [zoomScale, setZoomScale] = useState(1.5);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isZoomedImageLoading, setIsZoomedImageLoading] = useState(true);

  // Pinch-to-zoom Touch States
  const [startTouchDist, setStartTouchDist] = useState(0);
  const [startZoomScale, setStartZoomScale] = useState(1.5);

  // Video States
  const [videoURLInput, setVideoURLInput] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showCustomVideoField, setShowCustomVideoField] = useState(false);

  // Related Articles Carousel Ref
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  const scrollRelated = (direction: 'left' | 'right') => {
    if (relatedScrollRef.current) {
      const cardWidth = 300; // Expected approximate width of related article cards
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
      relatedScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Fetch updated article which also increments views counter in backend
  useEffect(() => {
    setIsLoading(true);
    // Reset image and video states
    setIsMainImageLoading(true);
    setMainImageError(false);
    setIsVideoPlaying(false);
    setShowCustomVideoField(false);

    const tryDirectFirestore = () => {
      import('../utils/firebaseClient')
        .then(({ getDirectNewsById, getDirectNews, setClientOnlyMode }) => {
          setClientOnlyMode(true);
          return Promise.all([
            getDirectNewsById(articleId),
            getDirectNews()
          ]);
        })
        .then(([data, allArticles]) => {
          setArticle(data);
          setIsLoading(false);
          setVideoURLInput(data.videoURL || '');
          // Seed standard random like count based on views
          setLikesCount(Math.max(5, Math.floor((data.views || 0) * 0.4)));
          setShareCount(Math.max(8, Math.floor((data.views || 0) * 0.25)));

          // Filter related articles from same category
          const filtered = allArticles
            .filter((item) => item._id !== data._id && item.category === data.category)
            .slice(0, 4);
          setRelatedArticles(filtered);
        })
        .catch((err) => {
          console.error('Direct Firestore fetch article failed:', err);
          setIsLoading(false);
          addToast('बातमी लोड करण्यात अडचण आली.', 'error');
          onBack();
        });
    };

    import('../utils/firebaseClient')
      .then(({ isClientOnlyMode }) => {
        if (isClientOnlyMode()) {
          tryDirectFirestore();
          return;
        }

        fetch(`/api/news/${articleId}`)
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'बातमी मिळवण्यात त्रुटी आली.');
            }
            return res.json();
          })
          .then((data: News) => {
            setArticle(data);
            setIsLoading(false);
            setVideoURLInput(data.videoURL || '');
            // Seed standard random like count based on views
            setLikesCount(Math.max(5, Math.floor((data.views || 0) * 0.4)));
            setShareCount(Math.max(8, Math.floor((data.views || 0) * 0.25)));

            // Load Related Articles from same category via API - fetch and display exactly 3-4 articles
            setIsRelatedLoading(true);
            fetch(`/api/news?category=${encodeURIComponent(data.category)}`)
              .then((r) => r.json())
              .then((list: News[]) => {
                const filtered = list.filter((item) => item._id !== data._id).slice(0, 4);
                setRelatedArticles(filtered);
                setIsRelatedLoading(false);
              })
              .catch((err) => {
                console.error(err);
                setIsRelatedLoading(false);
              });
          })
          .catch((err) => {
            console.warn('API fetch article failed, falling back to direct Firestore:', err);
            tryDirectFirestore();
          });
      })
      .catch((err) => {
        console.error('Failed to load firebaseClient module:', err);
        setIsLoading(false);
        addToast('बातमी लोड करण्यात अडचण आली.', 'error');
        onBack();
      });
  }, [articleId]);

  // Simulate active real-time updates of shares to provide social proof of a popular article
  useEffect(() => {
    if (!article) return;
    const interval = setInterval(() => {
      // 35% chance to increment share counter by 1 every 15 seconds
      if (Math.random() < 0.35) {
        setShareCount(prev => prev + 1);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [article]);

  // Sync Read Later on mount/change
  useEffect(() => {
    try {
      const savedList = JSON.parse(localStorage.getItem('majhapatra_read_later') || '[]');
      setIsSavedForLater(savedList.includes(articleId));
    } catch (e) {
      setIsSavedForLater(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (!isLoading && !article) {
      addToast('निवडलेली बातमी सापडली नाही.', 'error');
      onBack();
    }
  }, [isLoading, article, onBack, addToast]);

  // Hook: Scroll progress updater
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrolled = (window.scrollY / scrollHeight) * 100;
        setScrollProgress(scrolled);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hook: Load comments registry
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`majhapatra_comments_${articleId}`);
      if (stored) {
        setComments(JSON.parse(stored));
      } else {
        const defaults: any[] = [];
        setComments(defaults);
        localStorage.setItem(`majhapatra_comments_${articleId}`, JSON.stringify(defaults));
      }
    } catch(e) {
      console.error(e);
    }
  }, [articleId]);


  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const authorName = authUser ? authUser.name : newCommentName.trim();
    if (!authorName || !newCommentText.trim()) {
      addToast('कृपया प्रतिक्रिया रिकामी सोडू नका.', 'error');
      return;
    }
    const currentList = [...comments];
    const item = {
      id: 'comment-' + Date.now().toString(),
      author: authorName,
      text: newCommentText.trim(),
      date: 'आत्ताच',
      likes: 0,
      likedByMe: false,
      photoUrl: authUser?.photoUrl || ''
    };
    currentList.unshift(item);
    setComments(currentList);
    try {
      localStorage.setItem(`majhapatra_comments_${articleId}`, JSON.stringify(currentList));
    } catch (e) {
      console.error(e);
    }
    setNewCommentName('');
    setNewCommentText('');
    addToast('तुमची प्रतिक्रिया यशस्वीरीत्या प्रविष्ट करण्यात आली आहे!', 'success');
  };

  const handleLikeComment = (commentId: string) => {
    const updated = comments.map(c => {
      if (c.id === commentId) {
        const isLiked = c.likedByMe;
        return {
          ...c,
          likes: isLiked ? c.likes - 1 : c.likes + 1,
          likedByMe: !isLiked
        };
      }
      return c;
    });
    setComments(updated);
    try {
      localStorage.setItem(`majhapatra_comments_${articleId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleReadLater = () => {
    try {
      const savedList = JSON.parse(localStorage.getItem('majhapatra_read_later') || '[]');
      if (isSavedForLater) {
        const updatedList = savedList.filter((id: string) => id !== articleId);
        localStorage.setItem('majhapatra_read_later', JSON.stringify(updatedList));
        setIsSavedForLater(false);
        addToast('बातमी नंतर वाचायच्या यादीतून काढण्यात आली आहे.', 'info');
      } else {
        savedList.push(articleId);
        localStorage.setItem('majhapatra_read_later', JSON.stringify(savedList));
        setIsSavedForLater(true);
        addToast('ही बातमी नंतर वाचण्यासाठी यशस्वीरीत्या सेव्ह केली आहे!', 'success');
      }
    } catch (e) {
      addToast('ऑपरेशन अयशस्वी झाले.', 'error');
    }
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setShareCount(prev => prev + 1);
      addToast('बातमीची लिंक क्लिपबोर्डवर यशस्वीरीत्या कॉपी केली आहे!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      addToast('लिंक कॉपी करता आली नाही.', 'error');
    }
  };

  const shareOnTwitter = () => {
    if (!article) return;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShareTwitterCopied(true);
    setShareCount(prev => prev + 1);
    addToast('Twitter वर शेअर करण्यासाठी पेज उघडले आहे.', 'info');
    setTimeout(() => setShareTwitterCopied(false), 2000);
  };

  const shareOnFacebook = () => {
    if (!article) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShareFacebookCopied(true);
    setShareCount(prev => prev + 1);
    addToast('Facebook वर शेअर करण्यासाठी पेज उघडले आहे.', 'info');
    setTimeout(() => setShareFacebookCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    if (!article) return;
    const cleanDesc = article.description || article.content.replace(/<[^>]*>/g, '').slice(0, 150);
    // Placing the bolded title immediately above the clickable URL connects them visually and functionally on WhatsApp
    const shareText = `*${article.title}*\n🔗 येथे संपूर्ण बातमी वाचा: ${window.location.href}\n\n_${cleanDesc}_`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShareWhatsAppCopied(true);
    setShareCount(prev => prev + 1);
    addToast('WhatsApp वर शेअर करण्यासाठी पेज उघडले आहे.', 'info');
    setTimeout(() => setShareWhatsAppCopied(false), 2000);
  };

  const shareOnLinkedIn = () => {
    if (!article) return;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShareLinkedInCopied(true);
    setShareCount(prev => prev + 1);
    addToast('LinkedIn वर शेअर करण्यासाठी पेज उघडले आहे.', 'info');
    setTimeout(() => setShareLinkedInCopied(false), 2000);
  };

  const formatPublishDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return date.toLocaleDateString('mr-IN', options);
    } catch (e) {
      return dateString;
    }
  };

  // Calculate estimated reading time
  const calculateReadingTime = (text: string) => {
    if (!text) return 1;
    const words = text.trim().split(/\s+/).length;
    // Average Marathi reading speed is about 150-180 words per minute
    const speed = 160;
    const minutes = Math.ceil(words / speed);
    return minutes;
  };

  // Dynamic Marathi news tag derivation
  const deriveTags = (art: News) => {
    // If the article already contains tags (just in case future-proofed)
    if ((art as any).tags && Array.isArray((art as any).tags) && (art as any).tags.length > 0) {
      return (art as any).tags;
    }

    const words = (art.content + " " + art.title + " " + art.description).toLowerCase();
    const tags: string[] = [];
    
    const tagMatchers = [
      { tag: 'हवामान', keywords: ['हवामान', 'पाऊस', 'तापमान', 'अंदाज', 'वादळ', 'गारपीट', 'पूर', 'थंडी', 'उष्णता', 'चक्रीवादळ', 'मान्सून', 'monsoon', 'weather', 'rain'] },
      { tag: 'महाराष्ट्र समाचार', keywords: ['महाराष्ट्र', 'मुंबई', 'पुणे', 'ठाणे', 'नागपूर', 'नाशिक', 'कोल्हापूर', 'मंत्रालय', 'राज्य'] },
      { tag: 'ब्रेकिंग न्यूज', keywords: ['ब्रेकिंग', 'मोठी बातमी', 'धक्कादायक', 'तातडीने', 'अतिशय'] },
      { tag: 'राजकीय घडामोडी', keywords: ['राजकारण', 'निवडणूक', 'मंत्री', 'पंतप्रधान', 'मुख्यमंत्री', 'आघाडी', 'युती', 'पक्ष', 'आमदार', 'खासदार'] },
      { tag: 'मनोरंजन विश्‍व', keywords: ['चित्रपट', 'मालिका', 'अभिनेता', 'अभिनेत्री', 'सिनेमा', 'कलाकार', 'मनोरंजन', 'नाटक', 'गाणे'] },
      { tag: 'क्रीडा जगत्', keywords: ['क्रिकेट', 'धोनी', 'कोहली', 'सामना', 'खेळ', 'स्पर्धा', 'पदक', 'धावा', 'आयपीएल', 'ipl'] },
      { tag: 'आर्थिक वृत्त', keywords: ['शेअर', 'बँक', 'व्यवसाय', 'पैसा', 'सोने', 'गुंतवणूक', 'अर्थव्यवस्था', 'बजेट', 'जीएसटी'] },
      { tag: 'राष्ट्रीय घडामोडी', keywords: ['भारत', 'दिल्ली', 'देश', 'संसद', 'केंद्रीय', 'सीमा', 'लष्कर'] },
      { tag: 'तंत्रज्ञान व माहिती', keywords: ['मोबाईल', 'इंटरनेट', 'ॲप', 'स्मार्टफोन', 'सायबर', 'तांत्रिक', 'टेक्नॉलॉजी'] },
      { tag: 'विशेष कव्हरेज', keywords: ['विशेष', 'अहवाल', 'मजकूर', 'विश्लेषण', 'महत्त्वाचे'] }
    ];

    tagMatchers.forEach(m => {
      if (m.keywords.some(k => words.includes(k))) {
        tags.push(m.tag);
      }
    });

    // Fallbacks if no keywords match
    if (tags.length === 0) {
      tags.push(art.category || 'ताजी बातमी');
      tags.push('मुख्य घडामोडी');
      tags.push('माझापत्र विशेष');
    } else {
      // Append category if not present
      if (art.category && !tags.includes(art.category)) {
        tags.unshift(art.category);
      }
      if (tags.length < 3) {
        tags.push('विशेष कव्हरेज');
      }
    }

    // Return unique tags, max 5 elements
    return Array.from(new Set(tags)).slice(0, 5);
  };

  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[1] === 'youtu.be/' ? match[2] : match[2] : null;
  };

  // Zoom logic
  const openZoomModal = (customUrl?: any) => {
    const finalUrl = (customUrl && typeof customUrl === 'string') ? customUrl : (article?.imageURL || '');
    setZoomImageUrl(finalUrl);
    setZoomScale(1.5);
    setPanOffset({ x: 0, y: 0 });
    setIsZoomedImageLoading(true);
    setIsZoomed(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false); // disable movement drag during pinch-zooming
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setStartTouchDist(dist);
      setStartZoomScale(zoomScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (!isDragging) return;
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && startTouchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / startTouchDist;
      // Clamp scale nicely between 1.0 (min format) and 4.0 (max zoom)
      const nextScale = Math.min(4, Math.max(1, startZoomScale * factor));
      setZoomScale(nextScale);
    }
  };

  if (isLoading || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">बातमी उघडत आहे, कृपया प्रतीक्षा करा...</p>
      </div>
    );
  }

  const renderArticleContentWithMiddleAd = () => {
    if (!article) return null;
    const content = article.content || '';
    
    // Check if it's HTML content
    const isHtml = content.includes('<') && (content.includes('>') || content.includes('</'));

    // Prepare individual ad slot configurations
    const ad1 = article.sponsorAd1ImageURL ? {
      imageUrl: article.sponsorAd1ImageURL,
      link: article.sponsorAd1LinkURL || '#',
      label: '१ (प्रायोजित)'
    } : (siteSettings?.detailAd1Enabled ? {
      imageUrl: siteSettings.detailAd1ImageUrl || '',
      link: siteSettings.detailAd1Link || '#',
      whatsapp: siteSettings.detailAd1Whatsapp,
      phone: siteSettings.detailAd1Phone,
      label: '१'
    } : null);

    const ad2 = article.sponsorAd2ImageURL ? {
      imageUrl: article.sponsorAd2ImageURL,
      link: article.sponsorAd2LinkURL || '#',
      label: '२ (प्रायोजित)'
    } : (siteSettings?.detailAd2Enabled ? {
      imageUrl: siteSettings.detailAd2ImageUrl || '',
      link: siteSettings.detailAd2Link || '#',
      whatsapp: siteSettings.detailAd2Whatsapp,
      phone: siteSettings.detailAd2Phone,
      label: '२'
    } : null);

    const ad3 = article.sponsorAd3ImageURL ? {
      imageUrl: article.sponsorAd3ImageURL,
      link: article.sponsorAd3LinkURL || '#',
      label: '३ (प्रायोजित)'
    } : (siteSettings?.detailAd3Enabled ? {
      imageUrl: siteSettings.detailAd3ImageUrl || '',
      link: siteSettings.detailAd3Link || '#',
      whatsapp: siteSettings.detailAd3Whatsapp,
      phone: siteSettings.detailAd3Phone,
      label: '३'
    } : null);

    const ad4 = article.sponsorAd4ImageURL ? {
      imageUrl: article.sponsorAd4ImageURL,
      link: article.sponsorAd4LinkURL || '#',
      label: '४ (प्रायोजित)'
    } : (siteSettings?.detailAd4Enabled ? {
      imageUrl: siteSettings.detailAd4ImageUrl || '',
      link: siteSettings.detailAd4Link || '#',
      whatsapp: siteSettings.detailAd4Whatsapp,
      phone: siteSettings.detailAd4Phone,
      label: '४'
    } : null);

    const renderAdCard = (ad: { imageUrl: string; link: string; whatsapp?: string; phone?: string; label: string }, key: string) => {
      return (
        <div key={key} className="w-full my-6 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2.5 transition-all duration-300 hover:shadow-md animate-fade-in select-none">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 mb-1.5 font-sans">
            <span>जाहिरात {ad.label} (स्पॉन्सर्ड)</span>
            <span>अधिक माहिती</span>
          </div>
          <a 
            href={ad.link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden cursor-pointer"
          >
            <img 
              src={resolveDriveUrl(ad.imageUrl)} 
              alt="जाहिरात" 
              className="w-full h-auto aspect-[1290/720] max-w-[1290px] max-h-[720px] object-cover transition-transform duration-500 hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';
              }}
              referrerPolicy="no-referrer"
            />
          </a>
          {((ad.whatsapp) || (ad.phone)) && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-2.5 px-1 pb-1">
              {ad.whatsapp && (
                <a
                  href={`https://wa.me/${ad.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>व्हाट्सॲप संपर्क (WhatsApp)</span>
                </a>
              )}
              {ad.phone && (
                <a
                  href={`tel:${ad.phone.trim()}`}
                  className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>कॉल करा (Call Sponsor)</span>
                </a>
              )}
            </div>
          )}
        </div>
      );
    };

    if (isHtml) {
      // Find all paragraphs and line breaks - split by </p> and <br> tags to count actual text lines
      const rawChunks = content.split(/<\/p>|<br\s*\/?>/gi);
      const chunks = rawChunks
        .map(chunk => {
          let cleaned = chunk.trim();
          if (!cleaned) return '';
          // If it starts with <p> but doesn't end with </p> (since we split by </p>), let's close it
          if (cleaned.toLowerCase().startsWith('<p') && !cleaned.toLowerCase().endsWith('</p>')) {
            cleaned += '</p>';
          } else if (!cleaned.toLowerCase().startsWith('<p') && !cleaned.toLowerCase().startsWith('<div') && !cleaned.toLowerCase().startsWith('<h')) {
            // It's a raw line of text, wrap it in a clean paragraph tag
            cleaned = `<p>${cleaned}</p>`;
          }
          return cleaned;
        })
        .filter(chunk => {
          if (!chunk) return false;
          // Only keep chunks that contain actual text content (strip tags and check length)
          const stripped = chunk.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          return stripped.length > 0;
        });
      
      const L = chunks.length;
      const partSize = Math.floor(L / 4);
      const remainder = L % 4;

      const s1 = partSize + (remainder > 0 ? 1 : 0);
      const s2 = partSize + (remainder > 1 ? 1 : 0);
      const s3 = partSize + (remainder > 2 ? 1 : 0);
      const s4 = partSize;

      const part1 = chunks.slice(0, s1);
      const part2 = chunks.slice(s1, s1 + s2);
      const part3 = chunks.slice(s1 + s2, s1 + s2 + s3);
      const part4 = chunks.slice(s1 + s2 + s3);

      const elements: React.ReactNode[] = [];
      const renderChunk = (htmlText: string, idx: number, partPrefix: string) => (
        <div 
          key={`p-${partPrefix}-${idx}`}
          className={`rich-text-content-chunk leading-relaxed select-text animate-fade-in prose max-w-none prose-headings:font-bold prose-p:mb-4 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-strong:font-bold prose-a:text-rose-600 ${
            readingTheme === 'dark' 
              ? 'text-slate-200 prose-headings:text-slate-100 prose-strong:text-white' 
              : readingTheme === 'cream' 
              ? 'text-[#2c1d11] prose-headings:text-[#1a110a] prose-strong:text-[#1a110a]' 
              : 'text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900'
          }`}
          dangerouslySetInnerHTML={{ __html: htmlText }}
        />
      );

      // Part 1 content + Ad 1
      part1.forEach((p, idx) => elements.push(renderChunk(p, idx, 'p1')));
      if (ad1) elements.push(renderAdCard(ad1, 'mid-ad-1'));

      // Part 2 content + Ad 2
      part2.forEach((p, idx) => elements.push(renderChunk(p, idx, 'p2')));
      if (ad2) elements.push(renderAdCard(ad2, 'mid-ad-2'));

      // Google AdSense In-Paragraph Ad Placement
      elements.push(
        <AdSenseUnit
          key="adsense-mid-para"
          slotType="paragraph"
          adCode={siteSettings?.adsenseParagraphAdCode}
          clientId={siteSettings?.adsenseClientId}
        />
      );

      // Part 3 content + Ad 3
      part3.forEach((p, idx) => elements.push(renderChunk(p, idx, 'p3')));
      if (ad3) elements.push(renderAdCard(ad3, 'mid-ad-3'));

      // Part 4 content + Ad 4
      part4.forEach((p, idx) => elements.push(renderChunk(p, idx, 'p4')));
      if (ad4) elements.push(renderAdCard(ad4, 'mid-ad-4'));

      return <div className="space-y-6">{elements}</div>;
    } else {
      // Plain text content split by '\n' or '\r\n' to count actual text lines
      const paragraphs = content
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      const L = paragraphs.length;
      
      if (L === 0) return null;

      const partSize = Math.floor(L / 4);
      const remainder = L % 4;

      const s1 = partSize + (remainder > 0 ? 1 : 0);
      const s2 = partSize + (remainder > 1 ? 1 : 0);
      const s3 = partSize + (remainder > 2 ? 1 : 0);
      const s4 = partSize;

      const part1 = paragraphs.slice(0, s1);
      const part2 = paragraphs.slice(s1, s1 + s2);
      const part3 = paragraphs.slice(s1 + s2, s1 + s2 + s3);
      const part4 = paragraphs.slice(s1 + s2 + s3);
      
      const elements: React.ReactNode[] = [];

      // Part 1 content + Ad 1
      part1.forEach((para, idx) => {
        elements.push(
          <p key={`p-p1-${idx}`} className={`paragraph-item animate-fade-in ${idx === 0 ? 'first-letter:font-semibold first-letter:text-2xl first-letter:float-left first-letter:mr-1 first-letter:mt-1 first-letter:text-rose-600' : ''}`}>
            {para}
          </p>
        );
      });
      if (ad1) elements.push(renderAdCard(ad1, 'mid-ad-1'));

      // Part 2 content + Ad 2
      part2.forEach((para, idx) => {
        elements.push(
          <p key={`p-p2-${idx}`} className="paragraph-item animate-fade-in">
            {para}
          </p>
        );
      });
      if (ad2) elements.push(renderAdCard(ad2, 'mid-ad-2'));

      // Google AdSense In-Paragraph Ad Placement
      elements.push(
        <AdSenseUnit
          key="adsense-mid-para"
          slotType="paragraph"
          adCode={siteSettings?.adsenseParagraphAdCode}
          clientId={siteSettings?.adsenseClientId}
        />
      );

      // Part 3 content + Ad 3
      part3.forEach((para, idx) => {
        elements.push(
          <p key={`p-p3-${idx}`} className="paragraph-item animate-fade-in">
            {para}
          </p>
        );
      });
      if (ad3) elements.push(renderAdCard(ad3, 'mid-ad-3'));

      // Part 4 content + Ad 4
      part4.forEach((para, idx) => {
        elements.push(
          <p key={`p-p4-${idx}`} className="paragraph-item animate-fade-in">
            {para}
          </p>
        );
      });
      if (ad4) elements.push(renderAdCard(ad4, 'mid-ad-4'));
      
      return <>{elements}</>;
    }
  };

  const getWhatsAppJoinUrl = () => {
    const input = siteSettings?.whatsappUrl?.trim();
    if (!input) {
      // Provide a nice default WhatsApp group link so it works out-of-the-box
      return "https://chat.whatsapp.com/Kz4Y6H7X8Y9Z0123456789";
    }
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    // Remove non-numeric characters for phone number
    const cleanPhone = input.replace(/[^0-9]/g, '');
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}`;
    }
    return "https://chat.whatsapp.com/Kz4Y6H7X8Y9Z0123456789";
  };

  const renderWhatsAppJoinBanner = (position: 'top' | 'bottom') => {
    const joinUrl = getWhatsAppJoinUrl();
    if (!joinUrl) return null;

    const isTop = position === 'top';

    return (
      <div className={`w-full ${isTop ? 'mb-6' : 'mt-8'} bg-emerald-50/70 border-2 border-emerald-500/25 rounded-2xl p-4.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 select-none animate-fade-in`}>
        <div className="flex items-center space-x-3.5 text-left w-full sm:w-auto">
          <div className="bg-emerald-500 text-white p-3 rounded-full shadow-md animate-pulse shrink-0">
            <MessageCircle className="h-6 w-6 fill-white" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
              ताज्या घडामोडी थेट तुमच्या व्हाट्सॲपवर मिळवा!
            </h4>
            <p className="text-xs text-slate-500 leading-normal mt-0.5">
              आमच्या अधिकृत न्यूज चॅनेलच्या व्हाट्सॲप ग्रुपमध्ये सामील व्हा आणि राहा अपडेटेड सर्वात आधी.
            </p>
          </div>
        </div>
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-3 px-6 rounded-xl text-sm flex items-center justify-center space-x-2.5 transition duration-150 shadow-md cursor-pointer shrink-0"
        >
          <MessageCircle className="h-5 w-5 fill-current shrink-0" />
          <span>व्हाट्सॲप ग्रुप जॉईन करा</span>
        </a>
      </div>
    );
  };

  const readingTime = calculateReadingTime(article.content);
  const ytVideoId = getYouTubeId(videoURLInput);

  // Generate JSON-LD Structured Data (Article Schema)
  const schemaData = article ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": [
      article.imageURL ? resolveDriveUrl(article.imageURL) : "https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link"
    ],
    "datePublished": article.publishDate || new Date().toISOString(),
    "dateModified": article.publishDate || new Date().toISOString(),
    "author": [{
      "@type": "Person",
      "name": article.author || "अहिल्यानगर न्यूज नेटवर्क प्रतिनिधी",
      "jobTitle": "News Reporter"
    }],
    "publisher": {
      "@type": "Organization",
      "name": siteSettings?.channelName || "अहिल्यानगर न्यूज नेटवर्क",
      "logo": {
        "@type": "ImageObject",
        "url": siteSettings?.channelLogoUrl ? resolveDriveUrl(siteSettings.channelLogoUrl) : "https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link"
      }
    },
    "description": article.description || article.content.replace(/<[^>]*>/g, '').slice(0, 150),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    }
  } : null;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative">
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      )}
      {/* Reading Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-[4px] bg-slate-100/55 z-50 pointer-events-none">
        <div 
          className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 transition-all duration-150 rounded-r-full"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>

      {/* Top Header Controls Block with Font Size Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sticky top-12 sm:top-14 bg-white/95 backdrop-blur-md py-2 z-30 border-b border-slate-100">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-slate-600 hover:text-rose-600 font-bold transition-all group focus:outline-hidden"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-sans">मुख्यपृष्ठावर जा</span>
        </button>

        {/* Font Size Toggle */}
        <div className="flex items-center space-x-1.5 bg-slate-55 border border-slate-200/70 p-1 rounded-xl text-xs font-sans shadow-3xs">
          <span className="text-[10px] text-slate-500 font-bold px-1.5 select-none">अक्षर आकार (Font Size):</span>
          <button
            onClick={() => {
              setFontSize('base');
              addToast('लहान अक्षर आकार (Small) निवडला.', 'info');
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              fontSize === 'base' || fontSize === 'sm' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            Small
          </button>
          <button
            onClick={() => {
              setFontSize('lg');
              addToast('मध्यम अक्षर आकार (Medium) निवडला.', 'info');
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              fontSize === 'lg' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => {
              setFontSize('2xl');
              addToast('मोठा अक्षर आकार (Large) निवडला.', 'info');
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              fontSize === '2xl' || fontSize === 'xl' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            Large
          </button>
        </div>
      </div>

      {/* Category and Meta Headers */}
      <div className="space-y-4">
        <span className="inline-flex bg-rose-100 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-sm uppercase tracking-wider">
          {article.category}
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {article.title}
        </h1>

        {/* Short Description Lead */}
        <p className="text-slate-600 text-base sm:text-lg font-medium leading-relaxed border-l-4 border-rose-500 pl-4 py-1">
          {article.description}
        </p>

        {/* Metadata info */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 border-t border-slate-100/60 py-3 mt-4">
          <div className="flex items-center space-x-1.5">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{article.author}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{formatPublishDate(article.publishDate)}</span>
          </div>
          <div className="flex items-center space-x-1.5 font-sans">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-650">{readingTime} मिनिटे वाचन वेळ</span>
          </div>
          <div className="flex items-center space-x-1.5 ml-auto">
            <Eye className="h-4 w-4 text-slate-400" />
            <span><strong>{article.views}</strong> वेळा वाचले</span>
          </div>
        </div>
      </div>

      {/* Premium Reader Operations Dashboard */}
      <div className="mt-5 mb-2 p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col md:flex-row items-center gap-4 select-none animate-fade-in">
        {/* Left Side: Text to Speech (TTS) Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-center md:justify-start mr-auto bg-rose-50/40 p-2 rounded-xl border border-rose-100/50 shadow-3xs">
          <div className="flex items-center space-x-1">
            <Volume2 className="h-4.5 w-4.5 text-rose-600" />
            <span className="text-xs font-bold text-slate-700 font-sans mr-1">बातमी ऐका:</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {!isSpeaking || isPaused ? (
              <button
                onClick={handleStartSpeaking}
                className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                title="बातमी ऐका"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>ऐका (Listen)</span>
              </button>
            ) : (
              <button
                onClick={handlePauseSpeaking}
                className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                title="वाचन थांबवा"
              >
                <Pause className="h-3 w-3 fill-current" />
                <span>थांबवा (Pause)</span>
              </button>
            )}

            {isSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="flex items-center space-x-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold px-2 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                title="वाचन पूर्ण बंद करा"
              >
                <VolumeX className="h-3 w-3" />
                <span>बंद करा</span>
              </button>
            )}
          </div>

          {/* Speed / Rate control */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-semibold shadow-3xs">
            <span className="text-slate-400 px-1 font-bold">वेग:</span>
            {([0.8, 1.0, 1.25, 1.5] as const).map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  speechRate === rate ? 'bg-rose-100 text-rose-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Voice selector */}
          {availableVoices.length > 1 && (
            <select
              value={selectedVoiceName}
              onChange={(e) => {
                setSelectedVoiceName(e.target.value);
                if (isSpeaking && !isPaused) {
                  setTimeout(() => handleStartSpeaking(), 100);
                }
              }}
              className="text-[11px] bg-white border border-slate-200 text-slate-700 py-1 px-1.5 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[130px] truncate shadow-3xs"
            >
              {availableVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name.includes('Google') ? 'Google ' : ''}
                  {voice.lang.startsWith('mr') ? 'मराठी' : voice.lang.startsWith('hi') ? 'हिंदी' : 'English'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right Side: Font Size, Serif, and Cozy Theme presets */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
          {/* Theme background presets */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 shadow-3xs">
            <button
              onClick={() => {
                setReadingTheme('white');
                addToast('पांढरी पार्श्वभूमी निवडली.', 'info');
              }}
              className={`w-6 h-6 rounded-full border bg-white cursor-pointer ${
                readingTheme === 'white' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'
              }`}
              title="सामान्य पांढरा"
            />
            <button
              onClick={() => {
                setReadingTheme('cream');
                addToast('डोळ्यांसाठी आरामदायी कोझी क्रीम मोड सक्रिय.', 'info');
              }}
              className={`w-6 h-6 rounded-full border bg-[#fdfaf6] cursor-pointer ${
                readingTheme === 'cream' ? 'border-amber-600 ring-2 ring-amber-200' : 'border-slate-200'
              }`}
              title="कोझी क्रीम सेपिया (डोळ्यांसाठी आरामदायी)"
            />
            <button
              onClick={() => {
                setReadingTheme('dark');
                addToast('गडद नाईट मोड सक्रिय.', 'info');
              }}
              className={`w-6 h-6 rounded-full border bg-[#0f172a] cursor-pointer ${
                readingTheme === 'dark' ? 'border-blue-500 ring-2 ring-blue-900/60' : 'border-slate-200'
              }`}
              title="मिटनाईट डार्क"
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block"></div>

          {/* Sizing presets control */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-3xs">
            <span className="text-[10px] text-slate-400 font-bold px-1 select-none">अक्षर:</span>
            <button
              onClick={() => {
                setFontSize('base');
                addToast('लहान अक्षर आकार (Small) निवडला.', 'info');
              }}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                fontSize === 'base' || fontSize === 'sm' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Small
            </button>
            <button
              onClick={() => {
                setFontSize('lg');
                addToast('मध्यम अक्षर आकार (Medium) निवडला.', 'info');
              }}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                fontSize === 'lg' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => {
                setFontSize('2xl');
                addToast('मोठा अक्षर आकार (Large) निवडला.', 'info');
              }}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                fontSize === '2xl' || fontSize === 'xl' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Large
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block"></div>

          {/* Serif / Sans font toggle */}
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold shadow-3xs">
            <button
              onClick={() => {
                setFontStyle('font-sans');
                addToast('मॉडर्न सॅन्स फाँट सेट केला.', 'info');
              }}
              className={`px-2 py-0.5 rounded-md cursor-pointer ${fontStyle === 'font-sans' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sans
            </button>
            <button
              onClick={() => {
                setFontStyle('font-serif');
                addToast('पारंपारिक वृत्तपत्र सिरिफ फाँट सेट केला.', 'info');
              }}
              className={`px-2 py-0.5 rounded-md cursor-pointer ${fontStyle === 'font-serif' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              title="वृत्तपत्र टाईप सिरिफ फाँट"
            >
              Serif
            </button>
          </div>
        </div>
      </div>

      {/* Ad 1: Top Banner Ad */}
      {siteSettings?.detailAd1Enabled && (
        <div className="w-full my-6 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2.5 transition-all duration-300 hover:shadow-md animate-fade-in">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 mb-1.5 font-sans">
            <span>जाहिरात (स्पॉन्सर्ड)</span>
            <span>नवीन माहिती</span>
          </div>
          <a 
            href={siteSettings.detailAd1Link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden cursor-pointer"
          >
            <img 
              src={resolveDriveUrl(siteSettings.detailAd1ImageUrl || '')} 
              alt="जाहिरात" 
              className="w-full h-auto aspect-[1290/720] max-w-[1290px] max-h-[720px] object-cover transition-transform duration-500 hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80';
              }}
              referrerPolicy="no-referrer"
            />
          </a>
          {((siteSettings?.detailAd1Whatsapp) || (siteSettings?.detailAd1Phone)) && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-2.5 px-1 pb-1">
              {siteSettings.detailAd1Whatsapp && (
                <a
                  href={`https://wa.me/${siteSettings.detailAd1Whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>व्हाट्सॲप संपर्क (WhatsApp)</span>
                </a>
              )}
              {siteSettings.detailAd1Phone && (
                <a
                  href={`tel:${siteSettings.detailAd1Phone.trim()}`}
                  className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>कॉल करा (Call Sponsor)</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Article Image Container with Zoom support and refined Fallback Error Handling */}
      <div className="my-8 relative rounded-2xl overflow-hidden shadow-xs border border-slate-100 bg-slate-100 max-h-[480px] group select-none">
        {mainImageError ? (
          <div className="relative w-full h-[360px] overflow-hidden cursor-zoom-in group" onClick={openZoomModal}>
            <img
              src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80"
              alt="Default Illustrative News Banner"
              className="w-full h-full object-cover opacity-90 brightness-[0.85] transition-transform duration-500 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent"></div>
            <div className="absolute bottom-5 left-5 right-5 text-white text-left">
              <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-widest inline-block mb-2">माझापत्र बातमी छायाचित्र</span>
              <p className="text-white text-xs font-medium sm:text-sm max-w-lg leading-relaxed opacity-95">
                मूळ प्रविष्ट केलेले वृत्त छायाचित्र उपलब्ध नसल्यामुळे हे प्रातिनिधिक चित्र प्रदर्शित केले आहे. झूम करण्यासाठी येथे क्लिक करा.
              </p>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1.2 rounded-lg flex items-center space-x-1 hover:scale-105 transition-transform">
              <Maximize2 className="h-3 w-3" />
              <span>झूम करा</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full max-h-[400px] overflow-hidden cursor-zoom-in" onClick={openZoomModal}>
            {isMainImageLoading && (
              <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center min-h-[300px]">
                <div className="inline-block w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <img
              src={resolveDriveUrl(article.imageURL)}
              alt={article.title}
              className={`w-full h-full object-cover max-h-[400px] aspect-video transition-all duration-500 group-hover:scale-[1.02] ${
                isMainImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setIsMainImageLoading(false)}
              onError={() => {
                setIsMainImageLoading(false);
                setMainImageError(true);
              }}
              referrerPolicy="no-referrer"
            />
            
            {/* Click to Zoom Badge overlay */}
            {!isMainImageLoading && (
              <div className="absolute bottom-4 right-4 bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 opacity-90 group-hover:scale-105 transition-all select-none">
                <Maximize2 className="h-3.5 w-3.5" />
                <span>झूम करण्यासाठी क्लिक करा</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Sponsor Contact Action Bar */}
      {(() => {
        const sponsorWhatsapp = (siteSettings?.detailAd1Whatsapp || siteSettings?.detailAd2Whatsapp || siteSettings?.detailAd3Whatsapp || siteSettings?.detailAd4Whatsapp || '9423234193').trim();
        const sponsorPhone = (siteSettings?.detailAd1Phone || siteSettings?.detailAd2Phone || siteSettings?.detailAd3Phone || siteSettings?.detailAd4Phone || '9423234193').trim();
        return (
          <div className="sticky top-[100px] z-30 my-6 bg-amber-50/95 backdrop-blur-md border border-amber-200/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 select-none animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700 shrink-0">
                <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-snug">प्रायोजक थेट संपर्क (Sponsor Direct Contact)</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 leading-normal">या बातमीच्या प्रायोजकांशी त्वरित संपर्क साधण्यासाठी खालील बटणे वापरा:</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {sponsorWhatsapp && (
                <a
                  href={`https://wa.me/${sponsorWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>व्हाट्सॲप संपर्क</span>
                </a>
              )}
              {sponsorPhone && (
                <a
                  href={`tel:${sponsorPhone}`}
                  className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>कॉल करा</span>
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {/* YouTube Video Section - Embedded below the main image, before the article content */}
      {ytVideoId && (
        <div className="my-8 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600">
                <Play className="h-4 w-4 fill-rose-600" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-sans">
                या बातमीचा संबंधित व्हिडिओ रिपोर्ट (Video Report)
              </h3>
            </div>
            <button 
              onClick={() => setShowCustomVideoField(!showCustomVideoField)}
              className="text-[11px] font-bold text-rose-500 hover:underline"
            >
              {showCustomVideoField ? 'इंपूट बंद करा' : 'वेगळा व्हिडिओ लिंक टाका'}
            </button>
          </div>

          {showCustomVideoField && (
            <div className="relative flex gap-2">
              <input 
                type="text"
                placeholder="यूट्यूब व्हिडिओ लिंक पेस्ट करा (उदा. https://www.youtube.com/watch?v=...)"
                value={videoURLInput}
                onChange={(e) => {
                  setVideoURLInput(e.target.value);
                  setIsVideoPlaying(false);
                }}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500"
              />
              {videoURLInput && !getYouTubeId(videoURLInput) && (
                <span className="absolute right-3 top-2 text-[10px] text-rose-500 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>अवैध यूट्यूब लिंक</span>
                </span>
              )}
            </div>
          )}

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xs">
            {isVideoPlaying ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1`}
                title="YouTube Video Embed"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full aspect-video rounded-2xl"
              ></iframe>
            ) : (
              <div 
                onClick={() => setIsVideoPlaying(true)}
                className="relative w-full h-full aspect-video cursor-pointer group flex items-center justify-center overflow-hidden"
              >
                {/* Fallback elegant thumbnail */}
                <img 
                  src={`https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`}
                  alt="Video Thumbnail"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-550 group-hover:scale-102"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541417904950-b855846fe074?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                {/* Blur backdrop for professional look */}
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/30 transition-colors"></div>

                {/* Overlaid Play Button logo */}
                <div className="relative z-10 bg-slate-950/70 backdrop-blur-md rounded-full p-4.5 border border-white/20 shadow-lg group-hover:scale-110 group-hover:bg-rose-700/90 transition-all duration-350 flex items-center justify-center">
                  <Play className="h-7 w-7 text-white fill-current translate-x-0.5" />
                </div>

                <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
                  <span className="font-semibold truncate">यूट्यूब व्हिडिओ रिपोर्ट प्ले करण्यासाठी येथे क्लिक करा</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Body Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side Social bar (Floating styling) */}
        <div className="lg:col-span-1 flex flex-wrap lg:flex-col items-center justify-center lg:justify-start gap-2.5 sm:gap-4 border-b lg:border-b-0 pb-6 lg:pb-0 border-slate-100 lg:sticky lg:top-24 h-fit">
          
          {/* Read Later Button */}
          <button
            onClick={handleToggleReadLater}
            className={`p-3 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
              isSavedForLater 
                ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200'
            }`}
            title={isSavedForLater ? 'नंतर वाचायचे काढा' : 'नंतर वाचा (Save for Later)'}
          >
            <Bookmark className={`h-5 w-5 ${isSavedForLater ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => {
              const nextLikedState = !liked;
              setLiked(nextLikedState);
              setLikesCount(nextLikedState ? likesCount + 1 : likesCount - 1);
              addToast(nextLikedState ? 'बातमी तुम्हाला आवडली आहे!' : 'लाइक काढून टाकण्यात आला.', 'success');
            }}
            className={`p-3 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
              liked 
                ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200'
            }`}
            title="पसंत करा"
          >
            <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-rose-500' : ''}`} />
          </button>
          
          <ArticleShareButton
            article={article}
            siteName={siteSettings?.channelName || "अहिल्यानगर न्यूज नेटवर्क"}
            onShareSuccess={() => setShareCount(prev => prev + 1)}
            addToast={addToast}
            variant="circular"
          />

          {/* Twitter Social Share Link */}
          <button
            onClick={shareOnTwitter}
            className={`p-3 rounded-full border transition-all flex items-center justify-center relative cursor-pointer ${
              shareTwitterCopied 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                : 'border-slate-200 bg-white text-sky-500 hover:bg-sky-55 hover:border-sky-305'
            }`}
            title="ट्विटरवर शेअर करा"
          >
            {shareTwitterCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <Twitter className="h-5 w-5 fill-sky-500 text-sky-500" />}
          </button>

          {/* Facebook Social Share Link */}
          <button
            onClick={shareOnFacebook}
            className={`p-3 rounded-full border transition-all flex items-center justify-center relative cursor-pointer ${
              shareFacebookCopied 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                : 'border-slate-200 bg-white text-blue-600 hover:bg-blue-55 hover:border-blue-305'
            }`}
            title="फेसबुकवर शेअर करा"
          >
            {shareFacebookCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <Facebook className="h-5 w-5 fill-blue-600 text-blue-600" />}
          </button>

          {/* WhatsApp Social Share Link */}
          <button
            onClick={shareOnWhatsApp}
            className={`p-3 rounded-full border transition-all flex items-center justify-center relative cursor-pointer ${
              shareWhatsAppCopied 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                : 'border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
            }`}
            title="व्हॉट्सॲपवर शेअर करा"
          >
            {shareWhatsAppCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <MessageCircle className="h-5 w-5 fill-emerald-500 text-emerald-600" />}
          </button>

          {/* LinkedIn Social Share Link */}
          <button
            onClick={shareOnLinkedIn}
            className={`p-3 rounded-full border transition-all flex items-center justify-center relative cursor-pointer ${
              shareLinkedInCopied 
                ? 'bg-emerald-50 border-emerald-350 text-emerald-600' 
                : 'border-slate-200 bg-white text-sky-700 hover:bg-sky-55 hover:border-sky-350'
            }`}
            title="लिंक्डइनवर शेअर करा"
          >
            {shareLinkedInCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <Linkedin className="h-5 w-5 fill-sky-700 text-sky-700" />}
          </button>

          <button
            onClick={() => {
              setPrintTriggered(true);
              setTimeout(() => setPrintTriggered(false), 2000);
              window.print();
            }}
            className={`p-3 rounded-full border transition-all flex items-center justify-center hidden sm:flex cursor-pointer ${
              printTriggered
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                : 'border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200'
            }`}
            title="प्रिंट करा"
          >
            {printTriggered ? <Check className="h-5 w-5 text-emerald-600" /> : <Printer className="h-5 w-5" />}
          </button>

          {likesCount > 0 && (
            <span className="text-xs font-sans text-rose-600 font-bold ml-2 lg:ml-0 lg:mt-1 font-mono">
              +{likesCount}
            </span>
          )}

          {/* Social Proof Share Counter */}
          <div className="flex flex-col items-center justify-center bg-rose-50/70 border border-rose-100/60 rounded-xl p-1.5 px-2.5 text-center shrink-0 min-w-[64px] shadow-3xs hover:scale-105 transition-transform duration-300">
            <span className="text-xs font-black text-rose-700 font-mono tracking-tight flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping shrink-0"></span>
              <span>{shareCount}</span>
            </span>
            <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">शेअर्स</span>
          </div>
        </div>

        {/* Main Content paragraphs with Dynamic derived Tag integration */}
        <div className={`lg:col-span-11 p-4 sm:p-7 rounded-2xl transition-all duration-300 ${
          readingTheme === 'cream' 
            ? 'bg-[#fdfaf6] border border-[#f5ece1] text-[#2c1d11]' 
            : readingTheme === 'dark' 
            ? 'bg-[#0f172a] border border-[#1e293b] text-[#cbd5e1]' 
            : 'bg-white border border-slate-100/50 text-[#192434]'
        } ${fontStyle} ${
          fontSize === 'base' || fontSize === 'sm' ? 'text-sm sm:text-base' :
          fontSize === 'lg' ? 'text-base sm:text-lg' :
          'text-xl sm:text-2xl'
        } leading-relaxed space-y-6 shadow-3xs`}>
          {renderWhatsAppJoinBanner('top')}
          {renderArticleContentWithMiddleAd()}

          {/* Interactive Image Gallery */}
          {article.gallery && article.gallery.length > 0 && (
            <div className={`mt-8 p-4 sm:p-5 rounded-2xl border ${
              readingTheme === 'dark'
                ? 'bg-[#1e293b]/30 border-slate-800'
                : readingTheme === 'cream'
                ? 'bg-[#f4efe6]/70 border-[#e8dfcf]'
                : 'bg-slate-50/70 border-slate-200/50'
            }`}>
              <div className="flex items-center space-x-2 mb-4 select-none">
                <Images className="h-5 w-5 text-rose-600 animate-pulse" />
                <h3 className={`text-base font-extrabold ${
                  readingTheme === 'dark' ? 'text-white' : readingTheme === 'cream' ? 'text-[#1a110a]' : 'text-slate-900'
                }`}>
                  📷 छायाचित्र दालन (Photo Gallery)
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {article.gallery.map((imgUrl: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => openZoomModal(imgUrl)}
                    className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200/40 shadow-xs cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                  >
                    <img
                      src={resolveDriveUrl(imgUrl)}
                      alt={`${article.title} - ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300" />
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-1 rounded-md flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Maximize2 className="h-2.5 w-2.5" />
                      <span>पहा</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderWhatsAppJoinBanner('bottom')}

          {/* Dynamic Interactive Tag pills section */}
          <div className="pt-8 mt-10 border-t border-slate-100/80">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0 select-none">
                <Tag className="h-3.5 w-3.5 text-rose-600" />
                <span>महत्त्वाचे टॅग्ज / मुद्दे :</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {deriveTags(article).map((t: string, index: number) => (
                  <span 
                    key={index}
                    className="bg-slate-50 border border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/20 text-slate-600 hover:text-rose-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-default select-none"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Author Profile section */}
          {(() => {
            const matchedAuthor = siteSettings?.authorProfiles?.find(
              p => p.name.trim().toLowerCase() === article?.author?.trim().toLowerCase()
            );
            if (!matchedAuthor) return null;
            return <AuthorProfile author={matchedAuthor} />;
          })()}

          {/* Ad 3: Bottom Content Ad */}
          {siteSettings?.detailAd3Enabled && (
            <div className="w-full my-8 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2.5 transition-all duration-300 hover:shadow-md animate-fade-in">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 mb-1.5 font-sans">
                <span>जाहिरात (स्पॉन्सर्ड)</span>
                <span>विशेष ऑफर्स</span>
              </div>
              <a 
                href={siteSettings.detailAd3Link || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden cursor-pointer"
              >
                <img 
                  src={resolveDriveUrl(siteSettings.detailAd3ImageUrl || '')} 
                  alt="जाहिरात" 
                  className="w-full h-auto aspect-[1290/720] max-w-[1290px] max-h-[720px] object-cover transition-transform duration-500 hover:scale-[1.01]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80';
                  }}
                  referrerPolicy="no-referrer"
                />
              </a>
              {((siteSettings?.detailAd3Whatsapp) || (siteSettings?.detailAd3Phone)) && (
                <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-2.5 px-1 pb-1">
                  {siteSettings.detailAd3Whatsapp && (
                    <a
                      href={`https://wa.me/${siteSettings.detailAd3Whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span>व्हाट्सॲप संपर्क (WhatsApp)</span>
                    </a>
                  )}
                  {siteSettings.detailAd3Phone && (
                    <a
                      href={`tel:${siteSettings.detailAd3Phone.trim()}`}
                      className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>कॉल करा (Call Sponsor)</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ad 4: Above Related Articles / Bottom Banner Ad */}
      {siteSettings?.detailAd4Enabled && (
        <div className="w-full my-8 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2.5 transition-all duration-300 hover:shadow-md animate-fade-in">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 mb-1.5 font-sans">
            <span>जाहिरात (स्पॉन्सर्ड)</span>
            <span>आमच्या भागीदारांकडून</span>
          </div>
          <a 
            href={siteSettings.detailAd4Link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden cursor-pointer"
          >
            <img 
              src={resolveDriveUrl(siteSettings.detailAd4ImageUrl || '')} 
              alt="जाहिरात" 
              className="w-full h-auto aspect-[1290/720] max-w-[1290px] max-h-[720px] object-cover transition-transform duration-500 hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80';
              }}
              referrerPolicy="no-referrer"
            />
          </a>
          {((siteSettings?.detailAd4Whatsapp) || (siteSettings?.detailAd4Phone)) && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-2.5 px-1 pb-1">
              {siteSettings.detailAd4Whatsapp && (
                <a
                  href={`https://wa.me/${siteSettings.detailAd4Whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>व्हाट्सॲप संपर्क (WhatsApp)</span>
                </a>
              )}
              {siteSettings.detailAd4Phone && (
                <a
                  href={`tel:${siteSettings.detailAd4Phone.trim()}`}
                  className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>कॉल करा (Call Sponsor)</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feedback Card */}
      <div className="mt-12 p-6 sm:p-8 bg-slate-50 border border-slate-100 rounded-2xl">
        <h4 className="text-base font-bold text-slate-900">आपल्याला ही बातमी कशी वाटली?</h4>
        <p className="text-slate-500 text-sm mt-1">आपल्या प्रतिक्रिया आमच्यासाठी महत्त्वाच्या आहेत.</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => {
              if (!liked) {
                setLiked(true);
                setLikesCount(likesCount + 1);
                addToast('बातमी तुम्हाला आवडली आहे!', 'success');
              } else {
                addToast('तुम्ही आधीच या बातमीला पसंत केले आहे.', 'info');
              }
            }}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <ThumbsUp className={`h-4 w-4 ${liked ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`} />
            <span>उपयुक्त बातमी</span>
          </button>
          
          <button
            onClick={handleToggleReadLater}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-600 text-slate-705 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <Bookmark className={`h-4 w-4 ${isSavedForLater ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <span>{isSavedForLater ? 'नंतरच्या यादीत सेव्ह केली' : 'नंतर वाचा (Save)'}</span>
          </button>
        </div>

        {/* Dedicated Social Media Sharing Component Block */}
        <div className="mt-8 pt-6 border-t border-slate-200/80 select-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Share2 className="h-4.5 w-4.5 text-rose-600 animate-pulse" />
              <h5 className="text-sm font-black text-slate-900 font-sans">सोशल मीडियावर शेअर करा (Share Article)</h5>
            </div>
            <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 shadow-3xs">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
              </span>
              <span className="font-extrabold font-mono">{shareCount} शेअर्स</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* WhatsApp Share */}
            <button
              onClick={shareOnWhatsApp}
              className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs transition duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 fill-white text-emerald-600" />
              <span>{shareWhatsAppCopied ? 'शेअर केले!' : 'व्हॉट्सॲपवर शेअर करा'}</span>
            </button>

            {/* Facebook Share */}
            <button
              onClick={shareOnFacebook}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs transition duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Facebook className="h-4 w-4 fill-white text-blue-600" />
              <span>{shareFacebookCopied ? 'फेसबुकवर शेअर झाले!' : 'फेसबुकवर शेअर करा'}</span>
            </button>

            {/* Twitter/X Share */}
            <button
              onClick={shareOnTwitter}
              className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs transition duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Twitter className="h-4 w-4 fill-white text-slate-900" />
              <span>{shareTwitterCopied ? 'ट्विट केले!' : 'X (ट्विटर) वर शेअर करा'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Comments & Discussions Wall */}
      <div className="mt-10 bg-white border border-slate-100/85 rounded-2xl p-6 sm:p-8 shadow-3xs animate-fade-in font-sans">
        <div className="flex items-center space-x-2.5 mb-6 border-b border-slate-105 pb-4">
          <MessageSquare className="h-5 w-5 text-rose-600" />
          <h3 className="text-lg font-extrabold text-slate-900">
            वाचक चर्चा आणि मतप्रवाह ({comments.length})
          </h3>
          <span className="bg-rose-100 text-rose-850 px-2 py-0.5 rounded-full text-xs font-bold font-sans">मराठी मंच</span>
        </div>

        {/* Comment Input form widget */}
        <form onSubmit={handleAddComment} className="space-y-4 mb-8 bg-slate-50/50 border border-slate-100 p-4 sm:p-5 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>आपले मत नोंदवा :</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {authUser ? (
              <div className="sm:col-span-1 flex items-center space-x-2 bg-rose-55/40 border border-rose-100/50 px-3 py-2.5 rounded-xl">
                {authUser.photoUrl ? (
                  <img 
                    src={authUser.photoUrl} 
                    alt={authUser.name} 
                    className="h-6 w-6 rounded-full border border-rose-200 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {authUser.name.substring(0, 1)}
                  </div>
                )}
                <span className="text-xs font-extrabold text-slate-700 truncate" title={authUser.email}>
                  {authUser.name}
                </span>
              </div>
            ) : (
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="नाव लिहा..."
                  value={newCommentName}
                  onChange={(e) => setNewCommentName(e.target.value)}
                  className="w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:border-rose-550 focus:ring-1 focus:ring-rose-200 placeholder:text-slate-400 transition-all text-slate-800"
                  required
                />
              </div>
            )}
            <div className="sm:col-span-3 flex gap-2">
              <input
                type="text"
                placeholder="बातमीबद्दल आपली प्रतिक्रिया येथे टाईप करा..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full flex-1 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-rose-550 focus:ring-1 focus:ring-rose-200 placeholder:text-slate-400 transition-all text-slate-800"
                required
              />
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold p-2.5 sm:px-5 rounded-xl text-sm transition-all focus:outline-hidden shadow-xs hover:shadow-md cursor-pointer flex items-center space-x-1.5 shrink-0 active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">पाठवा</span>
              </button>
            </div>
          </div>
        </form>

        {/* Dynamic Comment Stream Items */}
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {comments.map((comment) => {
            const initials = comment.author ? comment.author.slice(0, 2) : 'MP';
            const commentWithPhoto = comment as any;
            return (
              <div 
                key={comment.id} 
                className="bg-white border border-slate-100/95 hover:border-slate-200/80 p-4 rounded-xl flex items-start space-x-4 transition-all hover:bg-slate-50/10"
              >
                {/* Profile Circle with photoUrl or Initials gradient */}
                {commentWithPhoto.photoUrl ? (
                  <img 
                    src={commentWithPhoto.photoUrl} 
                    alt={comment.author} 
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-rose-100 shadow-3xs" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 uppercase select-none shadow-3xs">
                    {initials}
                  </div>
                )}
                
                {/* Text & Meta details content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800">{comment.author}</span>
                    <span className="text-[10px] text-slate-400">{comment.date}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-650 leading-relaxed font-medium">
                    {comment.text}
                  </p>
                  
                  {/* Inline reaction bar per comment */}
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center space-x-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                        comment.likedByMe 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50/20'
                      }`}
                    >
                      <ThumbsUp className={`h-3 w-3 ${comment.likedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{comment.likes}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 select-none">• प्रतिसाद द्या</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related News Section - Display Exactly 3 Filtered Articles in a Clean Column Grid */}
      <div className="mt-16 pt-8 border-t border-slate-100/90">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-slate-900 border-l-4 border-rose-500 pl-3 font-sans">
            संबंधित बातम्या ({article.category})
          </h3>
        </div>
        
        {isRelatedLoading ? (
          <div className="bg-slate-50/50 rounded-2xl py-12 text-center border border-slate-100/60 font-sans">
            <div className="inline-block w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold">तुमच्यासाठी संबंधित बातम्या शोधत आहोत...</p>
          </div>
        ) : relatedArticles.length === 0 ? (
          <div className="bg-slate-50/60 rounded-2xl py-10 px-4 text-center border border-slate-100/50 font-sans">
            <p className="text-sm text-slate-500 font-medium italic">सध्या या श्रेणीमध्ये इतर कोणतीही बातमी उपलब्ध नाही.</p>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-1"
          >
            {relatedArticles.map((relItem) => (
              <div 
                key={relItem._id}
                onClick={() => {
                  onSelectArticle(relItem._id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-slate-100/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-250 transition-all duration-300 cursor-pointer flex flex-col group p-2.5"
              >
                {/* Related Thumbnail */}
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative mb-3 shrink-0">
                  <img
                    src={resolveDriveUrl(relItem.imageURL)}
                    alt={relItem.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80';
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Related Title and Publish Date */}
                <div className="flex-1 flex flex-col justify-between p-1 font-sans">
                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-3 group-hover:text-rose-600 transition-colors">
                    {relItem.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 border-t border-slate-50 pt-2">
                    <span className="truncate max-w-[100px] font-semibold text-slate-500">{relItem.author}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      <span>{formatPublishDate(relItem.publishDate)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Image Zoom and Pan Overlay modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between items-center backdrop-blur-md p-4 animate-fade-in select-none">
          {/* Top Panel */}
          <div className="w-full flex justify-between items-center text-white px-2 sm:px-6 py-2 max-w-7xl">
            <div className="flex flex-col">
              <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-sm w-fit uppercase mb-0.5">
                {zoomImageUrl === article.imageURL ? 'COVER LIVE VIEW' : 'GALLERY IMAGE VIEW'}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white max-w-md sm:max-w-2xl truncate leading-normal">
                {article.title}
              </h4>
            </div>
            
            {/* Close */}
            <button 
              onClick={() => setIsZoomed(false)}
              className="bg-slate-800 hover:bg-rose-600 text-white hover:scale-105 p-2 rounded-full transition-all duration-200 cursor-pointer shadow-md"
              title="बंद करा"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Interactive Zoom Stage */}
          <div 
            className="flex-1 w-full relative overflow-hidden flex items-center justify-center cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
          >
            {isZoomedImageLoading && (
              <div className="absolute inset-x-0 inset-y-0 m-auto w-12 h-12 flex flex-col items-center justify-center">
                <div className="inline-block w-9 h-9 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white text-xs mt-3 block whitespace-nowrap font-medium text-slate-300">चित्र लोड होत आहे...</span>
              </div>
            )}
            
            <img
              src={resolveDriveUrl(zoomImageUrl)}
              alt={article.title}
              className={`max-w-full max-h-[75vh] object-contain transition-transform duration-100 shadow-2xl rounded-sm ${
                isZoomedImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onLoad={() => setIsZoomedImageLoading(false)}
              onError={(e) => {
                setIsZoomedImageLoading(false);
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
              }}
              draggable={false}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom Controls Panel */}
          <div className="bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-6 py-3 mb-6 max-w-md flex items-center gap-6 shadow-xl backdrop-blur-md">
            <button 
              onClick={() => setZoomScale(Math.max(1, zoomScale - 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition flex items-center space-x-1"
              title="झूम कमी करा"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 font-bold tracking-wider select-none">
              Scaling {Math.round(zoomScale * 100)}%
            </span>
            <button 
              onClick={() => setZoomScale(Math.min(4, zoomScale + 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition flex items-center space-x-1"
              title="झूम वाढवा"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            
            <div className="h-4 w-px bg-slate-800"></div>

            <button 
              onClick={() => {
                setZoomScale(1.5);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition flex items-center space-x-1"
              title="रिसेट"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
