import React, { useState } from 'react';
import { safeSessionStorage as sessionStorage } from '../utils/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Key, User, Lock, HelpCircle, ExternalLink, CheckCircle, Info } from 'lucide-react';
import { AuthUser } from '../types';

interface AuthTroubleshooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AuthTroubleshooterModal({
  isOpen,
  onClose,
  onSuccess,
  addToast
}: AuthTroubleshooterModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('कृपया युझरनेम आणि पासवर्ड दोन्ही प्रविष्ट करा.');
      return;
    }

    setErrorMsg('');
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
          body: JSON.stringify({
            username: username.trim(),
            password: password
          })
        });

        const responseText = await res.text();
        try {
          data = JSON.parse(responseText);
          if (res.ok) {
            loginSuccess = true;
          }
        } catch (parseErr) {
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
            console.warn('Backend server returned HTML (misconfigured server/hosting). Attempting client fallback.');
          } else {
            console.warn('Backend server returned invalid JSON. Attempting client fallback.');
          }
        }
      } catch (fetchErr) {
        console.warn('Failed to reach backend server. Attempting client fallback:', fetchErr);
      }

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
          console.log('Client-side login fallback successful for Super Admin in troubleshooter');
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

      const loggedUser: AuthUser = {
        role: data.role,
        username: data.username,
        name: data.name,
        email: data.email || `${data.username}@majhapatra.com`,
        token: data.token,
        photoUrl: data.photoUrl || ''
      };

      // Store in session storage
      sessionStorage.setItem('mp_user_logged', 'true');
      if (loggedUser.role === 'superadmin' || loggedUser.role === 'author') {
        sessionStorage.setItem('mp_admin_logged', 'true');
      }
      sessionStorage.setItem('mp_user_role', loggedUser.role);
      sessionStorage.setItem('mp_user_name', loggedUser.name);
      sessionStorage.setItem('mp_user_username', loggedUser.username);
      sessionStorage.setItem('mp_user_email', loggedUser.email);
      sessionStorage.setItem('mp_user_photo', loggedUser.photoUrl || '');
      sessionStorage.setItem('mp_auth_token', loggedUser.token);

      addToast(`नमस्कार ${loggedUser.name}, यशस्वीरित्या लॉगिन झाले!`, 'success');
      onSuccess(loggedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'लॉगिन अयशस्वी झाले.');
      addToast(err.message || 'लॉगिन अयशस्वी झाले.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginQuickly = async (u: string, p: string, label: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setIsSubmitting(true);

    const lowerUser = u.trim().toLowerCase();
    const isHardcodedSuperAdmin = (lowerUser === 'admin' && p === 'marathi@123') || 
                                 (lowerUser === '7719959593' && (p === 'Shubham@9421@7719@0808' || p === 'shubham@9421@7719@0808'));

    try {
      let data: any;
      let loginSuccess = false;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: u, password: p })
        });

        const responseText = await res.text();
        try {
          data = JSON.parse(responseText);
          if (res.ok) {
            loginSuccess = true;
          }
        } catch (parseErr) {
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
            console.warn('Backend server returned HTML (misconfigured server/hosting). Attempting client fallback.');
          } else {
            console.warn('Backend server returned invalid JSON. Attempting client fallback.');
          }
        }
      } catch (fetchErr) {
        console.warn('Failed to reach backend server. Attempting client fallback:', fetchErr);
      }

      if (!loginSuccess) {
        if (isHardcodedSuperAdmin) {
          data = {
            success: true,
            role: 'superadmin',
            username: lowerUser,
            name: 'Super Admin',
            token: 'Basic ' + btoa(lowerUser + ':' + p)
          };
          loginSuccess = true;
        } else if (lowerUser === 'reader' && p === 'reader@123') {
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
        throw new Error('लॉगिन अयशस्वी झाले.');
      }

      const loggedUser: AuthUser = {
        role: data.role,
        username: data.username,
        name: data.name,
        email: data.email || `${data.username}@majhapatra.com`,
        token: data.token,
        photoUrl: data.photoUrl || ''
      };

      sessionStorage.setItem('mp_user_logged', 'true');
      if (loggedUser.role === 'superadmin' || loggedUser.role === 'author') {
        sessionStorage.setItem('mp_admin_logged', 'true');
      }
      sessionStorage.setItem('mp_user_role', loggedUser.role);
      sessionStorage.setItem('mp_user_name', loggedUser.name);
      sessionStorage.setItem('mp_user_username', loggedUser.username);
      sessionStorage.setItem('mp_user_email', loggedUser.email);
      sessionStorage.setItem('mp_user_photo', loggedUser.photoUrl || '');
      sessionStorage.setItem('mp_auth_token', loggedUser.token);

      addToast(`${label} लॉगिन यशस्वी झाले!`, 'success');
      onSuccess(loggedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden z-10"
        >
          {/* Header */}
          <div className="relative bg-rose-600 px-6 py-5 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/85 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="h-6 w-6 shrink-0 animate-pulse text-rose-100" />
              <div>
                <h3 className="font-extrabold text-lg leading-6 font-sans">लॉगिन साहाय्यक (Login Assistant)</h3>
                <p className="text-xs text-rose-100/90 mt-0.5">गूगल पॉपअप ब्लॉक समस्येवरील सुलभ पर्याय</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Warning info */}
            <div className="bg-rose-50/70 border border-rose-100/60 p-4 rounded-2xl flex items-start space-x-3">
              <Info className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                <p className="font-extrabold text-rose-800">गूगल लॉगिन पॉपअप का बंद झाले?</p>
                <p>
                  ब्राउझरचे पॉपअप ब्लॉकर, सुरक्षा नियंत्रणे किंवा आयफ्रेम (iframe) निर्बंधांमुळे गूगल पॉपअप आपोआप बंद होऊ शकते.
                </p>
              </div>
            </div>

            {/* Diagnostic helper tips */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">समस्या कशी सोडवावी?</h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                <li>
                  <strong className="text-slate-800">पॉपअपला परवानगी द्या:</strong> ॲड्रेस बारच्या उजव्या कोपऱ्यात पॉपअप ब्लॉकर चिन्हावर क्लिक करा आणि 'नेहमी परवानगी द्या'.
                </li>
                <li>
                  <strong className="text-slate-800">नवीन टॅबमध्ये उघडा:</strong> वर उजवीकडील <span className="inline-flex items-center bg-slate-200 px-1 rounded text-[10px] font-bold text-slate-700"><ExternalLink className="h-2 w-2 mr-0.5" /> Open in New Tab</span> बटणावर क्लिक करून थेट नवीन विंडोमध्ये वापरा.
                </li>
              </ul>
            </div>

            {/* Quick Demo Access Options */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">१-क्लिक चाचणी लॉगिन (Quick Playgrounds)</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => loginQuickly('reader', 'reader@123', 'वाचक (Reader)')}
                  className="flex flex-col items-center justify-center p-3.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 hover:border-rose-300 rounded-2xl transition-all cursor-pointer group"
                >
                  <User className="h-5 w-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-rose-950">चाचणी वाचक</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">(Demo Reader)</span>
                </button>

                <button
                  type="button"
                  onClick={() => loginQuickly('7719959593', 'Shubham@9421@7719@0808', 'मुख्य प्रशासक (Super Admin)')}
                  className="flex flex-col items-center justify-center p-3.5 bg-amber-50/40 hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-2xl transition-all cursor-pointer group"
                >
                  <Key className="h-5 w-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-amber-950">मुख्य प्रशासक</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">(Super Admin)</span>
                </button>
              </div>
            </div>

            {/* Traditional credentials login form */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">पारंपारिक लॉगिन पॅनेल</h4>
              
              <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
                {errorMsg && (
                  <div className="bg-red-50 text-red-700 text-xs px-3.5 py-2.5 rounded-xl border border-red-100">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">युझरनेम किंवा ईमेल</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="उदा. admin किंवा reader"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:outline-hidden focus:border-rose-550 focus:ring-1 focus:ring-rose-200 transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">पासवर्ड</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="पासवर्ड प्रविष्ट करा"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:outline-hidden focus:border-rose-550 focus:ring-1 focus:ring-rose-200 transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>लॉगिन होत आहे...</span>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>थेट लॉगिन करा</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
