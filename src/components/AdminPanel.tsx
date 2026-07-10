import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from '../utils/safeStorage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Newspaper, KeyRound, User, PlusCircle, Trash2, LogOut, CheckCircle2, AlertCircle, Eye, EyeOff, Calendar, FileText, Settings, Sparkles, Building2, MapPin, Phone, Mail, Copyright, Copy, Check, ArrowDownToLine, Megaphone, Tv, AlertTriangle, Images, Upload, Twitter, Facebook, Instagram, Link, Pencil, LayoutDashboard, BarChart3, TrendingUp, Users, ShieldCheck, Activity, Flame, Smartphone, Tablet, Laptop, Clock, Plus, FolderOpen, Database, Crop, X } from 'lucide-react';
import { News, CategoryType, SiteCustomization, BrandAdSlide } from '../types';
import { getYouTubeId } from './LiveTvSection';
import RichTextEditor from './RichTextEditor';
import RansomNoteGenerator from './RansomNoteGenerator';
import AuthorLoginsPanel from './AuthorLoginsPanel';
import D3Analytics from './D3Analytics';
import GoogleDrivePanel from './GoogleDrivePanel';
import PollsPanel from './PollsPanel';
import LogsPanel from './LogsPanel';
import { syncAllSiteData } from '../utils/googleDrive';
import { firebaseAppletConfig } from '../firebase-config-fallback';

interface AdminPanelProps {
  onBackToHome: () => void;
  newsList: News[];
  refreshNews: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  siteSettings: SiteCustomization;
  onSaveSettings: () => void;
  googleAccessToken: string | null;
  onGoogleAccessTokenChange?: (token: string | null) => void;
  onGoogleLogin: () => Promise<void>;
}

export default function AdminPanel({ 
  onBackToHome, 
  newsList, 
  refreshNews, 
  addToast, 
  siteSettings, 
  onSaveSettings,
  googleAccessToken,
  onGoogleAccessTokenChange,
  onGoogleLogin
}: AdminPanelProps) {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'author' | null>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dynamic Auth Headers Helper
  const getAuthHeader = () => {
    return sessionStorage.getItem('mp_auth_token') || 'Basic YWRtaW46bWFyYXRoaUAxMjM=';
  };

  // Form States to Add News
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('राज्य');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [author, setAuthor] = useState('माझापत्र प्रतिनिधी');
  const [videoURL, setVideoURL] = useState('');
  const [scheduledPublishDate, setScheduledPublishDate] = useState('');
  
  // Submit feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Logo Crop States & Refs
  const [logoCropImageSrc, setLogoCropImageSrc] = useState<string | null>(null);
  const [logoCropFileName, setLogoCropFileName] = useState<string>('logo.jpg');
  const [logoShowCropModal, setLogoShowCropModal] = useState<boolean>(false);
  const [logoCropZoom, setLogoCropZoom] = useState<number>(1);
  const [logoCropX, setLogoCropX] = useState<number>(0);
  const [logoCropY, setLogoCropY] = useState<number>(0);
  const [isDraggingLogoCrop, setIsDraggingLogoCrop] = useState<boolean>(false);
  const [logoDragStart, setLogoDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const logoCropImgRef = useRef<HTMLImageElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoCropImageSrc(reader.result as string);
      setLogoCropFileName(file.name);
      setLogoCropZoom(1);
      setLogoCropX(0);
      setLogoCropY(0);
      setLogoShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoCropSave = () => {
    if (!logoCropImgRef.current) return;
    const img = logoCropImgRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const displayedWidth = img.width;
    const displayedHeight = img.height;
    
    const naturalScaleX = img.naturalWidth / displayedWidth;
    const naturalScaleY = img.naturalHeight / displayedHeight;
    
    const containerSize = 320;
    const viewportSize = 200;
    const viewportLeft = (containerSize - viewportSize) / 2; // 60
    const viewportTop = (containerSize - viewportSize) / 2; // 60
    
    const imgLeft = (containerSize / 2) + logoCropX - ((displayedWidth * logoCropZoom) / 2);
    const imgTop = (containerSize / 2) + logoCropY - ((displayedHeight * logoCropZoom) / 2);
    
    const relativeX = (viewportLeft - imgLeft) / logoCropZoom;
    const relativeY = (viewportTop - imgTop) / logoCropZoom;
    const relativeWidth = viewportSize / logoCropZoom;
    const relativeHeight = viewportSize / logoCropZoom;
    
    const sx = relativeX * naturalScaleX;
    const sy = relativeY * naturalScaleY;
    const sWidth = relativeWidth * naturalScaleX;
    const sHeight = relativeHeight * naturalScaleY;
    
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 512, 512);
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const blob = base64ToBlob(croppedDataUrl);
    const croppedFile = new File([blob], logoCropFileName, { type: 'image/jpeg' });
    
    setLogoShowCropModal(false);
    handleDeviceUpload(null, 'logo', undefined, croppedFile);
  };

  const handleLogoCropMouseDown = (e: React.MouseEvent) => {
    setIsDraggingLogoCrop(true);
    setLogoDragStart({ x: e.clientX - logoCropX, y: e.clientY - logoCropY });
  };

  const handleLogoCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingLogoCrop) return;
    setLogoCropX(e.clientX - logoDragStart.x);
    setLogoCropY(e.clientY - logoDragStart.y);
  };

  const handleLogoCropMouseUp = () => {
    setIsDraggingLogoCrop(false);
  };

  const handleLogoCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingLogoCrop(true);
      const touch = e.touches[0];
      setLogoDragStart({ x: touch.clientX - logoCropX, y: touch.clientY - logoCropY });
    }
  };

  const handleLogoCropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingLogoCrop) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setLogoCropX(touch.clientX - logoDragStart.x);
      setLogoCropY(touch.clientY - logoDragStart.y);
    }
  };

  const handleLogoCropTouchEnd = () => {
    setIsDraggingLogoCrop(false);
  };

  // Custom iframe-friendly modal confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Deleting News Item Loading State
  const [deletingNewsId, setDeletingNewsId] = useState<string | null>(null);

  // AI Draft Generator States
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiCategory, setAiCategory] = useState<string>('राज्य');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<{
    title: string;
    category: string;
    description: string;
    plainTextContent: string;
    rawHtml: string;
    imageURL: string;
  } | null>(null);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const [showHTMLPreview, setShowHTMLPreview] = useState(false);

  const handleGenerateAIDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      addToast('कृपया बातमीचा मुख्य विषय एंटर करा.', 'error');
      return;
    }

    setIsGeneratingAI(true);
    setGeneratedDraft(null);
    setCopiedHTML(false);

    try {
      const res = await fetch('/api/news/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          keyPoints: aiKeyPoints.trim(),
          categorySuggestion: aiCategory
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI मसुदा तयार करण्यात अडचण आली.');
      }

      const data = await res.json();
      setGeneratedDraft(data);
      addToast('AI च्या साहाय्याने बातमी यशस्वीरित्या ड्राफ्ट केली गेली!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'तांत्रिक एरर आला. कृपया पुन्हा प्रयत्न करा.', 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyHTML = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft.rawHtml);
    setCopiedHTML(true);
    addToast('HTML कोड यशस्वीरित्या कॉपी केला गेला!', 'success');
    setTimeout(() => {
      setCopiedHTML(false);
    }, 3000);
  };

  const handlePopulateForm = () => {
    if (!generatedDraft) return;
    setTitle(generatedDraft.title || '');
    setCategory(generatedDraft.category || 'राज्य');
    setDescription(generatedDraft.description || '');
    setContent(generatedDraft.plainTextContent || '');
    setImageURL(generatedDraft.imageURL || '');
    setAuthor('AI News Desk');
    addToast('फॉर्म मधील सर्व तपशील यशस्वीरित्या भरले गेले!', 'success');
    
    // Smooth scroll down to the actual form so they can inspect/edit and publish
    setTimeout(() => {
      const entryForm = document.getElementById('news-entry-form');
      if (entryForm) {
        entryForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleSelectImageFromDrive = async (onSelect: (url: string) => void) => {
    if (!googleAccessToken) {
      addToast('कृपया प्रथम गुगल ड्राईव्ह कनेक्ट करा.', 'info');
      try {
        await onGoogleLogin();
      } catch (err) {
        console.error(err);
        addToast('गुगल लॉगिन अपूर्ण राहिले.', 'error');
        return;
      }
    }

    const loadPicker = () => {
      // @ts-ignore
      if (typeof google !== 'undefined' && google.picker) {
        createPicker();
      } else {
        // @ts-ignore
        if (typeof gapi !== 'undefined') {
          // @ts-ignore
          gapi.load('picker', {
            callback: () => {
              createPicker();
            }
          });
        } else {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            // @ts-ignore
            gapi.load('picker', {
              callback: () => {
                createPicker();
              }
            });
          };
          document.body.appendChild(script);
        }
      }
    };

    const createPicker = () => {
      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
          : window.location.origin;

      // @ts-ignore
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('image/png,image/jpeg,image/webp,image/gif');

      // @ts-ignore
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(googleAccessToken)
        .setCallback(async (data: any) => {
          // @ts-ignore
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            const fileId = file.id;
            const imgUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
            onSelect(imgUrl);
            addToast('गुगल ड्राईव्हवरून चित्र यशस्वीरित्या निवडले गेले!', 'success');
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    };

    loadPicker();
  };

  const handleQuickImportFromDrive = async () => {
    if (!googleAccessToken) {
      addToast('कृपया प्रथम गुगल ड्राईव्ह कनेक्ट करा.', 'info');
      try {
        await onGoogleLogin();
      } catch (err) {
        console.error(err);
        addToast('गुगल लॉगिन अपूर्ण राहिले.', 'error');
        return;
      }
    }

    const loadPicker = () => {
      // @ts-ignore
      if (typeof google !== 'undefined' && google.picker) {
        createPicker();
      } else {
        // @ts-ignore
        if (typeof gapi !== 'undefined') {
          // @ts-ignore
          gapi.load('picker', {
            callback: () => {
              createPicker();
            }
          });
        } else {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            // @ts-ignore
            gapi.load('picker', {
              callback: () => {
                createPicker();
              }
            });
          };
          document.body.appendChild(script);
        }
      }
    };

    const createPicker = () => {
      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
          : window.location.origin;

      // @ts-ignore
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('application/vnd.google-apps.document');

      // @ts-ignore
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(googleAccessToken)
        .setCallback(async (data: any) => {
          // @ts-ignore
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            const fileId = file.id;
            const fileName = file.name;

            addToast(`'${fileName}' वरून मजकूर आयात करत आहे...`, 'info');

            try {
              // 1. Fetch plain text for description
              const textRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
                headers: {
                  'Authorization': `Bearer ${googleAccessToken}`
                }
              });
              let descriptionText = '';
              if (textRes.ok) {
                const fullText = await textRes.text();
                descriptionText = fullText.slice(0, 180).replace(/\s+/g, ' ').trim();
                if (fullText.length > 180) descriptionText += '...';
              }

              // 2. Fetch HTML for rich-text editor content
              const htmlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`, {
                headers: {
                  'Authorization': `Bearer ${googleAccessToken}`
                }
              });

              if (!htmlRes.ok) {
                throw new Error('गुगल डॉक मसुदा आयात करण्यात अपयश आले.');
              }

              let htmlContent = await htmlRes.text();

              // Extract body content
              const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
              if (bodyMatch && bodyMatch[1]) {
                htmlContent = bodyMatch[1];
              }

              // Strip inline styles
              htmlContent = htmlContent.replace(/style="[^"]*"/g, '');

              setTitle(fileName);
              setContent(htmlContent);
              setDescription(descriptionText);
              addToast(`'${fileName}' यशस्वीरित्या मसुदा म्हणून आयात केले!`, 'success');
            } catch (err: any) {
              console.error(err);
              addToast('मसुदा आयात करताना त्रुटी आली: ' + err.message, 'error');
            }
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    };

    loadPicker();
  };

  // Site Customization states
  const [custChannelName, setCustChannelName] = useState(siteSettings?.channelName || '');
  const [custLogoText, setCustLogoText] = useState(siteSettings?.channelLogoText || '');
  const [custLogoAccentText, setCustLogoAccentText] = useState(siteSettings?.channelLogoAccentText || '');
  const [custTagline, setCustTagline] = useState(siteSettings?.channelTagline || '');
  const [custLogoUrl, setCustLogoUrl] = useState(siteSettings?.channelLogoUrl || '');
  const [custFooterAbout, setCustFooterAbout] = useState(siteSettings?.footerAbout || '');
  const [custFooterAddress, setCustFooterAddress] = useState(siteSettings?.footerAddress || '');
  const [custFooterPhone, setCustFooterPhone] = useState(siteSettings?.footerPhone || '');
  const [custFooterEmail, setCustFooterEmail] = useState(siteSettings?.footerEmail || '');
  const [custFooterCopyrightSub, setCustFooterCopyrightSub] = useState(siteSettings?.footerCopyrightSub || '');
  const [custBreakingNewsText, setCustBreakingNewsText] = useState<string>(() => siteSettings?.breakingNewsText || '');
  const [custTopBarTickerText, setCustTopBarTickerText] = useState<string>(() => siteSettings?.topBarTickerText || '');

  // Advanced Sponsor Slider Customization
  const [custBrandAdsTitle, setCustBrandAdsTitle] = useState(siteSettings?.brandAdsTitle || '');
  const [custBrandAdsSubtitle, setCustBrandAdsSubtitle] = useState(siteSettings?.brandAdsSubtitle || '');
  const [custBrandAdsInterval, setCustBrandAdsInterval] = useState<number>(siteSettings?.brandAdsInterval || 5);

  // Advanced Footer Customization
  const [custFooterBgColor, setCustFooterBgColor] = useState(siteSettings?.footerBgColor || '#0f172a');
  const [custFooterTextColor, setCustFooterTextColor] = useState(siteSettings?.footerTextColor || '#e2e8f0');
  const [custFooterSection1Title, setCustFooterSection1Title] = useState(siteSettings?.footerSection1Title || '');
  const [custFooterSection2Title, setCustFooterSection2Title] = useState(siteSettings?.footerSection2Title || '');
  const [custFooterSection3Title, setCustFooterSection3Title] = useState(siteSettings?.footerSection3Title || '');
  const [custFooterSection4Title, setCustFooterSection4Title] = useState(siteSettings?.footerSection4Title || '');
  const [custFooterNewsletterDesc, setCustFooterNewsletterDesc] = useState(siteSettings?.footerNewsletterDesc || '');

  // Custom Links
  const [custFooterLink1Text, setCustFooterLink1Text] = useState(siteSettings?.footerLink1Text || '');
  const [custFooterLink1Url, setCustFooterLink1Url] = useState(siteSettings?.footerLink1Url || '');
  const [custFooterLink2Text, setCustFooterLink2Text] = useState(siteSettings?.footerLink2Text || '');
  const [custFooterLink2Url, setCustFooterLink2Url] = useState(siteSettings?.footerLink2Url || '');
  const [custFooterLink3Text, setCustFooterLink3Text] = useState(siteSettings?.footerLink3Text || '');
  const [custFooterLink3Url, setCustFooterLink3Url] = useState(siteSettings?.footerLink3Url || '');
  const [custFooterLink4Text, setCustFooterLink4Text] = useState(siteSettings?.footerLink4Text || '');
  const [custFooterLink4Url, setCustFooterLink4Url] = useState(siteSettings?.footerLink4Url || '');
  const [custFooterLink5Text, setCustFooterLink5Text] = useState(siteSettings?.footerLink5Text || '');
  const [custFooterLink5Url, setCustFooterLink5Url] = useState(siteSettings?.footerLink5Url || '');
  const [custFooterLink6Text, setCustFooterLink6Text] = useState(siteSettings?.footerLink6Text || '');
  const [custFooterLink6Url, setCustFooterLink6Url] = useState(siteSettings?.footerLink6Url || '');

  // Ad Banner and Live TV states
  const [adBannerEnabled, setAdBannerEnabled] = useState<boolean>(() => siteSettings?.adBannerEnabled !== false);
  const [adBannerImageUrl, setAdBannerImageUrl] = useState<string>(() => siteSettings?.adBannerImageUrl || '');
  const [adBannerText, setAdBannerText] = useState<string>(() => siteSettings?.adBannerText || '');
  const [adBannerLink, setAdBannerLink] = useState<string>(() => siteSettings?.adBannerLink || '');
  const [adBannerBgColor, setAdBannerBgColor] = useState<string>(() => siteSettings?.adBannerBgColor || '#e11d48');
  const [liveTvUrl, setLiveTvUrl] = useState<string>(() => siteSettings?.liveTvUrl || '');
  const [enableFirebaseStorage, setEnableFirebaseStorage] = useState<boolean>(() => siteSettings?.enableFirebaseStorage === true);

  // Detailed Reading Page Advertisements (4 Ads) States
  const [detailAd1Enabled, setDetailAd1Enabled] = useState<boolean>(() => siteSettings?.detailAd1Enabled !== false);
  const [detailAd1ImageUrl, setDetailAd1ImageUrl] = useState<string>(() => siteSettings?.detailAd1ImageUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80');
  const [detailAd1Link, setDetailAd1Link] = useState<string>(() => siteSettings?.detailAd1Link || '#');

  const [detailAd2Enabled, setDetailAd2Enabled] = useState<boolean>(() => siteSettings?.detailAd2Enabled !== false);
  const [detailAd2ImageUrl, setDetailAd2ImageUrl] = useState<string>(() => siteSettings?.detailAd2ImageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80');
  const [detailAd2Link, setDetailAd2Link] = useState<string>(() => siteSettings?.detailAd2Link || '#');

  const [detailAd3Enabled, setDetailAd3Enabled] = useState<boolean>(() => siteSettings?.detailAd3Enabled !== false);
  const [detailAd3ImageUrl, setDetailAd3ImageUrl] = useState<string>(() => siteSettings?.detailAd3ImageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80');
  const [detailAd3Link, setDetailAd3Link] = useState<string>(() => siteSettings?.detailAd3Link || '#');

  const [detailAd4Enabled, setDetailAd4Enabled] = useState<boolean>(() => siteSettings?.detailAd4Enabled !== false);
  const [detailAd4ImageUrl, setDetailAd4ImageUrl] = useState<string>(() => siteSettings?.detailAd4ImageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80');
  const [detailAd4Link, setDetailAd4Link] = useState<string>(() => siteSettings?.detailAd4Link || '#');

  // Brand advertisement slider state variables
  const [brandAdsEnabled, setBrandAdsEnabled] = useState<boolean>(() => siteSettings?.brandAdsEnabled !== false);

  const [brandAdsSlides, setBrandAdsSlides] = useState<BrandAdSlide[]>(() => {
    return siteSettings?.brandAdsSlides || [
      {
        id: 'slide-1',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        linkUrl: '#',
        title: 'आमच्या न्यूज पोर्टलवर जाहिरात प्रसिद्ध करा व कोट्यवधी वाचकांपर्यंत पोहोचा!'
      },
      {
        id: 'slide-2',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        linkUrl: '#',
        title: 'विशेष औद्योगिक जाहिरात: उद्योजक आणि व्यावसायिकांसाठी उत्तम माध्यम'
      }
    ];
  });

  // Recent activities list state
  const [recentActivities, setRecentActivities] = useState<any[]>(() => {
    return siteSettings?.recentActivities || [];
  });

  // Slide addition state inputs
  const [newSlideImgUrl, setNewSlideImgUrl] = useState('');
  const [newSlideLinkUrl, setNewSlideLinkUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'news' | 'branding' | 'authors' | 'cutout' | 'author-logins' | 'google-drive' | 'polls' | 'logs'>('dashboard');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const handleImportDraftFromDrive = (
    importedTitle: string,
    htmlContent: string,
    importedDescription: string,
    existingArticleId?: string,
    existingArticleData?: any
  ) => {
    setTitle(importedTitle);
    setContent(htmlContent);
    setDescription(importedDescription);
    
    if (existingArticleId && existingArticleData) {
      setEditingArticleId(existingArticleId);
      setCategory(existingArticleData.category || 'राज्य');
      setImageURL(existingArticleData.imageURL || '');
      setAuthor(existingArticleData.author || 'माझापत्र प्रतिनिधी');
      setVideoURL(existingArticleData.videoURL || '');
      setNewsTags(existingArticleData.tags || []);
      setScheduledPublishDate(existingArticleData.scheduledPublishDate || '');
      addToast(`'${importedTitle}' बातमी संपादनासाठी लोड केली आहे. (Overwrite & Edit Mode)`, 'success');
    } else {
      setEditingArticleId(null);
      // Reset other news form fields to defaults for a fresh import
      setCategory('राज्य');
      setImageURL('');
      setAuthor('माझापत्र प्रतिनिधी');
      setVideoURL('');
      setNewsTags([]);
      setScheduledPublishDate('');
    }

    setActiveTab('news');
    setTimeout(() => {
      document.getElementById('news-publish-form-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Analytics states for D3.js visualization
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/analytics', {
        headers: {
          'Authorization': getAuthHeader()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // Dashboard pre-calculated metrics (Marathi Admin Panel)
  const totalViews = (newsList || []).reduce((sum, item) => sum + (item.views || 0), 0);
  const totalArticles = (newsList || []).length;
  
  // Calculate active layout advertisements
  let activeAdsCount = 0;
  if (siteSettings?.adBannerEnabled) activeAdsCount++;
  if (siteSettings?.detailAd1Enabled) activeAdsCount++;
  if (siteSettings?.detailAd2Enabled) activeAdsCount++;
  if (siteSettings?.detailAd3Enabled) activeAdsCount++;
  if (siteSettings?.detailAd4Enabled) activeAdsCount++;
  if (siteSettings?.brandAdsEnabled) activeAdsCount += (siteSettings.brandAdsSlides?.length || 0);

  // Retrieve top 5 read news articles
  const topArticles = [...(newsList || [])]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  const categoryCounts: Record<string, number> = {
    'राष्ट्रीय': 0,
    'राज्य': 0,
    'शहर': 0,
    'क्रीडा': 0,
    'मनोरंजन': 0,
    'अर्थव्यवस्था': 0,
  };
  (newsList || []).forEach(item => {
    if (item.category && categoryCounts[item.category] !== undefined) {
      categoryCounts[item.category]++;
    }
  });

  // Author profiles state list (synchronized with siteSettings)
  const [authorProfiles, setAuthorProfiles] = useState<any[]>([]);

  // Local state for Author Profiles editing form
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileTwitter, setProfileTwitter] = useState('');
  const [profileFacebook, setProfileFacebook] = useState('');
  const [profileInstagram, setProfileInstagram] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Local article tagging support
  const [newsTags, setNewsTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  // Enhanced Admin Dashboard States
  const [liveVisitors, setLiveVisitors] = useState(145);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  
  const [scratchpadItems, setScratchpadItems] = useState<{ id: string; text: string; category: string; done: boolean }[]>(() => {
    try {
      const stored = localStorage.getItem('majhapatra_scratchpad');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: '1', text: 'अहिल्यानगरमध्ये नवीन जिल्हा क्रीडा संकुलाचे काम वेगाने सुरू होणार', category: 'शहर', done: false },
      { id: '2', text: 'राहुरी कृषी विद्यापीठ शिफारशीत पावसाळ्यातील कापूस नियोजन', category: 'राज्य', done: true },
      { id: '3', text: 'या आठवड्यात जिल्ह्यात मुसळधार मान्सून पावसाचा इशारा (हवामान अंदाज)', category: 'शहर', done: false }
    ];
  });
  
  const [newScratchText, setNewScratchText] = useState('');
  const [newScratchCategory, setNewScratchCategory] = useState<string>('शहर');

  // Custom live visitor simulation & scratchpad local storage sync
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVisitors(prev => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
        return Math.max(110, Math.min(235, prev + delta));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('majhapatra_scratchpad', JSON.stringify(scratchpadItems));
    } catch (e) {
      console.error(e);
    }
  }, [scratchpadItems]);

  const toMarathiDigits = (num: number | string) => {
    const numerals: { [key: string]: string } = {
      '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
      '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
    };
    return num.toString().split('').map(d => numerals[d] || d).join('');
  };

  const handleAddScratchpadItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScratchText.trim()) return;
    const newItem = {
      id: String(Date.now()),
      text: newScratchText.trim(),
      category: newScratchCategory,
      done: false
    };
    setScratchpadItems([newItem, ...scratchpadItems]);
    setNewScratchText('');
    addToast('नवीन मसुदा विचार यशस्वीरित्या जोडला गेला!', 'success');
  };

  const handleToggleScratchpad = (id: string) => {
    setScratchpadItems(scratchpadItems.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const handleDeleteScratchpad = (id: string) => {
    setScratchpadItems(scratchpadItems.filter(item => item.id !== id));
    addToast('मसुदा विचार काढून टाकला.', 'info');
  };

  const handlePopulateFromScratch = (text: string, cat: string) => {
    setTitle(text);
    setCategory(cat as any);
    setAuthor(userRole === 'author' ? userName : 'माझापत्र प्रतिनिधी');
    addToast(`"${text}" हा मसुदा बातमी फॉर्ममध्ये लोड केला गेला!`, 'success');
    
    // Smooth scroll down to the actual form
    setTimeout(() => {
      const entryForm = document.getElementById('news-entry-form');
      if (entryForm) {
        entryForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const hourlyStats = [
    { hour: '12 AM', views: 420 },
    { hour: '03 AM', views: 180 },
    { hour: '06 AM', views: 890 },
    { hour: '09 AM', views: 2450 },
    { hour: '12 PM', views: 3100 },
    { hour: '03 PM', views: 1950 },
    { hour: '06 PM', views: 4205 },
    { hour: '09 PM', views: 3800 },
  ];

  // Image Cropping & Resizing Utility States
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<string | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<'16:9' | '4:3' | '1:1' | 'free'>('16:9');
  const [cropZoom, setCropZoom] = useState(100);
  const [cropOffsetX, setCropOffsetX] = useState(50); // % percentage
  const [cropOffsetY, setCropOffsetY] = useState(50); // % percentage
  const [resizeWidth, setResizeWidth] = useState(800); // px
  const [showCropperPane, setShowCropperPane] = useState(false);
  const [cropTargetField, setCropTargetField] = useState<'news' | 'banner' | 'slide' | 'detailAd1' | 'detailAd2' | 'detailAd3' | 'detailAd4' | null>(null);
  const [cropTargetIndex, setCropTargetIndex] = useState<number | undefined>(undefined);
  
  // Custom Handler to apply crop on raw canvas
  const handleApplyCrop = () => {
    if (!selectedFileForCrop) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Determine dimensions based on selected target width and aspect ratio
      let targetW = resizeWidth;
      let targetH = targetW;
      if (cropAspectRatio === '16:9') targetH = Math.round(targetW * 9 / 16);
      else if (cropAspectRatio === '4:3') targetH = Math.round(targetW * 3 / 4);
      else if (cropAspectRatio === '1:1') targetH = targetW;
      else if (cropAspectRatio === 'free') {
        const nativeRatio = img.height / img.width;
        targetH = Math.round(targetW * nativeRatio);
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const scaleVal = cropZoom / 100;
      const frameRatio = targetW / targetH;
      const imgRatio = img.width / img.height;
      
      let maxSrcW = img.width;
      let maxSrcH = img.height;
      
      if (imgRatio > frameRatio) {
        maxSrcW = img.height * frameRatio;
      } else {
        maxSrcH = img.width / frameRatio;
      }
      
      const srcW = maxSrcW / scaleVal;
      const srcH = maxSrcH / scaleVal;
      
      // Calculate start coordinates using offsets (0 to 100 range)
      const rangeX = img.width - srcW;
      const rangeY = img.height - srcH;
      
      const srcX = Math.max(0, Math.min(img.width - srcW, rangeX * (cropOffsetX / 100)));
      const srcY = Math.max(0, Math.min(img.height - srcH, rangeY * (cropOffsetY / 100)));

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      // Convert to Base64 (JPG Base64 fits perfectly in standard News.imageURL)
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      
      if (cropTargetField && cropTargetField !== 'news') {
        const blob = base64ToBlob(croppedBase64);
        const croppedFile = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });
        setSelectedFileForCrop(null);
        setShowCropperPane(false);
        // Upload the cropped file directly
        handleDeviceUpload(null, cropTargetField, cropTargetIndex, croppedFile);
      } else {
        setImageURL(croppedBase64);
        setSelectedFileForCrop(null);
        setShowCropperPane(false);
        setCropTargetField(null);
        setCropTargetIndex(undefined);
        addToast('मुख्य प्रतिमा यशस्वीरित्या क्रॉप व आकुंचन (cropped & resized) केली गेली!', 'success');
      }
    };
    img.onerror = () => {
      addToast('प्रतिमा लोड करण्यात अडचण आली. कृपया वैध URL तपासा किंवा स्थानिक फाईल पुन्हा सिलेक्ट करा.', 'error');
    };
    img.src = selectedFileForCrop;
  };

  // Convert local uploaded file to base64 Data URL to allow offline mock files cropping instantly
  const handleLocalFileSelection = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'news' | 'banner' | 'slide' | 'detailAd1' | 'detailAd2' | 'detailAd3' | 'detailAd4' = 'news', slideIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropTargetField(targetField);
    setCropTargetIndex(slideIndex);

    if (targetField === 'news' || targetField === 'banner' || targetField === 'slide') {
      setCropAspectRatio('16:9');
    } else {
      setCropAspectRatio('free');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFileForCrop(event.target.result as string);
        setShowCropperPane(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Client-side base64 to Blob helper that does NOT make network calls (prevents CSP/CORS net::ERR_FAILED in sandboxed frames)
  const base64ToBlob = (base64Str: string): Blob => {
    try {
      const parts = base64Str.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      const raw = window.atob(parts[1] || parts[0]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    } catch (err) {
      console.error('base64ToBlob error, creating simple fallback blob:', err);
      return new Blob([], { type: 'image/jpeg' });
    }
  };

  // Client-side image compression and resizing helper to prevent 1MB Firestore & proxy limits
  const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.78): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Determine the target compression format
          // To ensure extremely lightweight payloads and bypass server limitations (like Hostinger's 2MB/1MB post limits),
          // we force heavy formats like PNG/GIF to highly-compressed JPEGs.
          let targetMime = 'image/jpeg';
          if (base64Str.startsWith('data:image/webp')) {
            targetMime = 'image/webp';
          }

          // If target is JPEG, fill the canvas with a solid white background first
          // to gracefully handle any transparency (e.g. transparent PNG logos/avatars) without turning transparent areas black
          if (targetMime === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Generate the compressed data URL
          const compressed = canvas.toDataURL(targetMime, quality);
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  // Device Image upload helper
  const [isUploading, setIsUploading] = useState<string | null>(null); // tracks which field is uploading
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement> | null, targetField: 'news' | 'logo' | 'banner' | 'slide' | 'detailAd1' | 'detailAd2' | 'detailAd3' | 'detailAd4' | 'authorAvatar', slideIndex?: number, directFile?: File) => {
    const file = e ? e.target.files?.[0] : directFile;
    if (!file) return;

    const tracker = slideIndex !== undefined ? `slide-${slideIndex}` : targetField;
    setIsUploading(tracker);
    setUploadProgress(10);
    setUploadStatusText('चित्राची फाईल तयार केली जात आहे...');
    addToast('डिव्हाइसवरून निवडलेल्या चित्राची प्रक्रिया सुरू आहे...', 'info');

    const reader = new FileReader();
    reader.onload = async (event) => {
      let base64Data = event.target?.result as string;
      if (!base64Data) {
        setIsUploading(null);
        setUploadProgress(0);
        setUploadStatusText('');
        addToast('इमेज वाचताना त्रुटी आली.', 'error');
        return;
      }

      setUploadProgress(20);
      setUploadStatusText('चित्र कॉम्प्रेस व रीसाईझ केले जात आहे...');

      try {
        // Highly optimized client-side compression to guarantee lightweight payloads (~15KB-50KB)
        // This easily bypasses hosting/cPanel server payload size limits (usually 1MB or 2MB)
        // and also bypasses security rules of LiteSpeed/ModSecurity firewalls.
        const maxDim = (targetField === 'logo' || targetField === 'authorAvatar') ? 300 : 800;
        base64Data = await compressImage(base64Data, maxDim, maxDim, 0.65);
      } catch (compressErr) {
        console.warn('Image compression failed, using original base64:', compressErr);
      }

      setUploadProgress(35);
      setUploadStatusText('चित्राची वाचन प्रक्रिया यशस्वी झाली, रूपांतर करत आहे...');

      try {
        let uploadedUrl = '';
        let firebaseConfig: any;
        let storageSuccess = false;

        // Try direct Firebase Storage first for any target field (logo, avatar, news, banner, slides, etc.)
        try {
          const configRes = await fetch('/api/auth/firebase-config');
          if (configRes.ok) {
            const configText = await configRes.text();
            try {
              firebaseConfig = JSON.parse(configText);
            } catch (e) {
              firebaseConfig = firebaseAppletConfig;
            }
          } else {
            firebaseConfig = firebaseAppletConfig;
          }
        } catch (err) {
          firebaseConfig = firebaseAppletConfig;
        }

        if (enableFirebaseStorage && firebaseConfig && firebaseConfig.apiKey) {
          try {
            setUploadProgress(45);
            setUploadStatusText('थेट क्लाउड स्टोरेजवर सुरक्षित अपलोड तपासत आहे...');
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
            const storage = getStorage(app);
            const folderName = targetField === 'slide' ? 'brand-ads' : `uploads/${targetField}`;
            const storageRef = ref(storage, `${folderName}/${Date.now()}-${file.name}`);
            
            // Convert compressed base64 data to blob
            const blob = base64ToBlob(base64Data);
            
            const uploadSnapshot = await uploadBytes(storageRef, blob);
            uploadedUrl = await getDownloadURL(uploadSnapshot.ref);
            storageSuccess = true;
            console.log('Successfully uploaded image directly to Firebase Storage:', uploadedUrl);
          } catch (storageErr: any) {
            console.warn('Firebase Storage direct upload failed or not enabled, falling back to server API:', storageErr);
          }
        }

        // If Firebase Storage was not used or failed, fall back to Server API
        if (!storageSuccess) {
          setUploadProgress(55);
          setUploadStatusText('गुगल ड्राईव्ह फोल्डर आणि सर्व्हर ऑथेंटिकेशन पडताळत आहे...');

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': getAuthHeader()
          };
          if (googleAccessToken) {
            headers['X-Google-Access-Token'] = googleAccessToken;
          }

          setUploadProgress(75);
          setUploadStatusText('चित्र सर्व्हर/गुगल ड्राईव्हवर सुरक्षित अपलोड केले जात आहे...');

          let res: Response;
          let uploadUrlUsed = '/api/upload';

          try {
            res = await fetch('/api/upload', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: file.name,
                data: base64Data,
                targetField
              })
            });
          } catch (fetchErr) {
            console.warn('POST /api/upload network error, trying alternative /api/media-store:', fetchErr);
            // Construct a mock response to trigger the next retry in the chain
            res = { ok: false, status: 404 } as Response;
          }

          // If blocked by keyword filters (like ModSecurity) or Passenger, try the alternative endpoint
          if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 500)) {
            console.log('Trying alternative upload endpoint: /api/media-store');
            uploadUrlUsed = '/api/media-store';
            try {
              res = await fetch('/api/media-store', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  name: file.name,
                  data: base64Data,
                  targetField
                })
              });
            } catch (fetchErr2) {
              console.warn('POST /api/media-store network error, trying /api/save-image:', fetchErr2);
              res = { ok: false, status: 404 } as Response;
            }
          }

          // Try one more alternative URL if still getting 404/403
          if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 500)) {
            console.log('Trying alternative upload endpoint: /api/save-image');
            uploadUrlUsed = '/api/save-image';
            try {
              res = await fetch('/api/save-image', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  name: file.name,
                  data: base64Data,
                  targetField
                })
              });
            } catch (fetchErr3) {
              console.warn('POST /api/save-image network error:', fetchErr3);
              res = { ok: false, status: 404 } as Response;
            }
          }

          if (!res.ok) {
            let errorMsg = '';
            try {
              const errData = await res.json();
              errorMsg = errData.error;
            } catch (jsonErr) {
              if (res.status === 413) {
                errorMsg = 'चित्र खूप मोठे आहे (Payload Too Large). कृपया लहान किंवा कॉम्प्रेस केलेले चित्र निवडा.';
              } else {
                errorMsg = `सर्व्हर एरर (HTTP ${res.status}): होस्टिंग सर्व्हरवर फाईल अपलोड मर्यादा किंवा फोल्डर परमिशन तपासा.`;
              }
            }
            throw new Error(errorMsg || `इमेज अपलोड करण्यात एरर आला (HTTP ${res.status}).`);
          }

          setUploadProgress(95);
          setUploadStatusText('सर्वरकडून प्रतिसाद स्वीकारला, लोड होत आहे...');

          const data = await res.json();
          uploadedUrl = data.url;
        }

        setUploadProgress(100);
        setUploadStatusText('अपलोड यशस्वीरित्या पूर्ण झाले!');

        // Set state based on target field
        if (targetField === 'news') {
          setImageURL(uploadedUrl);
          addToast('बातमीचे चित्र यशस्वीरित्या डिव्हाइसमधून अपलोड केले गेले!', 'success');
        } else if (targetField === 'logo') {
          setCustLogoUrl(uploadedUrl);
          addToast('प्रवाहित लोगो यशस्वीरित्या डिव्हाइसमधून अपलोड केला गेला!', 'success');
          await addActivityLog('डिव्हाइसमधून मुख्य लोगो चित्र बदलले.', { channelLogoUrl: uploadedUrl });
          await autoSaveBranding({ channelLogoUrl: uploadedUrl });
        } else if (targetField === 'banner') {
          setAdBannerImageUrl(uploadedUrl);
          addToast('जाहिरात बॅनर यशस्वीरित्या डिव्हाइसमधून अपलोड केला गेला!', 'success');
          await addActivityLog('होमपेजसाठी नवीन जाहिरात बॅनर चित्र अपलोड केले.', { adBannerImageUrl: uploadedUrl });
          await autoSaveBranding({ adBannerImageUrl: uploadedUrl });
        } else if (targetField === 'slide') {
          if (slideIndex !== undefined) {
            const updated = [...brandAdsSlides];
            if (updated[slideIndex]) {
              updated[slideIndex] = { ...updated[slideIndex], imageUrl: uploadedUrl };
            }
            setBrandAdsSlides(updated);
            addToast('या जाहिरात स्लाईडचे चित्र यशस्वीरित्या बदलले गेले!', 'success');
            await addActivityLog(`विशेष जाहिरात स्लाईड क्र. ${slideIndex + 1} चे चित्र बदलले.`, { brandAdsSlides: updated });
            await autoSaveBranding({ brandAdsSlides: updated });
          } else {
            setNewSlideImgUrl(uploadedUrl);
            addToast('जाहिरात स्लाईड यशस्वीरित्या डिव्हाइसमधून अपलोड केली गेली! जोडण्यासाठी "जोडा" बटन दाबा.', 'success');
          }
        } else if (targetField === 'detailAd1') {
          setDetailAd1ImageUrl(uploadedUrl);
          addToast('बातमी वाचन जाहिरात क्र. १ ची इमेज यशस्वीरित्या अपलोड केली गेली!', 'success');
          await addActivityLog('बातमी वाचन जाहिरात क्र. १ चे चित्र अद्ययावत केले.', { detailAd1ImageUrl: uploadedUrl });
          await autoSaveBranding({ detailAd1ImageUrl: uploadedUrl });
        } else if (targetField === 'detailAd2') {
          setDetailAd2ImageUrl(uploadedUrl);
          addToast('बातमी वाचन जाहिरात क्र. २ ची इमेज यशस्वीरित्या अपलोड केली गेली!', 'success');
          await addActivityLog('बातमी वाचन जाहिरात क्र. २ चे चित्र अद्ययावत केले.', { detailAd2ImageUrl: uploadedUrl });
          await autoSaveBranding({ detailAd2ImageUrl: uploadedUrl });
        } else if (targetField === 'detailAd3') {
          setDetailAd3ImageUrl(uploadedUrl);
          addToast('बातमी वाचन जाहिरात क्र. ३ ची इमेज यशस्वीरित्या अपलोड केली गेली!', 'success');
          await addActivityLog('बातमी वाचन जाहिरात क्र. ३ चे चित्र अद्ययावत केले.', { detailAd3ImageUrl: uploadedUrl });
          await autoSaveBranding({ detailAd3ImageUrl: uploadedUrl });
        } else if (targetField === 'detailAd4') {
          setDetailAd4ImageUrl(uploadedUrl);
          addToast('बातमी वाचन जाहिरात क्र. ४ ची इमेज यशस्वीरित्या अपलोड केली गेली!', 'success');
          await addActivityLog('बातमी वाचन जाहिरात क्र. ४ चे चित्र अद्ययावत केले.', { detailAd4ImageUrl: uploadedUrl });
          await autoSaveBranding({ detailAd4ImageUrl: uploadedUrl });
        } else if (targetField === 'authorAvatar') {
          setProfileAvatarUrl(uploadedUrl);
          addToast('लेखकाचे प्रोफाईल चित्र यशस्वीरित्या अपलोड केले गेले!', 'success');
        }
      } catch (err: any) {
        console.error(err);
        addToast(err.message || 'इमेज अपलोड करता आली नाही.', 'error');
      } finally {
        setIsUploading(null);
        setTimeout(() => {
          setUploadProgress(0);
          setUploadStatusText('');
        }, 1500);
        // Reset the file input value so same file can be chosen again
        if (e) e.target.value = '';
      }
    };
    reader.onerror = () => {
      setIsUploading(null);
      setUploadProgress(0);
      setUploadStatusText('');
      addToast('इमेज वाचताना त्रुटी आली.', 'error');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (siteSettings) {
      setCustChannelName(siteSettings.channelName || '');
      setCustLogoText(siteSettings.channelLogoText || '');
      setCustLogoAccentText(siteSettings.channelLogoAccentText || '');
      setCustTagline(siteSettings.channelTagline || '');
      setCustLogoUrl(siteSettings.channelLogoUrl || '');
      setCustFooterAbout(siteSettings.footerAbout || '');
      setCustFooterAddress(siteSettings.footerAddress || '');
      setCustFooterPhone(siteSettings.footerPhone || '');
      setCustFooterEmail(siteSettings.footerEmail || '');
      setCustFooterCopyrightSub(siteSettings.footerCopyrightSub || '');
      setCustBreakingNewsText(siteSettings.breakingNewsText || '');
      setCustTopBarTickerText(siteSettings.topBarTickerText || '');

      setCustBrandAdsTitle(siteSettings.brandAdsTitle || '');
      setCustBrandAdsSubtitle(siteSettings.brandAdsSubtitle || '');
      setCustBrandAdsInterval(siteSettings.brandAdsInterval || 5);

      setCustFooterBgColor(siteSettings.footerBgColor || '#0f172a');
      setCustFooterTextColor(siteSettings.footerTextColor || '#e2e8f0');
      setCustFooterSection1Title(siteSettings.footerSection1Title || '');
      setCustFooterSection2Title(siteSettings.footerSection2Title || '');
      setCustFooterSection3Title(siteSettings.footerSection3Title || '');
      setCustFooterSection4Title(siteSettings.footerSection4Title || '');
      setCustFooterNewsletterDesc(siteSettings.footerNewsletterDesc || '');

      setCustFooterLink1Text(siteSettings.footerLink1Text || '');
      setCustFooterLink1Url(siteSettings.footerLink1Url || '');
      setCustFooterLink2Text(siteSettings.footerLink2Text || '');
      setCustFooterLink2Url(siteSettings.footerLink2Url || '');
      setCustFooterLink3Text(siteSettings.footerLink3Text || '');
      setCustFooterLink3Url(siteSettings.footerLink3Url || '');
      setCustFooterLink4Text(siteSettings.footerLink4Text || '');
      setCustFooterLink4Url(siteSettings.footerLink4Url || '');
      setCustFooterLink5Text(siteSettings.footerLink5Text || '');
      setCustFooterLink5Url(siteSettings.footerLink5Url || '');
      setCustFooterLink6Text(siteSettings.footerLink6Text || '');
      setCustFooterLink6Url(siteSettings.footerLink6Url || '');
      if (siteSettings.authorProfiles) {
        setAuthorProfiles(siteSettings.authorProfiles);
      }
      
      setAdBannerEnabled(siteSettings.adBannerEnabled !== false);
      setAdBannerImageUrl(siteSettings.adBannerImageUrl || '');
      setAdBannerText(siteSettings.adBannerText || '');
      setAdBannerLink(siteSettings.adBannerLink || '');
      setAdBannerBgColor(siteSettings.adBannerBgColor || '#e11d48');
      setLiveTvUrl(siteSettings.liveTvUrl || '');
      setEnableFirebaseStorage(siteSettings.enableFirebaseStorage === true);

      // Detailed Reading Page Advertisements synchronization
      setDetailAd1Enabled(siteSettings.detailAd1Enabled !== false);
      setDetailAd1ImageUrl(siteSettings.detailAd1ImageUrl || '/Images/ads1.png');
      setDetailAd1Link(siteSettings.detailAd1Link || '#');

      setDetailAd2Enabled(siteSettings.detailAd2Enabled !== false);
      setDetailAd2ImageUrl(siteSettings.detailAd2ImageUrl || '/Images/ads2.png');
      setDetailAd2Link(siteSettings.detailAd2Link || '#');

      setDetailAd3Enabled(siteSettings.detailAd3Enabled !== false);
      setDetailAd3ImageUrl(siteSettings.detailAd3ImageUrl || '/Images/ads3.png');
      setDetailAd3Link(siteSettings.detailAd3Link || '#');

      setDetailAd4Enabled(siteSettings.detailAd4Enabled !== false);
      setDetailAd4ImageUrl(siteSettings.detailAd4ImageUrl || '/Images/ads4.png');
      setDetailAd4Link(siteSettings.detailAd4Link || '#');

      setBrandAdsEnabled(siteSettings.brandAdsEnabled !== false);
      setBrandAdsSlides(siteSettings.brandAdsSlides || [
        {
          id: 'slide-1',
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '#',
          title: 'आमच्या न्यूज पोर्टलवर जाहिरात प्रसिद्ध करा व कोट्यवधी वाचकांपर्यंत पोहोचा!'
        },
        {
          id: 'slide-2',
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '#',
          title: 'विशेष औद्योगिक जाहिरात: उद्योजक आणि व्यावसायिकांसाठी उत्तम माध्यम'
        }
      ]);
      setRecentActivities(siteSettings.recentActivities || []);
    }
  }, [siteSettings]);

  // Auto load login state from session storage for convenience
  useEffect(() => {
    const adminSessionToken = sessionStorage.getItem('mp_admin_logged');
    if (adminSessionToken === 'true') {
      setIsLoggedIn(true);
      const role = (sessionStorage.getItem('mp_user_role') as any) || 'superadmin';
      setUserRole(role);
      setUserName(sessionStorage.getItem('mp_user_name') || 'Super Admin');
      setUserUsername(sessionStorage.getItem('mp_user_username') || 'admin');
      
      const authorPref = sessionStorage.getItem('mp_user_name');
      if (role === 'author' && authorPref) {
        setAuthor(authorPref);
      }
    }
  }, []);

  // Listen for Google Auth callback responses
  useEffect(() => {
    const handleGoogleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin = 
        origin === window.location.origin ||
        origin.endsWith('.run.app') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1');

      if (!isAllowedOrigin) {
        return;
      }
      
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const payload = event.data.payload;
        setIsLoggedIn(true);
        setUserRole(payload.role);
        setUserName(payload.name);
        setUserUsername(payload.username);
        
        sessionStorage.setItem('mp_admin_logged', 'true');
        sessionStorage.setItem('mp_user_role', payload.role);
        sessionStorage.setItem('mp_user_name', payload.name);
        sessionStorage.setItem('mp_user_username', payload.username);
        sessionStorage.setItem('mp_auth_token', payload.token);
        
        addToast(`यशस्वीरित्या गूगल द्वारे मुख्य व्यवस्थापक (Super Admin) म्हणून लॉगिन झाले!`, 'success');
        refreshNews();
      }
    };
    
    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoginError('');
      setIsSubmitting(true);
      
      let firebaseConfig: any;
      try {
        const configRes = await fetch('/api/auth/firebase-config');
        const configText = await configRes.text();
        if (configRes.ok) {
          try {
            firebaseConfig = JSON.parse(configText);
          } catch (e) {
            console.warn('Could not parse server Firebase configuration, using bundled fallback:', e);
            firebaseConfig = firebaseAppletConfig;
          }
        } else {
          console.warn('Server Firebase configuration endpoint returned non-OK status, using bundled fallback');
          firebaseConfig = firebaseAppletConfig;
        }
      } catch (networkErr) {
        console.warn('Network error while fetching Firebase configuration, using bundled fallback:', networkErr);
        firebaseConfig = firebaseAppletConfig;
      }

      if (!firebaseConfig || !firebaseConfig.apiKey) {
        throw new Error('सर्व्हरवरून Firebase कॉन्फिगरेशन मिळवण्यात अपयश आले आणि पर्यायी फाइल देखील अपूर्ण आहे.');
      }

      // 2. Initialize Firebase App
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      // 3. Trigger Google Sign-In popup via Firebase Auth
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      // Add Google Drive scopes so that they are granted automatically during login
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');

      const userCredential = await signInWithPopup(auth, provider);
      
      // Capture and store Google Access Token for Google Drive integration
      const credential = GoogleAuthProvider.credentialFromResult(userCredential);
      if (credential?.accessToken) {
        sessionStorage.setItem('mp_google_access_token', credential.accessToken);
        localStorage.setItem('mp_google_access_token', credential.accessToken);
        if (onGoogleAccessTokenChange) {
          onGoogleAccessTokenChange(credential.accessToken);
        }
      }
      
      const idToken = await userCredential.user.getIdToken();
      const userEmail = userCredential.user.email || '';

      // 4. Send the ID token to our secure backend verify endpoint
      let loginData: any;
      let loginSuccess = false;
      
      try {
        const loginRes = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idToken })
        });

        const loginText = await loginRes.text();
        try {
          loginData = JSON.parse(loginText);
          if (loginRes.ok) {
            loginSuccess = true;
          }
        } catch (parseErr) {
          if (loginText.trim().startsWith('<!DOCTYPE') || loginText.includes('<html')) {
            console.warn('Backend server returned HTML (misconfigured server/hosting). Attempting client-side Google Auth fallback.');
          } else {
            console.warn('Backend server returned invalid JSON. Attempting client-side Google Auth fallback.');
          }
        }
      } catch (fetchErr) {
        console.warn('Failed to reach backend server for Firebase login verification. Attempting client-side fallback:', fetchErr);
      }

      // Client-side Google auth fallback if server is misconfigured/offline
      if (!loginSuccess) {
        const lowerEmail = userEmail.toLowerCase();
        // Authorized emails for superadmin/author access on frontend-only/static hosting
        if (
          lowerEmail === 'shubhamhinganebusiness@gmail.com' || 
          lowerEmail.startsWith('admin@') || 
          userCredential.user.uid === 'some-known-uid'
        ) {
          loginData = {
            success: true,
            role: 'superadmin',
            username: userEmail.split('@')[0],
            name: userCredential.user.displayName || 'Super Admin',
            token: 'ClientFallbackToken-' + idToken.substring(0, 20)
          };
          loginSuccess = true;
          console.log('Client-side Google Auth fallback successful for Super Admin:', userEmail);
        } else {
          // Default to author for any other authenticated email as an offline fallback
          loginData = {
            success: true,
            role: 'author',
            username: userEmail.split('@')[0],
            name: userCredential.user.displayName || 'Author',
            token: 'ClientFallbackToken-' + idToken.substring(0, 20)
          };
          loginSuccess = true;
          console.log('Client-side Google Auth fallback successful for Author:', userEmail);
        }
      }

      if (!loginSuccess || !loginData) {
        throw new Error('Firebase लॉगिन पडताळणी अयशस्वी झाली आणि कोणताही योग्य क्लायंट-साइड फॉलबॅक आढळला नाही.');
      }

      if (loginData.role === 'reader') {
        throw new Error('प्रशासक किंवा लेखक म्हणून प्रवेश मर्यादित आहे. तुमच्या खात्याला आवश्यक परवानग्या नाहीत.');
      }

      // 5. Save the verified session info to state and session storage
      setIsLoggedIn(true);
      setUserRole(loginData.role);
      setUserName(loginData.name);
      setUserUsername(loginData.username);
      
      sessionStorage.setItem('mp_admin_logged', 'true');
      sessionStorage.setItem('mp_user_role', loginData.role);
      sessionStorage.setItem('mp_user_name', loginData.name);
      sessionStorage.setItem('mp_user_username', loginData.username);
      sessionStorage.setItem('mp_auth_token', loginData.token);

      const welcomeMsg = loginData.role === 'superadmin' 
        ? `यशस्वीरित्या गूगल द्वारे मुख्य व्यवस्थापक (Super Admin) म्हणून लॉगिन झाले!` 
        : `यशस्वीरित्या गूगल द्वारे लेखक (Author) म्हणून लॉगिन झाले!`;
      addToast(welcomeMsg, 'success');
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let MarathiErrMsg = err.message || 'गूगल लॉगिन करताना त्रुटी आली.';
      if (err.code === 'auth/popup-closed-by-user') {
        MarathiErrMsg = 'लॉगिन पॉपअप विंडो युझरने बंद केली.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        MarathiErrMsg = 'लॉगिन पॉपअप विनंती रद्द करण्यात आली.';
      } else if (err.code === 'auth/unauthorized-domain') {
        MarathiErrMsg = 'Firebase एरर: (auth/unauthorized-domain) - हा डोमेन तुमच्या Firebase प्रकल्पामध्ये अधिकृत डोमेन (Authorized Domain) म्हणून जोडलेला नाही. कृपया Firebase Console वर जाऊन हा डोमेन अधिकृत करा.';
      }
      setLoginError(MarathiErrMsg);
      addToast(MarathiErrMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ensure authors cannot view the dashboard tab
  useEffect(() => {
    if (userRole === 'author' && activeTab === 'dashboard') {
      setActiveTab('news');
    }
  }, [userRole, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    
    const lowerUser = username.trim().toLowerCase();
    const isHardcodedSuperAdmin = (lowerUser === 'admin' && password === 'marathi@123') || 
                                 (lowerUser === '7719959593' && (password === 'Shubham@9421@7719@0808' || password === 'shubham@9421@7719@0808'));
    
    try {
      let data: any;
      let loginSuccess = false;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: username.trim(), password })
        });
        
        const responseText = await res.text();
        try {
          data = JSON.parse(responseText);
          if (res.ok) {
            loginSuccess = true;
          }
        } catch (parseErr) {
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
            console.warn('Backend server returned HTML (misconfigured server/hosting). Attempting client-side fallback.');
          } else {
            console.warn('Backend server returned invalid JSON. Attempting client-side fallback.');
          }
        }
      } catch (fetchErr) {
        console.warn('Failed to reach backend server. Attempting client-side fallback:', fetchErr);
      }

      // If server verification didn't succeed, check for client fallback
      if (!loginSuccess) {
        if (isHardcodedSuperAdmin) {
          data = {
            success: true,
            role: 'superadmin',
            username: lowerUser,
            name: 'Super Admin',
            token: 'Basic ' + btoa(lowerUser + ':' + password)
          };
          loginSuccess = true;
          console.log('Client-side login fallback successful for Super Admin');
        } else if (lowerUser === 'reader' && password === 'reader@123') {
          data = {
            success: true,
            role: 'reader',
            username: 'reader',
            name: 'वाचक (Marathi Reader)',
            token: 'Basic ' + btoa('reader:reader@123')
          };
          loginSuccess = true;
        }
      }

      if (!loginSuccess || !data) {
        throw new Error('युझरनेम किंवा पासवर्ड चुकीचा आहे किंवा सर्व्हरशी संपर्क होऊ शकला नाही.');
      }

      setIsLoggedIn(true);
      setUserRole(data.role);
      setUserName(data.name);
      setUserUsername(data.username);
      sessionStorage.setItem('mp_admin_logged', 'true');
      sessionStorage.setItem('mp_user_role', data.role);
      sessionStorage.setItem('mp_user_name', data.name);
      sessionStorage.setItem('mp_user_username', data.username);
      sessionStorage.setItem('mp_auth_token', data.token);

      if (data.role === 'author') {
        setAuthor(data.name);
      }

      addToast(`यशस्वीरित्या ${data.role === 'superadmin' ? 'मुख्य व्यवस्थापक' : 'लेखक (' + data.name + ')'} म्हणून लॉगिन झाले!`, 'success');
      try {
        refreshNews();
      } catch (refreshErr) {
        console.warn('Could not refresh news list from server:', refreshErr);
      }
    } catch (err: any) {
      setLoginError(err.message);
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName('');
    setUserUsername('');
    sessionStorage.removeItem('mp_admin_logged');
    sessionStorage.removeItem('mp_user_role');
    sessionStorage.removeItem('mp_user_name');
    sessionStorage.removeItem('mp_user_username');
    sessionStorage.removeItem('mp_auth_token');
    addToast('लॉगआउट यशस्वीरित्या पूर्ण झाले.', 'info');
    refreshNews();
  };

  const saveSettingsHelper = async (payload: any) => {
    let isSaved = false;
    let isClientOnly = false;
    try {
      const { isClientOnlyMode, saveDirectSettings, setClientOnlyMode } = await import('../utils/firebaseClient');
      if (isClientOnlyMode()) {
        isClientOnly = true;
      }

      if (!isClientOnly) {
        try {
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            isSaved = true;
          } else if (res.status === 404) {
            setClientOnlyMode(true);
            isClientOnly = true;
          } else {
            let errorMsg = '';
            try {
              const errData = await res.json();
              errorMsg = errData.error;
            } catch (jsonErr) {
              if (res.status === 413) {
                errorMsg = 'चित्रांचा डेटा किंवा फाईलचा आकार खूप मोठा आहे (HTTP 413 Payload Too Large). कृपया जाहिरातीचे किंवा लोगोचे चित्र अधिक कॉम्प्रेस करून लहान आकारात अपलोड करा.';
              } else if (res.status === 403) {
                errorMsg = 'अधिकार उपलब्ध नाहीत (HTTP 403): साइट रचना बदलण्याचा अधिकार केवळ मुख्य व्यवस्थापकाला (Super Admin) आहे.';
              } else {
                errorMsg = `सर्व्हर एरर (HTTP ${res.status}): डेटा जतन करताना तांत्रिक चूक झाली.`;
              }
            }
            throw new Error(errorMsg || `साइट रचना जतन करताना एरर आला (HTTP ${res.status}).`);
          }
        } catch (apiErr: any) {
          if (isClientOnly) {
            // will continue to fallback
          } else {
            throw apiErr;
          }
        }
      }

      if (isClientOnly) {
        console.log('Using direct client-side Firestore save fallback for settings...');
        await saveDirectSettings(payload);
        isSaved = true;
      }
    } catch (err: any) {
      console.error('Error in saveSettingsHelper:', err);
      throw err;
    }
    return isSaved;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);

    try {
      const payload = {
        ...siteSettings,
        channelName: custChannelName.trim(),
        channelLogoText: custLogoText.trim(),
        channelLogoAccentText: custLogoAccentText.trim(),
        channelTagline: custTagline.trim(),
        channelLogoUrl: custLogoUrl.trim(),
        footerAbout: custFooterAbout.trim(),
        footerAddress: custFooterAddress.trim(),
        footerPhone: custFooterPhone.trim(),
        footerEmail: custFooterEmail.trim(),
        footerCopyrightSub: Math.max(0, custBrandAdsInterval) ? custFooterCopyrightSub.trim() : custFooterCopyrightSub.trim(),
        breakingNewsText: custBreakingNewsText.trim(),
        topBarTickerText: custTopBarTickerText.trim(),
        adBannerEnabled,
        adBannerImageUrl: adBannerImageUrl.trim(),
        adBannerText: adBannerText.trim(),
        adBannerLink: adBannerLink.trim(),
        adBannerBgColor: adBannerBgColor.trim(),
        liveTvUrl: liveTvUrl.trim(),
        enableFirebaseStorage,

        // Detailed Reading Page Advertisements (4 Ads) payload
        detailAd1Enabled,
        detailAd1ImageUrl: detailAd1ImageUrl.trim(),
        detailAd1Link: detailAd1Link.trim(),
        detailAd2Enabled,
        detailAd2ImageUrl: detailAd2ImageUrl.trim(),
        detailAd2Link: detailAd2Link.trim(),
        detailAd3Enabled,
        detailAd3ImageUrl: detailAd3ImageUrl.trim(),
        detailAd3Link: detailAd3Link.trim(),
        detailAd4Enabled,
        detailAd4ImageUrl: detailAd4ImageUrl.trim(),
        detailAd4Link: detailAd4Link.trim(),

        brandAdsEnabled,
        brandAdsSlides,
        brandAdsTitle: custBrandAdsTitle.trim(),
        brandAdsSubtitle: custBrandAdsSubtitle.trim(),
        brandAdsInterval: Number(custBrandAdsInterval) || 5,
        footerBgColor: custFooterBgColor.trim(),
        footerTextColor: custFooterTextColor.trim(),
        footerSection1Title: custFooterSection1Title.trim(),
        footerSection2Title: custFooterSection2Title.trim(),
        footerSection3Title: custFooterSection3Title.trim(),
        footerSection4Title: custFooterSection4Title.trim(),
        footerNewsletterDesc: custFooterNewsletterDesc.trim(),
        footerLink1Text: custFooterLink1Text.trim(),
        footerLink1Url: custFooterLink1Url.trim(),
        footerLink2Text: custFooterLink2Text.trim(),
        footerLink2Url: custFooterLink2Url.trim(),
        footerLink3Text: custFooterLink3Text.trim(),
        footerLink3Url: custFooterLink3Url.trim(),
        footerLink4Text: custFooterLink4Text.trim(),
        footerLink4Url: custFooterLink4Url.trim(),
        footerLink5Text: custFooterLink5Text.trim(),
        footerLink5Url: custFooterLink5Url.trim(),
        footerLink6Text: custFooterLink6Text.trim(),
        footerLink6Url: custFooterLink6Url.trim(),
      };

      // Save to localStorage so they persist on page reload.
      localStorage.setItem('majhapatra_adBannerEnabled', JSON.stringify(adBannerEnabled));
      localStorage.setItem('majhapatra_adBannerImageUrl', adBannerImageUrl.trim());
      localStorage.setItem('majhapatra_adBannerText', adBannerText.trim());
      localStorage.setItem('majhapatra_adBannerLink', adBannerLink.trim());
      localStorage.setItem('majhapatra_adBannerBgColor', adBannerBgColor.trim());
      localStorage.setItem('majhapatra_liveTvUrl', liveTvUrl.trim());

      // Detailed Reading Page Advertisements (4 Ads) localstorage persistence
      localStorage.setItem('mp_detailAd1Enabled', JSON.stringify(detailAd1Enabled));
      localStorage.setItem('mp_detailAd1ImageUrl', detailAd1ImageUrl.trim());
      localStorage.setItem('mp_detailAd1Link', detailAd1Link.trim());
      localStorage.setItem('mp_detailAd2Enabled', JSON.stringify(detailAd2Enabled));
      localStorage.setItem('mp_detailAd2ImageUrl', detailAd2ImageUrl.trim());
      localStorage.setItem('mp_detailAd2Link', detailAd2Link.trim());
      localStorage.setItem('mp_detailAd3Enabled', JSON.stringify(detailAd3Enabled));
      localStorage.setItem('mp_detailAd3ImageUrl', detailAd3ImageUrl.trim());
      localStorage.setItem('mp_detailAd3Link', detailAd3Link.trim());
      localStorage.setItem('mp_detailAd4Enabled', JSON.stringify(detailAd4Enabled));
      localStorage.setItem('mp_detailAd4ImageUrl', detailAd4ImageUrl.trim());
      localStorage.setItem('mp_detailAd4Link', detailAd4Link.trim());

      localStorage.setItem('majhapatra_brandAdsEnabled', JSON.stringify(brandAdsEnabled));
      localStorage.setItem('majhapatra_brandAdsSlides', JSON.stringify(brandAdsSlides));
      localStorage.setItem('majhapatra_brandAdsTitle', custBrandAdsTitle.trim());
      localStorage.setItem('majhapatra_brandAdsSubtitle', custBrandAdsSubtitle.trim());
      localStorage.setItem('majhapatra_brandAdsInterval', String(custBrandAdsInterval));
      localStorage.setItem('majhapatra_footerBgColor', custFooterBgColor.trim());
      localStorage.setItem('majhapatra_footerTextColor', custFooterTextColor.trim());
      localStorage.setItem('majhapatra_breakingNewsText', custBreakingNewsText.trim());
      localStorage.setItem('majhapatra_topBarTickerText', custTopBarTickerText.trim());
      localStorage.setItem('majhapatra_siteCustomization', JSON.stringify(payload));

      await saveSettingsHelper(payload);

      const successMsg = 'साइट रचना आणि ब्रँडिंग यशस्वीरित्या जतन केले गेले!';
      addToast(successMsg, 'success');
      onSaveSettings(); // Trigger parent fetch to sync header and footer immediately
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'रचना जतन करताना अडचण आली.', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Helper to trigger background auto-save of site customization settings
  const autoSaveBranding = async (updatedFields?: any) => {
    try {
      const payload = {
        ...siteSettings,
        channelName: updatedFields && 'channelName' in updatedFields ? updatedFields.channelName : custChannelName.trim(),
        channelLogoText: updatedFields && 'channelLogoText' in updatedFields ? updatedFields.channelLogoText : custLogoText.trim(),
        channelLogoAccentText: updatedFields && 'channelLogoAccentText' in updatedFields ? updatedFields.channelLogoAccentText : custLogoAccentText.trim(),
        channelTagline: updatedFields && 'channelTagline' in updatedFields ? updatedFields.channelTagline : custTagline.trim(),
        channelLogoUrl: updatedFields && 'channelLogoUrl' in updatedFields ? updatedFields.channelLogoUrl : custLogoUrl.trim(),
        footerAbout: updatedFields && 'footerAbout' in updatedFields ? updatedFields.footerAbout : custFooterAbout.trim(),
        footerAddress: updatedFields && 'footerAddress' in updatedFields ? updatedFields.footerAddress : custFooterAddress.trim(),
        footerPhone: updatedFields && 'footerPhone' in updatedFields ? updatedFields.footerPhone : custFooterPhone.trim(),
        footerEmail: updatedFields && 'footerEmail' in updatedFields ? updatedFields.footerEmail : custFooterEmail.trim(),
        footerCopyrightSub: updatedFields && 'footerCopyrightSub' in updatedFields ? updatedFields.footerCopyrightSub : custFooterCopyrightSub.trim(),
        breakingNewsText: updatedFields && 'breakingNewsText' in updatedFields ? updatedFields.breakingNewsText : custBreakingNewsText.trim(),
        topBarTickerText: updatedFields && 'topBarTickerText' in updatedFields ? updatedFields.topBarTickerText : custTopBarTickerText.trim(),
        adBannerEnabled: updatedFields && 'adBannerEnabled' in updatedFields ? updatedFields.adBannerEnabled : adBannerEnabled,
        adBannerImageUrl: updatedFields && 'adBannerImageUrl' in updatedFields ? updatedFields.adBannerImageUrl : adBannerImageUrl.trim(),
        adBannerText: updatedFields && 'adBannerText' in updatedFields ? updatedFields.adBannerText : adBannerText.trim(),
        adBannerLink: updatedFields && 'adBannerLink' in updatedFields ? updatedFields.adBannerLink : adBannerLink.trim(),
        adBannerBgColor: updatedFields && 'adBannerBgColor' in updatedFields ? updatedFields.adBannerBgColor : adBannerBgColor.trim(),
        liveTvUrl: updatedFields && 'liveTvUrl' in updatedFields ? updatedFields.liveTvUrl : liveTvUrl.trim(),
        enableFirebaseStorage: updatedFields && 'enableFirebaseStorage' in updatedFields ? updatedFields.enableFirebaseStorage : enableFirebaseStorage,

        detailAd1Enabled: updatedFields && 'detailAd1Enabled' in updatedFields ? updatedFields.detailAd1Enabled : detailAd1Enabled,
        detailAd1ImageUrl: updatedFields && 'detailAd1ImageUrl' in updatedFields ? updatedFields.detailAd1ImageUrl : detailAd1ImageUrl.trim(),
        detailAd1Link: updatedFields && 'detailAd1Link' in updatedFields ? updatedFields.detailAd1Link : detailAd1Link.trim(),
        detailAd2Enabled: updatedFields && 'detailAd2Enabled' in updatedFields ? updatedFields.detailAd2Enabled : detailAd2Enabled,
        detailAd2ImageUrl: updatedFields && 'detailAd2ImageUrl' in updatedFields ? updatedFields.detailAd2ImageUrl : detailAd2ImageUrl.trim(),
        detailAd2Link: updatedFields && 'detailAd2Link' in updatedFields ? updatedFields.detailAd2Link : detailAd2Link.trim(),
        detailAd3Enabled: updatedFields && 'detailAd3Enabled' in updatedFields ? updatedFields.detailAd3Enabled : detailAd3Enabled,
        detailAd3ImageUrl: updatedFields && 'detailAd3ImageUrl' in updatedFields ? updatedFields.detailAd3ImageUrl : detailAd3ImageUrl.trim(),
        detailAd3Link: updatedFields && 'detailAd3Link' in updatedFields ? updatedFields.detailAd3Link : detailAd3Link.trim(),
        detailAd4Enabled: updatedFields && 'detailAd4Enabled' in updatedFields ? updatedFields.detailAd4Enabled : detailAd4Enabled,
        detailAd4ImageUrl: updatedFields && 'detailAd4ImageUrl' in updatedFields ? updatedFields.detailAd4ImageUrl : detailAd4ImageUrl.trim(),
        detailAd4Link: updatedFields && 'detailAd4Link' in updatedFields ? updatedFields.detailAd4Link : detailAd4Link.trim(),

        brandAdsEnabled: updatedFields && 'brandAdsEnabled' in updatedFields ? updatedFields.brandAdsEnabled : brandAdsEnabled,
        brandAdsSlides: updatedFields && 'brandAdsSlides' in updatedFields ? updatedFields.brandAdsSlides : brandAdsSlides,
        brandAdsTitle: updatedFields && 'brandAdsTitle' in updatedFields ? updatedFields.brandAdsTitle : custBrandAdsTitle.trim(),
        brandAdsSubtitle: updatedFields && 'brandAdsSubtitle' in updatedFields ? updatedFields.brandAdsSubtitle : custBrandAdsSubtitle.trim(),
        brandAdsInterval: updatedFields && 'brandAdsInterval' in updatedFields ? updatedFields.brandAdsInterval : Number(custBrandAdsInterval) || 5,

        footerBgColor: updatedFields && 'footerBgColor' in updatedFields ? updatedFields.footerBgColor : custFooterBgColor.trim(),
        footerTextColor: updatedFields && 'footerTextColor' in updatedFields ? updatedFields.footerTextColor : custFooterTextColor.trim(),
        footerSection1Title: updatedFields && 'footerSection1Title' in updatedFields ? updatedFields.footerSection1Title : custFooterSection1Title.trim(),
        footerSection2Title: updatedFields && 'footerSection2Title' in updatedFields ? updatedFields.footerSection2Title : custFooterSection2Title.trim(),
        footerSection3Title: updatedFields && 'footerSection3Title' in updatedFields ? updatedFields.footerSection3Title : custFooterSection3Title.trim(),
        footerSection4Title: updatedFields && 'footerSection4Title' in updatedFields ? updatedFields.footerSection4Title : custFooterSection4Title.trim(),
        footerNewsletterDesc: updatedFields && 'footerNewsletterDesc' in updatedFields ? updatedFields.footerNewsletterDesc : custFooterNewsletterDesc.trim(),
        footerLink1Text: updatedFields && 'footerLink1Text' in updatedFields ? updatedFields.footerLink1Text : custFooterLink1Text.trim(),
        footerLink1Url: updatedFields && 'footerLink1Url' in updatedFields ? updatedFields.footerLink1Url : custFooterLink1Url.trim(),
        footerLink2Text: updatedFields && 'footerLink2Text' in updatedFields ? updatedFields.footerLink2Text : custFooterLink2Text.trim(),
        footerLink2Url: updatedFields && 'footerLink2Url' in updatedFields ? updatedFields.footerLink2Url : custFooterLink2Url.trim(),
        footerLink3Text: updatedFields && 'footerLink3Text' in updatedFields ? updatedFields.footerLink3Text : custFooterLink3Text.trim(),
        footerLink3Url: updatedFields && 'footerLink3Url' in updatedFields ? updatedFields.footerLink3Url : custFooterLink3Url.trim(),
        footerLink4Text: updatedFields && 'footerLink4Text' in updatedFields ? updatedFields.footerLink4Text : custFooterLink4Text.trim(),
        footerLink4Url: updatedFields && 'footerLink4Url' in updatedFields ? updatedFields.footerLink4Url : custFooterLink4Url.trim(),
        footerLink5Text: updatedFields && 'footerLink5Text' in updatedFields ? updatedFields.footerLink5Text : custFooterLink5Text.trim(),
        footerLink5Url: updatedFields && 'footerLink5Url' in updatedFields ? updatedFields.footerLink5Url : custFooterLink5Url.trim(),
        footerLink6Text: updatedFields && 'footerLink6Text' in updatedFields ? updatedFields.footerLink6Text : custFooterLink6Text.trim(),
        footerLink6Url: updatedFields && 'footerLink6Url' in updatedFields ? updatedFields.footerLink6Url : custFooterLink6Url.trim(),

        authorProfiles: updatedFields && 'authorProfiles' in updatedFields ? updatedFields.authorProfiles : authorProfiles,
        recentActivities: updatedFields && 'recentActivities' in updatedFields ? updatedFields.recentActivities : recentActivities,
      };

      // Back up to localStorage
      localStorage.setItem('majhapatra_siteCustomization', JSON.stringify(payload));

      await saveSettingsHelper(payload);

      onSaveSettings(); // notify parent
    } catch (err) {
      console.error('Error in autoSaveBranding:', err);
    }
  };

  // Log a recent superadmin activity and persist it
  const addActivityLog = async (actionText: string, otherFields?: any) => {
    const newLog = {
      id: `act-${Date.now()}`,
      action: actionText,
      timestamp: new Date().toISOString(),
      user: userName || 'admin'
    };
    
    setRecentActivities((prev) => {
      const updated = [newLog, ...prev].slice(0, 50); // limit to last 50 entries
      autoSaveBranding({ 
        ...otherFields,
        recentActivities: updated 
      });
      return updated;
    });
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear alerts
    setSubmitSuccess('');
    setSubmitError('');

    // Field validation
    if (!title.trim() || !description.trim() || !content.trim() || !imageURL.trim() || !author.trim()) {
      const errorMsg = 'कृपया सर्व आवश्यक फॉर्म फील्ड्स पूर्ण करा.';
      setSubmitError(errorMsg);
      addToast(errorMsg, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Setup payload matching backend fields
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        content: content.trim(),
        imageURL: imageURL.trim(),
        author: userRole === 'author' ? userName : author.trim(),
        videoURL: videoURL.trim(),
        tags: newsTags,
        scheduledPublishDate: scheduledPublishDate || '',
      };

      const url = editingArticleId ? `/api/news/${editingArticleId}` : '/api/news';
      const method = editingArticleId ? 'PUT' : 'POST';

      let isSaved = false;
      let isClientOnly = false;
      const { isClientOnlyMode, createDirectNews, updateDirectNews, setClientOnlyMode } = await import('../utils/firebaseClient');

      if (isClientOnlyMode()) {
        isClientOnly = true;
      }

      if (!isClientOnly) {
        try {
          const res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            isSaved = true;
          } else if (res.status === 404) {
            setClientOnlyMode(true);
            isClientOnly = true;
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || (editingArticleId ? 'बातमी सुधारित करताना सर्व्हर त्रुटी आली.' : 'बातमी प्रकाशित करताना सर्व्हर त्रुटी आली.'));
          }
        } catch (apiErr: any) {
          if (isClientOnly) {
            // continue to fallback
          } else {
            throw apiErr;
          }
        }
      }

      if (isClientOnly) {
        console.log('Using direct client-side Firestore save fallback for news...');
        const payloadToSave = {
          ...payload,
          authorUsername: userRole === 'author' ? userUsername : 'admin',
          slug: payload.title.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '-').replace(/(^-|-$)/g, ''),
          publishDate: payload.scheduledPublishDate || new Date().toISOString()
        } as any;
        if (editingArticleId) {
          await updateDirectNews(editingArticleId, payloadToSave);
        } else {
          await createDirectNews(payloadToSave);
        }
        isSaved = true;
      }

      const successMsg = editingArticleId 
        ? 'बातमी यशस्वीरित्या सुधारित केली गेली!'
        : 'बातमी यशस्वीरित्या जोडली गेली आणि पोर्टलवर प्रकाशित झाली!';
      setSubmitSuccess(successMsg);
      addToast(successMsg, 'success');
      addActivityLog(editingArticleId ? `"${payload.title}" ही बातमी संपादित केली.` : `"${payload.title}" ही नवीन बातमी प्रकाशित केली.`);
      
      // Reset Form Fields
      setTitle('');
      setDescription('');
      setContent('');
      setImageURL('');
      setAuthor(userRole === 'author' ? userName : 'माझापत्र प्रतिनिधी');
      setVideoURL('');
      setNewsTags([]);
      setScheduledPublishDate('');
      setEditingArticleId(null);

      // Refresh list in parent
      refreshNews();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'काहीतरी गडबड झाली. कृपया पुन्हा प्रयत्न करा.';
      setSubmitError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNews = (id: string, itemTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'बातमी डिलीट करावी का?',
      message: `तुम्हाला खात्री आहे का की "${itemTitle}" ही बातमी कायमची डिलीट करायची आहे? ही क्रिया बदलता येणार नाही आणि बातमी पोर्टलवरून पूर्णपणे काढून टाकली जाईल.`,
      onConfirm: async () => {
        setDeletingNewsId(id);
        try {
          let isDeleted = false;
          let isClientOnly = false;
          const { isClientOnlyMode, deleteDirectNews, setClientOnlyMode } = await import('../utils/firebaseClient');
          if (isClientOnlyMode()) {
            isClientOnly = true;
          }

          if (!isClientOnly) {
            try {
              const res = await fetch(`/api/news/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': getAuthHeader()
                }
              });

              if (res.ok) {
                isDeleted = true;
              } else if (res.status === 404) {
                setClientOnlyMode(true);
                isClientOnly = true;
              } else {
                let errorMsg = `त्रुटी आली: सर्व्हर कडून नकारात्मक प्रतिसाद प्राप्त झाला (${res.status} ${res.statusText})`;
                try {
                  const errorJson = await res.json();
                  if (errorJson && errorJson.error) {
                    errorMsg = `त्रुटी: ${errorJson.error}`;
                  }
                } catch (jsonErr) {
                  // Ignore JSON parse error, use fallback
                }
                throw new Error(errorMsg);
              }
            } catch (apiErr: any) {
              if (isClientOnly) {
                // continue to fallback
              } else {
                throw apiErr;
              }
            }
          }

          if (isClientOnly) {
            console.log('Using direct client-side Firestore delete fallback for news...');
            await deleteDirectNews(id);
            isDeleted = true;
          }

          addToast('बातमी यशस्वीरित्या डिलीट केली.', 'success');
          addActivityLog(`"${itemTitle}" ही बातमी पोर्टलवरून डिलीट केली.`);
          refreshNews();
        } catch (err: any) {
          addToast(err.message || 'बातमी डिलीट करता आली नाही. कृपया पुन्हा प्रयत्न करा.', 'error');
        } finally {
          setDeletingNewsId(null);
        }
      }
    });
  };

  const handleToggleVisibility = async (id: string, currentHidden: boolean, itemTitle: string) => {
    const newHidden = !currentHidden;
    const actionText = newHidden ? 'अदृश्य (Hide)' : 'दर्शवा (Unhide)';
    
    try {
      let isToggled = false;
      let isClientOnly = false;
      const { isClientOnlyMode, updateDirectNews, setClientOnlyMode } = await import('../utils/firebaseClient');
      if (isClientOnlyMode()) {
        isClientOnly = true;
      }

      if (!isClientOnly) {
        try {
          const res = await fetch(`/api/news/${id}/toggle-visibility`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify({ hidden: newHidden })
          });

          if (res.ok) {
            isToggled = true;
          } else if (res.status === 404) {
            setClientOnlyMode(true);
            isClientOnly = true;
          } else {
            const errorJson = await res.json().catch(() => ({}));
            throw new Error(errorJson.error || `बातमी ${actionText} करण्यात अपयश आले.`);
          }
        } catch (apiErr: any) {
          if (isClientOnly) {
            // continue to fallback
          } else {
            throw apiErr;
          }
        }
      }

      if (isClientOnly) {
        console.log('Using direct client-side Firestore toggle-visibility fallback...');
        await updateDirectNews(id, { hidden: newHidden });
        isToggled = true;
      }

      addToast(`बातमी यशस्वीरित्या ${newHidden ? 'अदृश्य केली गेली' : 'दर्शवली गेली'}!`, 'success');
      refreshNews();
    } catch (err: any) {
      addToast(err.message || `क्रिया पूर्ण करता आली नाही. कृपया पुन्हा प्रयत्न करा.`, 'error');
    }
  };

  // Login Screen render
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-6 py-8 text-center text-white space-y-2">
            <Newspaper className="h-10 w-10 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold tracking-tight">माझापत्र प्रशासक लॉगिन</h2>
            <p className="text-slate-400 text-xs">व्यवस्थापक डॅशबोर्डमध्ये प्रवेश करण्यासाठी क्रेडेन्शियल भरा</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg flex items-start space-x-1.5 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">वापरकर्ता नाव (Username)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="उदा. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans text-slate-900"
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">पासवर्ड (Password)</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans text-slate-900"
                />
                <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm shadow-rose-200 hover:shadow-lg transition-all text-sm mt-2 cursor-pointer"
            >
              लॉगिन करा
            </button>

            <div className="flex items-center my-3">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-400">किंवा</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-lg border border-slate-200 hover:border-slate-300 shadow-3xs hover:shadow-2xs active:scale-[0.99] transition-all text-sm cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Gmail द्वारे लॉगिन करा</span>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="w-full text-slate-500 hover:text-slate-800 font-semibold text-xs text-center block pt-2 underline cursor-pointer"
            >
              मुख्यपृष्ठावर परत जा
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged-In Admin Panel Workspace
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Header Panel */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-rose-600 p-2.5 rounded-xl shrink-0">
            <Newspaper className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black">प्रशासक नियंत्रण डॅशबोर्ड</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">माझापत्र वर नवीन बातम्या जोडा आणि व्यवस्थापित करा</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={onBackToHome}
            className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition"
          >
            पोर्टल मुख्यपृष्ठ
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>लॉगआउट</span>
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-rose-100/65 overflow-x-auto whitespace-nowrap scrollbar-none space-x-2">
        {userRole === 'superadmin' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 text-rose-600" />
            <span>📊 मुख्य डॅशबोर्ड</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'news'
              ? 'border-rose-600 text-rose-600 bg-rose-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="h-4.5 w-4.5 text-rose-600" />
          <span>बातम्या जोडा व नष्ट करा</span>
        </button>
        <button
          onClick={() => setActiveTab('google-drive')}
          className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'google-drive'
              ? 'border-rose-600 text-rose-600 bg-rose-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderOpen className="h-4.5 w-4.5 text-rose-600" />
          <span>📁 गुगल ड्राईव्ह</span>
        </button>
        {userRole === 'superadmin' && (
          <>
            <button
              onClick={() => setActiveTab('branding')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'branding'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-4.5 w-4.5 text-rose-600" />
              <span>⚙️ साइट रचना व लोगो</span>
            </button>
            <button
              onClick={() => setActiveTab('authors')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'authors'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4.5 w-4.5 text-rose-600" />
              <span>👤 लेखकांचे प्रोफाइल्स</span>
            </button>
            <button
              onClick={() => setActiveTab('author-logins')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'author-logins'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="h-4.5 w-4.5 text-rose-600" />
              <span>🔐 युझर लॉगिन्स (लेखक)</span>
            </button>
            <button
              onClick={() => setActiveTab('cutout')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 font-special ${
                activeTab === 'cutout'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="h-4 w-4 text-rose-600 shrink-0" />
              <span>📰 रॅन्सम-नोट मेकर</span>
            </button>
            <button
              onClick={() => setActiveTab('polls')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'polls'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5 text-rose-600 shrink-0" />
              <span>📊 मतदान पोल</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'logs'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="h-4.5 w-4.5 text-rose-600 shrink-0" />
              <span>📝 संवेदनशील कृती नोंदी</span>
            </button>
          </>
        )}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6 sm:space-y-8 animate-fade-in text-slate-900">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block">एकूण प्रसिद्ध बातम्या</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 block">{(newsList || []).length}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3 shrink-0" />
                  <span>लाइव्ह / सुरू</span>
                </span>
              </div>
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
                <Newspaper className="h-6 w-6" />
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block">एकूण वाचक संख्या (Views)</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
                  {totalViews.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 animate-pulse">
                  <Flame className="h-3 w-3 shrink-0 text-rose-600" />
                  <span>प्रचलित संकेतस्थळ</span>
                </span>
              </div>
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block">एकूण सक्रिय जाहिराती</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 block">{activeAdsCount}</span>
                <span className="text-[10px] text-sky-500 font-bold flex items-center gap-0.5">
                  <span className="bg-sky-100 text-sky-700 font-extrabold px-1.5 py-0.5 rounded-xs text-[8px] uppercase tracking-wider">1290 × 720</span>
                </span>
              </div>
              <div className="bg-sky-50 text-sky-600 p-3 rounded-xl">
                <Megaphone className="h-6 w-6" />
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block">नोंदणीकृत लेखक</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 block">{(authorProfiles || []).length}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  <span>प्रमाणित सदस्य</span>
                </span>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* D3.js Analytics Visualizations */}
          {loadingAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-[250px] flex flex-col items-center justify-center space-y-3 animate-pulse">
                <Activity className="h-8 w-8 text-rose-300 animate-bounce" />
                <span className="text-xs font-bold text-slate-400">दैनिक वाचक कल लोड होत आहे...</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-[250px] flex flex-col items-center justify-center space-y-3 animate-pulse">
                <BarChart3 className="h-8 w-8 text-rose-300 animate-bounce" />
                <span className="text-xs font-bold text-slate-400">बातमी श्रेणी कल लोड होत आहे...</span>
              </div>
            </div>
          ) : (
            <D3Analytics analyticsData={analyticsData} newsList={newsList} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column Left: Visual Category Breakdown & System Monitor */}
            <div className="lg:col-span-4 space-y-6 col-span-1">
              {/* Real-time Visitors & Hourly Peak Views Chart */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">रिअल-टाइम वाचक संख्या</span>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        {toMarathiDigits(liveVisitors)}
                      </span>
                      <span className="text-xs text-emerald-650 font-black">थेट वाचक सुरू (Live)</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                    <Activity className="h-5 w-5 animate-pulse" />
                  </div>
                </div>

                {/* Micro Device Share Indicators */}
                <div className="pt-2 border-t border-slate-100/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5 text-slate-400" /> मोबाईल (७४%)
                    </span>
                    <span className="flex items-center gap-1">
                      <Laptop className="h-3.5 w-3.5 text-slate-400" /> संगणक (२१%)
                    </span>
                    <span className="flex items-center gap-1">
                      <Tablet className="h-3.5 w-3.5 text-slate-400" /> टॅब्लेट (५%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 flex overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: '74%' }} title="मोबाईल: ७४%" />
                    <div className="bg-amber-400 h-full" style={{ width: '21%' }} title="संगणक: २१%" />
                    <div className="bg-emerald-500 h-full" style={{ width: '5%' }} title="टॅब्लेट: ५%" />
                  </div>
                </div>

                {/* 24-hr views interactive SVG line chart */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-rose-500" /> तासानुसार वाचक कल (Reading Peak)
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                      {hoveredChartIndex !== null ? `वेळ: ${hourlyStats[hoveredChartIndex].hour}` : 'बिंदूवर माउस आणा'}
                    </span>
                  </div>

                  <div className="relative bg-slate-50/50 rounded-xl p-2 border border-slate-100/60 flex items-center justify-center">
                    <svg
                      viewBox={`0 0 450 140`}
                      className="w-full h-auto overflow-visible select-none"
                    >
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Y Axis Guide Lines */}
                      <line x1={40} y1={20} x2={410} y2={20} stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1={40} y1={80} x2={410} y2={80} stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1={40} y1={120} x2={410} y2={120} stroke="#cbd5e1" />

                      {/* Area Fill */}
                      <path
                        d={`${hourlyStats.map((stat, idx) => {
                          const x = 40 + (idx / (hourlyStats.length - 1)) * 370;
                          const y = 140 - 20 - (stat.views / 4500) * 100;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')} L 410 120 L 40 120 Z`}
                        fill="url(#viewsGradient)"
                      />

                      {/* Line Path */}
                      <path
                        d={hourlyStats.map((stat, idx) => {
                          const x = 40 + (idx / (hourlyStats.length - 1)) * 370;
                          const y = 140 - 20 - (stat.views / 4500) * 100;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points Circles */}
                      {hourlyStats.map((stat, idx) => {
                        const x = 40 + (idx / (hourlyStats.length - 1)) * 370;
                        const y = 140 - 20 - (stat.views / 4500) * 100;
                        return (
                          <g key={idx}>
                            <circle
                              cx={x}
                              cy={y}
                              r={hoveredChartIndex === idx ? "6" : "3.5"}
                              fill={hoveredChartIndex === idx ? "#f43f5e" : "#ffffff"}
                              stroke="#f43f5e"
                              strokeWidth={hoveredChartIndex === idx ? "2.5" : "1.5"}
                              className="transition-all duration-150 cursor-pointer"
                              onMouseEnter={() => setHoveredChartIndex(idx)}
                              onMouseLeave={() => setHoveredChartIndex(null)}
                            />
                          </g>
                        );
                      })}

                      {/* X Axis Labels */}
                      {hourlyStats.map((stat, idx) => {
                        const x = 40 + (idx / (hourlyStats.length - 1)) * 370;
                        return (
                          <text
                            key={idx}
                            x={x}
                            y={136}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="800"
                            fill="#64748b"
                            className="font-sans"
                          >
                            {stat.hour}
                          </text>
                        );
                      })}
                    </svg>

                    {/* Interactive hover overlay detail bubble */}
                    {hoveredChartIndex !== null && (
                      <div className="absolute top-2 right-2 bg-slate-900 text-white rounded-lg p-2 text-[10px] font-semibold shadow-md pointer-events-none animate-fade-in transition-all">
                        <p className="text-slate-300">वेळ: <span className="text-white font-extrabold">{hourlyStats[hoveredChartIndex].hour}</span></p>
                        <p className="text-rose-450 mt-0.5">वाचक: <span className="text-white font-extrabold font-mono text-xs">{toMarathiDigits(hourlyStats[hoveredChartIndex].views)}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <BarChart3 className="h-4.5 w-4.5 text-rose-500" />
                    <span>बातमी श्रेणी वितरण</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">एकूण: {totalArticles}</span>
                </div>

                <div className="space-y-3.5">
                  {Object.entries(categoryCounts).map(([cat, count]) => {
                    const percentage = totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            {cat}
                          </span>
                          <span className="text-slate-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-rose-500 h-full rounded-full transition-all duration-700" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Status Control & Monitor */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  <span>सिस्टम कॉन्फिगरेशन आणि स्टेटस</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  {/* Status Item 1 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-semibold">वाहिन्यांचे नाव / लोगो</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">Active</span>
                  </div>

                  {/* Status Item 2 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-semibold">ब्रेकिंग न्यूज बार</span>
                    {siteSettings.breakingNewsText ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">शुरू</span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">बंद</span>
                    )}
                  </div>

                  {/* Status Item 3 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-semibold">थेट टीव्ही सुसंगतता</span>
                    {siteSettings.liveTvUrl ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">कनेक्टेड</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">लिंक नाही</span>
                    )}
                  </div>

                  {/* Status Item 4 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-semibold">जाहिराती आकारमान रक्षक</span>
                    <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">Strict 1290×720</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Right: Top Performers & Quick Campaigns */}
            <div className="lg:col-span-8 col-span-1 space-y-6">
              {/* Popular Articles List */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Flame className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <span>लोकप्रिय बातम्या (सर्वात जास्त वाचल्या गेलेल्या)</span>
                </h3>

                <div className="divide-y divide-slate-100 max-h-[295px] overflow-y-auto pr-1">
                  {topArticles.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">अद्याप कोणतीही बातमी उपलब्ध नाही.</div>
                  ) : (
                    topArticles.map((item, idx) => (
                      <div key={item._id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-black text-slate-300 w-4 block text-center">#{idx + 1}</span>
                          {item.imageURL && (
                            <img src={item.imageURL} alt="" className="w-10 h-7 rounded object-cover border border-slate-100 shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.category} • {new Date(item.publishDate).toLocaleDateString('mr-IN')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                            <Eye className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{item.views || 0}</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* News Editor's Interactive Scratchpad & Idea Board */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <FileText className="h-4.5 w-4.5 text-rose-500" />
                    <span>संपादकांचा मसुदा फलक आणि तात्कालिक विचार (Editor's Scratchpad)</span>
                  </h3>
                  <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-sans">
                    स्थानिक साठवणूक सक्रिय (Local Storage Active)
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">लोकप्रिय किंवा महत्त्वाचे घडणारे स्थानिक प्रसंग, कल्पक संकल्पना किंवा ब्रेकिंग बातमीचे कच्चे विषय येथे सुरक्षितपणे नोंदवून ठेवा. तुम्ही थेट एका क्लिकवर या विषयाला बातमी फॉर्ममध्ये लोड करू शकता.</p>

                {/* Simple form to add draft/idea */}
                <form onSubmit={handleAddScratchpadItem} className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="text"
                    value={newScratchText}
                    onChange={(e) => setNewScratchText(e.target.value)}
                    placeholder="उदा. अहमदनगर जिल्ह्यात कृषी प्रदर्शनाला उत्स्फूर्त प्रतिसाद..."
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-slate-50/20 outline-hidden font-sans"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newScratchCategory}
                      onChange={(e) => setNewScratchCategory(e.target.value as any)}
                      className="text-xs border border-slate-200 rounded-xl px-2 py-2 bg-white focus:outline-hidden text-slate-700 cursor-pointer font-bold shrink-0"
                    >
                      <option value="राष्ट्रीय">राष्ट्रीय</option>
                      <option value="राज्य">राज्य</option>
                      <option value="शहर">शहर</option>
                      <option value="क्रीडा">क्रीडा</option>
                      <option value="मनोरंजन">मनोरंजन</option>
                      <option value="अर्थव्यवस्था">अर्थव्यवस्था</option>
                    </select>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition duration-150 flex items-center justify-center gap-1 cursor-pointer select-none text-xs shrink-0"
                    >
                      <Plus className="h-4 w-4" /> जोडा (Add)
                    </button>
                  </div>
                </form>

                {/* Scratchpad Ideas List */}
                <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
                  {scratchpadItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50/20">कोणताही कच्चा विचार नोंदवून ठेवलेला नाही. वरील फॉर्ममधून नवीन जोडा.</div>
                  ) : (
                    scratchpadItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          item.done 
                            ? 'bg-slate-50/50 border-slate-100 opacity-60 line-through' 
                            : 'bg-white border-slate-100 shadow-3xs hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleScratchpad(item.id)}
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition ${
                              item.done 
                                ? 'bg-emerald-500 border-emerald-600 text-white' 
                                : 'border-slate-300 hover:border-emerald-500 animate-[pulse_3s_infinite]'
                            }`}
                          >
                            {item.done && <Check className="h-3 w-3 stroke-[3]" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-relaxed break-words">{item.text}</p>
                            <span className="inline-block mt-1 text-[9px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          {!item.done && (
                            <button
                              type="button"
                              onClick={() => handlePopulateFromScratch(item.text, item.category)}
                              className="px-2 py-1 text-[9px] font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition active:scale-95 cursor-pointer"
                              title="बातमी मसुदा फॉर्म मध्ये लोड करा"
                            >
                              मसुदा भरा
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteScratchpad(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="काढून टाका"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Advertisements Standard Status Widget */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 animate-fade-in">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Images className="h-4.5 w-4.5 text-indigo-500" />
                    <span>जाहिरात मोहिमा आणि कॉन्फिगरेशन</span>
                  </h3>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-xs border border-rose-100 shadow-3xs uppercase">1290 × 720 Size Guard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Ad Widget 1 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">मुख्य बॅनर जाहिरात (Home)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.adBannerEnabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">सक्रिय</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>

                  {/* Ad Widget 2 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">तपशील जाहिरात १ (Detail 1)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.detailAd1Enabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">सक्रिय</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>

                  {/* Ad Widget 3 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">तपशील जाहिरात २ (Detail 2)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.detailAd2Enabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">सक्रिय</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>

                  {/* Ad Widget 4 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">तपशील जाहिरात ३ (Detail 3)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.detailAd3Enabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">सक्रिय</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>

                  {/* Ad Widget 5 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">तपशील जाहिरात ४ (Detail 4)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.detailAd4Enabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">सक्रिय</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>

                  {/* Ad Widget 6 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">प्रायोजक स्लाइडर (Sponsors)</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">1290 × 720</span>
                      {siteSettings.brandAdsEnabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase font-mono">{(siteSettings.brandAdsSlides || []).length} active</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">निष्क्रिय</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Quick Action Launcher Shortcuts */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <PlusCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <span>व्यवस्थापकीय जलद लिंक्स (Quick Links)</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <button
                    onClick={() => setActiveTab('news')}
                    className="p-3 bg-rose-50 text-rose-800 rounded-xl font-bold text-center border border-rose-100/35 hover:bg-rose-100 transition duration-150 active:scale-95 text-[11px] cursor-pointer"
                  >
                    नवीन बातमी जोडा
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('news');
                      setTimeout(() => {
                        const card = document.getElementById('ai-generator-card');
                        if (card) {
                          card.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 200);
                    }}
                    className="p-3 bg-violet-50 text-violet-800 rounded-xl font-bold text-center border border-violet-100/35 hover:bg-violet-100 transition duration-150 active:scale-95 text-[11px] cursor-pointer"
                  >
                    🚀 AI मसुदा सहाय्यक
                  </button>
                  <button
                    onClick={() => setActiveTab('branding')}
                    className="p-3 bg-sky-50 text-sky-800 rounded-xl font-bold text-center border border-sky-100/35 hover:bg-sky-100 transition duration-150 active:scale-95 text-[11px] cursor-pointer"
                  >
                    ⚙️ साइट लोगो & जाहिराती
                  </button>
                  <button
                    onClick={() => setActiveTab('authors')}
                    className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-center border border-emerald-100/35 hover:bg-emerald-100 transition duration-150 active:scale-95 text-[11px] cursor-pointer"
                  >
                    👤 लेखक प्रोफाईल्स
                  </button>
                </div>
              </div>

              {/* Recent Site Activities Log (Requirement 4) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 animate-fade-in">
                <div className="flex justify-between items-center pb-1">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Activity className="h-4.5 w-4.5 text-rose-500 shrink-0 animate-pulse" />
                    <span>संकेतस्थळ बदल इतिहास (Recent Site Activities)</span>
                  </h3>
                  {recentActivities.length > 0 && (
                    <button 
                      onClick={async () => {
                        if (window.confirm('तुम्हाला खरोखरच सर्व ॲक्टिव्हिटी लॉग्स पुसून टाकायचे आहेत का?')) {
                          setRecentActivities([]);
                          await autoSaveBranding({ recentActivities: [] });
                          addToast('बदल इतिहास यशस्वीरित्या साफ केला!', 'info');
                        }
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold uppercase transition bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded"
                    >
                      इतिहास पुसा
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  सुपर ॲडमिनद्वारे करण्यात आलेले बदल आणि क्रियांचा सुरक्षित इतिहास खालीलप्रमाणे नोंदवला गेला आहे:
                </p>

                <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1 space-y-1">
                  {recentActivities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      अद्याप कोणताही बदल इतिहास उपलब्ध नाही.
                    </div>
                  ) : (
                    recentActivities.map((act: any) => (
                      <div key={act.id} className="py-2.5 flex items-start gap-3 first:pt-0 last:pb-0 animate-fade-in">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-xs shadow-rose-500/50"></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 break-words leading-relaxed">{act.action}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {new Date(act.timestamp).toLocaleString('mr-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.2 rounded-sm uppercase tracking-wider font-sans border border-slate-200/50">
                              👤 {act.user}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'news' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form to Add News */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* AI Assistant Card for automated news drafting */}
            <div id="ai-generator-card" className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md p-6 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-500 animate-pulse shrink-0" />
                <span>AI ऑटो-ड्राफ्ट आणि HTML जनरेटर (Gemini 3.5)</span>
              </h3>
              
              <p className="text-slate-400 text-xs leading-relaxed">
                तुमच्या बातमीचा मुख्य गाभा किंवा केवळ विषय प्रविष्ट करा, AI त्यावर सविस्तर बातमी आणि थेट तुमच्या CMS साठी पब्लिश-रेडी HTML कोड तयार करेल.
              </p>

              <form onSubmit={handleGenerateAIDraft} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-300">बातमीचा मुख्य विषय / वन-लाइनर <span className="text-rose-400">*</span></label>
                  <textarea
                    rows={2}
                    required
                    placeholder="उदा. मुंबई शहर आणि उपनगरात पुढील २४ तासात मुसळधार पावसाचा इशारा, हवामान विभागाचा यलो अलर्ट..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-300">महत्त्वाचे मुख्य मुद्दे (स्वच्छ माहितीसाठी, पर्यायी)</label>
                  <input
                    type="text"
                    placeholder="उदा. सखल भागात पाणी साचणार, वाहतूक विस्कळीत, स्थानिक प्रशासनाची तयारी..."
                    value={aiKeyPoints}
                    onChange={(e) => setAiKeyPoints(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-300">बातमी श्रेणी (Category Recommendation)</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="राष्ट्रीय">राष्ट्रीय</option>
                    <option value="राज्य">राज्य</option>
                    <option value="शहर">शहर</option>
                    <option value="क्रीडा">क्रीडा</option>
                    <option value="मनोरंजन">मनोरंजन</option>
                    <option value="अर्थव्यवस्था">अर्थव्यवस्था</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingAI}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-xs hover:shadow-md transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      AI मसुदा तयार करत आहे...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>✨ AI च्या मदतीने बातमी लिहा</span>
                    </>
                  )}
                </button>
              </form>

              {/* Generated Draft Section */}
              {generatedDraft && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-fade-in animate-duration-300 animate-fill-both">
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-sans text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="bg-rose-500/25 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {generatedDraft.category}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        AI AUTODRAFT
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-100 line-clamp-2 leading-snug">
                        {generatedDraft.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 italic font-medium">
                        {generatedDraft.description}
                      </p>
                    </div>

                    {/* Styled HTML Tabs */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 space-x-1">
                      <button
                        type="button"
                        onClick={() => setShowHTMLPreview(false)}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-md transition cursor-pointer ${
                          !showHTMLPreview ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        HTML कोड पहा
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowHTMLPreview(true)}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-md transition cursor-pointer ${
                          showHTMLPreview ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        लाइव्ह प्रिव्ह्यू (CMS Layout)
                      </button>
                    </div>

                    {showHTMLPreview ? (
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-white max-h-[300px] overflow-y-auto p-1 text-slate-900">
                        {/* secure sandboxed layout preview of generated high contrast HTML */}
                        <iframe
                          srcDoc={generatedDraft.rawHtml}
                          title="HTML Article Preview"
                          className="w-full h-[250px] border-0 bg-white"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900 shadow-inner max-h-[220px] overflow-y-auto p-2.5 font-mono text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap select-all">
                        {generatedDraft.rawHtml}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handlePopulateForm}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="खालील मुख्य फॉर्ममध्ये हा डेटा भरा जेणेकरून थेट वेबसाईटवर प्रकाशित करता येईल..."
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
                        <span>१-क्लिकने फॉर्म मध्ये भरा</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyHTML}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 border border-slate-700/60 transition cursor-pointer"
                      >
                        {copiedHTML ? (
                          <>
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">कॉपी केले!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                            <span>HTML कोड कॉपी करा</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGeneratedDraft(null)}
                      className="w-full text-center text-[9px] text-slate-500 hover:text-slate-300 pt-1 underline cursor-pointer"
                    >
                      मसुदा रीसेट करा
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div id="news-publish-form-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-rose-100 pb-2 flex items-center space-x-1.5">
                {editingArticleId ? (
                  <>
                    <Pencil className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />
                    <span className="text-amber-600">बातमी संपादित करा (Edit News Article)</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    <span>नवीन बातमी प्रकाशित करा</span>
                  </>
                )}
              </h3>

              {/* Quick Import from Google Drive panel */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100/75 text-left">
                <div className="text-left">
                  <span className="text-xs font-black text-slate-700 block">📁 गुगल डॉक वरून जलद आयात (Quick Import)</span>
                  <span className="text-[10px] text-slate-400 font-bold block">तुमच्या कनेक्ट केलेल्या ड्राईव्हमधील डॉक्युमेंट थेट मसुदा बनवा</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickImportFromDrive}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>ड्राईव्ह मधून आयात</span>
                </button>
              </div>

              {/* Submit Alerts */}
              {submitSuccess && (
                <div className="bg-green-55 bg-green-50 border border-green-100 text-green-800 text-xs p-3.5 rounded-lg flex items-start space-x-2 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3.5 rounded-lg flex items-start space-x-2 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form id="news-entry-form" onSubmit={handleCreateNews} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">बातमी शीर्षक (Title in Marathi) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. मुंबई मेट्रोचा नवीन मार्ग आजपासून खुला..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">बातमी श्रेणी (Category) <span className="text-rose-500">*</span></label>
                    <select
                      value={['राष्ट्रीय', 'राज्य', 'शहर', 'राजकीय', 'क्रीडा', 'मनोरंजन', 'अर्थव्यवस्था'].includes(category) ? category : 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setCategory('custom');
                          setCustomCategory('');
                        } else {
                          setCategory(val);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold select-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="राष्ट्रीय">राष्ट्रीय</option>
                      <option value="राज्य">राज्य</option>
                      <option value="शहर">शहर</option>
                      <option value="राजकीय">राजकीय (Politics)</option>
                      <option value="क्रीडा">क्रीडा</option>
                      <option value="मनोरंजन">मनोरंजन</option>
                      <option value="अर्थव्यवस्था">अर्थव्यवस्था</option>
                      <option value="custom">✍️ नवीन श्रेणी जोडा... (Custom Category)</option>
                    </select>
                    {(category === 'custom' || !['राष्ट्रीय', 'राज्य', 'शहर', 'राजकीय', 'क्रीडा', 'मनोरंजन', 'अर्थव्यवस्था'].includes(category)) && (
                      <input
                        type="text"
                        placeholder="नवीन श्रेणीचे नाव टाइप करा..."
                        value={category === 'custom' ? customCategory : category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomCategory(val);
                          setCategory(val);
                        }}
                        className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        required
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">लेखक (Author) <span className="text-rose-500">*</span></label>
                    {userRole === 'author' ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700">
                        ✍️ {userName}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select
                          value={authorProfiles.some(a => a.name === author) ? author : 'custom'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setAuthor('माझापत्र प्रतिनिधी');
                            } else {
                              setAuthor(val);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold select-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        >
                          {authorProfiles.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                          <option value="custom">✍️ स्वतःचे सानुकूलित नाव लिहा (Custom Name)</option>
                        </select>
                        
                        {(!authorProfiles.some(a => a.name === author) || !author) && (
                          <input
                            type="text"
                            required
                            placeholder="उदा. विशेष प्रतिनिधी"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>वाहिनी / संदर्भ इमेज (Image URL) <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-sm">क्रॉप आणि रिसाईझ टूल्स समाविष्ट</span>
                  </label>
                  
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="text"
                      required
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageURL}
                      onChange={(e) => setImageURL(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                    
                    {/* Local file cropping activator */}
                    <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLocalFileSelection}
                      />
                      <span>अपलोड व क्रॉप</span>
                    </label>

                    {/* Direct Device Upload */}
                    <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDeviceUpload(e, 'news')}
                        disabled={isUploading === 'news'}
                      />
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading === 'news' ? 'अपलोड होत आहे...' : 'थेट अपलोड'}</span>
                    </label>
                  </div>

                  {isUploading === 'news' && (
                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl space-y-2.5 animate-pulse">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-rose-800 flex items-center gap-2">
                          <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-rose-600 border-t-transparent inline-block"></span>
                          {uploadStatusText || 'चित्र गुगल ड्राईव्हवर जतन केले जात आहे...'}
                        </span>
                        <span className="font-bold text-rose-950 font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-rose-200/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Horizontal carousel of previously uploaded images */}
                  {newsList && newsList.length > 0 && (
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-500 block">पूर्वी वापरलेल्या चित्रांमधून निवडा (Past Used Images):</span>
                      <div className="flex space-x-2.5 overflow-x-auto py-1 scrollbar-thin">
                        {Array.from(new Set(newsList.map(item => item.imageURL).filter(Boolean))).slice(0, 10).map((pastImg, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setImageURL(pastImg);
                              addToast('मागील बातमीची इमेज यशस्वीरित्या निवडली गेली!', 'success');
                            }}
                            className={`relative h-12 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition focus:outline-hidden ${
                              imageURL === pastImg ? 'border-rose-600 scale-95 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-rose-350'
                            }`}
                          >
                            <img src={pastImg} alt="Past choice" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">बातमीचे मुख्य कव्हर चित्र जोडण्यासाठी वैध URL पेस्ट करा किंवा स्थानिक चित्र क्रॉप करण्यासाठी <b>"अपलोड व क्रॉप"</b> सिलेक्ट करा.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">यूट्यूब व्हिडिओ लिंक (YouTube Video URL - Optional)</label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoURL}
                    onChange={(e) => setVideoURL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-400">या बातमीशी संबंधित यूट्यूब व्हिडिओची लिंक येथे पेस्ट करा.</p>
                </div>

                {/* Schedule Post Date/Time Picker */}
                <div className="space-y-1 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/60">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span>भविष्यात प्रसिद्ध करण्याचे नियोजन करा (Schedule Post - Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledPublishDate}
                    onChange={(e) => setScheduledPublishDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">जर तुम्हाला ही बातमी भविष्यात ठराविक वेळी स्वयंचलितपणे प्रसिद्ध करायची असेल, तर तारीख आणि वेळ निवडा. रिकामे ठेवल्यास बातमी ताबडतोब प्रसिद्ध होईल.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">टोकदार वर्णन (Description - Marathi) <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={2}
                    maxLength={180}
                    placeholder="बातमीचे २ ओळीत संक्षिप्त वर्णन"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans resize-none"
                  />
                </div>

                {/* Article Tagging System */}
                <div className="space-y-1 bg-rose-50/25 p-3.5 rounded-xl border border-rose-100/60">
                  <label className="text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>बातमीचे सर्च टॅग्ज (Article Tags for Discoverability)</span>
                    <span className="text-[10px] text-slate-400 font-normal">स्वल्पविराम (comma) किंवा एंटर दाबून जोडा</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="उदा. मुंबई, शेतकरी आंदोलन, क्रीडा..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = tagInput.trim().replace(/,/g, '');
                          if (val && !newsTags.includes(val)) {
                            setNewsTags([...newsTags, val]);
                          }
                          setTagInput('');
                        }
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = tagInput.trim().replace(/,/g, '');
                        if (val && !newsTags.includes(val)) {
                          setNewsTags([...newsTags, val]);
                        }
                        setTagInput('');
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      जोडा
                    </button>
                  </div>

                  {/* Render added tag pills */}
                  {newsTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {newsTags.map((t, idx) => (
                        <span key={idx} className="bg-rose-50 border border-rose-100/80 text-rose-700 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <span>#{t}</span>
                          <button
                            type="button"
                            onClick={() => setNewsTags(newsTags.filter(item => item !== t))}
                            className="text-rose-400 hover:text-rose-800 text-[10px] font-black"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">एसइओ (SEO) आणि शोधक्षमता सुधारण्यासाठी टॅग्ज जोडा.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">पूर्ण बातमी सामग्री (Full News Content) <span className="text-rose-500">*</span></label>
                  <RichTextEditor
                    value={content}
                    onChange={(html) => setContent(html)}
                    placeholder="यामध्ये बातमीची सविस्तर माहिती लिहा. एमएस वर्ड (Microsoft Word) प्रमाणे निवडलेल्या अक्षरांना बोल्ड, इटॅलिक करा किंवा विविध प्रकारच्या याद्या आणि रंगात सजवा..."
                    id="news-publish-content"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs hover:shadow-md transition duration-250 text-sm ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? 'प्रक्रिया सुरू आहे...' : editingArticleId ? 'बदल जतन करा (Save Changes)' : 'बातमी प्रकाशित करा (Publish)'}
                  </button>
                  {editingArticleId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingArticleId(null);
                        setTitle('');
                        setDescription('');
                        setContent('');
                        setImageURL('');
                        setAuthor(userRole === 'author' ? userName : 'माझापत्र प्रतिनिधी');
                        setVideoURL('');
                        setNewsTags([]);
                        setScheduledPublishDate('');
                        addToast('संपादन रद्द केले.', 'info');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition text-sm cursor-pointer border border-slate-200 shrink-0"
                    >
                      रद्द करा
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Listing Active News with deletion */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-rose-100 pb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <FileText className="h-5 w-5 text-rose-500" />
                  <span>मागील सर्व बातम्या ({newsList.length})</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-sans font-bold uppercase overflow-hidden">
                  ACTIVE LIST
                </span>
              </h3>

              {newsList.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-sm">प्रकाशन सूची पूर्णपणे रिकामी आहे.</p>
              ) : (
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                  {newsList.map((item) => (
                    <div
                      key={item._id}
                      className="border border-slate-100 rounded-xl p-3 sm:p-4 flex gap-4 hover:bg-slate-50/50 transition"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-16 w-20 sm:h-20 sm:w-24 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={item.imageURL}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=300&q=80';
                          }}
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Meta */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              {item.category}
                            </span>
                            {item.hidden ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <EyeOff className="h-2.5 w-2.5 shrink-0" />
                                <span>अदृश्य (Hidden)</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Eye className="h-2.5 w-2.5 shrink-0" />
                                <span>पब्लिश (Visible)</span>
                              </span>
                            )}
                            {item.scheduledPublishDate && new Date(item.scheduledPublishDate) > new Date() && (
                              <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                                <Clock className="h-2.5 w-2.5 shrink-0 text-orange-600" />
                                <span>नियोजित (Scheduled: {new Date(item.scheduledPublishDate).toLocaleString('mr-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight mt-1">
                            {item.title}
                          </h4>
                        </div>

                        {/* Info lines + Actions */}
                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-sans">
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center space-x-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(item.publishDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' })}</span>
                            </span>
                            <span className="flex items-center space-x-0.5">
                              <Eye className="h-3 w-3" />
                              <span>{item.views} Views</span>
                            </span>
                          </div>
                          {(userRole === 'superadmin' || item.authorUsername === userUsername) ? (
                            <div className="flex items-center space-x-1 sm:space-x-1.5">
                              {/* Hide / Unhide Toggle Action */}
                              <button
                                type="button"
                                onClick={() => handleToggleVisibility(item._id, !!item.hidden, item.title)}
                                className={`${item.hidden ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} p-1.5 sm:p-2 rounded-lg transition shrink-0`}
                                title={item.hidden ? "बातमी दर्शवा (Unhide)" : "बातमी अदृश्य करा (Hide)"}
                              >
                                {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>

                              {/* Edit Action */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingArticleId(item._id);
                                  setTitle(item.title || '');
                                  setCategory(item.category || 'राज्य');
                                  setDescription(item.description || '');
                                  setContent(item.content || '');
                                  setImageURL(item.imageURL || '');
                                  setAuthor(item.author || 'माझापत्र प्रतिनिधी');
                                  setVideoURL(item.videoURL || '');
                                  setNewsTags(item.tags || []);
                                  setScheduledPublishDate(item.scheduledPublishDate || '');
                                  // Scroll smoothly to form
                                  document.getElementById('news-publish-form-card')?.scrollIntoView({ behavior: 'smooth' });
                                  addToast('बातमी संपादन मोड सक्रिय केला!', 'info');
                                }}
                                className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-1.5 sm:p-2 rounded-lg transition shrink-0"
                                title="संपादन करा (Edit)"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={() => handleDeleteNews(item._id, item.title)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition shrink-0 flex items-center justify-center min-w-[32px] min-h-[32px]"
                                title="डिलीट करा"
                                disabled={deletingNewsId !== null}
                              >
                                {deletingNewsId === item._id ? (
                                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100/80 px-2 py-1 rounded-md font-bold select-none">
                              🔒 इतर लेखकाची बातमी
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'branding' ? (
        /* Site Customization interface */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-rose-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              <span>वृत्तवाहिनी ओळख आणि सानुकूलन (Branding & Identity)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              येथे तुम्ही बातमी चॅनेलचे नाव, मुख्य लोगो, हेडर टॅगलाईन, संपर्क माहिती, पत्ता आणि फुटर मजकूर सहजपणे संपादित करू शकता.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Row 1: Channel Identity */}
            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Building2 className="h-4 w-4 text-rose-500 shrink-0" />
                <span>१. मुख्य चॅनेल ब्रँडिंग (Channel Branding)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">चॅनेलचे पूर्ण नाव (News Channel Name) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. माझापत्र"
                    value={custChannelName}
                    onChange={(e) => setCustChannelName(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog(`चॅनेलचे नाव बदलून "${custChannelName}" केले.`); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">लोगो मजकूर - भाग १ (Logo Text - Left) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. माझा"
                    value={custLogoText}
                    onChange={(e) => setCustLogoText(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog(`लोगोचा पहिला भाग बदलून "${custLogoText}" केला.`); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">लोगो मजकूर - भाग २ (Logo Text Accent - Right) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. पत्र"
                    value={custLogoAccentText}
                    onChange={(e) => setCustLogoAccentText(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog(`लोगोचा दुसरा भाग बदलून "${custLogoAccentText}" केला.`); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">हेडर टॅगलाईन (Tagline / Slogan) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. माझा महाराष्ट्र, माझे पत्र"
                    value={custTagline}
                    onChange={(e) => setCustTagline(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog(`हेडर टॅगलाईन बदलून "${custTagline}" केली.`); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <span>चित्रात्मक लोगो लिंक (Custom Logo URL - पर्यायी)</span>
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={custLogoUrl}
                      onChange={(e) => setCustLogoUrl(e.target.value)}
                      onBlur={() => { autoSaveBranding(); addActivityLog('चित्रात्मक लोगोची लिंक सुधारित केली.'); }}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                    <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoSelect}
                        disabled={isUploading === 'logo'}
                      />
                      <Crop className="h-3.5 w-3.5" />
                      <span>अपलोड व क्रॉप</span>
                    </label>
                    <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDeviceUpload(e, 'logo')}
                        disabled={isUploading === 'logo'}
                      />
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading === 'logo' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400">चित्र उपलब्ध केल्यास आयकन ऐवजी थेट तुमचा स्वतःचा लोगो दर्शवला जाईल.</p>
                </div>
              </div>

              <div className="space-y-1 mt-3">
                <label className="text-xs font-bold text-slate-700">टॉप बार ब्रेकिंग संदेश (Top Bar Ticker News Text) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="उदा. माझापत्र वर ताज्या घडामोडी आणि अचूक बातम्यांचे थेट प्रसार पाहा."
                  value={custTopBarTickerText}
                  onChange={(e) => setCustTopBarTickerText(e.target.value)}
                  onBlur={() => { autoSaveBranding(); addActivityLog('टॉप बारमधील फिरता संदेश सुधारित केला.'); }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                />
                <p className="text-[10px] text-slate-400">हा संदेश वेबसाईटच्या सर्वात वरच्या शीर्ष पट्टी (Top Bar) मध्ये फिरणाऱ्या अक्षरांमध्ये दिसेल.</p>
              </div>
            </div>

            {/* Row 2: Footer & Help Info */}
            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Sparkles className="h-4 w-4 text-rose-500 shrink-0" />
                <span>२. फुटर माहिती व सविस्तर वर्णन (Footer Section Customization)</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">तुमच्या चॅनेलबद्दल संक्षिप्त माहिती (Footer About Us Description) <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="फुटरमध्ये दिसणारी चॅनेलची थोडक्यात ओळख किंवा परिचय..."
                  value={custFooterAbout}
                  onChange={(e) => setCustFooterAbout(e.target.value)}
                  onBlur={() => { autoSaveBranding(); addActivityLog('फुटरमधील "आमच्याबद्दल" मजकूर अद्ययावत केला.'); }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">कॉपीराइट उप-घोषणा (Copyright Tagline sub-text) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. महाराष्ट्राचे हक्काचे व्यासपीठ"
                    value={custFooterCopyrightSub}
                    onChange={(e) => setCustFooterCopyrightSub(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog(`कॉपीराइट टॅगलाईन बदलून "${custFooterCopyrightSub}" केली.`); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Direct Contact details */}
            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <span>३. अधिकृत संपर्क माहिती (Contact Details)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-rose-600" />
                    <span>कार्यालयीन पत्ता (Office Address) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. १२, नरिमन पॉईंट, मुंबई..."
                    value={custFooterAddress}
                    onChange={(e) => setCustFooterAddress(e.target.value)}
                    onBlur={() => { autoSaveBranding(); addActivityLog('कार्यालयीन पत्ता बदलला.'); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Phone className="h-3 w-3 text-rose-600" />
                      <span>फोन क्रमांक (Phone) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+९१ २२ ..."
                      value={custFooterPhone}
                      onChange={(e) => setCustFooterPhone(e.target.value)}
                      onBlur={() => { autoSaveBranding(); addActivityLog('कार्यालयीन संपर्क फोन क्रमांक बदलला.'); }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Mail className="h-3 w-3 text-rose-600" />
                      <span>ई-मेल आयडी (Official Email) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="editor@..."
                      value={custFooterEmail}
                      onChange={(e) => setCustFooterEmail(e.target.value)}
                      onBlur={() => { autoSaveBranding(); addActivityLog('कार्यालयीन ईमेल आयडी बदलला.'); }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Breaking News text details */}
            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Sparkles className="h-4 w-4 text-rose-500 shrink-0" />
                <span>४. ब्रेकिंग न्यूज मजकूर (Breaking News Ticker Text)</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">स्क्रोलिंग पट्टी मधील ताज्या बातम्या / ब्रेकिंग मजकूर (Breaking News Text) <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="येथे मुख्य पानावर फिरणारा ब्रेकिंग न्यूज मजकूर लिहा. वेगळ्या बातम्या वेगळ्या चिन्हांनी (उदा. | ) विभागून टाका..."
                  value={custBreakingNewsText}
                  onChange={(e) => setCustBreakingNewsText(e.target.value)}
                  onBlur={() => { autoSaveBranding(); addActivityLog('वेबसाईटवरील ब्रेकिंग न्यूज पट्टी बदलली.'); }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                />
                <p className="text-[10px] text-slate-400">हा मजकूर चॅनेलच्या मुख्य पानावर स्क्रोलिंग पट्टी (Ticker) च्या रूपात अतिशय आकर्षक दिसेल.</p>
              </div>
            </div>

            {/* Row 5: Home Page Ad Banner Customization */}
            <div id="settings-ad-banner-form" className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Megaphone className="h-4 w-4 text-rose-500 shrink-0" />
                <span>५. मुख्य जाहिरात बॅनर (Home Page Ad Banner Section)</span>
              </h4>

              <div className="flex items-center space-x-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="adBannerEnabled"
                  checked={adBannerEnabled}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setAdBannerEnabled(val);
                    await autoSaveBranding({ adBannerEnabled: val });
                    addActivityLog(val ? 'मुख्य जाहिरात बॅनर चालू केला.' : 'मुख्य जाहिरात बॅनर बंद केला.');
                  }}
                  className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="adBannerEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  होमपेजवरील जाहिरात बॅनर चालू करा (Enable/Disable Ad Banner)
                </label>
              </div>

              {adBannerEnabled && (
                <div className="space-y-4 pt-1 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        <span>जाहिरात बॅनरचे चित्र (Banner Image URL)</span>
                        <span className="bg-rose-150 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wide border border-rose-200">1290 × 720 (16:9)</span>
                      </label>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/... किंवा तुमच्या जाहिरातीचा इमेज पाथ"
                          value={adBannerImageUrl}
                          onChange={(e) => setAdBannerImageUrl(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('मुख्य जाहिरात बॅनरचे चित्र बदलले.'); }}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                        <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLocalFileSelection(e, 'banner')}
                          />
                          <Crop className="h-3.5 w-3.5" />
                          <span>अपलोड व क्रॉप</span>
                        </label>
                        <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1.5 self-stretch">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleDeviceUpload(e, 'banner')}
                            disabled={isUploading === 'banner'}
                          />
                          <Upload className="h-3.5 w-3.5" />
                          <span>{isUploading === 'banner' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">जाहिरात बॅकग्राउंड रंग (Banner Background Color)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={adBannerBgColor}
                          onChange={(e) => setAdBannerBgColor(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('मुख्य जाहिरात बॅनरचा रंग बदलला.'); }}
                          className="h-9 w-12 border border-slate-200 rounded-lg cursor-pointer bg-white"
                        />
                        <input
                          type="text"
                          placeholder="उदा. #e11d48"
                          value={adBannerBgColor}
                          onChange={(e) => setAdBannerBgColor(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('मुख्य जाहिरात बॅनरचा रंग बदलला.'); }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">जाहिरात मजकूर / शीर्षक (Banner Text / Offer Title) <span className="text-rose-500">*</span></label>
                    <textarea
                      required={adBannerEnabled}
                      rows={2}
                      placeholder="उदा. विशेष दिवाळी धमाका जाहिरात: आमच्या सर्व जाहिरातींवर ५०% टक्के महासवलत! आजच बुक करा..."
                      value={adBannerText}
                      onChange={(e) => setAdBannerText(e.target.value)}
                      onBlur={() => { autoSaveBranding(); addActivityLog('मुख्य जाहिरात बॅनरचा मजकूर बदलला.'); }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">जाहिरात क्लिक लिंक (Banner Target Link URL)</label>
                    <input
                      type="text"
                      placeholder="उदा. https://majhapatra.com/contact"
                      value={adBannerLink}
                      onChange={(e) => setAdBannerLink(e.target.value)}
                      onBlur={() => { autoSaveBranding(); addActivityLog('मुख्य जाहिरात बॅनरची क्लिक लिंक बदलली.'); }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                  </div>

                  {/* Real-time Ad Banner Preview inside Admin Panel */}
                  <div className="bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 mt-2 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">बॅनर पूर्वदृश्य (Real-time Preview):</span>
                    <div 
                      className="relative overflow-hidden rounded-xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4"
                      style={{ backgroundColor: adBannerBgColor }}
                    >
                      <div className="flex items-center gap-3 text-center sm:text-left z-10">
                        <div className="bg-white/10 p-2.5 rounded-lg border border-white/20 hidden sm:block">
                          <Megaphone className="h-4.5 w-4.5 text-yellow-300 animate-pulse" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="inline-block bg-yellow-400 text-slate-900 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wide">जाहिरात पूर्वदृश्य</span>
                          <p className="text-xs font-bold leading-relaxed">{adBannerText || 'मजकुराचा नमुना येथे दिसेल...'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-center z-10">
                        {adBannerImageUrl && (
                          <img 
                            src={adBannerImageUrl} 
                            alt="preview" 
                            className="w-[72px] h-auto aspect-[1290/720] max-w-[1290px] max-h-[720px] object-cover rounded bg-black/15 border border-white/10 hidden sm:block"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="bg-white text-slate-900 font-bold text-[10px] px-3.5 py-1.5 rounded-lg whitespace-nowrap shadow-xs">
                          अधिक माहिती
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 5.5: Article Detail Page Advertisements Customization */}
            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100/60 pb-3">
                <div className="flex items-center space-x-1.5">
                  <Images className="h-4 w-4 text-rose-500 shrink-0" />
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
                    <span>५.२ बातमी वाचन पानातील जाहिराती (Article Detail Ads Customization)</span>
                  </h4>
                </div>
                <span className="bg-rose-50 border border-rose-200/50 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none shrink-0 self-start sm:self-center">
                  ४ स्वतंत्र जाहिरात जागा
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-normal">
                बातमी सविस्तर वाचनाच्या पानावरील चार वेगवेगळ्या ठिकाणी दिसणाऱ्या जाहिरातींचे फोटो आणि जाहिरात लिंक्स तुम्ही येथून बदलू किंवा तात्पुरत्या बंद करू शकता.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Ad 1 Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 select-none">
                      <span className="bg-rose-100 text-rose-700 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">१</span>
                      <span>जाहिरात क्र. १ - टॉप बॅनर (Top)</span>
                    </span>
                    <input
                      type="checkbox"
                      id="detailAd1Enabled"
                      checked={detailAd1Enabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setDetailAd1Enabled(val);
                        await autoSaveBranding({ detailAd1Enabled: val });
                        addActivityLog(val ? 'बातमी वाचन जाहिरात क्र. १ चालू केली.' : 'बातमी वाचन जाहिरात क्र. १ बंद केली.');
                      }}
                      className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                    />
                  </div>
                  {detailAd1Enabled ? (
                    <div className="space-y-2.5 text-xs animate-fade-in">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block flex flex-wrap items-center gap-1.5">
                          <span>जाहिरात चित्र लिंक (Ad Image URL)</span>
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">1290 × 720 (16:9)</span>
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... किंवा अपलोड करा"
                            value={detailAd1ImageUrl}
                            onChange={(e) => setDetailAd1ImageUrl(e.target.value)}
                            onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. १ चे चित्र बदलले.'); }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                          <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalFileSelection(e, 'detailAd1')}
                            />
                            <Crop className="h-3 w-3" />
                            <span>अपलोड व क्रॉप</span>
                          </label>
                          <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDeviceUpload(e, 'detailAd1')}
                              disabled={isUploading === 'detailAd1'}
                            />
                            <Upload className="h-3 w-3" />
                            <span>{isUploading === 'detailAd1' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">कारवाई लिंक (Target Link URL)</label>
                        <input
                          type="text"
                          placeholder="उदा. https://majhapatra.com/contact"
                          value={detailAd1Link}
                          onChange={(e) => setDetailAd1Link(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. १ ची क्लिक लिंक बदलली.'); }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                      </div>
                      <div className="pt-1 select-none">
                        <span className="text-[10px] text-slate-400 block mb-1">चित्र पूर्वदृश्य (Live Preview):</span>
                        <div className="aspect-[1290/720] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
                          <img 
                            src={detailAd1ImageUrl} 
                            alt="Ad 1 preview" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-[1290/720]"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80'; }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 select-none font-medium">ही जाहिरात सध्या बंद आहे.</div>
                  )}
                </div>

                {/* Ad 2 Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 select-none font-sans">
                      <span className="bg-rose-100 text-rose-700 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">२</span>
                      <span>जाहिरात क्र. २ - मजकुराच्या मध्ये (Middle)</span>
                    </span>
                    <input
                      type="checkbox"
                      id="detailAd2Enabled"
                      checked={detailAd2Enabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setDetailAd2Enabled(val);
                        await autoSaveBranding({ detailAd2Enabled: val });
                        addActivityLog(val ? 'बातमी वाचन जाहिरात क्र. २ चालू केली.' : 'बातमी वाचन जाहिरात क्र. २ बंद केली.');
                      }}
                      className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                    />
                  </div>
                  {detailAd2Enabled ? (
                    <div className="space-y-2.5 text-xs animate-fade-in">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block flex flex-wrap items-center gap-1.5">
                          <span>जाहिरात चित्र लिंक (Ad Image URL)</span>
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">1290 × 720 (16:9)</span>
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... किंवा अपलोड करा"
                            value={detailAd2ImageUrl}
                            onChange={(e) => setDetailAd2ImageUrl(e.target.value)}
                            onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. २ चे चित्र बदलले.'); }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                          <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalFileSelection(e, 'detailAd2')}
                            />
                            <Crop className="h-3 w-3" />
                            <span>अपलोड व क्रॉप</span>
                          </label>
                          <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDeviceUpload(e, 'detailAd2')}
                              disabled={isUploading === 'detailAd2'}
                            />
                            <Upload className="h-3 w-3" />
                            <span>{isUploading === 'detailAd2' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">कारवाई लिंक (Target Link URL)</label>
                        <input
                          type="text"
                          placeholder="उदा. https://majhapatra.com/contact"
                          value={detailAd2Link}
                          onChange={(e) => setDetailAd2Link(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. २ ची क्लिक लिंक बदलली.'); }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                      </div>
                      <div className="pt-1 select-none">
                        <span className="text-[10px] text-slate-400 block mb-1">चित्र पूर्वदृश्य (Live Preview):</span>
                        <div className="aspect-[1290/720] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
                          <img 
                            src={detailAd2ImageUrl} 
                            alt="Ad 2 preview" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-[1290/720]"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'; }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 select-none font-medium">ही जाहिरात सध्या बंद आहे.</div>
                  )}
                </div>

                {/* Ad 3 Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 select-none font-sans">
                      <span className="bg-rose-100 text-rose-700 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">३</span>
                      <span>जाहिरात क्र. ३ - बातमीच्या खाली (Bottom Content)</span>
                    </span>
                    <input
                      type="checkbox"
                      id="detailAd3Enabled"
                      checked={detailAd3Enabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setDetailAd3Enabled(val);
                        await autoSaveBranding({ detailAd3Enabled: val });
                        addActivityLog(val ? 'बातमी वाचन जाहिरात क्र. ३ चालू केली.' : 'बातमी वाचन जाहिरात क्र. ३ बंद केली.');
                      }}
                      className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                    />
                  </div>
                  {detailAd3Enabled ? (
                    <div className="space-y-2.5 text-xs animate-fade-in">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block flex flex-wrap items-center gap-1.5">
                          <span>जाहिरात चित्र लिंक (Ad Image URL)</span>
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">1290 × 720 (16:9)</span>
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... किंवा अपलोड करा"
                            value={detailAd3ImageUrl}
                            onChange={(e) => setDetailAd3ImageUrl(e.target.value)}
                            onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. ३ चे चित्र बदलले.'); }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                          <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalFileSelection(e, 'detailAd3')}
                            />
                            <Crop className="h-3 w-3" />
                            <span>अपलोड व क्रॉप</span>
                          </label>
                          <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDeviceUpload(e, 'detailAd3')}
                              disabled={isUploading === 'detailAd3'}
                            />
                            <Upload className="h-3 w-3" />
                            <span>{isUploading === 'detailAd3' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">कारवाई लिंक (Target Link URL)</label>
                        <input
                          type="text"
                          placeholder="उदा. https://majhapatra.com/contact"
                          value={detailAd3Link}
                          onChange={(e) => setDetailAd3Link(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. ३ ची क्लिक लिंक बदलली.'); }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                      </div>
                      <div className="pt-1 select-none">
                        <span className="text-[10px] text-slate-400 block mb-1">चित्र पूर्वदृश्य (Live Preview):</span>
                        <div className="aspect-[1290/720] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
                          <img 
                            src={detailAd3ImageUrl} 
                            alt="Ad 3 preview" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-[1290/720]"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80'; }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 select-none font-medium">ही जाहिरात सध्या बंद आहे.</div>
                  )}
                </div>

                {/* Ad 4 Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 select-none font-sans">
                      <span className="bg-rose-100 text-rose-700 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">४</span>
                      <span>जाहिरात क्र. ४ - संबंधित बातमीच्या खाली (Bottom Banner)</span>
                    </span>
                    <input
                      type="checkbox"
                      id="detailAd4Enabled"
                      checked={detailAd4Enabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setDetailAd4Enabled(val);
                        await autoSaveBranding({ detailAd4Enabled: val });
                        addActivityLog(val ? 'बातमी वाचन जाहिरात क्र. ४ चालू केली.' : 'बातमी वाचन जाहिरात क्र. ४ बंद केली.');
                      }}
                      className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                    />
                  </div>
                  {detailAd4Enabled ? (
                    <div className="space-y-2.5 text-xs animate-fade-in">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block flex flex-wrap items-center gap-1.5">
                          <span>जाहिरात चित्र लिंक (Ad Image URL)</span>
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">1290 × 720 (16:9)</span>
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... किंवा अपलोड करा"
                            value={detailAd4ImageUrl}
                            onChange={(e) => setDetailAd4ImageUrl(e.target.value)}
                            onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. ४ चे चित्र बदलले.'); }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                          <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalFileSelection(e, 'detailAd4')}
                            />
                            <Crop className="h-3 w-3" />
                            <span>अपलोड व क्रॉप</span>
                          </label>
                          <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDeviceUpload(e, 'detailAd4')}
                              disabled={isUploading === 'detailAd4'}
                            />
                            <Upload className="h-3 w-3" />
                            <span>{isUploading === 'detailAd4' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">कारवाई लिंक (Target Link URL)</label>
                        <input
                          type="text"
                          placeholder="उदा. https://majhapatra.com/contact"
                          value={detailAd4Link}
                          onChange={(e) => setDetailAd4Link(e.target.value)}
                          onBlur={() => { autoSaveBranding(); addActivityLog('बातमी वाचन जाहिरात क्र. ४ ची क्लिक लिंक बदलली.'); }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                      </div>
                      <div className="pt-1 select-none">
                        <span className="text-[10px] text-slate-400 block mb-1">चित्र पूर्वदृश्य (Live Preview):</span>
                        <div className="aspect-[1290/720] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
                          <img 
                            src={detailAd4ImageUrl} 
                            alt="Ad 4 preview" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 aspect-[1290/720]"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80'; }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 select-none font-medium">ही जाहिरात सध्या बंद आहे.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 6: Live TV Channels Customization */}
            <div id="settings-live-tv-form" className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Tv className="h-4 w-4 text-rose-500 shrink-0" />
                <span>६. लाइव्ह टीव्ही थेट प्रक्षेपण (Live TV Video Section)</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">यूट्यूब लाइव्ह / व्हिडिओ लिंक (YouTube Live Stream URL)</label>
                <input
                  type="url"
                  placeholder="उदा. https://www.youtube.com/watch?v=abc123xyz"
                  value={liveTvUrl}
                  onChange={(e) => setLiveTvUrl(e.target.value)}
                  onBlur={() => { autoSaveBranding(); addActivityLog('लाइव्ह टीव्ही चॅनेल यूट्यूब प्रवाहाची लिंक बदलली.'); }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                />
                <p className="text-[10px] text-slate-400">टीप: यूट्यूब चॅनल लाईव्ह प्रवाह किंवा कोणताही सविस्तर व्हिडिओ लिंक प्रविष्ट करा.</p>
              </div>

              {/* Live TV Preview inside Admin Panel */}
              <div className="bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 mt-2 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">टीव्ही प्लेयर पूर्वदृश्य (TV Player Preview):</span>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-300">
                  {(() => {
                    const parsed = getYouTubeId(liveTvUrl);
                    if (parsed) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${parsed}?autoplay=0&rel=0`}
                          title="Admin Live TV Preview"
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allowFullScreen
                        ></iframe>
                      );
                    } else {
                      return (
                        <div className="p-4 text-center text-slate-400 space-y-1 text-xs">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-300">थेट प्रक्षेपण पूर्वदृश्य उपलब्ध नाही</p>
                          <p className="text-[10px]">कृपया वैध किंवा प्रविष्ट यूट्यूब लिंक तपासा.</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Row 7: Media and Cloud Storage Customization */}
            <div id="settings-media-storage" className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Database className="h-4 w-4 text-rose-500 shrink-0" />
                <span>७. मीडिया आणि क्लाउड स्टोरेज (Media & Cloud Storage)</span>
              </h4>

              <div className="flex flex-col space-y-4 bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enableFirebaseStorage"
                    checked={enableFirebaseStorage}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setEnableFirebaseStorage(val);
                      await autoSaveBranding({ enableFirebaseStorage: val });
                      addActivityLog(val ? 'थेट क्लाउड स्टोरेजवर इमेज अपलोड सुरू केले.' : 'थेट क्लाउड स्टोरेजवर इमेज अपलोड बंद केले.');
                    }}
                    className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="enableFirebaseStorage" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    थेट फायरबेस क्लाउड स्टोरेजवर अपलोड सक्षम करा (Enable Direct Firebase Storage Uploads)
                  </label>
                </div>
                <div className="pl-7 text-[11px] text-slate-500 space-y-2 leading-relaxed">
                  <p>
                    <strong>टीप (Note):</strong> जर हे पर्याय बंद असेल (डीफॉल्ट), तर अपलोड केलेल्या सर्व प्रतिमा आणि चित्रे अत्यंत विश्वासार्ह व सुरक्षित अशा अंतर्गत सर्व्हर मेमरीमध्ये जतन केल्या जातील आणि गुगल ड्राईव्हवर सुरक्षितरित्या बॅकअप घेतल्या जातील.
                  </p>
                  <p>
                    जर तुमच्या फायरबेस कन्सोलवर <strong>Firebase Storage</strong> सेवा सुरू असेल आणि कन्सोलमध्ये सुरक्षितता नियम (Rules) व CORS पॉलिसी योग्य प्रकारे सेट असतील, तरच हे चालू करा. कन्सोलवर योग्य सेटअप नसल्यास थेट ब्राऊझरवरून <code>CORS Policy Blocked</code> एरर दिसू शकतो.
                  </p>
                </div>

                {/* Expanded CORS Config Guide */}
                <div className="mt-3 border-t border-slate-100 pt-3 pl-7 space-y-3">
                  <span className="text-xs font-extrabold text-slate-700 block uppercase tracking-wider">
                    🌐 डोमेनसाठी CORS एरर कसा सोडवायचा? (How to Solve CORS Error for ahilyanagarnewsnetwork.in)
                  </span>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-sans">
                    <p className="font-bold">🚨 कारण (Reason):</p>
                    <p>
                      तुम्ही तुमची साईट <code>https://ahilyanagarnewsnetwork.in</code> वर होस्ट केली आहे. सुरक्षा नियमांमुळे, फायरबेस स्टोरेज तुमच्या स्वतःच्या डोमेनवरून थेट फाईल अपलोड ब्लॉक करते जोपर्यंत तुम्ही CORS परवानगी सेट करत नाही.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-600">पायरी १: खालील कोड कॉपी करा आणि <code>cors.json</code> नावाच्या फाईलमध्ये सेव्ह करा:</p>
                    <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-md text-[10px] font-mono overflow-x-auto leading-normal">
{`[
  {
    "origin": ["https://ahilyanagarnewsnetwork.in", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-meta-filename"],
    "maxAgeSeconds": 3600
  }
]`}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-600">पायरी २: Google Cloud Shell किंवा तुमच्या कॉम्प्युटरच्या टर्मिनलमध्ये खालील कमांड चालवा:</p>
                    <div className="bg-slate-900 text-rose-400 p-2.5 rounded-md text-[10px] font-mono break-all leading-normal select-all">
                      gcloud storage buckets update gs://gen-lang-client-0237037046.firebasestorage.app --cors-file=cors.json
                    </div>
                    <p className="text-[10px] text-slate-400">
                      (टीप: जर तुम्ही <code>gsutil</code> वापरत असाल तर: <code>gsutil cors set cors.json gs://gen-lang-client-0237037046.firebasestorage.app</code> चालवा)
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-800">
                    <strong>💡 पर्यायी आणि सोपा उपाय (Alternative Quick Fix):</strong> जर तुम्हाला वरील पायऱ्या करायच्या नसतील, तर तुम्ही फक्त वरील "थेट फायरबेस क्लाउड स्टोरेजवर अपलोड सक्षम करा" चा <strong>चेकबॉक्स बंद (Uncheck) ठेवा</strong>. यामुळे सिस्टम आपोआप अंतर्गत सुरक्षित सर्व्हरवर चित्रे जतन करेल आणि गुगल ड्राईव्हवर बॅकअप घेईल!
                  </div>
                </div>
              </div>
            </div>

            {/* Row 8: Brand Advertisement Image Slider Customization */}
            <div id="settings-brand-ads-slider" className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Images className="h-4 w-4 text-rose-500 shrink-0" />
                <span>८. इतर ब्रँड जाहिराती स्लाइडर (Other Brand Advertisement Slider Section)</span>
              </h4>

              <div className="flex items-center space-x-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="brandAdsEnabled"
                  checked={brandAdsEnabled}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setBrandAdsEnabled(val);
                    await autoSaveBranding({ brandAdsEnabled: val });
                    addActivityLog(val ? 'इतर ब्रँड जाहिराती स्लाइडर चालू केला.' : 'इतर ब्रँड जाहिराती स्लाइडर बंद केला.');
                  }}
                  className="h-4.5 w-4.5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="brandAdsEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  इतर जाहिरात स्लाइडर चालू करा (Enable Brand Ads Slideshow Slider)
                </label>
              </div>

              {brandAdsEnabled && (
                <div className="space-y-4 pt-1 animate-fade-in">
                  
                  {/* List of current slides */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">सध्याच्या जाहिरात स्लाइड्स (Current Advertisement Slides):</span>
                    {brandAdsSlides.length === 0 ? (
                      <p className="text-slate-400 text-xs italic bg-white p-3.5 text-center rounded-lg border border-slate-200">सध्या एकही जाहिरात स्लाईड उपलब्ध नाही. कृपया नवीन जोडा.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brandAdsSlides.map((slide, idx) => (
                          <div key={slide.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col space-y-3 relative group shadow-xs">
                            <div className="flex space-x-3 items-start">
                              <img
                                src={slide.imageUrl}
                                alt={slide.title || 'Slide'}
                                className="w-20 h-14 object-cover rounded-lg bg-slate-100 border border-slate-200 shrink-0"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1 space-y-1 text-xs">
                                <p className="font-bold text-slate-800 line-clamp-1">{slide.title || `स्लाईड क्रमांक #${idx + 1}`}</p>
                                <p className="text-slate-400 truncate text-[10px] font-mono">{slide.linkUrl}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const list = brandAdsSlides.filter((_, sidx) => sidx !== idx);
                                  setBrandAdsSlides(list);
                                  addToast('जाहीरात स्लाईड काढली गेली! संपूर्ण बदल सेव्ह करण्यासाठी खालील रचना सेव्ह बटन दाबा.', 'info');
                                }}
                                className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-md border border-slate-100 transition-colors shrink-0"
                                title="स्लाईड काढा"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Inline Edit & Upload Controls */}
                            <div className="pt-2.5 border-t border-slate-100/80 space-y-2 text-[11px]">
                              <div className="space-y-1">
                                <span className="text-slate-500 font-bold block">चित्र (Image URL या डिव्हाइसमधून अपलोड):</span>
                                <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
                                  <input
                                    type="text"
                                    value={slide.imageUrl}
                                    onChange={(e) => {
                                      const list = [...brandAdsSlides];
                                      list[idx] = { ...list[idx], imageUrl: e.target.value };
                                      setBrandAdsSlides(list);
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-sans"
                                    placeholder="इमेज URL"
                                  />
                                  <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleLocalFileSelection(e, 'slide', idx)}
                                    />
                                    <Crop className="h-3 w-3" />
                                    <span>अपलोड व क्रॉप</span>
                                  </label>
                                  <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleDeviceUpload(e, 'slide', idx)}
                                      disabled={isUploading === `slide-${idx}`}
                                    />
                                    <Upload className="h-3 w-3" />
                                    <span>{isUploading === `slide-${idx}` ? 'अपलोड...' : 'थेट अपलोड'}</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectImageFromDrive((url) => {
                                      const list = [...brandAdsSlides];
                                      list[idx] = { ...list[idx], imageUrl: url };
                                      setBrandAdsSlides(list);
                                    })}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center transition shrink-0 gap-1 select-none cursor-pointer"
                                  >
                                    <FolderOpen className="h-3 w-3" />
                                    <span>ड्राईव्ह</span>
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="text-slate-500 font-bold block">शीर्षक / कॅप्शन (Title):</span>
                                  <input
                                    type="text"
                                    value={slide.title || ''}
                                    onChange={(e) => {
                                      const list = [...brandAdsSlides];
                                      list[idx] = { ...list[idx], title: e.target.value || undefined };
                                      setBrandAdsSlides(list);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                                    placeholder="जाहिरात शीर्षक"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-slate-500 font-bold block">लिंक (Target Link):</span>
                                  <input
                                    type="text"
                                    value={slide.linkUrl === '#' ? '' : slide.linkUrl}
                                    onChange={(e) => {
                                      const list = [...brandAdsSlides];
                                      list[idx] = { ...list[idx], linkUrl: e.target.value || '#' };
                                      setBrandAdsSlides(list);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                                    placeholder="उदा. https://..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add a new slide Form */}
                  <div className="bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
                    <span className="text-xs font-bold text-slate-800 block flex items-center gap-1">
                      <PlusCircle className="h-4 w-4 text-emerald-600" />
                      <span>नवीन जाहिरात स्लाईड जोडा (Add New Brand Slide)</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block flex items-center gap-1.5 flex-wrap">
                          <span>जाहिरात चित्र पत्ता (Image URL) <span className="text-rose-500">*</span></span>
                          <span className="bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-xs text-[9px] uppercase tracking-wider">1290 × 720 (16:9)</span>
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="text"
                            placeholder="उदा. https://images.unsplash.com/photo-..."
                            value={newSlideImgUrl}
                            onChange={(e) => setNewSlideImgUrl(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                          />
                          <label className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 self-stretch">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalFileSelection(e, 'slide')}
                            />
                            <Crop className="h-3 w-3" />
                            <span>अपलोड व क्रॉप</span>
                          </label>
                          <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 self-stretch">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDeviceUpload(e, 'slide')}
                              disabled={isUploading === 'slide'}
                            />
                            <Upload className="h-3 w-3" />
                            <span>{isUploading === 'slide' ? 'अपलोड...' : 'थेट अपलोड'}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSelectImageFromDrive((url) => {
                              setNewSlideImgUrl(url);
                            })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center justify-center transition shrink-0 gap-1 select-none cursor-pointer self-stretch"
                          >
                            <FolderOpen className="h-3 w-3" />
                            <span>ड्राईव्ह</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">कारवाई लिंक (Target Link URL)</label>
                        <input
                          type="text"
                          placeholder="उदा. https://yourbrand.com/special-offer"
                          value={newSlideLinkUrl}
                          onChange={(e) => setNewSlideLinkUrl(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">जाहिरातीचा मुख्य मजकूर / शीर्षक (Banner Caption title)</label>
                      <input
                        type="text"
                        placeholder="उदा. आमच्या नवीन मॉल उद्घाटनानिमित्त सोने खरेदीवर भरघोस सूट!"
                        value={newSlideTitle}
                        onChange={(e) => setNewSlideTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>

                    {newSlideImgUrl && (
                      <div className="pt-1.5 select-none animate-fade-in">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">नवीन स्लाईड चित्र पूर्वदृश्य (New Slide Live Preview):</span>
                        <div className="aspect-[1290/720] w-full max-w-md rounded-lg overflow-hidden border border-slate-300 bg-slate-50 relative group shadow-xs">
                          <img 
                            src={newSlideImgUrl} 
                            alt="New Brand Ad preview" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'; }}
                            referrerPolicy="no-referrer"
                          />
                          {newSlideTitle && (
                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 p-2 text-white text-[10px] font-bold backdrop-blur-xs">
                              {newSlideTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!newSlideImgUrl.trim()) {
                          addToast('कृपया जाहिरातीच्या चित्राची वैध लिंक (Image URL) प्रविष्ट करा.', 'error');
                          return;
                        }

                        const newSlide: BrandAdSlide = {
                          id: `slide-${Date.now()}`,
                          imageUrl: newSlideImgUrl.trim(),
                          linkUrl: newSlideLinkUrl.trim() || '#',
                          title: newSlideTitle.trim() || undefined
                        };

                        setBrandAdsSlides((prev) => [...prev, newSlide]);
                        addToast('जाहिरात स्लाईड तात्पुरती जोडली गेली! रचना कायमस्वरूपी जतन करण्यासाठी खालील "साइट रचना जतन करा" बटणावर क्लिक करा.', 'success');
                        
                        // Reset forms
                        setNewSlideImgUrl('');
                        setNewSlideLinkUrl('');
                        setNewSlideTitle('');
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span>जोडा (Add to Slideshow)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Row 8: Custom Footer Links Customization */}
            <div id="settings-footer-links" className="bg-slate-50/60 p-4 sm:p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                <Link className="h-4 w-4 text-rose-500 shrink-0" />
                <span>८. फुटर सानुकूल लिंक्स (Custom Footer Links)</span>
              </h4>
              <p className="text-xs text-slate-500">फुटरमधील 'जलद दुवे' (Quick Links) भागात दाखवण्यासाठी ६ सानुकूल लिंक्स आणि त्यांची शीर्षके येथे सेट करा.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Link 1 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक १ (Link 1)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. आमच्याबद्दल"
                        value={custFooterLink1Text}
                        onChange={(e) => setCustFooterLink1Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /about किंवा #"
                        value={custFooterLink1Url}
                        onChange={(e) => setCustFooterLink1Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Link 2 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक २ (Link 2)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. जाहिरात दर"
                        value={custFooterLink2Text}
                        onChange={(e) => setCustFooterLink2Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /adv किंवा #"
                        value={custFooterLink2Url}
                        onChange={(e) => setCustFooterLink2Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Link 3 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक ३ (Link 3)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. संपर्क साधा"
                        value={custFooterLink3Text}
                        onChange={(e) => setCustFooterLink3Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /contact किंवा #"
                        value={custFooterLink3Url}
                        onChange={(e) => setCustFooterLink3Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Link 4 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक ४ (Link 4)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. गोपनीयता धोरण"
                        value={custFooterLink4Text}
                        onChange={(e) => setCustFooterLink4Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /privacy किंवा #"
                        value={custFooterLink4Url}
                        onChange={(e) => setCustFooterLink4Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Link 5 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक ५ (Link 5)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. नियम व अटी"
                        value={custFooterLink5Text}
                        onChange={(e) => setCustFooterLink5Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /terms किंवा #"
                        value={custFooterLink5Url}
                        onChange={(e) => setCustFooterLink5Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Link 6 */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">लिंक ६ (Link 6)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">नाव / मजकूर (Text)</label>
                      <input
                        type="text"
                        placeholder="उदा. करिअर"
                        value={custFooterLink6Text}
                        onChange={(e) => setCustFooterLink6Text(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">दुवा (URL)</label>
                      <input
                        type="text"
                        placeholder="उदा. /careers किंवा #"
                        value={custFooterLink6Url}
                        onChange={(e) => setCustFooterLink6Url(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-3 flex gap-3">
              <button
                type="submit"
                disabled={isSavingBranding}
                className={`flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:shadow-lg transition duration-200 text-sm flex items-center justify-center space-x-2 ${
                  isSavingBranding ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isSavingBranding ? (
                  <span>रचना जतन होत आहे...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>साइट रचना जतन करा (Save Settings)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (siteSettings) {
                    setCustChannelName(siteSettings.channelName || '');
                    setCustLogoText(siteSettings.channelLogoText || '');
                    setCustLogoAccentText(siteSettings.channelLogoAccentText || '');
                    setCustTagline(siteSettings.channelTagline || '');
                    setCustLogoUrl(siteSettings.channelLogoUrl || '');
                    setCustFooterAbout(siteSettings.footerAbout || '');
                    setCustFooterAddress(siteSettings.footerAddress || '');
                    setCustFooterPhone(siteSettings.footerPhone || '');
                    setCustFooterEmail(siteSettings.footerEmail || '');
                    setCustFooterCopyrightSub(siteSettings.footerCopyrightSub || '');
                    localStorage.removeItem('majhapatra_breakingNewsText');
                    localStorage.removeItem('majhapatra_topBarTickerText');
                    setCustBreakingNewsText(siteSettings.breakingNewsText || '');
                    setCustTopBarTickerText(siteSettings.topBarTickerText || '');
                    setAdBannerEnabled(siteSettings.adBannerEnabled !== undefined ? siteSettings.adBannerEnabled : true);
                    setAdBannerImageUrl(siteSettings.adBannerImageUrl || '');
                    setAdBannerText(siteSettings.adBannerText || '');
                    setAdBannerLink(siteSettings.adBannerLink || '');
                    setAdBannerBgColor(siteSettings.adBannerBgColor || '#e11d48');
                    setLiveTvUrl(siteSettings.liveTvUrl || '');
                    setEnableFirebaseStorage(siteSettings.enableFirebaseStorage === true);
                    setBrandAdsEnabled(siteSettings.brandAdsEnabled !== undefined ? siteSettings.brandAdsEnabled : true);
                    setBrandAdsSlides(siteSettings.brandAdsSlides || []);
                    setCustFooterLink1Text(siteSettings.footerLink1Text || '');
                    setCustFooterLink1Url(siteSettings.footerLink1Url || '');
                    setCustFooterLink2Text(siteSettings.footerLink2Text || '');
                    setCustFooterLink2Url(siteSettings.footerLink2Url || '');
                    setCustFooterLink3Text(siteSettings.footerLink3Text || '');
                    setCustFooterLink3Url(siteSettings.footerLink3Url || '');
                    setCustFooterLink4Text(siteSettings.footerLink4Text || '');
                    setCustFooterLink4Url(siteSettings.footerLink4Url || '');
                    setCustFooterLink5Text(siteSettings.footerLink5Text || '');
                    setCustFooterLink5Url(siteSettings.footerLink5Url || '');
                    setCustFooterLink6Text(siteSettings.footerLink6Text || '');
                    setCustFooterLink6Url(siteSettings.footerLink6Url || '');
                  }
                  setActiveTab('news');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3.5 rounded-xl transition cursor-pointer text-sm"
              >
                रद्द करा / वापस जा
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'author-logins' ? (
        <AuthorLoginsPanel addToast={addToast} getAuthHeader={getAuthHeader} />
      ) : activeTab === 'cutout' ? (
        <RansomNoteGenerator addToast={addToast} />
      ) : activeTab === 'google-drive' ? (
        <GoogleDrivePanel
          googleAccessToken={googleAccessToken}
          onGoogleLogin={onGoogleLogin}
          newsList={newsList}
          addToast={addToast}
          onImportDraft={handleImportDraftFromDrive}
          siteSettings={siteSettings}
          userRole={userRole}
          adminToken={getAuthHeader()}
          onSaveSettings={onSaveSettings}
        />
      ) : activeTab === 'polls' ? (
        <PollsPanel addToast={addToast} adminToken={getAuthHeader()} googleAccessToken={googleAccessToken} />
      ) : activeTab === 'logs' ? (
        <LogsPanel addToast={addToast} adminToken={getAuthHeader()} />
      ) : (
        /* Author Profiles management interface */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-rose-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <User className="h-5 w-5 text-rose-500" />
              <span>लेखकांचे प्रोफाइल्स व्यवस्थापन (Author Profiles Management)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              सदर विभागात तुम्ही बातमीच्या विशेष वार्ताहरांची, उपसंपादकांची किंवा प्रतिनिधींची नावे आणि त्यांची माहिती जतन करू शकता. ही प्रोफाईल्स तुम्ही नवीन बातम्या प्रसिद्ध करताना थेट जोडू शकता.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Register/Edit form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-150 shadow-xs space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <PlusCircle className="h-4.5 w-4.5 text-rose-600" />
                  <span>{editingAuthorId ? 'लेखक प्रोफाइल संपादित करा' : 'नवीन लेखक जोडा (Add New Author)'}</span>
                </h4>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!profileName.trim()) {
                      addToast('कृपया लेखकाचे नाव अनिवार्य आहे.', 'error');
                      return;
                    }

                    let updatedList = [...authorProfiles];
                    if (editingAuthorId) {
                      updatedList = updatedList.map(item => 
                        item.id === editingAuthorId 
                          ? {
                              ...item,
                              name: profileName.trim(),
                              bio: profileBio.trim(),
                              avatarUrl: profileAvatarUrl.trim(),
                              twitterUrl: profileTwitter.trim(),
                              facebookUrl: profileFacebook.trim(),
                              instagramUrl: profileInstagram.trim(),
                              email: profileEmail.trim(),
                            }
                          : item
                      );
                      addToast('लेखक प्रोफाइल यशस्वीरित्या सुधारित केली गेली!', 'success');
                    } else {
                      const newAuthor = {
                        id: `author-${Date.now()}`,
                        name: profileName.trim(),
                        bio: profileBio.trim(),
                        avatarUrl: profileAvatarUrl.trim(),
                        twitterUrl: profileTwitter.trim(),
                        facebookUrl: profileFacebook.trim(),
                        instagramUrl: profileInstagram.trim(),
                        email: profileEmail.trim(),
                      };
                      updatedList.push(newAuthor);
                      addToast('नवीन लेखक प्रोफाइल यशस्वीरित्या जोडली गेली!', 'success');
                    }

                    // Save to DB and parent settings
                    setAuthorProfiles(updatedList);
                    
                    try {
                      const payload = {
                        ...siteSettings,
                        channelName: custChannelName.trim(),
                        channelLogoText: custLogoText.trim(),
                        channelLogoAccentText: custLogoAccentText.trim(),
                        channelTagline: custTagline.trim(),
                        channelLogoUrl: custLogoUrl.trim(),
                        footerAbout: custFooterAbout.trim(),
                        footerAddress: custFooterAddress.trim(),
                        footerPhone: custFooterPhone.trim(),
                        footerEmail: custFooterEmail.trim(),
                        footerCopyrightSub: custFooterCopyrightSub.trim(),
                        breakingNewsText: custBreakingNewsText.trim(),
                        topBarTickerText: custTopBarTickerText.trim(),
                        adBannerEnabled,
                        adBannerImageUrl: adBannerImageUrl.trim(),
                        adBannerText: adBannerText.trim(),
                        adBannerLink: adBannerLink.trim(),
                        adBannerBgColor: adBannerBgColor.trim(),
                        liveTvUrl: liveTvUrl.trim(),
                        brandAdsEnabled,
                        brandAdsSlides,
                        authorProfiles: updatedList,
                      };

                      await saveSettingsHelper(payload);
                      onSaveSettings();
                    } catch (err) {
                      console.error('Failed to sync settings with server:', err);
                    }

                    // Reset
                    setEditingAuthorId(null);
                    setProfileName('');
                    setProfileBio('');
                    setProfileAvatarUrl('');
                    setProfileTwitter('');
                    setProfileFacebook('');
                    setProfileInstagram('');
                    setProfileEmail('');
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750 text-slate-700">पूर्ण नाव (Full Name) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राजेंद्र माने (विशेष प्रतिनिधी)"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-755 text-slate-700">परिचय / बायो (Author Biography)</label>
                    <textarea
                      rows={3}
                      placeholder="उदा. गेल्या १० वर्षांपासून राजकीय विषयांवर लिखाण करणारे ज्येष्ठ पत्रकार..."
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">प्रोफाइल चित्र (Photo / Avatar)</label>
                    <div className="flex items-center gap-3">
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt="Avatar Preview"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-bold text-xs shrink-0 select-none">
                          चित्र
                        </div>
                      )}
                      <div className="flex-1 flex gap-2">
                        <input
                          type="url"
                          placeholder="प्रोफाइल चित्र URL (उदा. https://...)"
                          value={profileAvatarUrl}
                          onChange={(e) => setProfileAvatarUrl(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
                        />
                        <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 gap-1 select-none">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleDeviceUpload(e, 'authorAvatar')}
                            disabled={isUploading === 'authorAvatar'}
                          />
                          <Upload className="h-3 w-3" />
                          <span>{isUploading === 'authorAvatar' ? 'अपलोड...' : 'अपलोड'}</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2 my-2 space-y-3">
                    <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">सोशल मीडिया लिंक्स आणि ईमेल (Social Info)</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-650 text-slate-650">ईमेल आयडी</label>
                        <input
                          type="email"
                          placeholder="m@example.com"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-650 text-slate-650">ट्विटर (@X)</label>
                        <input
                          type="url"
                          placeholder="https://twitter.com/..."
                          value={profileTwitter}
                          onChange={(e) => setProfileTwitter(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-650 text-slate-650">फेसबुक लिंक</label>
                        <input
                          type="url"
                          placeholder="https://facebook.com/..."
                          value={profileFacebook}
                          onChange={(e) => setProfileFacebook(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-650 text-slate-650">इंस्टाग्राम लिंक</label>
                        <input
                          type="url"
                          placeholder="https://instagram.com/..."
                          value={profileInstagram}
                          onChange={(e) => setProfileInstagram(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition cursor-pointer"
                    >
                      {editingAuthorId ? 'बदल जतन करा' : 'लेखक जोडणी पूर्ण करा'}
                    </button>
                    {editingAuthorId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAuthorId(null);
                          setProfileName('');
                          setProfileBio('');
                          setProfileAvatarUrl('');
                          setProfileTwitter('');
                          setProfileFacebook('');
                          setProfileInstagram('');
                          setProfileEmail('');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg transition"
                      >
                        रद्द करा
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Active Author profiles list */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-rose-600" />
                <span>नोंदणीकृत लेखकांची यादी ({authorProfiles.length})</span>
              </h4>

              {authorProfiles.length === 0 ? (
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-8 text-center text-slate-400 text-sm">
                  सध्या कोणतेही लेखक प्रोफाईल उपलब्ध नाही.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {authorProfiles.map((authorItem) => (
                    <div
                      key={authorItem.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <img
                            src={authorItem.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}
                            alt={authorItem.name}
                            className="w-11 h-11 rounded-full object-cover bg-slate-200 border border-rose-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80';
                            }}
                          />
                          <div>
                            <h5 className="font-bold text-sm text-slate-900 leading-tight">{authorItem.name}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{authorItem.id}</p>
                          </div>
                        </div>

                        {authorItem.bio && (
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {authorItem.bio}
                          </p>
                        )}

                        {/* Social connections overview */}
                        <div className="flex items-center space-x-2.5 pt-1">
                          {authorItem.email && (
                            <a
                              href={`mailto:${authorItem.email}`}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              title={authorItem.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {authorItem.twitterUrl && (
                            <a
                              href={authorItem.twitterUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-sky-500 transition-colors"
                              title="ट्विटर (Twitter)"
                            >
                              <Twitter className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {authorItem.facebookUrl && (
                            <a
                              href={authorItem.facebookUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="फेसबुक (Facebook)"
                            >
                              <Facebook className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {authorItem.instagramUrl && (
                            <a
                              href={authorItem.instagramUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-pink-600 transition-colors"
                              title="इन्स्टाग्राम (Instagram)"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 border-t border-slate-200/60 pt-2.5 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAuthorId(authorItem.id);
                            setProfileName(authorItem.name);
                            setProfileBio(authorItem.bio || '');
                            setProfileAvatarUrl(authorItem.avatarUrl || '');
                            setProfileTwitter(authorItem.twitterUrl || '');
                            setProfileFacebook(authorItem.facebookUrl || '');
                            setProfileInstagram(authorItem.instagramUrl || '');
                            setProfileEmail(authorItem.email || '');
                            
                            // Scroll up
                            const tabHeader = document.getElementById('admin-header-title');
                            if (tabHeader) tabHeader.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] py-1 px-3 rounded-md transition"
                        >
                          सुधार करा
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'लेखक प्रोफाइल डिलीट करावी का?',
                              message: `तुम्हाला खात्री आहे का की "${authorItem.name}" या लेखकाचे प्रोफाइल काढून टाकायचे आहे?`,
                              onConfirm: async () => {
                                const updatedList = authorProfiles.filter(item => item.id !== authorItem.id);
                                setAuthorProfiles(updatedList);
                                addToast('लेखक प्रोफाइल यशस्वीरित्या डिलीट केली गेली!', 'success');

                                try {
                                  const payload = {
                                    ...siteSettings,
                                    channelName: custChannelName.trim(),
                                    channelLogoText: custLogoText.trim(),
                                    channelLogoAccentText: custLogoAccentText.trim(),
                                    channelTagline: custTagline.trim(),
                                    channelLogoUrl: custLogoUrl.trim(),
                                    footerAbout: custFooterAbout.trim(),
                                    footerAddress: custFooterAddress.trim(),
                                    footerPhone: custFooterPhone.trim(),
                                    footerEmail: custFooterEmail.trim(),
                                    footerCopyrightSub: custFooterCopyrightSub.trim(),
                                    breakingNewsText: custBreakingNewsText.trim(),
                                    topBarTickerText: custTopBarTickerText.trim(),
                                    adBannerEnabled,
                                    adBannerImageUrl: adBannerImageUrl.trim(),
                                    adBannerText: adBannerText.trim(),
                                    adBannerLink: adBannerLink.trim(),
                                    adBannerBgColor: adBannerBgColor.trim(),
                                    liveTvUrl: liveTvUrl.trim(),
                                    brandAdsEnabled,
                                    brandAdsSlides,
                                    authorProfiles: updatedList,
                                  };

                                  await saveSettingsHelper(payload);
                                  onSaveSettings();
                                } catch (err) {
                                  console.error('Failed to sync settings with server:', err);
                                }
                              }
                            });
                          }}
                          className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold text-[11px] py-1 px-3 rounded-md transition"
                        >
                          डिलीट
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logo Crop Modal */}
      {logoShowCropModal && logoCropImageSrc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">लोगो क्रॉप करा</h3>
                  <p className="text-[11px] text-slate-500">चित्र ड्रॅग करून आणि झूम करून मुख्य भाग वर्तुळात/चौकोनात ऍडजस्ट करा.</p>
                </div>
              </div>
              <button 
                onClick={() => setLogoShowCropModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col items-center justify-center space-y-6 bg-slate-100/40 flex-1 overflow-y-auto">
              {/* Interactive Cropper Area */}
              <div 
                className="w-80 h-80 bg-slate-900 relative overflow-hidden flex items-center justify-center rounded-2xl shadow-inner border border-slate-700/50 cursor-move select-none"
                onMouseDown={handleLogoCropMouseDown}
                onMouseMove={handleLogoCropMouseMove}
                onMouseUp={handleLogoCropMouseUp}
                onMouseLeave={handleLogoCropMouseUp}
                onTouchStart={handleLogoCropTouchStart}
                onTouchMove={handleLogoCropTouchMove}
                onTouchEnd={handleLogoCropTouchEnd}
              >
                {/* 1:1 Aspect Mask with circular inner border overlay */}
                <div 
                  className="absolute w-52 h-52 border-2 border-dashed border-rose-500 pointer-events-none rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] z-10 flex items-center justify-center"
                >
                  {/* Subtle alignment crosshair */}
                  <div className="absolute w-4 h-0.5 bg-rose-500/40"></div>
                  <div className="absolute h-4 w-0.5 bg-rose-500/40"></div>
                </div>

                {/* The target image */}
                <img
                  ref={logoCropImgRef}
                  src={logoCropImageSrc}
                  alt="Crop Target"
                  style={{ 
                    transform: `translate(${logoCropX}px, ${logoCropY}px) scale(${logoCropZoom})`,
                    transition: isDraggingLogoCrop ? 'none' : 'transform 0.1s ease-out'
                  }}
                  className="max-h-full max-w-full object-contain pointer-events-none select-none"
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>

              {/* Sliders and Controls */}
              <div className="w-full max-w-xs space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1 font-sans">झूम (Zoom)</span>
                    <span className="text-slate-500 font-sans">{Math.round(logoCropZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setLogoCropZoom(prev => Math.max(1, prev - 0.25))}
                      className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition text-slate-600 hover:text-slate-900"
                      title="झूम कमी करा"
                    >
                      <span className="text-xs font-bold font-sans">-</span>
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={logoCropZoom}
                      onChange={(e) => setLogoCropZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-rose-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <button 
                      onClick={() => setLogoCropZoom(prev => Math.min(3, prev + 0.25))}
                      className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition text-slate-600 hover:text-slate-900"
                      title="झूम वाढवा"
                    >
                      <span className="text-xs font-bold font-sans">+</span>
                    </button>
                  </div>
                </div>

                {/* Quick alignment helpers */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setLogoCropX(0);
                      setLogoCropY(0);
                      setLogoCropZoom(1);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition font-sans"
                  >
                    मधे आणा (Center Image)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end space-x-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setLogoShowCropModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition font-sans"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleLogoCropSave}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20 flex items-center gap-1.5 font-sans"
              >
                <Check className="h-4 w-4" />
                <span>क्रॉप करा आणि अपलोड करा</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (Iframe/Sandbox Compatible) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-slide-up">
            <div className="flex items-start space-x-4">
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  {confirmDialog.title || "खात्री करा"}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    confirmDialog.onConfirm();
                  } catch (e) {
                    console.error('Error during confirmation callback:', e);
                  }
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                नक्की करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic HTML5 Canvas Cropper Modal for settings/branding */}
      {selectedFileForCrop && showCropperPane && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <div className="bg-rose-950 text-rose-400 p-2 rounded-lg animate-pulse">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">इमेज क्रॉप आणि रिसाईझ करा</h3>
                  <p className="text-[11px] text-slate-400 font-sans">झूम, गुणोत्तर आणि ऑफसेट टूल्स वापरून इमेज अचूक सेट करा.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedFileForCrop(null);
                  setShowCropperPane(false);
                  setCropTargetField(null);
                  setCropTargetIndex(undefined);
                }}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col space-y-4 overflow-y-auto bg-slate-950/20">
              {/* Live Preview Container */}
              <div className="flex flex-col items-center bg-slate-950 p-3 rounded-xl border border-slate-800/80 relative min-h-[180px] max-h-[220px] overflow-hidden justify-center shadow-inner">
                <img
                  src={selectedFileForCrop}
                  alt="Crop Source"
                  className="max-h-[160px] max-w-full rounded object-contain opacity-85 select-none"
                  style={{
                    transform: `scale(${cropZoom / 100})`,
                    translate: `${(cropOffsetX - 50) * 0.5}px ${(cropOffsetY - 50) * 0.5}px`,
                  }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] text-rose-300 font-sans">
                  इमेजचा रिअल-टाइम प्रभाव (Live Preview)
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block pb-0.5 font-sans">आस्पेक्ट रेशो (Aspect Ratio)</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['16:9', '4:3', '1:1', 'free'] as const).map(ratio => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setCropAspectRatio(ratio)}
                          className={`text-[9px] py-1 font-bold rounded cursor-pointer transition ${
                            cropAspectRatio === ratio ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block pb-0.5 font-sans">आकार विड्थ (Resolution Width px)</label>
                    <div className="grid grid-cols-3 gap-1">
                      {([600, 800, 1200] as const).map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setResizeWidth(w)}
                          className={`text-[9px] py-1 font-bold rounded cursor-pointer transition ${
                            resizeWidth === w ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-sans">१. झूम गुणवत्ता (Scale Zoom) :</span>
                      <span className="text-rose-400 font-bold font-sans">{cropZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-sans">२. आडवा शिफ्ट (Offset-X) :</span>
                        <span className="text-rose-400 font-bold font-sans">{cropOffsetX}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cropOffsetX}
                        onChange={(e) => setCropOffsetX(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-sans">३. उभा शिफ्ट (Offset-Y) :</span>
                        <span className="text-rose-400 font-bold font-sans">{cropOffsetY}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cropOffsetY}
                        onChange={(e) => setCropOffsetY(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFileForCrop(null);
                  setShowCropperPane(false);
                  setCropTargetField(null);
                  setCropTargetIndex(undefined);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer font-sans"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 font-sans"
              >
                <Check className="h-4 w-4" />
                <span>क्रॉप व रिसाईझ रिझल्ट लागू करा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
