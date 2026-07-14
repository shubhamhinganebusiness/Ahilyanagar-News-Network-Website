import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from './utils/safeStorage';
import Navbar from './components/Navbar';
import NewsGrid from './components/NewsGrid';
import ArticleDetail from './components/ArticleDetail';
import AdminPanel from './components/AdminPanel';
import WeatherForecast from './components/WeatherForecast';
import Footer from './components/Footer';
import { News, CategoryType, SiteCustomization, AuthUser } from './types';
import ToastContainer, { ToastMessage } from './components/Toast';
import { AlertTriangle, Umbrella } from 'lucide-react';
import AdBanner from './components/AdBanner';
import LiveTvSection from './components/LiveTvSection';
import AuthTroubleshooterModal from './components/AuthTroubleshooterModal';
import { firebaseAppletConfig } from './firebase-config-fallback';
import { useMetadata } from './hooks/useMetadata';

export default function App() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [currentCategory, setCategory] = useState<CategoryType>('सर्व');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showWeatherView, setShowWeatherView] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showAuthTroubleshooter, setShowAuthTroubleshooter] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Load auth state from session storage on mount
  useEffect(() => {
    try {
      const isLogged = sessionStorage.getItem('mp_user_logged') === 'true';
      const role = sessionStorage.getItem('mp_user_role') as 'superadmin' | 'author' | 'reader' | null;
      const name = sessionStorage.getItem('mp_user_name') || '';
      const username = sessionStorage.getItem('mp_user_username') || '';
      const email = sessionStorage.getItem('mp_user_email') || '';
      const token = sessionStorage.getItem('mp_auth_token') || '';
      const photoUrl = sessionStorage.getItem('mp_user_photo') || '';
      const gToken = localStorage.getItem('mp_google_access_token') || sessionStorage.getItem('mp_google_access_token');

      if (gToken) {
        setGoogleAccessToken(gToken);
      }

      if (isLogged && role && token) {
        setAuthUser({
          role,
          username,
          name,
          email,
          token,
          photoUrl
        });
      }
    } catch (e) {
      console.error('Error reading auth state from sessionStorage:', e);
    }
  }, []);

  const handleLogout = () => {
    setAuthUser(null);
    setGoogleAccessToken(null);
    sessionStorage.removeItem('mp_user_logged');
    sessionStorage.removeItem('mp_admin_logged'); // legacy admin toggle support
    sessionStorage.removeItem('mp_user_role');
    sessionStorage.removeItem('mp_user_name');
    sessionStorage.removeItem('mp_user_username');
    sessionStorage.removeItem('mp_user_email');
    sessionStorage.removeItem('mp_user_photo');
    sessionStorage.removeItem('mp_auth_token');
    sessionStorage.removeItem('mp_google_access_token');
    localStorage.removeItem('mp_google_access_token');
    
    if (isAdminMode) {
      setIsAdminMode(false);
      window.history.pushState(null, '', '/');
    }
    addToast('यशस्वीरित्या लॉगआउट झाले.', 'info');
  };

  const handleFirebaseGoogleLogin = async () => {
    try {
      addToast('गूगल लॉगिन सुरू होत आहे...', 'info');
      
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
      // Add Google Drive scopes
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');

      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      
      // Cache Google Access Token in memory, sessionStorage, and localStorage
      const credential = GoogleAuthProvider.credentialFromResult(userCredential);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        sessionStorage.setItem('mp_google_access_token', credential.accessToken);
        localStorage.setItem('mp_google_access_token', credential.accessToken);
      }

      // 4. Send the ID token to our secure backend verify endpoint
      const loginRes = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });

      const loginText = await loginRes.text();
      let loginData: any;
      try {
        loginData = JSON.parse(loginText);
      } catch (parseErr) {
        if (loginText.trim().startsWith('<!DOCTYPE') || loginText.includes('<html')) {
          throw new Error('तांत्रिक अडचण: सर्व्हरकडून अयोग्य प्रतिसाद मिळाला (HTML ऐवजी JSON हवा होता). कृपया खात्री करा की तुमची होस्टिंग योग्यरित्या कॉन्फिगर केली आहे आणि बॅकएंड Node.js/Express सर्व्हर सक्रिय आहे. (Unexpected HTML response from /api/auth/firebase-login. This usually means your static hosting is misconfigured and routing API requests to index.html instead of the running backend server).');
        }
        throw new Error('सर्व्हरकडून चुकीचा प्रतिसाद मिळाला (Invalid JSON response from /api/auth/firebase-login).');
      }

      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Firebase लॉगिन पडताळणी अयशस्वी झाली.');
      }

      const loggedUser: AuthUser = {
        role: loginData.role,
        username: loginData.username,
        name: loginData.name,
        email: loginData.email,
        token: loginData.token,
        photoUrl: loginData.photoUrl || ''
      };

      setAuthUser(loggedUser);
      sessionStorage.setItem('mp_user_logged', 'true');
      sessionStorage.setItem('mp_user_role', loggedUser.role);
      sessionStorage.setItem('mp_user_name', loggedUser.name);
      sessionStorage.setItem('mp_user_username', loggedUser.username);
      sessionStorage.setItem('mp_user_email', loggedUser.email);
      sessionStorage.setItem('mp_user_photo', loggedUser.photoUrl || '');
      sessionStorage.setItem('mp_auth_token', loggedUser.token);
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let MarathiErrMsg = err.message || 'गूगल लॉगिन करताना त्रुटी आली.';
      if (err.code === 'auth/popup-closed-by-user') {
        MarathiErrMsg = 'लॉगिन पॉपअप विंडो बंद झाली किंवा ब्लॉक केली गेली आहे. कृपया पुन्हा प्रयत्न करा.';
      }
      addToast(MarathiErrMsg, 'error');
    }
  };

  // Local-first site initialization to prevent Cloud Run ephemeral updates loss
  const getInitialSettings = (): SiteCustomization => {
    const defaultVals: SiteCustomization = {
      channelName: 'अहिल्यानगर न्यूज नेटवर्क',
      channelLogoText: 'माझा',
      channelLogoAccentText: 'अहिल्यानगर न्यूज नेटवर्क',
      channelTagline: 'माझा महाराष्ट्र, माझे पत्र',
      channelLogoUrl: 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link',
      footerAbout: 'अहिल्यानगर न्यूज नेटवर्क हे महाराष्ट्रातील अग्रगण्य मराठी न्यूज पोर्टल आहे. आम्ही आपल्यापर्यंत राजकीय, सामाजिक, क्रीडा, मनोरंजन आणि आर्थिक क्षेत्रातील ताज्या व विश्वासार्ह घडामोडी तत्परतेने पोहोचवतो.',
      footerAddress: 'अहिल्यानगर न्यूज नेटवर्क, महाराष्ट्र, भारत.',
      footerPhone: '+९१ ९४२३२३४१९३',
      footerEmail: 'editor@ahilyanagarnewsnetwork.in',
      footerCopyrightSub: 'महाराष्ट्राचे हक्ताचे व्यासपीठ',
      breakingNewsText: 'महायुती आणि महाविकास आघाडीमध्ये जागावाटपाचा तिढा सुटला; दोन्ही बाजूंकडून उमेदवारांची घोषणा | मुंबई-पुणे एक्सप्रेसवेवर भीषण अपघात, वाहतूक कोंडी | सोन्याच्या दरात घसरण, गुढीपाडव्याच्या पार्श्वभूमीवर ग्राहकांना दिलासा | आयपीएल २०२६: मुंबई इंडियन्सचा शानदार विजय, गुणतालिकेत वरचे स्थान मिळवले',
      topBarTickerText: 'अहिल्यानगर न्यूज नेटवर्क वर ताज्या घडामोडी आणि अचूक बातम्यांचे थेट प्रसार पाहा.',
      adBannerEnabled: true,
      adBannerImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      adBannerText: 'विशेष जाहिरात ऑफर: आमच्यासोबत जाहिरात करून तुमचा व्यवसाय लाखोंपर्यंत पोहोचवा! संपर्क: +९१ ९४२३२३४१९३',
      adBannerLink: '#',
      adBannerBgColor: '#e11d48',
      liveTvUrl: 'https://www.youtube.com/watch?v=yW6I1y8Jt4w',
      detailAd1Enabled: true,
      detailAd1ImageUrl: 'https://drive.google.com/file/d/1E1E6cWWWKiBrCardUEJRg3dONyDJ6fe1/view?usp=drive_link',
      detailAd1Link: '#',
      detailAd2Enabled: true,
      detailAd2ImageUrl: 'https://drive.google.com/file/d/18IMddIjMS_H_SyvKDbLE1U1MEktquJxR/view?usp=drive_link',
      detailAd2Link: '#',
      detailAd3Enabled: true,
      detailAd3ImageUrl: 'https://drive.google.com/file/d/18IMddIjMS_H_SyvKDbLE1U1MEktquJxR/view?usp=drive_link',
      detailAd3Link: '#',
      detailAd4Enabled: true,
      detailAd4ImageUrl: 'https://drive.google.com/file/d/1_OwWqIM9eTKQH1XffOBlSpL6WWZv_fW-/view?usp=drive_link',
      detailAd4Link: '#',
      brandAdsEnabled: true,
      brandAdsSlides: [
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
      ],
      brandAdsTitle: 'विशेष जाहिरात दालन',
      brandAdsSubtitle: 'आमच्या न्यूज पोर्टलवर आपल्या व्यवसायाची जाहिरात करा',
      brandAdsInterval: 5,
    };

    const result = { ...defaultVals };
    try {
      const stored = localStorage.getItem('majhapatra_siteCustomization');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(result, parsed);
      }
    } catch (e) {
      console.error('Error recovering local customization settings:', e);
    }

    if (!result.channelLogoUrl || result.channelLogoUrl.includes('magnific.com') || result.channelLogoUrl === '/logo.jpg' || result.channelLogoUrl === '/Images/logo.jpg') {
      result.channelLogoUrl = 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link';
    }
    return result;
  };
  const [siteSettings, setSiteSettings] = useState<SiteCustomization>(getInitialSettings);

  const activeArticle = selectedArticleId ? newsList.find(n => n._id === selectedArticleId || (n as any).id === selectedArticleId) || null : null;
  useMetadata(activeArticle, siteSettings);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Function to load/refresh news list from real Express API
  const fetchNews = () => {
    setIsLoading(true);
    
    const tryDirectFirestore = () => {
      import('./utils/firebaseClient')
        .then(({ getDirectNews, setClientOnlyMode }) => {
          setClientOnlyMode(true);
          const authorUser = isAdminMode ? (sessionStorage.getItem('mp_auth_username') || undefined) : undefined;
          return getDirectNews(
            currentCategory === 'सर्व' ? undefined : currentCategory,
            searchQuery.trim() ? searchQuery : undefined,
            isAdminMode,
            authorUser
          );
        })
        .then((data) => {
          setNewsList(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Direct Firestore fetch news failed:', err);
          setIsLoading(false);
          addToast('बातम्या लोड करण्यात अडचण आली.', 'error');
        });
    };

    import('./utils/firebaseClient').then(({ isClientOnlyMode, setClientOnlyMode }) => {
      if (isClientOnlyMode()) {
        tryDirectFirestore();
        return;
      }

      let url = '/api/news';
      
      // Build parameters if they fit backend endpoints
      const params = new URLSearchParams();
      params.append('_t', Date.now().toString());
      if (currentCategory !== 'सर्व') {
        params.append('category', currentCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (isAdminMode) {
        params.append('includeHidden', 'true');
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const headers: Record<string, string> = {};
      if (isAdminMode) {
        headers['Authorization'] = sessionStorage.getItem('mp_auth_token') || 'Basic YWRtaW46bWFyYXRoaUAxMjM=';
      }

      fetch(url, { headers })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              setClientOnlyMode(true);
              throw new Error('404');
            }
            throw new Error('बातम्या लोड करण्यात अडचण आली.');
          }
          return res.json();
        })
        .then((data: News[]) => {
          setNewsList(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('API Fetch News failed, falling back to client-side Firestore:', err);
          tryDirectFirestore();
        });
    });
  };

  // Trigger load on category, search, admin mode or initial load
  useEffect(() => {
    fetchNews();
  }, [currentCategory, searchQuery, isAdminMode]);

  // Fetch Site Customization settings on mount with localStorage caching
  const fetchSettings = () => {
    const tryDirectSettings = () => {
      import('./utils/firebaseClient')
        .then(({ getDirectSettings, setClientOnlyMode }) => {
          setClientOnlyMode(true);
          return getDirectSettings();
        })
        .then((data) => {
          if (data && typeof data === 'object') {
            setSiteSettings((prev) => {
              const merged = { ...prev, ...data };
              if (!merged.channelLogoUrl || merged.channelLogoUrl.includes('magnific.com') || merged.channelLogoUrl === '/logo.jpg' || merged.channelLogoUrl === '/Images/logo.jpg') {
                merged.channelLogoUrl = 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link';
              }
              try {
                localStorage.setItem('majhapatra_siteCustomization', JSON.stringify(merged));
              } catch (e) {
                console.error(e);
              }
              return merged;
            });
          }
        })
        .catch((err) => {
          console.error('Direct Firestore fetch settings failed:', err);
        });
    };

    import('./utils/firebaseClient').then(({ isClientOnlyMode, setClientOnlyMode }) => {
      if (isClientOnlyMode()) {
        tryDirectSettings();
        return;
      }

      fetch(`/api/settings?_t=${Date.now()}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              setClientOnlyMode(true);
              throw new Error('404');
            }
            throw new Error();
          }
          return res.json();
        })
        .then((data) => {
          if (data && typeof data === 'object') {
            setSiteSettings((prev) => {
              const merged = { ...prev, ...data };
              if (!merged.channelLogoUrl || merged.channelLogoUrl.includes('magnific.com') || merged.channelLogoUrl === '/logo.jpg' || merged.channelLogoUrl === '/Images/logo.jpg') {
                merged.channelLogoUrl = 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link';
              }
              try {
                localStorage.setItem('majhapatra_siteCustomization', JSON.stringify(merged));
              } catch (e) {
                console.error(e);
              }
              return merged;
            });
            if (data.googleAccessToken) {
              setGoogleAccessToken(data.googleAccessToken);
            }
          }
        })
        .catch((err) => {
          console.warn('API Fetch Settings failed, falling back to client-side Firestore:', err);
          tryDirectSettings();
        });
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Check URL parameters on mount to support redirect routing from Express
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    const articleParam = params.get('article');

    if (pageParam === 'admin') {
      setIsAdminMode(true);
      setSelectedArticleId(null);
      setShowWeatherView(false);
    } else if (pageParam === 'weather') {
      setShowWeatherView(true);
      setIsAdminMode(false);
      setSelectedArticleId(null);
    } else if (articleParam) {
      setSelectedArticleId(articleParam);
      setIsAdminMode(false);
      setShowWeatherView(false);
    }
  }, []);

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    setIsAdminMode(false);
    setShowWeatherView(false);
    // Push simple state changes into history in-case user uses browser back button
    window.history.pushState(null, '', `/?article=${id}`);
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setSelectedArticleId(null);
    setIsAdminMode(false);
    setShowWeatherView(false);
    window.history.pushState(null, '', '/');
    fetchNews();
  };

  const handleNavigateToAdmin = () => {
    setIsAdminMode(true);
    setSelectedArticleId(null);
    setShowWeatherView(false);
    window.history.pushState(null, '', '/?page=admin');
  };

  const handleToggleWeather = (show: boolean) => {
    setShowWeatherView(show);
    setIsAdminMode(false);
    setSelectedArticleId(null);
    if (show) {
      window.history.pushState(null, '', '/?page=weather');
    } else {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser popstate to make browser back button work!
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const articleParam = params.get('article');

      if (pageParam === 'admin') {
        setIsAdminMode(true);
        setSelectedArticleId(null);
        setShowWeatherView(false);
      } else if (pageParam === 'weather') {
        setShowWeatherView(true);
        setIsAdminMode(false);
        setSelectedArticleId(null);
      } else if (articleParam) {
        setSelectedArticleId(articleParam);
        setIsAdminMode(false);
        setShowWeatherView(false);
      } else {
        setSelectedArticleId(null);
        setIsAdminMode(false);
        setShowWeatherView(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Implement Read-Only, No-Copy, and No-Image-Download restrictions
  useEffect(() => {
    const isUserAdmin = isAdminMode || authUser?.role === 'superadmin' || authUser?.role === 'author';
    
    if (isUserAdmin) {
      document.body.classList.add('admin-mode-active');
    } else {
      document.body.classList.remove('admin-mode-active');
    }

    let lastToastTime = 0;
    const showCopyWarning = () => {
      const now = Date.now();
      if (now - lastToastTime > 3500) {
        addToast('या वेबसाईटवरील मजकूर किंवा चित्रे कॉपी करण्यास अथवा डाउनलोड करण्यास मनाई आहे.', 'error');
        lastToastTime = now;
      }
    };

    const isEditableElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      const tagName = target.tagName.toUpperCase();
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null
      );
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isUserAdmin) return;
      const target = e.target as HTMLElement;
      if (isEditableElement(target)) return;

      e.preventDefault();
      showCopyWarning();
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (isUserAdmin) return;
      const target = e.target as HTMLElement;
      if (isEditableElement(target)) return;

      e.preventDefault();
      showCopyWarning();
    };

    const handleDragStart = (e: DragEvent) => {
      if (isUserAdmin) return;
      const target = e.target as HTMLElement;
      // Completely block dragging images to download or copy them
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
        showCopyWarning();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUserAdmin) return;
      const target = e.target as HTMLElement;
      if (isEditableElement(target)) return;

      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Block Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+S, Ctrl+U, F12, Ctrl+Shift+I
      if (
        (isCmdOrCtrl && (key === 'c' || key === 'a' || key === 'x' || key === 's' || key === 'u')) ||
        e.key === 'F12' ||
        (isCmdOrCtrl && e.shiftKey && key === 'i') ||
        (e.metaKey && e.altKey && key === 'i')
      ) {
        e.preventDefault();
        showCopyWarning();
      }
    };

    // Add event listeners globally
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('copy', handleCopyCut, { capture: true });
    window.addEventListener('cut', handleCopyCut, { capture: true });
    window.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('copy', handleCopyCut, { capture: true });
      window.removeEventListener('cut', handleCopyCut, { capture: true });
      window.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isAdminMode, authUser]);

  // Compute dynamic categories based on default core ones and the ones present in news articles
  const defaultCategories = ['सर्व', 'राजकीय', 'राष्ट्रीय', 'राज्य', 'शहर', 'क्रीडा', 'मनोरंजन', 'अर्थव्यवस्था'];
  const activeCategories = newsList
    .map((item) => item.category)
    .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '');
  const uniqueCategories = Array.from(new Set([...defaultCategories, ...activeCategories]));
  const categoriesList = uniqueCategories.map((cat) => ({
    label: cat === 'सर्व' ? 'सर्व बातम्या' : cat,
    value: cat,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <div>
        {/* Navbar */}
        <Navbar
          currentCategory={currentCategory}
          setCategory={(cat) => {
            setCategory(cat);
            setShowWeatherView(false);
          }}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q) setShowWeatherView(false);
          }}
          onNavigateToAdmin={handleNavigateToAdmin}
          onNavigateToHome={handleBackToHome}
          isAdminMode={isAdminMode}
          siteSettings={siteSettings}
          showWeatherView={showWeatherView}
          onToggleWeather={handleToggleWeather}
          authUser={authUser}
          onGoogleLogin={handleFirebaseGoogleLogin}
          onLogout={handleLogout}
          onOpenTroubleshooter={() => setShowAuthTroubleshooter(true)}
          addToast={addToast}
          categories={categoriesList}
        />

        {/* Breaking News Ticker */}
        {(localStorage.getItem('majhapatra_breakingNewsText') || siteSettings.breakingNewsText) && (
          <div className="bg-rose-600 border-y border-rose-700/30 text-white flex items-center h-11 overflow-hidden select-none shadow-xs font-sans">
            <div className="bg-rose-700 text-white text-xs font-extrabold px-4 py-3 shrink-0 flex items-center space-x-2.5 uppercase tracking-wider relative z-10 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
              </span>
              <span>ब्रेकिंग न्यूज</span>
            </div>
            <div className="relative flex-1 overflow-hidden flex items-center h-full">
              <div className="animate-marquee whitespace-nowrap flex items-center gap-16 text-sm font-medium tracking-wide">
                <span>{localStorage.getItem('majhapatra_breakingNewsText') || siteSettings.breakingNewsText}</span>
                <span className="text-yellow-300 font-bold">★</span>
                <span>{localStorage.getItem('majhapatra_breakingNewsText') || siteSettings.breakingNewsText}</span>
                <span className="text-yellow-300 font-bold">★</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Pages Area */}
        <main className="animate-fade-in">
          {isAdminMode ? (
            <AdminPanel
              onBackToHome={handleBackToHome}
              newsList={newsList}
              refreshNews={fetchNews}
              addToast={addToast}
              siteSettings={siteSettings}
              onSaveSettings={fetchSettings}
              googleAccessToken={googleAccessToken}
              onGoogleAccessTokenChange={(token) => {
                setGoogleAccessToken(token);
                if (token) {
                  sessionStorage.setItem('mp_google_access_token', token);
                  localStorage.setItem('mp_google_access_token', token);
                  // Save securely to server settings
                  fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': sessionStorage.getItem('mp_auth_token') || ''
                    },
                    body: JSON.stringify({ googleAccessToken: token })
                  }).catch((err) => console.error('Failed to save Google access token to settings:', err));
                } else {
                  sessionStorage.removeItem('mp_google_access_token');
                  localStorage.removeItem('mp_google_access_token');
                  // Clear from server settings
                  fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': sessionStorage.getItem('mp_auth_token') || ''
                    },
                    body: JSON.stringify({ googleAccessToken: '' })
                  }).catch((err) => console.error('Failed to clear Google access token from settings:', err));
                }
              }}
              onGoogleLogin={handleFirebaseGoogleLogin}
            />
          ) : showWeatherView ? (
            <WeatherForecast />
          ) : selectedArticleId ? (
            <ArticleDetail
              articleId={selectedArticleId}
              onBack={handleBackToHome}
              onSelectArticle={handleSelectArticle}
              addToast={addToast}
              channelName={siteSettings.channelName}
              siteSettings={siteSettings}
              authUser={authUser}
            />
          ) : (
            <>
              {/* Ad Banner customizable via admin */}
              <AdBanner settings={siteSettings} />

              <NewsGrid
                newsList={newsList}
                currentCategory={currentCategory}
                searchQuery={searchQuery}
                onSelectArticle={handleSelectArticle}
                setCategory={setCategory}
                setSearchQuery={setSearchQuery}
                siteSettings={siteSettings}
                onToggleWeather={handleToggleWeather}
                authUser={authUser}
                addToast={addToast}
                isLoading={isLoading}
                categories={categoriesList}
              />
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer siteSettings={siteSettings} addToast={addToast} />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Auth Troubleshooter Modal for Fallback Login / Popup issues */}
      <AuthTroubleshooterModal
        isOpen={showAuthTroubleshooter}
        onClose={() => setShowAuthTroubleshooter(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          // Auto route to admin panel if user is admin/author and they logged in from a restricted action
          if (user.role === 'superadmin' || user.role === 'author') {
            setIsAdminMode(true);
            window.scrollTo(0, 0);
          }
        }}
        addToast={addToast}
      />
    </div>
  );
}
