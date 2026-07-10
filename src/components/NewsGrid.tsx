import React, { useState, useEffect } from 'react';
import { Calendar, User, Eye, ArrowRight, LayoutGrid, AlertCircle, Sun, Sprout, CloudRain, CloudLightning, Coffee, Umbrella, Sparkles, Heart, BarChart3, CheckCircle2 } from 'lucide-react';
import { News, CategoryType, SiteCustomization, Poll, AuthUser, resolveDriveUrl } from '../types';
import { safeLocalStorage as localStorage } from '../utils/safeStorage';
import BrandAdsSlider from './BrandAdsSlider';
import PollComponent from './PollComponent';

interface NewsGridProps {
  newsList: News[];
  currentCategory: CategoryType;
  searchQuery: string;
  onSelectArticle: (id: string) => void;
  setCategory: (cat: CategoryType) => void;
  setSearchQuery: (query: string) => void;
  siteSettings: SiteCustomization;
  onToggleWeather?: (show: boolean) => void;
  authUser?: AuthUser | null;
  addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  isLoading?: boolean;
  categories?: { label: string; value: CategoryType }[];
}

export default function NewsGrid({
  newsList,
  currentCategory,
  searchQuery,
  onSelectArticle,
  setCategory,
  setSearchQuery,
  siteSettings,
  onToggleWeather,
  authUser,
  addToast,
  isLoading,
  categories,
}: NewsGridProps) {
  
  // Filter news based on category and search query
  const filteredNews = newsList.filter((item) => {
    const matchesCategory = currentCategory === 'सर्व' || item.category === currentCategory;
    
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !searchLower || 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.content.toLowerCase().includes(searchLower) ||
      item.author.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  const formatPublishDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return date.toLocaleDateString('mr-IN', options);
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-l-4 border-slate-300 pl-3">
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-md" />
          </div>
          
          {/* Featured Article Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 h-64 sm:h-96 bg-slate-200 animate-pulse" />
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4 bg-slate-50/50">
              <div className="space-y-4">
                <div className="h-3.5 w-24 bg-slate-200 animate-pulse rounded-sm" />
                <div className="space-y-2">
                  <div className="h-7 w-5/6 bg-slate-300 animate-pulse rounded-md" />
                  <div className="h-7 w-2/3 bg-slate-300 animate-pulse rounded-md" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-full bg-slate-200 animate-pulse rounded-md" />
                  <div className="h-4 w-full bg-slate-200 animate-pulse rounded-md" />
                  <div className="h-4 w-4/5 bg-slate-200 animate-pulse rounded-md" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-auto">
                <div className="h-4 w-28 bg-slate-200 animate-pulse rounded-md" />
                <div className="flex space-x-4">
                  <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-slate-200 animate-pulse rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid List Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-l-4 border-slate-300 pl-3">
            <div className="h-6 w-40 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="h-48 bg-slate-200 animate-pulse shrink-0" />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-3.5 w-16 bg-slate-200 animate-pulse rounded-sm" />
                    <div className="space-y-2">
                      <div className="h-5 w-5/6 bg-slate-300 animate-pulse rounded-md" />
                      <div className="h-5 w-2/3 bg-slate-300 animate-pulse rounded-md" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="h-3.5 w-full bg-slate-200 animate-pulse rounded-md" />
                      <div className="h-3.5 w-5/6 bg-slate-200 animate-pulse rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                    <div className="h-3.5 w-16 bg-slate-200 animate-pulse rounded-md" />
                    <div className="flex space-x-2">
                      <div className="h-3.5 w-16 bg-slate-200 animate-pulse rounded-md" />
                      <div className="h-3.5 w-10 bg-slate-200 animate-pulse rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Extract featured news (first items in filtered list)
  const featuredArticle = filteredNews[0];
  const gridArticles = filteredNews.slice(1);

  if (filteredNews.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 max-w-lg mx-auto space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900">बातम्या सापडल्या नाहीत</h3>
          <p className="text-slate-500 text-sm">
            क्षमस्व, '{searchQuery || currentCategory}' संदर्भात कोणतीही बातमी उपलब्ध नाही. कृपया वेगळा कीवर्ड किंवा दुसरी श्रेणी निवडून पहा.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
              >
                शोध रद्द करा
              </button>
            )}
            {currentCategory !== 'सर्व' && (
              <button
                onClick={() => setCategory('सर्व')}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
              >
                सर्व बातम्या दाखवा
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Search Header Banner */}
      {searchQuery && (
        <div className="bg-rose-50 border border-rose-100/60 p-4 rounded-xl flex items-center justify-between">
          <p className="text-sm font-medium text-rose-950">
            शोधाचे निकाल फलक: <span className="font-bold">"{searchQuery}"</span>
          </p>
        </div>
      )}

      {/* Dynamic Rainy Season Theme Concept (Cozy Monsoon Homepage Welcome) */}
      {!searchQuery && currentCategory === 'सर्व' && (
        <div className="space-y-8 animate-fade-in">
          {/* Rainy Visual Header Notification Pill */}
          <div className="bg-gradient-to-r from-blue-900/40 to-slate-900/30 border border-blue-500/20 backdrop-blur-md text-blue-100 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-xs font-medium">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <CloudRain className="h-4 w-4 animate-bounce text-blue-400" />
              <span className="text-slate-200">
                बाहेर पाऊस पडत असल्यासारखे दिसतेय — गरमागरम चहा घ्या आणि <strong>{siteSettings.channelName || 'अहिल्यानगर न्यूज नेटवर्क'}</strong> वर ताज्या घडामोडींचा आनंद घ्या! ☔
              </span>
            </div>
            <button
              onClick={() => {
                const isCelsius = localStorage.getItem('majhapatra_is_celsius') !== 'false';
                alert(`अहिल्यानगर हवामान इशारा: पुढील २४ तासांत माध्यम स्वरूपाचा पाऊस पडण्याची शक्यता. चालू तापमान: ${isCelsius ? '२२°C' : '७१.६°F'}. घरातच राहा, सुरक्षित राहा!`);
              }}
              className="bg-blue-600/30 border border-blue-400/45 text-blue-300 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-600/50 transition cursor-pointer self-stretch sm:self-auto text-center"
            >
              विशेष सतर्कता
            </button>
          </div>

          {/* Majestic Rainy Season Launch Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-10 border border-slate-700/50 shadow-xl group">
            
            {/* Ambient Falling Raindrops Decoration Background */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-transparent"></div>
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute left-6 top-6 w-12 h-12 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Cozy micro raindrop accents */}
            <div className="absolute top-4 right-10 flex space-x-6 text-slate-500/30 animate-pulse pointer-events-none">
              <CloudRain className="h-6 w-6 animate-bounce" />
              <CloudLightning className="h-5 w-5" />
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Cozy headlines and seasonal call to action */}
              <div className="lg:col-span-8 space-y-5 text-left">
                {/* Monsoon Launch Event tag */}
                <div className="inline-flex items-center space-x-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-full px-4 py-1.5 text-xs font-black tracking-wide uppercase">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>मान्सून विशेष आवृत्ती २०२६</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-white drop-shadow-xs">
                    मना मनातील पावसाळा, <br className="hidden sm:inline" />
                    घराघरात <span className="text-amber-400 underline decoration-amber-400/50 decoration-wavy">{siteSettings.channelName || 'माझापत्र'}</span> सोहळा!
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl font-sans">
                    चिंब पावसाचे गार वारे, वाफाळलेला गरमागरम चहा आणि विश्वसनीय बातम्यांचा सुखद संगम. अहिल्यानगर व महाराष्ट्रातील ताज्या मान्सून घडामोडी, जिल्हाधिकारी कार्यालयाचे तातडीचे अलर्ट्स व महात्मा फुले कृषी विद्यापीठ शिफारशी शंभू टक्के सविस्तर, २४ तास थेट.
                  </p>
                </div>

                {/* Theme-fitting cozy call-to-action button and launch promotional tag */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      if (onToggleWeather) {
                        onToggleWeather(true);
                      }
                    }}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm tracking-wide px-7 py-3.5 rounded-2xl shadow-lg shadow-amber-500/10 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2.5 border border-amber-500/20 cursor-pointer"
                  >
                    <Umbrella className="h-5 w-5 shrink-0 animate-bounce" />
                    <span>पावसाळी विशेष माहिती केंद्र</span>
                  </button>

                  <div className="flex items-center space-x-2 justify-center sm:justify-start">
                    <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50">
                      🌧️ लाँच विशेष ऑफर: सदैव मोफत सतर्कता
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Cozy Cup Coffee/Tea Illustration Visual */}
              <div className="lg:col-span-4 hidden lg:flex flex-col items-center justify-center relative">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl w-full text-center relative shadow-inner overflow-hidden flex flex-col items-center justify-center group-hover:border-blue-500/25 transition">
                  {/* Glowing light effect behind tea cup */}
                  <div className="absolute w-24 h-24 bg-amber-400/20 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>

                  <div className="relative z-10 flex flex-col items-center">
                    <Coffee className="h-16 w-16 text-amber-400 animate-[bounce_3s_infinite]" />
                    {/* Steam animations */}
                    <div className="flex space-x-1 mb-3 justify-center -mt-2">
                      <span className="w-1 h-3 bg-amber-200/50 rounded-full animate-pulse"></span>
                      <span className="w-1 h-5 bg-amber-200/30 rounded-full animate-pulse delay-75"></span>
                      <span className="w-1 h-4 bg-amber-200/40 rounded-full animate-pulse delay-150"></span>
                    </div>

                    <span className="text-xs text-amber-300 font-extrabold flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-current" />
                      कोझी मानसून अनुभव
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-sans">
                      हवामान: २२°C रिमझिम पाऊस
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-grid of 3 Seasonal Monsoon Promotional Blurbs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 border-t border-slate-800 pt-8 relative z-10">
              
              {/* Blurb 1: Cozy Room Comfort */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-left flex items-start gap-3 hover:border-slate-700 transition">
                <div className="bg-amber-400/10 p-2 rounded-xl text-amber-400 shrink-0">
                  <Coffee className="h-5 w-5 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-amber-400 font-sans">वाफाळलेला चहा आणि बातम्या</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    घरी बसून रिमझिम पावसाचा आनंद घ्या. हातात घ्या कडक वाफाळलेला चहा आणि वाचत राहा विश्वसनीय मराठी वृत्तांत.
                  </p>
                </div>
              </div>

              {/* Blurb 2: Crop Care Farm advisory */}
              <div className="bg-slate-855/40 border border-slate-800 rounded-2xl p-4 text-left flex items-start gap-3 hover:border-slate-700 transition">
                <div className="bg-emerald-400/10 p-2 rounded-xl text-emerald-400 shrink-0">
                  <Sprout className="h-5 w-5 text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-emerald-400 font-sans">मान्सून कृषी मार्गदर्शन सल्ला</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    अहिल्यानगरमधील शेतकऱ्यांसाठी विशेष हवामान अंदाज, पीक संरक्षण मार्गदर्शक इशारे, आणि सुरक्षित शेती सल्ला.
                  </p>
                </div>
              </div>

              {/* Blurb 3: Rainy Monoson Savings Info */}
              <div className="bg-slate-855/40 border border-slate-800 rounded-2xl p-4 text-left flex items-start gap-3 hover:border-slate-700 transition">
                <div className="bg-blue-400/10 p-2 rounded-xl text-blue-400 shrink-0">
                  <Umbrella className="h-5 w-5 text-blue-400 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-blue-400 font-sans">मान्सून सवलत बंपर ऑफर्स</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    पावसाची मजा घरबसल्या घ्या! स्थानिक मार्केटमधील छत्री, रेनकोट व मान्सून इमर्जन्सी साहित्यावरील विशेष सवलतींची माहिती.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Featured News Layout - Only visible if no active filter banner takes up screen */}
      {featuredArticle && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-l-4 border-rose-600 pl-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">आजची मुख्य बातमी</h2>
          </div>
          
          <div 
            onClick={() => onSelectArticle(featuredArticle._id)}
            className="bg-white rounded-2xl border border-rose-100/50 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-0 group"
          >
            {/* Featured Image */}
            <div className="lg:col-span-7 h-64 sm:h-96 overflow-hidden relative">
              <img
                src={resolveDriveUrl(featuredArticle.imageURL)}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
                }}
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-4 left-4 bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-sm shadow-md uppercase tracking-wider">
                {featuredArticle.category}
              </span>
            </div>

            {/* Featured Description */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4 bg-slate-50/50">
              <div className="space-y-3">
                <span className="text-xs text-rose-600 font-bold tracking-widest block font-mono">नवीनतम • LATEST NEWS</span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-905 leading-tight group-hover:text-rose-600 transition-colors">
                  {featuredArticle.title}
                </h3>
                <p className="text-slate-600 text-sm line-clamp-4 leading-relaxed font-sans">
                  {featuredArticle.description}
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-auto">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{featuredArticle.author}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatPublishDate(featuredArticle.publishDate)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                    <span>{featuredArticle.views} Views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand Ads Image Slider */}
      <BrandAdsSlider settings={siteSettings} />

      {/* Ahilyanagar District Weather Campaign Card */}
      {currentCategory === 'सर्व' && !searchQuery && onToggleWeather && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 border border-amber-100/70 rounded-2xl p-6 sm:p-7 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-start sm:items-center space-x-4">
            <div className="bg-amber-500 text-white p-3 sm:p-4 rounded-full shadow-md shrink-0 flex items-center justify-center animate-[pulse_3s_infinite] relative">
              <Sun className="h-6 w-6 sm:h-8 sm:w-8 animate-[spin_15s_linear_infinite]" />
              <div className="absolute -bottom-1 -right-1 bg-rose-600 border border-white text-white font-sans text-[8px] font-black px-1 py-0.5 rounded-full select-none">LIVE</div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-905 font-sans leading-none flex flex-wrap items-center gap-2">
                <span>अहिल्यानगर जिल्हा हवामान अंदाज</span>
                <span className="bg-amber-100/80 border border-amber-200 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-sm shrink-0">३५°C • कोरडे वातावरण</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl font-sans text-left">
                जिल्ह्यातील सर्व तालुक्यांचे पुढील ५ दिवसांचे हवामान, तापमान बदल आणि महात्मा फुले कृषी विद्यापीठ, राहुरी शिफारशीत अधिकृत <strong className="text-slate-800 font-extrabold">विशेष शेती सल्ला (Crop Care Advisory)</strong> आपल्या भाषेत सविस्तर वाचा.
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggleWeather(true)}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-all shadow-md shadow-amber-600/10 hover:shadow-lg flex items-center justify-center space-x-1.5 border border-amber-700/20 cursor-pointer shrink-0"
          >
            <span>सविस्तर अंदाज व पीक सल्ला</span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}

      {/* Reader Opinion Poll Section */}
      <PollComponent authUser={authUser} addToast={addToast} />

      {/* Grid List below */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-l-4 border-rose-600 pl-3">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {searchQuery 
              ? 'शोधाचे परिणाम' 
              : currentCategory === 'सर्व' 
                ? 'इतर ताज्या बातम्या' 
                : `${currentCategory} विभागातील बातम्या`
            }
          </h2>
          <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider flex items-center gap-1">
            <LayoutGrid className="h-3 w-3" />
            {filteredNews.length} बातम्या उपलब्ध
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Loop over filtered array if search active, or gridArticles if featured takes up row */}
          {(searchQuery ? filteredNews : (featuredArticle ? gridArticles : filteredNews)).map((item) => (
            <article
              key={item._id}
              onClick={() => onSelectArticle(item._id)}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              {/* Cover Image */}
              <div className="h-48 overflow-hidden relative bg-slate-100 shrink-0">
                <img
                  src={resolveDriveUrl(item.imageURL)}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80';
                  }}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  {item.category}
                </span>
              </div>

              {/* Text Description Block */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-900 leading-snug text-base line-clamp-2 group-hover:text-rose-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>

                {/* Card Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50 mt-auto">
                  <span className="truncate font-semibold text-slate-500 max-w-[100px]">{item.author}</span>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="flex items-center space-x-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{formatPublishDate(item.publishDate)}</span>
                    </span>
                    <span className="flex items-center space-x-0.5 font-mono text-[10px]">
                      <Eye className="h-3 w-3" />
                      <span>{item.views}</span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
