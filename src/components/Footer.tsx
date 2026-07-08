import React, { useState } from 'react';
import { Newspaper, Mail, Phone, MapPin, Shield, Info, Heart, Send, Bell } from 'lucide-react';
import { SiteCustomization } from '../types';

interface FooterProps {
  siteSettings: SiteCustomization;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Footer({ siteSettings, addToast }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      addToast('कृपया तुमचा ई-मेल आयडी प्रविष्ट करा.', 'error');
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      addToast('कृपया वैध ई-मेल पत्ता प्रविष्ट करा.', 'error');
      return;
    }

    console.log(`[${siteSettings?.channelName || 'MajhaPatra'} Newsletter] New email subscription received: ${cleanEmail}`);
    setSubscribed(true);
    setEmail('');
    addToast('माझापत्र वृत्तपत्र सदस्यता यशस्वी! नियमित अपडेट्स तुम्हाला मिळत राहतील.', 'success');
    setTimeout(() => setSubscribed(false), 5000);
  };

  const footerBg = siteSettings?.footerBgColor || '#0f172a';
  const footerText = siteSettings?.footerTextColor || '#e2e8f0';

  const link1Text = siteSettings?.footerLink1Text || 'मुख्यपृष्ठ';
  const link1Url = siteSettings?.footerLink1Url || '#';
  const link2Text = siteSettings?.footerLink2Text || 'आमच्याबद्दल';
  const link2Url = siteSettings?.footerLink2Url || '#';
  const link3Text = siteSettings?.footerLink3Text || 'संपर्क साधा';
  const link3Url = siteSettings?.footerLink3Url || '#';
  const link4Text = siteSettings?.footerLink4Text || 'गोपनीयता धोरण';
  const link4Url = siteSettings?.footerLink4Url || '#';
  const link5Text = siteSettings?.footerLink5Text || 'जाहिरात धोरण';
  const link5Url = siteSettings?.footerLink5Url || '#';
  const link6Text = siteSettings?.footerLink6Text || 'नियम व अटी';
  const link6Url = siteSettings?.footerLink6Url || '#';

  return (
    <footer 
      className="mt-16 border-t border-slate-800 transition-colors"
      style={{ backgroundColor: footerBg, color: footerText }}
    >
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Section 1: About */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-rose-500 font-bold text-2xl">
              <Newspaper className="h-7 w-7" />
              <span className="tracking-tight font-extrabold font-sans" style={{ color: footerBg === '#ffffff' ? '#0f172a' : '#ffffff' }}>
                {siteSettings?.footerSection1Title || siteSettings?.channelName || 'माझापत्र'}
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-85">
              {siteSettings?.footerAbout || 'माझापत्र (MajhaPatra) हे महाराष्ट्रातील अग्रगण्य मराठी न्यूज पोर्टल आहे. आम्ही आपल्यापर्यंत राजकीय, सामाजिक, क्रीडा, मनोरंजन आणि आर्थिक क्षेत्रातील ताज्या व विश्वासार्ह घडामोडी तत्परतेने पोहोचवतो.'}
            </p>
          </div>

          {/* Section 2: Quick Links / Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-wide border-b border-rose-500/30 pb-2" style={{ color: footerBg === '#ffffff' ? '#0f172a' : '#ffffff' }}>
              {siteSettings?.footerSection2Title || 'जलद दुवे'}
            </h3>
            <ul className="grid grid-cols-2 gap-2 text-sm opacity-85">
              <li className="hover:text-rose-400 transition-colors">
                <a href={link1Url} className="flex items-center space-x-1">
                  <span>• {link1Text}</span>
                </a>
              </li>
              <li className="hover:text-rose-400 transition-colors">
                <a href={link2Url} className="flex items-center space-x-1">
                  <span>• {link2Text}</span>
                </a>
              </li>
              <li className="hover:text-rose-400 transition-colors">
                <a href={link3Url} className="flex items-center space-x-1">
                  <span>• {link3Text}</span>
                </a>
              </li>
              <li className="hover:text-rose-400 transition-colors">
                <a href={link4Url} className="flex items-center space-x-1">
                  <span>• {link4Text}</span>
                </a>
              </li>
              <li className="hover:text-rose-400 transition-colors">
                <a href={link5Url} className="flex items-center space-x-1">
                  <span>• {link5Text}</span>
                </a>
              </li>
              <li className="hover:text-rose-400 transition-colors">
                <a href={link6Url} className="flex items-center space-x-1">
                  <span>• {link6Text}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Section 3: Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-wide border-b border-rose-500/30 pb-2" style={{ color: footerBg === '#ffffff' ? '#0f172a' : '#ffffff' }}>
              {siteSettings?.footerSection3Title || 'संपर्क तपशील'}
            </h3>
            <ul className="space-y-3 text-sm opacity-85">
              <li className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{siteSettings?.footerAddress || '१२, नरिमन पॉईंट, मुंबई - ४०००२१, महाराष्ट्र, भारत.'}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{siteSettings?.footerPhone || '+९१ २२ २४५६ ७८९०'}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{siteSettings?.footerEmail || 'editor@majhapatra.com'}</span>
              </li>
            </ul>
          </div>

          {/* Section 4: Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-wide border-b border-rose-500/30 pb-2" style={{ color: footerBg === '#ffffff' ? '#0f172a' : '#ffffff' }}>
              {siteSettings?.footerSection4Title || 'वृत्तपत्र सदस्यता'}
            </h3>
            <p className="text-sm leading-relaxed opacity-85">
              {siteSettings?.footerNewsletterDesc || 'दररोजच्या महत्वाच्या घडामोडी थेट तुमच्या ई-मेलवर मिळवण्यासाठी आजच सबस्क्राईब करा.'}
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative font-sans">
                <input
                  type="email"
                  required
                  placeholder="तुमचा ई-मेल भरा..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/20 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 font-sans"
                  style={{ color: footerText }}
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm shadow-rose-950/20 hover:shadow-lg transition-all focus:outline-hidden"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>सबस्क्राईब करा</span>
              </button>
            </form>
            {subscribed && (
              <p className="text-emerald-400 text-xs font-semibold animate-pulse mt-1">
                ✓ धन्यवाद! तुम्ही यशस्वीरीत्या नोंदणी केली आहे.
              </p>
            )}
          </div>
        </div>

        {/* Brand Bar */}
        <div className="border-t border-slate-800/50 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm opacity-60">
          <p>© {currentYear} {siteSettings?.channelName || 'माझापत्र'}. सर्व हक्क राखीव.</p>
          <p className="flex items-center mt-4 sm:mt-0">
            {siteSettings?.footerCopyrightSub || 'महाराष्ट्राचे हक्काचे व्यासपीठ'} <Heart className="h-4 w-4 text-rose-500 mx-1 fill-rose-500 animate-pulse" /> सह बनवले.
          </p>
        </div>
      </div>
    </footer>
  );
}
