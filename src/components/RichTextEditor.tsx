import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Undo, Redo, Link, 
  Trash2, Smile, Sparkles, Type, Heading1, Heading2, 
  Quote, Palette, Highlighter, HelpCircle, Eye, FileText
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
  id?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'बातमी सविस्तर लिहा...', id = 'rich-editor' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isEditingRef = useRef(false);
  
  // Track counts
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);

  // Initialize and synchronise value
  useEffect(() => {
    if (editorRef.current) {
      if (!isEditingRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
        updateCounters(value || '');
      }
    }
    setHtmlValue(value || '');
  }, [value]);

  const updateCounters = (html: string) => {
    // Strip HTML to get plain text
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    const text = tempElement.textContent || tempElement.innerText || '';
    
    // Character count (including spaces)
    setCharCount(text.length);
    
    // Word count calculation
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.replace(/\s+/g, ' ').split(' ').length;
    setWordCount(words);
  };

  const emitChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      isEditingRef.current = true;
      onChange(html);
      updateCounters(html);
      setHtmlValue(html);
      // Reset the editing flag shortly after to allow outer updates if needed
      setTimeout(() => {
        isEditingRef.current = false;
      }, 50);
    }
  };

  const handleInput = () => {
    emitChange();
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlValue(val);
    onChange(val);
    updateCounters(val);
    if (editorRef.current) {
      editorRef.current.innerHTML = val;
    }
  };

  // Run document commands
  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    emitChange();
  };

  const applyHeading = (tag: string) => {
    executeCommand('formatBlock', tag);
  };

  const insertLink = () => {
    const url = prompt('कृपया लिंकचा पत्ता (URL) प्रविष्ट करा:', 'https://');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Helper colors
  const textColors = [
    { name: 'Default', value: '#1e293b' }, // slate-800
    { name: 'Rose Red', value: '#e11d48' }, // rose-600
    { name: 'Ocean Blue', value: '#0284c7' }, // sky-600
    { name: 'Emerald', value: '#10b981' }, // emerald-500
    { name: 'Amber', value: '#f59e0b' }, // amber-500
    { name: 'Deep Purple', value: '#8b5cf6' }, // violet-500
  ];

  const bgHighlightColors = [
    { name: 'Yellow Highlight', value: '#fef08a' }, // yellow-200
    { name: 'Green Highlight', value: '#bbf7d0' }, // green-200
    { name: 'Blue Highlight', value: '#bfdbfe' }, // blue-200
    { name: 'Pink Highlight', value: '#fbcfe8' }, // pink-200
    { name: 'Clear Highlight', value: 'transparent' },
  ];

  // Inserts a structured quote/notice block similar to MS Word Page Layout element styles
  const insertTemplateBlock = (type: 'quote' | 'alert' | 'highlight') => {
    let blockHtml = '';
    if (type === 'quote') {
      blockHtml = `<blockquote style="border-left: 4px solid #e11d48; padding-left: 16px; margin: 12px 0; font-style: italic; color: #475569; font-weight: 500;">"येथे महत्त्वाचे वक्तव्य किंवा अवतरण लिहा..."</blockquote><p></p>`;
    } else if (type === 'alert') {
      blockHtml = `<div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 12px 0; color: #991b1b; font-weight: 600;">⚠️ <strong>महत्त्वाची सूचना:</strong> येथे महत्त्वाची माहिती किंवा ताजी सूचना लिहा...</div><p></p>`;
    } else if (type === 'highlight') {
      blockHtml = `<div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 6px; margin: 12px 0; color: #166534; font-weight: 500;">⭐ <strong>विशेष बातमी / विश्लेषण:</strong> विशेष नोंदीचा मजकूर येथे लिहा...</div><p></p>`;
    }
    
    if (editorRef.current) {
      editorRef.current.focus();
      // Use insertHTML
      document.execCommand('insertHTML', false, blockHtml);
      emitChange();
    }
  };

  return (
    <div id={`${id}-container`} className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Word-like Professional Ribbon Toolbar */}
      <div className="bg-slate-50/80 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center select-none shrink-0 sticky top-0 z-10 backdrop-blur-xs">
        
        {/* Undo/Redo Group */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="मागे जा (Undo - Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="पुन्हा करा (Redo - Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        {/* Headings format Group */}
        <div className="flex items-center space-x-1 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => applyHeading('<p>')}
            className="px-2 py-1 text-[11px] font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer"
            title="सामान्य मजकूर (Paragraph)"
          >
            मजकूर
          </button>
          <button
            type="button"
            onClick={() => applyHeading('<h2>')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-0.5"
            title="मोठी हेडिंग (Heading 1)"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('<h3>')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-0.5"
            title="लहान हेडिंग (Heading 2)"
          >
            <Heading2 className="h-4 w-4" />
          </button>
        </div>

        {/* Font Weight/Style Group */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors font-extrabold cursor-pointer"
            title="ठळक करा (Bold - Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors italic cursor-pointer"
            title="तिरपे करा (Italic - Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors underline cursor-pointer"
            title="अधोरेखित करा (Underline - Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors line-through cursor-pointer"
            title="मजकूर खोडा (Strikethrough)"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
        </div>

        {/* Color Palette dropdown and Highlighting dropdown */}
        <div className="flex items-center space-x-1 border-r border-slate-200 pr-1.5 mr-1">
          {/* Font Color dropdown selection list */}
          <div className="relative group/color">
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="मजकूर अक्षरांचा रंग (Text Color)"
            >
              <Palette className="h-4 w-4 text-slate-700" />
              <span className="text-[9px] font-sans font-bold">रंग</span>
            </button>
            <div className="hidden group-focus-within/color:block hover:block absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg p-2 shadow-lg z-20 grid grid-cols-3 gap-1.5 min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 col-span-3 text-center pb-1">मजकूर रंग</p>
              {textColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => executeCommand('foreColor', color.value)}
                  style={{ backgroundColor: color.value === '#1e293b' ? '#fff' : color.value, borderColor: color.value }}
                  className="w-6 h-6 rounded-md hover:scale-110 active:scale-95 transition-all border shadow-3xs cursor-pointer"
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Highlight Color Picker selection list */}
          <div className="relative group/highlight">
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="मजकूर हायलाईट रंग (Background Highlight Color)"
            >
              <Highlighter className="h-4 w-4 text-amber-500" />
              <span className="text-[9px] font-sans font-bold">हायलाईट</span>
            </button>
            <div className="hidden group-focus-within/highlight:block hover:block absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg p-2 shadow-lg z-20 grid grid-cols-3 gap-1.5 min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 col-span-3 text-center pb-1">हायलाईट</p>
              {bgHighlightColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => executeCommand('hiliteColor', color.value)}
                  style={{ backgroundColor: color.value }}
                  className="w-6 h-6 rounded-md hover:scale-110 active:scale-95 transition-all border border-slate-200 shadow-3xs cursor-pointer"
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Text alignment Group */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="डावीकडे जुळवा (Align Left)"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="मध्यभागी जुळवा (Align Center)"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="उजवीकडे जुळवा (Align Right)"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="दोन्ही बाजूने जुळवा (Justify Align)"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>

        {/* Lists & Link insertion */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="बुलेट्स यादी (Bulleted List)"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="क्रमांकित यादी (Numbered List)"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white active:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="लिंक टाका (Insert Link)"
          >
            <Link className="h-4 w-4" />
          </button>
        </div>

        {/* Word templates designs (Pro Features Ribbon Layout) */}
        <div className="flex items-center space-x-1.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => insertTemplateBlock('quote')}
            className="px-2 py-1 text-[10px] font-extrabold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 transition-all flex items-center gap-0.5 cursor-pointer shadow-3xs"
            title="अवतरण डिझाईन टाका (Insert Blockquote)"
          >
            <Quote className="h-3 w-3" />
            <span>कोट ब्लॉक</span>
          </button>
          <button
            type="button"
            onClick={() => insertTemplateBlock('alert')}
            className="px-2 py-1 text-[10px] font-extrabold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 transition-all flex items-center gap-0.5 cursor-pointer shadow-3xs"
            title="ताजी नोटीस डिझाईन टाका (Insert Alert Box)"
          >
            <Sparkles className="h-3 w-3" />
            <span>सूचना खोका</span>
          </button>
        </div>

        {/* Clear / Options Group */}
        <div className="ml-auto flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1 border border-transparent hover:border-red-100"
            title="सर्व फॉर्मेटिंग काढून टाका (Clear Formatting)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">फॉर्मेटिंग पुसा</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHtml(!showHtml)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border transition-all flex items-center gap-1 cursor-pointer ${
              showHtml 
                ? 'bg-rose-600 border-rose-700 text-white shadow-xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="कोड एडिटर चालू/बंद करा (Toggle HTML Code View)"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{showHtml ? 'डिझाईन दृश्य' : 'HTML कोड'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas Body */}
      <div className="relative min-h-[300px] flex flex-col flex-1 bg-white">
        
        {/* Real Editor text container HTML mode */}
        {showHtml ? (
          <textarea
            value={htmlValue}
            onChange={handleHtmlChange}
            placeholder="या ठिकाणी बातमीची HTML कोड दाखवला जातो..."
            className="w-full h-full min-h-[300px] flex-1 font-mono p-4 text-xs font-medium text-amber-900 bg-slate-950 focus:outline-hidden resize-y select-text leading-relaxed selection:bg-rose-500/30 selection:text-white"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={emitChange}
            className="w-full min-h-[300px] max-h-[600px] overflow-y-auto flex-1 p-5 focus:outline-hidden text-sm text-slate-800 leading-relaxed font-sans prose max-w-none prose-slate prose-headings:font-bold border-none"
            style={{ 
              fontFamily: '"Inter", sans-serif',
              outline: 'none',
              direction: 'ltr'
            }}
          />
        )}

        {/* Placeholder label displayed when element is empty */}
        {!showHtml && (!value || value === '<p></p>' || value === '<br>' || value === '') && (
          <div className="absolute top-5 left-5 text-slate-400 text-xs font-semibold pointer-events-none italic select-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Ribbon Footer status-bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex justify-between items-center text-[10px] font-bold text-slate-400 font-sans select-none shrink-0 uppercase tracking-wider">
        <div className="flex items-center space-x-3.5">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>शब्द संख्या (Words) : <span className="text-slate-700 font-extrabold">{wordCount}</span></span>
          </span>
          <span>•</span>
          <span>अक्षरे (Characters) : <span className="text-slate-700 font-extrabold">{charCount}</span></span>
        </div>
        <div>
          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            मजकूर संपादक (Word Style Rich Text Enabled)
          </span>
        </div>
      </div>
    </div>
  );
}
