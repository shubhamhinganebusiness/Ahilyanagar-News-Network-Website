import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Download, 
  Trash2, 
  Type, 
  Sliders, 
  Palette, 
  FileText, 
  Check, 
  HelpCircle,
  Scissors
} from 'lucide-react';
import html2canvas from 'html2canvas';

// Type definitions for styled cutout tokens
interface CutoutToken {
  id: string;
  text: string;
  isSpace: boolean;
  isNewline: boolean;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  rotation: number;
  bgColor: string;
  textColor: string;
  borderRadius: string;
  padding: string;
  offsetY: number;
  boxShadow: string;
  hasTape: boolean;
  tapeRotation: number;
  tapeWidth: string;
  tapeOpacity: number;
  borderSkew: string;
}

interface Swatch {
  bg: string;
  isDark: boolean;
  name: string;
}

// Background Swatches for newspaper cuttings
const NEWSPRINT_SWATCHES: Swatch[] = [
  { bg: '#f2eae1', isDark: false, name: 'aged-pulp' },
  { bg: '#fbfcf7', isDark: false, name: 'chalk' },
  { bg: '#eceae2', isDark: false, name: 'eggshell' },
  { bg: '#dcd9cf', isDark: false, name: 'news-grey' },
  { bg: '#f5eecb', isDark: false, name: 'vintage-yellow' },
  { bg: '#eadabe', isDark: false, name: 'kraft-brown' },
  { bg: '#2b2c2a', isDark: true, name: 'charcoal-ink' },
  { bg: '#1c1c1a', isDark: true, name: 'vintage-black' }
];

const COLORFUL_SWATCHES: Swatch[] = [
  ...NEWSPRINT_SWATCHES,
  { bg: '#dc2626', isDark: true, name: 'crimson-tear' },
  { bg: '#ea580c', isDark: true, name: 'burnt-orange' },
  { bg: '#eab308', isDark: false, name: 'mustard' },
  { bg: '#16a34a', isDark: true, name: 'forest-pulp' },
  { bg: '#0d9488', isDark: true, name: 'vintage-teal' },
  { bg: '#2563eb', isDark: true, name: 'retro-blue' },
  { bg: '#db2777', isDark: true, name: 'acid-pink' },
  { bg: '#7c3aed', isDark: true, name: 'deep-purple' }
];

const LIGHT_TEXT_COLORS = ['#0f0f0f', '#241b12', '#0c1724', '#660b0d', '#112213', '#1e1b4b'];
const DARK_TEXT_COLORS = ['#f8fafc', '#fef9c3', '#e0f2fe', '#fce7f3', '#ccfbf1', '#ffedd5'];

const RECOGNIZED_FONTS = [
  'font-special', // Special Elite
  'font-playfair', // Playfair Display
  'font-bebas', // Bebas Neue
  'font-oswald', // Oswald
  'font-courier', // Courier Prime
  'font-abril', // Abril Fatface
  'font-lobster', // Lobster
  'font-serif',
  'font-sans',
  'font-mono'
];

interface RansomNoteGeneratorProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function RansomNoteGenerator({ addToast }: RansomNoteGeneratorProps) {
  // Input settings
  const [inputText, setInputText] = useState(
    "माझापत्र ब्रेकिंग!\n" +
    "सर्व वाचकांना कळविण्यात येते की\n" +
    "आता बातम्या अधिक डिजिटल आणि रोमांचक झाल्या आहेत."
  );
  
  const [chaosLevel, setChaosLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [splitMode, setSplitMode] = useState<'word' | 'letter'>('word');
  const [colorMode, setColorMode] = useState<'newsprint' | 'colorful'>('colorful');
  
  const [tokens, setTokens] = useState<CutoutToken[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Randomization function matching the requested core cutout rendering engine math
  const styleToken = (txt: string, isSpace = false, isNewline = false): CutoutToken => {
    const id = Math.random().toString(36).substring(2, 9);
    
    if (isNewline) {
      return {
        id, text: '\n', isSpace: false, isNewline: true,
        fontFamily: '', fontSize: '', fontWeight: '', rotation: 0,
        bgColor: '', textColor: '', borderRadius: '', padding: '',
        offsetY: 0, boxShadow: '', hasTape: false, tapeRotation: 0,
        tapeWidth: '', tapeOpacity: 0, borderSkew: ''
      };
    }
    
    if (isSpace) {
      return {
        id, text: ' ', isSpace: true, isNewline: false,
        fontFamily: '', fontSize: '', fontWeight: '', rotation: 0,
        bgColor: '', textColor: '', borderRadius: '', padding: '',
        offsetY: 0, boxShadow: '', hasTape: false, tapeRotation: 0,
        tapeWidth: '', tapeOpacity: 0, borderSkew: ''
      };
    }

    // Determine typography properties
    const randFamily = RECOGNIZED_FONTS[Math.floor(Math.random() * RECOGNIZED_FONTS.length)];
    const fontWeights = ['font-normal', 'font-semibold', 'font-black'];
    const randWeight = fontWeights[Math.floor(Math.random() * fontWeights.length)];
    
    // Scale features based on Chaos slider
    let minSize = 20, maxSize = 38, maxRotate = 6, maxOffset = 3;
    if (chaosLevel === 'low') {
      minSize = 22; maxSize = 30; maxRotate = 4; maxOffset = 1;
    } else if (chaosLevel === 'high') {
      minSize = 16; maxSize = 52; maxRotate = 20; maxOffset = 10;
    }
    
    const sizeVal = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const rotateVal = (Math.random() * maxRotate * 2) - maxRotate;
    const offsetVal = (Math.random() * maxOffset * 2) - maxOffset;

    // Determine colors
    const colorsList = colorMode === 'newsprint' ? NEWSPRINT_SWATCHES : COLORFUL_SWATCHES;
    const selectedSwatch = colorsList[Math.floor(Math.random() * colorsList.length)];
    
    let finalTextColor = '';
    if (selectedSwatch.isDark) {
      finalTextColor = DARK_TEXT_COLORS[Math.floor(Math.random() * DARK_TEXT_COLORS.length)];
    } else {
      finalTextColor = LIGHT_TEXT_COLORS[Math.floor(Math.random() * LIGHT_TEXT_COLORS.length)];
    }

    // Irregular torn margins (mimicking physical clippings)
    const tl = Math.floor(Math.random() * 9) + 2; 
    const tr = Math.floor(Math.random() * 9) + 2; 
    const bl = Math.floor(Math.random() * 9) + 2; 
    const br = Math.floor(Math.random() * 9) + 2; 
    const borderRadStr = `${tl}px ${tr}px ${bl}px ${br}px`;
    
    // Slight tactile box shadow representing physical thickness
    const shadowIntensity = Math.random() * 0.15 + 0.15;
    const shadowDistX = Math.random() * 2 + 1;
    const shadowDistY = Math.random() * 3 + 2;
    const boxShadowStr = `${shadowDistX.toFixed(1)}px ${shadowDistY.toFixed(1)}px 5px rgba(0,0,0,${shadowIntensity.toFixed(2)})`;

    // Tape/glue probabilities
    const rollTape = Math.random() < 0.15; // 15% chance
    const tapeRot = (Math.random() * 25) - 12;
    const tapeW = `${Math.floor(Math.random() * 20) + 60}%`; // 60% to 80%
    const tapeOp = Math.random() * 0.2 + 0.55; // 0.55 to 0.75opacity

    const pY = Math.floor(Math.random() * 4) + 6; // Padding variables
    const pX = Math.floor(Math.random() * 6) + 12;

    return {
      id,
      text: txt,
      isSpace: false,
      isNewline: false,
      fontFamily: randFamily,
      fontSize: `${sizeVal}px`,
      fontWeight: randWeight,
      rotation: rotateVal,
      bgColor: selectedSwatch.bg,
      textColor: finalTextColor,
      borderRadius: borderRadStr,
      padding: `${pY}px ${pX}px`,
      offsetY: offsetVal,
      boxShadow: boxShadowStr,
      hasTape: rollTape,
      tapeRotation: tapeRot,
      tapeWidth: tapeW,
      tapeOpacity: tapeOp,
      borderSkew: `skew(${(Math.random() * 4 - 2).toFixed(1)}deg)`
    };
  };

  const generateCutout = () => {
    if (!inputText.trim()) {
      addToast('कृपया रॅन्सम-नोट बनवण्यासाठी काहीतरी मजकूर टाईप करा!', 'error');
      return;
    }

    const lines = inputText.split('\n');
    const newTokens: CutoutToken[] = [];

    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        newTokens.push(styleToken('\n', false, true));
      }

      if (splitMode === 'word') {
        const words = line.split(/(\s+)/);
        words.forEach((piece) => {
          if (!piece) return;
          if (/\s+/.test(piece)) {
            // Space Token
            newTokens.push(styleToken(' ', true));
          } else {
            // Word Token
            newTokens.push(styleToken(piece));
          }
        });
      } else {
        // Character mode
        const chars = line.split('');
        chars.forEach((char) => {
          if (char === ' ') {
            newTokens.push(styleToken(' ', true));
          } else {
            newTokens.push(styleToken(char));
          }
        });
      }
    });

    setTokens(newTokens);
    addToast('मजकूर यशस्वीरित्या वर्तमानपत्र कटआउट शैलीत परावर्तित केला!', 'success');
  };

  const reshuffleStyles = () => {
    if (tokens.length === 0) return;
    const reshuffled = tokens.map((tok) => {
      if (tok.isSpace || tok.isNewline) return tok;
      return {
        ...tok,
        ...styleToken(tok.text)
      };
    });
    setTokens(reshuffled);
    addToast('सर्व कटआउटची अक्षरे आणि नक्षीकाम पुन्हा बदलले!', 'info');
  };

  const handleCopyAsImage = async () => {
    if (!canvasRef.current || tokens.length === 0) {
      addToast('स्क्रीनशॉट घेण्यासाठी कोणतीही कटआउट रचना अद्याप तयार नाही.', 'error');
      return;
    }
    
    setIsDownloading(true);
    addToast('चित्र तयार केले जात आहे, कृपया क्षणभर प्रतीक्षा करा...', 'info');

    try {
      // Small timeout to allow render pipelines to cool off
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#bc9c71',
        scale: 2.2, // crystal clear crisp print scaling
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: -window.scrollY
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `मजकूर_रॅन्सम_नोट_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      addToast('🖼️ वृत्तपत्र कर्टिंग नोट चित्र (PNG) यशस्वीरित्या तयार झाले!', 'success');
    } catch (err) {
      console.error('Html2canvas snapshot failed:', err);
      addToast('प्रतिमा काढण्यात समस्या आली. कृपया पुन्हा क्लिक करा.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const clearCanvas = () => {
    setInputText('');
    setTokens([]);
    addToast('सर्व मजकूर आणि कॅनव्हास रिकामा केला गेला.', 'info');
  };

  // Generate on first mount automatically so user doesn't see an empty board
  useEffect(() => {
    generateCutout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaosLevel, splitMode, colorMode]);

  return (
    <div className="bg-[#121212] border border-slate-800 rounded-3xl p-4 sm:p-7 space-y-7 animate-fade-in text-slate-100 max-w-7xl mx-auto selection:bg-rose-600 selection:text-white" id="ransom-note-generator">
      {/* Editorial Title banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-600/10 text-rose-500 rounded-xl border border-rose-500/20 shadow-xs">
              <Scissors className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold font-special text-rose-550 uppercase tracking-wide flex items-center gap-2">
              <span>Ransom-Note Maker</span>
              <span className="text-[10px] bg-rose-950 text-rose-400 px-2 py-0.5 rounded-full border border-rose-900 font-sans font-black">AI-CLIPPINGS BETA</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl font-sans font-medium">
            मजकूर टाईप करा आणि त्याला जुन्या वर्तमानपत्राच्या छापील अक्षरांच्या स्वरूपात (Classic Newspaper Cutouts/Ransom Note) रूपांतरित करा. प्रत्येक अक्षर स्वतंत्र आकार, फॉन्ट आणि फिरवलेल्या कोनात भासेल.
          </p>
        </div>
        
        {/* Special theme tags */}
        <div className="flex items-center space-x-2 text-[11px] font-sans text-slate-400 self-start md:self-center font-bold">
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="font-special text-rose-500">GRITTY PHY-TECH EDITORIAL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Text Input controls & options */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Note input block */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-rose-500 font-special uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="h-4 w-4" />
                <span>आपला मजकूर लिहा (Enter Text)</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-black/40 px-2.5 py-1 rounded-md">
                {inputText.length} अक्षरे
              </span>
            </div>

            <textarea
              className="w-full h-44 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-rose-600 focus:ring-1 focus:ring-rose-950 font-sans font-medium transition-all resize-none leading-relaxed"
              placeholder="तुमची गुप्त संदेश किंवा प्रतिक्रिया येथे लिहा..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {/* Quick Presets Buttons */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setInputText("ब्रेकिंग न्यूज !\nमाझापत्र वृत्तवाहिनी सर्वोत्तम आहे.");
                  addToast('प्रेसेट मजकूर सेट केला.', 'info');
                }}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                #१ साधे हेडिंग
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText("अतिशय गुप्त माहिती !\nहा संदेश वाचताच नष्ट करावा.");
                  addToast('प्रेसेट मजकूर सेट केला.', 'info');
                }}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                #२ सिक्रेट मेसेज
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText("लक्ष द्या !!\nसत्य लपवून लपत नाही.");
                  addToast('प्रेसेट मजकूर सेट केला.', 'info');
                }}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                #३ कडक चेतावणी
              </button>
            </div>
          </div>

          {/* Core Settings Block */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
            <h4 className="text-xs font-black text-rose-500 font-special uppercase tracking-wider flex items-center space-x-1.5 border-b border-neutral-800/60 pb-2">
              <Sliders className="h-4 w-4 text-rose-500" />
              <span>कस्टम पर्याय (Options Control)</span>
            </h4>

            {/* Chaos Level Select slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">अवजडपणा / भिन्नता (Chaos Level)</span>
                <span className="text-rose-500 font-mono capitalize">
                  {chaosLevel === 'low' && 'कमी (Subtle)'}
                  {chaosLevel === 'medium' && 'मध्यम (Moderate)'}
                  {chaosLevel === 'high' && 'जास्त (Extreme Jitter)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setChaosLevel('low')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    chaosLevel === 'low' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Low
                </button>
                <button
                  type="button"
                  onClick={() => setChaosLevel('medium')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    chaosLevel === 'medium' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setChaosLevel('high')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    chaosLevel === 'high' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  High
                </button>
              </div>
            </div>

            {/* Render Split mode options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">कापणीची पद्धत (Split Unit Mode)</span>
                <span className="text-rose-500 font-mono">
                  {splitMode === 'word' ? 'शब्द-रूपांतर (Per Word)' : 'अक्षरशः (Per Letter)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSplitMode('word')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'word' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="अक्ख्या शब्दाला एकाच धाग्यात कापणे"
                >
                  Per Word
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('letter')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'letter' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="प्रत्येक अक्षराला सुटसुटीत कापून विस्कळीत करणे"
                >
                  Per Letter
                </button>
              </div>
            </div>

            {/* Color Palette setting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">रंग संगती (Color Theme Mood)</span>
                <span className="text-rose-500 font-mono capitalize">
                  {colorMode === 'newsprint' ? 'काळा आणि पांढरा (Newsprint)' : 'रंगीबेरंगी (Vibrant)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setColorMode('newsprint')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    colorMode === 'newsprint' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Newsprint
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('colorful')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    colorMode === 'colorful' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Colorful
                </button>
              </div>
            </div>

          </div>

          {/* Action Chrome row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={clearCanvas}
              type="button"
              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-slate-300 font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm font-special flex items-center justify-center space-x-1.5 cursor-pointer shadow-3xs transition-transform active:scale-95"
            >
              <Trash2 className="h-4.5 w-4.5 text-rose-500" />
              <span>कॅनव्हास साफ करा</span>
            </button>

            <button
              onClick={generateCutout}
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm font-special flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs hover:shadow-lg transition-all active:scale-95"
            >
              <Sparkles className="h-4.5 w-4.5" />
              <span>कटआउट बनवा !</span>
            </button>
          </div>

        </div>

        {/* Right column: Dark Cork notice board rendering canvas */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Label panel */}
          <div className="flex items-center justify-between text-xs font-bold px-1 font-special uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Type className="h-4 w-4 text-rose-500" />
              <span>कॉर्ड-बोर्ड थिअटर कॅनव्हास (Cork-Board Preview)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              *प्रतिमेचा व्हिज्युअल फील भौतिक कोलाज प्रमाणे आहे
            </span>
          </div>

          {/* Natural cork board structure */}
          <div 
            className="relative overflow-hidden border-[14px] border-[#442c1f] rounded-3xl shadow-xl bg-slate-900 group"
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.7)',
            }}
          >
            {/* Corner pins simulation representing real notice board thumbtacks */}
            <div className="absolute top-2.5 left-2.5 w-4 h-4 bg-rose-600 rounded-full shadow-md z-30 border border-rose-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
            </div>
            <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-emerald-600 rounded-full shadow-md z-30 border border-emerald-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
            </div>
            <div className="absolute bottom-2.5 left-2.5 w-4 h-4 bg-amber-500 rounded-full shadow-md z-30 border border-amber-300 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
            </div>
            <div className="absolute bottom-2.5 right-2.5 w-4 h-4 bg-blue-600 rounded-full shadow-md z-30 border border-blue-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
            </div>

            {/* Cork background surface */}
            <div 
              ref={canvasRef}
              className="w-full min-h-[420px] max-h-[580px] overflow-y-auto p-8 sm:p-12 transition-all block relative"
              style={{
                backgroundColor: '#c8a97e',
                backgroundImage: `
                  radial-gradient(rgba(171, 142, 101, 0.55) 20%, transparent 20%),
                  radial-gradient(rgba(171, 142, 101, 0.45) 20%, transparent 25%)
                `,
                backgroundSize: '10px 10px',
                backgroundPosition: '0 0, 5px 5px',
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.25)',
              }}
            >
              {/* Subtle dust and grunge noise overlay filters (Pointer Events None) */}
              <div 
                className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay opacity-30 select-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
              />
              <div 
                className="absolute inset-0 pointer-events-none z-20 mix-blend-multiply opacity-[0.06] select-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter2'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.05' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter2)'/%3E%3C/svg%3E")`,
                }}
              />

              {tokens.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-xs">
                  <Scissors className="h-10 w-10 text-rose-500 mb-3 animate-bounce" />
                  <p className="text-base font-bold text-white font-special">काहीतरी मजकुराची नोंद घ्या</p>
                  <p className="text-xs text-slate-300 mt-1 font-sans">
                    तुमचे आवडता मजकूर लिहून 'कटआउट बनवा' पर्यायावर क्लिक करा.
                  </p>
                </div>
              ) : (
                <div className="h-full w-full flex flex-wrap content-start items-center justify-start gap-y-6 gap-x-1.5 leading-none">
                  {tokens.map((token, index) => {
                    if (token.isNewline) {
                      // Line break render to maintain paragraph block structuring
                      return <div key={token.id} className="w-full h-2" />;
                    }

                    if (token.isSpace) {
                      // Render horizontal word spacing gap
                      return <div key={token.id} className="w-4 h-4 inline-block select-none" />;
                    }

                    return (
                      <span
                        key={token.id}
                        className={`inline-flex relative select-none cursor-grab active:cursor-grabbing transition-all hover:scale-105 duration-200 text-center items-center justify-center font-sans tracking-tight animate-fade-in`}
                        style={{
                          backgroundColor: token.bgColor,
                          color: token.textColor,
                          fontFamily: token.fontFamily.replace('font-', ''),
                          fontSize: token.fontSize,
                          fontWeight: token.fontWeight === 'font-black' ? 900 : token.fontWeight === 'font-semibold' ? 600 : 'normal',
                          transform: `rotate(${token.rotation}deg) translateY(${token.offsetY}px) ${token.borderSkew}`,
                          borderRadius: token.borderRadius,
                          padding: token.padding,
                          boxShadow: token.boxShadow,
                          userSelect: 'none',
                          animationDelay: `${index * 12}ms`,
                          border: '1.2px solid rgba(255,255,255,0.18)',
                          textShadow: token.bgColor.startsWith('#2b') || token.bgColor.startsWith('#1c') ? '0 1px 1px rgba(0,0,0,0.2)' : 'none',
                        }}
                      >
                        {/* Cutout details & tape */}
                        {token.hasTape && (
                          <div 
                            className="absolute pointer-events-none bg-[rgba(251,243,219,0.45)] border-l border-r border-white/20"
                            style={{
                              top: '-9px',
                              left: '50%',
                              transform: `translateX(-50%) rotate(${token.tapeRotation}deg)`,
                              width: token.tapeWidth,
                              height: '13px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              opacity: token.tapeOpacity,
                              zIndex: 20
                            }}
                          />
                        )}

                        {/* Subtle distressed paper inset line styling */}
                        <span className="absolute inset-0.5 border border-white/10 pointer-events-none rounded-[inherit]"></span>

                        <span className="relative z-10 leading-normal block">
                          {token.text}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Operation Triggers footer for board tool */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-[10px] sm:text-xs font-sans text-slate-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center space-x-1 self-start font-bold">
              <span className="text-amber-500">★</span>
              <span>कॅनव्हासमधील प्रत्येक तुकडा भौतिकरित्या कापल्यासारखा वाटेल!</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reshuffleStyles}
                disabled={tokens.length === 0}
                className={`bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-slate-100 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm font-special flex items-center justify-center space-x-2 shadow-3xs cursor-pointer select-none transition-transform active:scale-95 duration-200 ${
                  tokens.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title="अक्षरांच्या रंगांची आणि फॉन्टची पुनरावृत्ती करा"
              >
                <span>🔀</span>
                <span>पुनर्संगठित करा (Reshuffle)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAsImage}
                disabled={tokens.length === 0 || isDownloading}
                className={`bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm font-special flex items-center justify-center space-x-2 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95 duration-200 select-none ${
                  (tokens.length === 0 || isDownloading) ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {isDownloading ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin text-white">⚙️</span>
                    <span>तयार होत आहे...</span>
                  </span>
                ) : (
                  <>
                    <Download className="h-4.5 w-4.5" />
                    <span>डाऊनलोड करा (PNG)</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Decorative Tips info banner */}
      <div className="border border-neutral-800/80 bg-neutral-950 p-4 rounded-2xl flex items-start space-x-3.5 shadow-sm text-slate-400 text-xs font-sans">
        <HelpCircle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
        <div className="space-y-1 font-medium">
          <p className="font-bold text-slate-200">
            रॅन्सम-नोट कटिंग जनरेटर माहिती मार्गदर्शक (Note Clipping Guidelines):
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li><strong>शब्द-रूपांतर (Per Word) mode</strong> मजकूर स्पष्ट आणि वाचनीय ठेवण्यासाठी सर्वोत्तम आहे, कारण यामध्ये प्रत्येक संपूर्ण शब्द एकाच चिठ्ठीवर उमटतो.</li>
            <li><strong>अक्षरशः (Per Letter) mode</strong> एक अस्सल आणि विचित्र रॅन्सम-नोट लूक देतो, कारण यामध्ये कणाकणाचे तुकडे विस्कळीत होतात.</li>
            <li><strong>Chaos Level :</strong> 'High' मोडवर फिरणे अक्षरांचे आकारमान (FontSize) आणि चुकीचे कोन (Rotate angle) वाढवून खरी अव्यवस्थित गोंधळ प्रणाली तयार करते.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
