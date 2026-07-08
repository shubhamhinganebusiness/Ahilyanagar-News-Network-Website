import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, CheckCircle2, RefreshCw, Vote, Loader2, Award, Share2, Clock, Calendar, MessageSquare, ThumbsUp, Send, User, X } from 'lucide-react';
import { Poll, PollComment, AuthUser } from '../types';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from '../utils/safeStorage';
import PollResultsChart from './PollResultsChart';

interface PollComponentProps {
  onVoteComplete?: () => void;
  className?: string;
  authUser?: AuthUser | null;
  addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function PollComponent({ 
  onVoteComplete, 
  className = '', 
  authUser, 
  addToast 
}: PollComponentProps) {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [orderedIndices, setOrderedIndices] = useState<number[]>([]);

  // Comments state
  const [comments, setComments] = useState<PollComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load voted polls history from localStorage & fetch active poll
  const fetchActivePoll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/polls');
      if (!res.ok) throw new Error('मतदान पोल लोड करता आला नाही.');
      const list: Poll[] = await res.json();
      const active = list.find((p) => p.active);
      setActivePoll(active || null);

      if (active) {
        // New Poll Notification Opt-in Logic
        const lastSeenPollId = localStorage.getItem('mp_last_seen_poll_id');
        const notificationsOptedIn = localStorage.getItem('mp_notifications_opt_in') !== 'false';
        
        if (!lastSeenPollId) {
          // Initialize silently on first visit
          localStorage.setItem('mp_last_seen_poll_id', active._id);
        } else if (lastSeenPollId !== active._id && notificationsOptedIn) {
          if (addToast) {
            addToast(`🗳️ नवीन जनमत कौल सुरू झाला आहे: "${active.question}" - आपले मत नोंदवा!`, 'info');
          }
          localStorage.setItem('mp_last_seen_poll_id', active._id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching active poll:', err);
      setError(err.message || 'पोल मिळवताना त्रुटी आली.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch comments for active poll
  const fetchPollComments = async (pollId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (activePoll) {
      const indices = activePoll.options.map((_, i) => i);
      if (activePoll.randomizeOptions) {
        // Shuffle indices using Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = indices[i];
          indices[i] = indices[j];
          indices[j] = temp;
        }
      }
      setOrderedIndices(indices);
      // Fetch poll comments
      fetchPollComments(activePoll._id);
    } else {
      setOrderedIndices([]);
      setComments([]);
    }
  }, [activePoll]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mp_voted_polls');
      if (stored) {
        setVotedPolls(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading voted polls from localStorage:', e);
    }

    fetchActivePoll();
  }, []);

  const handleVote = async (optionIndex: number) => {
    if (!activePoll || isVoting) return;
    setIsVoting(true);
    try {
      const body: any = { optionIndex };
      if (authUser) {
        body.email = authUser.email;
        body.username = authUser.username || authUser.name;
      }
      const res = await fetch(`/api/polls/${activePoll._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = [...votedPolls, activePoll._id];
        setVotedPolls(updated);
        localStorage.setItem('mp_voted_polls', JSON.stringify(updated));

        // Update vote counts locally for an instant visual feedback
        const updatedVotes = { ...activePoll.votes };
        updatedVotes[String(optionIndex)] = (updatedVotes[String(optionIndex)] || 0) + 1;
        setActivePoll({
          ...activePoll,
          votes: updatedVotes,
        });

        if (addToast) {
          addToast('तुमचे मत यशस्वीरित्या नोंदवले गेले!', 'success');
        }

        if (onVoteComplete) {
          onVoteComplete();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'मतदान करताना त्रुटी आली.');
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.message || 'तांत्रिक कारणामुळे मतदान नोंदवता आले नाही.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    if (!activePoll) return;
    const shareUrl = `${window.location.origin}?pollId=${activePoll._id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoll || !newCommentText.trim() || isSubmittingComment) return;
    if (!authUser) {
      if (addToast) {
        addToast('कमेंट करण्यासाठी कृपया प्रथम वरून गूगल लॉगिन करा.', 'error');
      } else {
        alert('कमेंट करण्यासाठी कृपया प्रथम वरून गूगल लॉगिन करा.');
      }
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/polls/${activePoll._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: authUser.username || authUser.name,
          name: authUser.name,
          email: authUser.email,
          photoUrl: authUser.photoUrl || '',
          commentText: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        setNewCommentText('');
        if (addToast) {
          addToast('तुमची कमेंट यशस्वीरित्या प्रसिद्ध झाली!', 'success');
        }
        await fetchPollComments(activePoll._id);
      } else {
        const data = await res.json();
        alert(data.error || 'कमेंट पोस्ट करताना त्रुटी आली.');
      }
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      alert('तांत्रिक कारणामुळे कमेंट पोस्ट करू शकलो नाही.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpvoteComment = async (commentId: string) => {
    if (!authUser) {
      if (addToast) {
        addToast('अपव्होट करण्यासाठी कृपया प्रथम वरून गूगल लॉगिन करा.', 'error');
      } else {
        alert('अपव्होट करण्यासाठी कृपया प्रथम वरून गूगल लॉगिन करा.');
      }
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authUser.email,
        }),
      });

      if (res.ok) {
        // Optimistically update comment upvote locally
        setComments(prev => prev.map(c => {
          if (c._id === commentId) {
            const alreadyUpvoted = c.upvotedUsers?.includes(authUser.email);
            const updatedUsers = alreadyUpvoted
              ? (c.upvotedUsers || []).filter(u => u !== authUser.email)
              : [...(c.upvotedUsers || []), authUser.email];
            const updatedUpvotes = alreadyUpvoted
              ? Math.max(0, c.upvotes - 1)
              : c.upvotes + 1;
            return {
              ...c,
              upvotes: updatedUpvotes,
              upvotedUsers: updatedUsers
            };
          }
          return c;
        }));
        if (addToast) {
          addToast('तुमचे अपव्होट नोंदवले गेले!', 'success');
        }
      } else {
        const data = await res.json();
        alert(data.error || 'अपव्होट करताना अडचण आली.');
      }
    } catch (err) {
      console.error('Error upvoting comment:', err);
    }
  };

  if (isLoading) {
    return (
      <div id="opinion-poll-section" className={`bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center justify-center min-h-[220px] text-slate-500 ${className}`}>
        <Loader2 className="h-8 w-8 text-rose-500 animate-spin mb-3" />
        <p className="text-xs sm:text-sm font-semibold font-sans">जनमत कौल लोड होत आहे...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="opinion-poll-section" className={`bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs text-center text-slate-500 ${className}`}>
        <p className="text-xs sm:text-sm text-rose-500 font-semibold mb-3">त्रुटी: {error}</p>
        <button
          onClick={fetchActivePoll}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          <span>पुन्हा प्रयत्न करा</span>
        </button>
      </div>
    );
  }

  if (!activePoll) {
    return null; // Don't render anything if no active poll exists
  }

  const votesMap = activePoll.votes || {};
  const totalVotes = (Object.values(votesMap) as number[]).reduce((a: number, b: number) => a + b, 0);
  const hasVoted = votedPolls.includes(activePoll._id);
  
  // Check if poll has expired
  const isExpired = activePoll.expiryDate ? new Date() > new Date(activePoll.expiryDate) : false;
  const showResults = hasVoted || isExpired;

  // Check if poll is expiring soon (within 24 hours)
  const isExpiringSoon = !isExpired && activePoll.expiryDate
    ? (() => {
        const msLeft = new Date(activePoll.expiryDate).getTime() - Date.now();
        return msLeft > 0 && msLeft <= 24 * 60 * 60 * 1000;
      })()
    : false;

  // Format expiry date beautifully if present
  const formatExpiryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('mr-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <motion.div
      id="opinion-poll-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-slate-900 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-50 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-2xl">
            <BarChart3 className="h-5 w-5 text-rose-600" />
          </div>
          <div className="text-left">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>माझापत्र जनमत कौल (Opinion Poll)</span>
              {!isExpired && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-sans">अहिल्यानगरकरांचे ताजे मत जाणून घ्या</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-special">
            एकूण मते: {totalVotes}
          </span>
          
          {/* Share Button */}
          <button
            onClick={handleShare}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
              shareCopied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
            }`}
            title="पोल शेअर करा"
          >
            <Share2 className="h-3 w-3" />
            <span>{shareCopied ? 'लिंक कॉपी झाली!' : 'शेअर करा'}</span>
          </button>

          <button
            onClick={fetchActivePoll}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
            title="रिफ्रेश करा"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-5">
        <h4 className="text-sm sm:text-base font-extrabold text-slate-800 leading-relaxed font-sans text-left flex flex-col gap-1">
          <span>{activePoll.question}</span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {activePoll.expiryDate && (
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>मतदानाची मुदत: {formatExpiryDate(activePoll.expiryDate)}</span>
              </span>
            )}
            {isExpiringSoon && (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-lg animate-pulse tracking-wide shadow-xs shrink-0">
                <Clock className="h-3 w-3 text-white shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                <span>लवकरच संपत आहे! (Expiring Soon)</span>
              </span>
            )}
          </div>
        </h4>

        <AnimatePresence mode="wait">
          {showResults ? (
            // Results view with visual feedback, list of percentages, and the Recharts Chart
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isExpired && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold text-left font-sans">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>हा पोल कालबाह्य (expired) झाला आहे. आता नवीन मते स्वीकारली जात नाहीत.</span>
                </div>
              )}

              <div className="space-y-4">
                {activePoll.options.map((option, idx) => {
                  const count = votesMap[String(idx)] || 0;
                  const displayPercentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const imageUrl = activePoll.optionImages?.[idx];

                  return (
                    <div key={idx} className="space-y-1.5 text-left">
                      <div className="flex items-center gap-3">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={option}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 flex justify-between text-xs sm:text-sm font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {option}
                          </span>
                          <span className="text-slate-500 font-special">
                            {displayPercentage}% ({count} मते)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-150">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${displayPercentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-full"
                        ></motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Render Recharts chart */}
              <PollResultsChart poll={activePoll} />

              {hasVoted && !isExpired && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-2 flex items-center justify-center gap-2 text-emerald-600 text-xs sm:text-sm font-extrabold bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100/50 font-sans"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 animate-bounce" />
                  <span>तुमचे मत यशस्वीरित्या नोंदवले गेले आहे! धन्यवाद.</span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // Options voting view with nice enter transitions
            <motion.div
              key="voting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {orderedIndices.map((idx) => {
                const option = activePoll.options[idx];
                const imageUrl = activePoll.optionImages?.[idx];
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01, translateY: -1 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={isVoting}
                    onClick={() => handleVote(idx)}
                    className="w-full text-left bg-slate-50 hover:bg-rose-50/40 border border-slate-150 hover:border-rose-200 p-4 rounded-2xl text-xs sm:text-sm font-bold text-slate-750 hover:text-rose-700 transition cursor-pointer flex items-center justify-between group disabled:opacity-50 gap-2 font-sans"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-black flex items-center justify-center group-hover:border-rose-300 group-hover:text-rose-600 shrink-0">
                        {idx + 1}
                      </span>
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={option}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>{option}</span>
                    </span>
                    <span className="text-slate-400 group-hover:text-rose-500 transition-colors font-sans text-xs flex items-center gap-1 shrink-0">
                      <Vote className="h-3.5 w-3.5" />
                      <span>मत द्या →</span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Discussion Forum / Comments Section */}
      <div className="border-t border-slate-100 pt-6 mt-4 text-left">
        <h5 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
          <MessageSquare className="h-4.5 w-4.5 text-rose-500" />
          <span>वाचक चर्चा सत्र ({comments.length} प्रतिक्रिया)</span>
        </h5>

        {/* Comment entry Form */}
        {authUser ? (
          <form onSubmit={handleSubmitComment} className="flex gap-3 items-start mb-6">
            {authUser.photoUrl ? (
              <img 
                src={authUser.photoUrl} 
                alt="" 
                className="w-9 h-9 rounded-full object-cover border border-rose-100 shrink-0" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-rose-650 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                {authUser.name[0]}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="या जनमत कौल विषयावर आपले मत व्यक्त करा..."
                rows={2}
                required
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 placeholder:text-slate-400 font-medium resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-semibold">
                  नाव: <strong className="text-slate-600">{authUser.name}</strong> म्हणून प्रतिक्रिया लिहीत आहात.
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>प्रतिक्रिया पोस्ट करा</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center text-xs sm:text-sm font-sans mb-6 space-y-2.5">
            <p className="font-bold text-slate-600 leading-relaxed">
              या मतदानावर आपले मत मांडण्यासाठी व इतर वाचकांशी चर्चा करण्यासाठी कृपया लॉगिन करा.
            </p>
            <p className="text-[11px] text-slate-400">
              लॉगिन करण्यासाठी वरील कोपऱ्यात असलेल्या <strong>'गूगल लॉगिन'</strong> बटनावर क्लिक करा.
            </p>
          </div>
        )}

        {/* Comments List */}
        {commentsLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400 gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            <span className="text-xs font-semibold">प्रतिक्रिया लोड होत आहेत...</span>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-400 font-bold text-center py-4">अद्याप कोणतीही प्रतिक्रिया नाही. पहिले मत तुमचे व्यक्त करा!</p>
        ) : (
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {comments.map((comment) => {
              const hasUpvoted = authUser && comment.upvotedUsers?.includes(authUser.email);
              return (
                <div key={comment._id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      {comment.photoUrl ? (
                        <img 
                          src={comment.photoUrl} 
                          alt="" 
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0">
                          {(comment.name || 'U').substring(0, 1)}
                        </div>
                      )}
                      <div>
                        <h6 className="text-xs font-extrabold text-slate-800">{comment.name}</h6>
                        <span className="text-[9px] text-slate-400 font-bold font-mono">
                          {new Date(comment.createdAt).toLocaleDateString('mr-IN')} {new Date(comment.createdAt).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Upvote Button */}
                    <button
                      onClick={() => handleUpvoteComment(comment._id)}
                      className={`flex items-center space-x-1 border px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        hasUpvoted
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                      title={hasUpvoted ? "अपव्होट काढा" : "या प्रतिक्रियेला अपव्होट करा"}
                    >
                      <ThumbsUp className={`h-3 w-3 ${hasUpvoted ? 'fill-rose-500 text-rose-600' : ''}`} />
                      <span>{comment.upvotes || 0}</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans pl-1">
                    {comment.commentText}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
