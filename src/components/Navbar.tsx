import React, { useState, useEffect } from 'react';
import { safeLocalStorage as localStorage } from '../utils/safeStorage';
import { Newspaper, Search, Menu, X, ShieldAlert, Calendar, LayoutGrid, Sun, Activity, Bell, RefreshCw, User, BarChart3, Vote, Shield } from 'lucide-react';
import { CategoryType, SiteCustomization, AuthUser } from '../types';

// Helper to convert English numerals to Marathi numerals
const toMarathiDigits = (num: number | string) => {
  const numerals: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return num.toString().split('').map(d => numerals[d] || d).join('');
};

interface NavbarProps {
  currentCategory: CategoryType;
  setCategory: (category: CategoryType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNavigateToAdmin: () => void;
  onNavigateToHome: () => void;
  isAdminMode: boolean;
  siteSettings: SiteCustomization;
  showWeatherView: boolean;
  onToggleWeather: (show: boolean) => void;
  authUser: AuthUser | null;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onOpenTroubleshooter?: () => void;
  addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  categories?: { label: string; value: CategoryType }[];
}

export default function Navbar({
  currentCategory,
  setCategory,
  searchQuery,
  setSearchQuery,
  onNavigateToAdmin,
  onNavigateToHome,
  isAdminMode,
  siteSettings,
  showWeatherView,
  onToggleWeather,
  authUser,
  onGoogleLogin,
  onLogout,
  onOpenTroubleshooter,
  addToast,
  categories: dynamicCategories,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [userVotesHistory, setUserVotesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'polls'>('profile');
  const [notificationsOptedIn, setNotificationsOptedIn] = useState<boolean>(() => {
    return localStorage.getItem('mp_notifications_opt_in') !== 'false';
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [siteNotifications, setSiteNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSiteNotifications = async () => {
    if (!authUser?.email) return;
    try {
      const res = await fetch(`/api/notifications?email=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setSiteNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching site notifications:', err);
    }
  };

  useEffect(() => {
    if (authUser?.email) {
      fetchSiteNotifications();
      const interval = setInterval(fetchSiteNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [authUser]);

  const fetchActivityHistory = async () => {
    if (!authUser?.email) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/user-votes?email=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setUserVotesHistory(data);
      }
    } catch (err) {
      console.error('Error fetching voting history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showActivityModal) {
      fetchActivityHistory();
    }
  }, [showActivityModal, authUser]);

  const toggleNotifications = () => {
    const newVal = !notificationsOptedIn;
    setNotificationsOptedIn(newVal);
    localStorage.setItem('mp_notifications_opt_in', String(newVal));
    if (addToast) {
      if (newVal) {
        addToast('वेबसाईट मतदान आणि नवीन सूचना सुरू केल्या!', 'success');
      } else {
        addToast('वेबसाईट सूचना बंद केल्या.', 'info');
      }
    }
  };

  const [isCelsius, setIsCelsius] = useState<boolean>(() => {
    return localStorage.getItem('majhapatra_is_celsius') !== 'false';
  });
  const [currentTemp, setCurrentTemp] = useState<number | null>(() => {
    const cached = localStorage.getItem('majhapatra_cached_temp');
    return cached ? Number(cached) : 35;
  });

  const fetchLiveTemp = async () => {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=19.0948&longitude=74.7480&current=temperature_2m`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.current && typeof data.current.temperature_2m === 'number') {
          const tempVal = Math.round(data.current.temperature_2m);
          setCurrentTemp(tempVal);
          localStorage.setItem('majhapatra_cached_temp', String(tempVal));
        }
      }
    } catch (e) {
      console.warn("Fallback to default temp in Navbar", e);
    }
  };

  React.useEffect(() => {
    fetchLiveTemp();
    // Auto update live temp every 30 seconds
    const interval = setInterval(fetchLiveTemp, 30000);

    const handleUnitChange = () => {
      setIsCelsius(localStorage.getItem('majhapatra_is_celsius') !== 'false');
    };
    window.addEventListener('majhapatra_unit_change', handleUnitChange);

    const handleWeatherUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.temp === 'number') {
        setCurrentTemp(customEvent.detail.temp);
      }
    };
    window.addEventListener('majhapatra_weather_updated', handleWeatherUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('majhapatra_unit_change', handleUnitChange);
      window.removeEventListener('majhapatra_weather_updated', handleWeatherUpdated);
    };
  }, []);

  // Categories in Marathi
  const categories: { label: string; value: CategoryType }[] = dynamicCategories || [
    { label: 'सर्व बातम्या', value: 'सर्व' },
    { label: 'राष्ट्रीय', value: 'राष्ट्रीय' },
    { label: 'राज्य', value: 'राज्य' },
    { label: 'शहर', value: 'शहर' },
    { label: 'क्रीडा', value: 'क्रीडा' },
    { label: 'मनोरंजन', value: 'मनोरंजन' },
    { label: 'अर्थव्यवस्था', value: 'अर्थव्यवस्था' },
  ];

  // Helper to get Marathi Date
  const getMarathiDate = () => {
    const days = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    const months = [
      'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
      'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
    ];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const yearNum = now.getFullYear();

    return `${dayName}, ${toMarathiDigits(dateNum)} ${monthName} ${toMarathiDigits(yearNum)}`;
  };

  return (
    <header className="bg-white border-b border-rose-100 shadow-xs sticky top-0 z-50">
      {/* Top bar: Date, live news ticker and Admin link */}
      <div className="bg-rose-50 text-rose-950 px-4 py-2 text-xs sm:px-6 lg:px-8 border-b border-rose-100/60 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-center sm:text-left">
          <div className="flex items-center space-x-3 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5 text-rose-600" />
              <span>{getMarathiDate()}</span>
            </div>
            <span className="text-rose-250/50 hidden sm:inline">|</span>
            <button
              onClick={() => onToggleWeather(true)}
              className="flex items-center space-x-1 hover:text-rose-600 text-slate-600 transition-all font-bold bg-white/45 hover:bg-white px-2 py-0.5 rounded-sm border border-rose-100/40 shadow-3xs"
              title="अहिल्यानगर जिल्हा हवामान अंदाज पाहण्यासाठी क्लिक करा"
            >
              <Sun className="h-3.5 w-3.5 text-amber-500 animate-[spin_10s_linear_infinite]" />
              <span>हवामान: {currentTemp !== null ? (isCelsius ? `${toMarathiDigits(currentTemp)}°C` : `${toMarathiDigits(Math.round((currentTemp * 9 / 5) + 32))}°F`) : (isCelsius ? '३५°C' : '९५°F')} (अहिल्यानगर)</span>
            </button>
          </div>
          <div className="flex items-center space-x-2 mr-0 sm:mr-4 max-w-full overflow-hidden w-full sm:w-auto flex-1 bg-rose-100/30 sm:bg-transparent py-1 sm:py-0 px-2 rounded-md">
            <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm animate-pulse shrink-0">ब्रेकिंग</span>
            <div className="flex-1 min-w-0 overflow-hidden relative py-0.5 text-slate-800 font-sans text-xs">
              <div className="animate-marquee whitespace-nowrap">
                <span className="inline-block pr-12 font-semibold">
                  {localStorage.getItem('majhapatra_topBarTickerText') || siteSettings?.topBarTickerText || "माझापत्र वर ताज्या घडामोडी आणि अचूक बातम्यांचे थेट प्रसार पाहा."}
                </span>
                <span className="inline-block pr-12 font-semibold">
                  {localStorage.getItem('majhapatra_topBarTickerText') || siteSettings?.topBarTickerText || "माझापत्र वर ताज्या घडामोडी आणि अचूक बातम्यांचे थेट प्रसार पाहा."}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3.5">
            {authUser ? (
              <div className="flex items-center space-x-3">
                {/* User Info & Avatar */}
                <div className="flex items-center space-x-1.5 bg-white/40 px-2 py-0.5 rounded-md border border-rose-150/20">
                  {authUser.photoUrl ? (
                    <img 
                      src={authUser.photoUrl} 
                      alt={authUser.name} 
                      className="h-4.5 w-4.5 rounded-full border border-rose-200 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {authUser.name.substring(0, 1)}
                    </div>
                  )}
                  <span className="text-slate-700 font-bold max-w-[100px] truncate">{authUser.name}</span>
                </div>

                {/* Role badge if admin/author */}
                {(authUser.role === 'superadmin' || authUser.role === 'author') && (
                  <button
                    onClick={onNavigateToAdmin}
                    className={`flex items-center space-x-1 hover:text-rose-600 font-bold transition-all px-2 py-0.5 rounded-md border text-[11px] ${
                      isAdminMode 
                        ? 'text-rose-600 border-rose-200 bg-rose-100/50' 
                        : 'text-slate-600 border-rose-100 bg-rose-50/50 hover:bg-rose-50'
                    }`}
                  >
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    <span>{authUser.role === 'superadmin' ? 'प्रशासक (Admin)' : 'लेखक पॅनेल'}</span>
                  </button>
                )}

                {/* My Activity Button */}
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="flex items-center space-x-1 hover:text-rose-650 font-bold transition-all px-2 py-0.5 rounded-md border text-[11px] text-slate-600 border-rose-100 bg-white hover:bg-rose-50"
                  title="माझा मतदान इतिहास"
                >
                  <Activity className="h-3 w-3 shrink-0 text-rose-500" />
                  <span>माझी कृती</span>
                </button>

                {/* Notification Bell with Badge & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      fetchSiteNotifications();
                    }}
                    className={`p-1 rounded-md border transition-all cursor-pointer flex items-center justify-center w-5.5 h-5.5 relative ${
                      showNotificationsDropdown || unreadCount > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/70' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                    title="सूचना केंद्र (Notification Center)"
                  >
                    <Bell className={`h-3.5 w-3.5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                        {toMarathiDigits(unreadCount)}
                      </span>
                    )}
                  </button>

                  {showNotificationsDropdown && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-slide-up">
                      <div className="p-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 font-special">सूचना केंद्र (Notifications)</span>
                        {unreadCount > 0 && (
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                            {toMarathiDigits(unreadCount)} नवीन
                          </span>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {siteNotifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-450 space-y-1">
                            <Bell className="h-5 w-5 text-slate-300 mx-auto" />
                            <p className="text-[11px] font-bold">कोणतीही नवीन सूचना नाही.</p>
                          </div>
                        ) : (
                          siteNotifications.map((notif) => (
                            <div 
                              key={notif._id} 
                              onClick={async () => {
                                if (!notif.read) {
                                  await fetch(`/api/notifications/${notif._id}/read`, { method: 'POST' });
                                  fetchSiteNotifications();
                                }
                              }}
                              className={`p-3 text-left transition cursor-pointer ${
                                notif.read ? 'bg-white hover:bg-slate-50/50' : 'bg-rose-50/20 hover:bg-rose-50/40 border-l-2 border-rose-500'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                                  {!notif.read && <span className="w-1.5 h-1.5 bg-rose-600 rounded-full inline-block shrink-0" />}
                                  <span>{notif.title}</span>
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">
                                  {new Date(notif.createdAt).toLocaleDateString('mr-IN', {
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-normal font-bold">
                                {notif.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="text-rose-600 hover:text-rose-800 font-bold text-[11px] border border-rose-100 px-2 py-0.5 rounded-md bg-white hover:bg-rose-50/50 transition-all shrink-0 cursor-pointer"
                >
                  लॉगआउट
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={onGoogleLogin}
                  className="flex items-center space-x-1 bg-white border border-rose-200 hover:border-rose-400 text-rose-700 hover:bg-rose-50 font-bold px-2 py-0.5 rounded-md transition-all text-[11px] shadow-3xs cursor-pointer"
                  title="गूगल द्वारे लॉगिन करा"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-3 h-3" alt="Google" />
                  <span>गूगल लॉगिन</span>
                </button>

                {onOpenTroubleshooter && (
                  <button
                    onClick={onOpenTroubleshooter}
                    className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 p-0.5 rounded-md transition-all cursor-pointer text-[11px] font-bold flex items-center justify-center shrink-0 w-5 h-5"
                    title="लॉगिन साहाय्यक (लॉगिन होत नसल्यास येथे क्लिक करा)"
                  >
                    ?
                  </button>
                )}

                {/* Traditional fallback/link for admin page */}
                <button
                  onClick={onNavigateToAdmin}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold underline pl-1"
                >
                  प्रशासक
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main branding & Search (Centered Logo & Channel Name in single responsive line on mobile / grid on desktop) */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 border-b border-rose-100/30">
        <div className="flex items-center justify-between w-full md:grid md:grid-cols-3 md:gap-6 md:items-center">
          
          {/* Column 1: Website Tagline Description (Desktop Only) */}
          <div className="hidden md:flex flex-col items-start space-y-1.5 border-l-2 border-rose-500 pl-3">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-sm">थेट २४ तास घडामोडी</span>
            <span className="text-xs text-slate-500 font-semibold font-sans leading-relaxed text-left">
              {siteSettings.channelName || 'माझापत्र'} वर तुमच्या हक्काच्या आणि खात्रीशीर बातम्या.
            </span>
          </div>

          {/* Column 2: Logo and Channel Name (Aligned left on mobile, centered on desktop - stays on single line) */}
          <div className="flex justify-start md:justify-center flex-1 min-w-0 mr-2 md:mr-0">
            <div
              onClick={onNavigateToHome}
              className="flex items-center space-x-2.5 sm:space-x-3.5 cursor-pointer select-none group focus:outline-hidden transition-all duration-200 hover:scale-[1.01] min-w-0"
            >
              {/* Refined Shield Logo with golden ring/shadow effect */}
              {siteSettings.channelLogoUrl ? (
                <div className="shrink-0 relative h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden border-2 border-rose-600 shadow-md sm:shadow-lg shadow-rose-200/50 hover:scale-105 transition-all duration-300">
                  <img 
                    src={siteSettings.channelLogoUrl} 
                    alt={siteSettings.channelName || 'Logo'} 
                    className="h-full w-full object-cover relative z-10" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:from-rose-500 group-hover:to-red-700 transition-all duration-300 shadow-md sm:shadow-lg shadow-rose-200/50 ring-2 sm:ring-4 ring-rose-50 border border-rose-100 shrink-0 relative overflow-hidden flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 opacity-60"></div>
                  <Newspaper className="h-5 w-5 sm:h-7 sm:w-7 relative z-10 drop-shadow-sm transform group-hover:rotate-1 transition-transform" />
                </div>
              )}
              
              <div className="text-left flex flex-col justify-center min-w-0">
                <h1 className="text-lg min-[360px]:text-xl min-[400px]:text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight font-sans leading-tight flex items-center select-none whitespace-nowrap">
                  <span className="text-rose-600 relative inline-block drop-shadow-xs whitespace-nowrap">
                    {siteSettings.channelLogoAccentText || 'माझापत्र'}
                    {/* Tiny visual underline decoration under accent */}
                    <span className="absolute bottom-0 left-0 w-full h-[2px] sm:h-[3px] bg-gradient-to-r from-rose-500 to-rose-700 rounded-full"></span>
                  </span>
                </h1>
                
                {/* Elegant gold/crimson Marathi Tagline layout */}
                <span className="inline-flex items-center mt-1 select-none overflow-hidden truncate">
                  <span className="h-1 w-1 bg-amber-500 rounded-full mr-1 sm:mr-1.5 animate-pulse shrink-0"></span>
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-extrabold tracking-widest uppercase font-mono truncate">
                    {siteSettings.channelTagline || 'माझा महाराष्ट्र, माझे पत्र'}
                  </p>
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Search Box & Mobile controls (Right Aligned on Desktop, inline-flex on mobile) */}
          <div className="flex justify-end items-center shrink-0">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center w-64 lg:w-72 relative">
              <input
                type="text"
                placeholder="बातम्या शोधा (मराठी किंवा इंग्रजी)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-sans"
              />
              <Search className="h-4 w-4 text-slate-400 absolute right-3 mt-0.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 text-slate-400 hover:text-slate-600 text-xs py-1 px-1 font-sans font-bold"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Mobile controls & toggle (Stays nicely on same row) */}
            <div className="flex md:hidden items-center space-x-1 shrink-0">
              <button
                onClick={() => setShowSearchBox(!showSearchBox)}
                className="p-2 text-slate-600 hover:text-rose-600 focus:outline-hidden rounded-md hover:bg-slate-50 shrink-0"
                title="शोधा"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-rose-600 focus:outline-hidden rounded-md hover:bg-slate-50 shrink-0"
                title="मेनू"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Search Expandable Box */}
      {showSearchBox && (
        <div className="md:hidden border-t border-slate-100 bg-slate-50 px-4 py-3 animate-fade-in">
          <div className="relative">
            <input
              type="text"
              placeholder="बातम्या शोधा..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-sans"
            />
            <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-9 top-2.5 text-slate-400 hover:text-slate-600 text-xs py-1 px-1 font-sans"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Navigation (Desktop) */}
      <nav className="hidden md:block border-t border-rose-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-1 overflow-x-auto justify-center">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  onNavigateToHome();
                  setCategory(cat.value);
                }}
                className={`px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  !isAdminMode && !showWeatherView && currentCategory === cat.value
                    ? 'text-rose-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-md'
                }`}
              >
                {cat.label}
                {!isAdminMode && !showWeatherView && currentCategory === cat.value && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-rose-600 rounded-full" />
                )}
              </button>
            ))}
            <button
              onClick={() => onToggleWeather(true)}
              className={`px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap flex items-center space-x-1.5 ${
                !isAdminMode && showWeatherView
                  ? 'text-rose-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-md'
              }`}
            >
              <Sun className="h-4 w-4 text-rose-500 animate-[spin_12s_linear_infinite]" />
              <span>हवामान अंदाज</span>
              {!isAdminMode && showWeatherView && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-rose-600 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu (Categories) */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-white border-t border-slate-100 py-3 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>बातम्या श्रेणी</span>
          </div>
          <div className="px-2 space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  onNavigateToHome();
                  setCategory(cat.value);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                  !isAdminMode && !showWeatherView && currentCategory === cat.value
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{cat.label}</span>
                {!isAdminMode && !showWeatherView && currentCategory === cat.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                )}
              </button>
            ))}
            
            <div className="h-px bg-slate-100 my-2 mx-4" />
            
            <button
              onClick={() => {
                onToggleWeather(true);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                !isAdminMode && showWeatherView
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Sun className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <span>अहिल्यानगर हवामान अंदाज</span>
              </span>
              {!isAdminMode && showWeatherView && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              )}
            </button>

            <div className="h-px bg-slate-100 my-2 mx-4" />

            {authUser ? (
              <div className="px-4 py-3 space-y-3 bg-rose-50/25 rounded-xl border border-rose-100/30 m-2">
                <div className="flex items-center space-x-2.5">
                  {authUser.photoUrl ? (
                    <img 
                      src={authUser.photoUrl} 
                      alt={authUser.name} 
                      className="h-8 w-8 rounded-full border border-rose-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                      {authUser.name.substring(0, 1)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-800 truncate">{authUser.name}</span>
                    <span className="text-[11px] text-slate-500 truncate">{authUser.email}</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 pt-1">
                  {(authUser.role === 'superadmin' || authUser.role === 'author') && (
                    <button
                      onClick={() => {
                        onNavigateToAdmin();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-rose-650 text-white hover:bg-rose-700 font-bold py-2 rounded-lg text-sm transition-all border border-rose-600"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{authUser.role === 'superadmin' ? 'मुख्य प्रशासक पॅनेल (Admin)' : 'लेखक पॅनेल'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowActivityModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-750 font-bold py-2 rounded-lg text-sm transition-all border border-slate-200 cursor-pointer"
                  >
                    <Activity className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>माझी कृती (My Activity)</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleNotifications();
                    }}
                    className={`w-full flex items-center justify-center space-x-2 font-bold py-2 rounded-lg text-sm transition-all border cursor-pointer ${
                      notificationsOptedIn
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Bell className="h-4 w-4 shrink-0" />
                    <span>{notificationsOptedIn ? 'नवीन मतदान सूचना सुरू आहेत' : 'नवीन मतदान सूचना बंद आहेत'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-lg text-sm transition-all border border-slate-200 cursor-pointer"
                  >
                    लॉगआउट
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-3 m-2">
                <button
                  onClick={() => {
                    onGoogleLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2.5 bg-white border border-rose-200 hover:border-rose-450 text-rose-705 hover:bg-rose-50 font-bold py-2.5 rounded-xl transition-all text-sm shadow-3xs cursor-pointer"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  <span>गूगल द्वारे लॉगिन करा</span>
                </button>

                <button
                  onClick={() => {
                    onNavigateToAdmin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-rose-650 underline py-1"
                >
                  पारंपारिक प्रशासक लॉगिन
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
      {/* My Activity Modal */}
      {showActivityModal && authUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-rose-600 animate-pulse" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">माझा मतदान इतिहास (My Activity)</h3>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile info banner */}
            <div className="px-5 py-3.5 bg-rose-50/30 border-b border-rose-100/30 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center space-x-2">
                {authUser.photoUrl ? (
                  <img src={authUser.photoUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">{authUser.name[0]}</div>
                )}
                <span className="font-bold text-slate-700">{authUser.name}</span>
              </div>
              <span className="text-slate-400 font-mono font-bold truncate max-w-[200px]">{authUser.email}</span>
            </div>

            {/* Tabs for Profile and Polls History */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1 mx-5 mt-4 rounded-xl shrink-0">
              <button
                onClick={() => setProfileTab('profile')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  profileTab === 'profile'
                    ? 'bg-white text-rose-600 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>माझे प्रोफाईल (Profile)</span>
              </button>
              <button
                onClick={() => setProfileTab('polls')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  profileTab === 'polls'
                    ? 'bg-white text-rose-600 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>माझे पोल (My Polls) ({userVotesHistory.length})</span>
              </button>
            </div>

            {/* List / Profile Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-rose-500" />
                  <span className="text-xs font-semibold">इतिहास लोड होत आहे...</span>
                </div>
              ) : profileTab === 'profile' ? (
                /* Profile Card Tab Content */
                <div className="space-y-4 text-left">
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 p-5 rounded-2xl border border-rose-100/50 space-y-4 animate-fade-in">
                    <div className="flex items-center space-x-4">
                      {authUser.photoUrl ? (
                        <img src={authUser.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-rose-600 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-md shrink-0">{authUser.name[0]}</div>
                      )}
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-800">{authUser.name}</h4>
                        <p className="text-xs text-slate-500 font-mono font-bold">{authUser.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-450 uppercase block">भूमिका (Role)</span>
                        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-rose-500" />
                          {authUser.role === 'superadmin' ? 'प्रशासक' : authUser.role === 'author' ? 'लेखक' : 'वाचक/मतदार'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-450 uppercase block">सहभाग (Votes)</span>
                        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                          <Vote className="w-3.5 h-3.5 text-indigo-500" />
                          {toMarathiDigits(userVotesHistory.length)} पोल मते
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800">मतदार मार्गदर्शक तत्त्वे (Voter Guide)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                      महाराष्ट्र कौल व्यासपीठावर तुमचे प्रत्येक मत अत्यंत मोलाचे आहे. चालू पोलमध्ये आपले विचार मांडून जनमताचा कौल स्पष्ट करण्यास मदत करा.
                    </p>
                  </div>
                </div>
              ) : userVotesHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <div className="bg-slate-50 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-slate-100">
                    <Activity className="h-6 w-6 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700 text-sm">तुम्ही अद्याप कोणत्याही मतदानात भाग घेतलेला नाही.</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">मुख्य पानावर जाऊन सक्रिय पोलमध्ये आपले मत नोंदवा.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userVotesHistory.map((vote, idx) => (
                    <div key={vote._id || idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                          कौल निकाल
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono shrink-0">
                          {new Date(vote.votedAt).toLocaleDateString('mr-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-snug">
                        {vote.question}
                      </h4>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <span className="text-[11px] font-bold text-slate-500">तुमचा पर्याय:</span>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                          {vote.optionText}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center shrink-0">
              <button
                onClick={() => setShowActivityModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer transition-colors"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
