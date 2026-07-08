import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Shield, ShieldAlert, KeyRound, Loader2, AlertCircle } from 'lucide-react';

interface Author {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  email: string;
}

interface AuthorLoginsPanelProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  getAuthHeader: () => string;
}

export default function AuthorLoginsPanel({ addToast, getAuthHeader }: AuthorLoginsPanelProps) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Author inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  const fetchAuthors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/authors', {
        headers: {
          'Authorization': getAuthHeader()
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'लेखकांची यादी लोड करता आली नाही.');
      }
      const data = await res.json();
      setAuthors(data);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'लेखकांची यादी मिळवताना चूक झाली.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleCreateAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!username.trim() || !password.trim() || !name.trim()) {
      setFormError('कृपया सर्व आवश्यक रकाने भरा.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/authors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          name: name.trim(),
          email: email.trim()
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'लेखक तयार करताना तांत्रिक चूक झाली.');
      }

      addToast('लेखकाचे नवीन खाते यशस्वीरित्या तयार झाले!', 'success');
      
      // Reset inputs
      setUsername('');
      setPassword('');
      setName('');
      setEmail('');
      
      // Refresh list
      fetchAuthors();
    } catch (err: any) {
      setFormError(err.message);
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAuthor = async (id: string, authorName: string) => {
    if (!window.confirm(`तुम्हाला खात्री आहे का की "${authorName}" चे लॉगिन खाते कायमचे डिलीट करायचे आहे? या लेखकाने लिहिलेल्या बातम्या पोर्टलवर राहतील परंतु ते पुन्हा लॉगिन करू शकणार नाहीत.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/authors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthHeader()
        }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'लेखक खाते डिलीट करता आले नाही.');
      }

      addToast('लेखक खाते यशस्वीरित्या डिलीट केले गेले आहे.', 'success');
      fetchAuthors();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="border-b border-rose-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-500" />
            <span>लेखक लॉगिन क्रेडेंशियल्स व्यवस्थापन</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            केवळ मुख्य व्यवस्थापक (Super Admin) येथून नवीन लेखकांचे युझरनेम व पासवर्ड तयार करू शकतात. प्रत्येक लेखकाला स्वतंत्र लॉगिन पॅनेल मिळेल.
          </p>
        </div>
        <div className="bg-rose-50 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-rose-100 self-start flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>केवळ सुपर ॲडमीन अधिकार</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-4 bg-slate-50/75 border border-slate-100 rounded-xl p-5 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
            <UserPlus className="h-4 w-4 text-rose-500" />
            <span>नवीन लेखक खाते तयार करा</span>
          </h4>

          {formError && (
            <div className="bg-rose-50 text-rose-800 text-xs px-3 py-2.5 rounded-lg border border-rose-100 flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateAuthor} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                लेखकाचे पूर्ण नाव *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. सचिन मोरे"
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                ईमेल पत्ता (किंवा फोन नंबर)
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="उदा. sachin@gmail.com"
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                युझरनेम (Username) *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="उदा. sachin123 (स्मॉल लेटर्स)"
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">लेखक या युझरनेमचा वापर लॉगिन करण्यासाठी करतील.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                पासवर्ड (Password) *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="किमान ६ अक्षरे"
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>खाते तयार होत आहे...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>प्रमाणपत्रे जतन करा</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Authors List */}
        <div className="lg:col-span-8 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Users className="h-4 w-4 text-rose-500" />
            <span>सध्याचे अधिकृत लेखक ({authors.length})</span>
          </h4>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-xs">लेखकांची यादी लोड होत आहे...</span>
            </div>
          ) : authors.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-1">
              <KeyRound className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">कोणतेही लेखक खाते उपलब्ध नाही.</p>
              <p className="text-[10px]">डावीकडील फॉर्म वापरून पहिले लेखक खाते जोडा.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">नाव</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">युझरनेम</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ईमेल/संपर्क</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">कृती</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 divide-rose-50/50">
                  {authors.map((author) => (
                    <tr key={author._id || author.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800">{author.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                          {author.username}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 sm:mt-0">
                        {author.email ? (
                          <>
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{author.email}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 font-normal italic">उपलब्ध नाही</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAuthor((author._id || author.id) as string, author.name)}
                          className="bg-white hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-rose-600 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                          title="मंजुरी काढून घ्या"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
