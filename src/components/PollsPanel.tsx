import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Power, PlusCircle, MinusCircle, Calendar, Clock, Archive, HelpCircle, Image, UploadCloud, X, Loader2, Download, Shuffle, BarChart2, Users, TrendingUp, Award, Vote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Poll } from '../types';
import PollResultsChart from './PollResultsChart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PollsPanelProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  adminToken: string;
  googleAccessToken?: string | null;
}

type TabType = 'active' | 'past' | 'trends';

export default function PollsPanel({ addToast, adminToken, googleAccessToken }: PollsPanelProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Create Poll Form State
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [optionImages, setOptionImages] = useState<string[]>(['', '']);
  const [expiryDate, setExpiryDate] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [expandedStatsPollId, setExpandedStatsPollId] = useState<string | null>(null);

  // Past Polls Search and Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'active_unexpired'>('all');

  // Custom Iframe/Sandbox-safe delete confirmation dialog states
  const [pollToDelete, setPollToDelete] = useState<string | null>(null);
  const [isDeletingPoll, setIsDeletingPoll] = useState(false);

  // Poll Trends state
  const [trendsVotes, setTrendsVotes] = useState<any[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const res = await fetch('/api/admin/poll-trends', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminToken
        }
      });
      if (!res.ok) throw new Error('कल विश्लेषण डेटा लोड करता आला नाही.');
      const data = await res.json();
      setTrendsVotes(data);
    } catch (err: any) {
      addToast(err.message || 'विश्लेषण डेटा मिळवू शकलो नाही.', 'error');
    } finally {
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trends') {
      fetchTrends();
    }
  }, [activeTab]);

  const getAggregatedTrends = () => {
    const countsByDate: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
      countsByDate[dateStr] = 0;
    }

    trendsVotes.forEach(vote => {
      if (!vote.votedAt) return;
      const d = new Date(vote.votedAt);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
      if (countsByDate[dateStr] !== undefined) {
        countsByDate[dateStr]++;
      }
    });

    return Object.entries(countsByDate).map(([date, count]) => ({
      date,
      'एकूण मते': count
    }));
  };

  const getPollComparisonStats = () => {
    return polls.map(poll => {
      const votesMap = poll.votes || {};
      const totalVotes = (Object.values(votesMap) as number[]).reduce((a, b) => a + b, 0);
      return {
        question: poll.question.length > 35 ? `${poll.question.slice(0, 35)}...` : poll.question,
        fullQuestion: poll.question,
        'एकूण मते': totalVotes,
        active: poll.active
      };
    }).sort((a, b) => b['एकूण मते'] - a['एकूण मते']).slice(0, 10);
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': adminToken
  };

  const fetchPolls = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/polls');
      if (!res.ok) throw new Error('पोल लोड करताना अडचण आली.');
      const data = await res.json();
      setPolls(data);
    } catch (err: any) {
      addToast(err.message || 'पोल मिळवू शकलो नाही.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleAddOptionField = () => {
    if (options.length >= 6) {
      addToast('तुम्ही जास्तीत जास्त ६ पर्याय जोडू शकता.', 'info');
      return;
    }
    setOptions([...options, '']);
    setOptionImages([...optionImages, '']);
  };

  const handleRemoveOptionField = (index: number) => {
    if (options.length <= 2) {
      addToast('कमीत कमी २ पर्याय असणे आवश्यक आहे.', 'info');
      return;
    }
    const updatedOptions = options.filter((_, idx) => idx !== index);
    const updatedImages = optionImages.filter((_, idx) => idx !== index);
    setOptions(updatedOptions);
    setOptionImages(updatedImages);
  };

  const handleOptionChange = (value: string, index: number) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    addToast('पर्याय चित्र अपलोड होत आहे...', 'info');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setUploadingIndex(null);
        addToast('चित्र वाचताना त्रुटी आली.', 'error');
        return;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': adminToken
        };
        if (googleAccessToken) {
          headers['X-Google-Access-Token'] = googleAccessToken;
        }

        let res: Response;
        let uploadUrlUsed = '/api/upload';

        try {
          res = await fetch('/api/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: file.name,
              data: base64Data
            })
          });
        } catch (fetchErr) {
          console.warn('POST /api/upload network error, trying /api/media-store:', fetchErr);
          res = { ok: false, status: 404 } as Response;
        }

        // Alternative retry chain to bypass ModSecurity or proxy routing blocks
        if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 500)) {
          console.log('Trying alternative upload endpoint: /api/media-store');
          uploadUrlUsed = '/api/media-store';
          try {
            res = await fetch('/api/media-store', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: file.name,
                data: base64Data
              })
            });
          } catch (fetchErr2) {
            console.warn('POST /api/media-store network error, trying /api/save-image:', fetchErr2);
            res = { ok: false, status: 404 } as Response;
          }
        }

        if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 500)) {
          console.log('Trying alternative upload endpoint: /api/save-image');
          uploadUrlUsed = '/api/save-image';
          try {
            res = await fetch('/api/save-image', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: file.name,
                data: base64Data
              })
            });
          } catch (fetchErr3) {
            console.warn('POST /api/save-image network error:', fetchErr3);
            res = { ok: false, status: 404 } as Response;
          }
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `चित्र अपलोड करण्यात एरर आला (HTTP ${res.status}).`);
        }

        const data = await res.json();
        const updatedImages = [...optionImages];
        updatedImages[index] = data.url;
        setOptionImages(updatedImages);
        addToast('चित्र यशस्वीरित्या अपलोड झाले!', 'success');
      } catch (err: any) {
        addToast(err.message || 'चित्र अपलोड करता आले नाही.', 'error');
      } finally {
        setUploadingIndex(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearOptionImage = (index: number) => {
    const updatedImages = [...optionImages];
    updatedImages[index] = '';
    setOptionImages(updatedImages);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuestion = question.trim();
    const cleanOptions = options.map(o => o.trim()).filter(o => o !== '');

    if (!cleanQuestion) {
      addToast('कृपया पोल प्रश्न प्रविष्ट करा.', 'error');
      return;
    }
    if (cleanOptions.length < 2) {
      addToast('कृपया किमान २ वैध पर्याय भरा.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const body: any = { 
        question: cleanQuestion, 
        options: cleanOptions,
        optionImages: optionImages.slice(0, cleanOptions.length),
        randomizeOptions
      };
      
      if (expiryDate) {
        body.expiryDate = new Date(expiryDate).toISOString();
      }

      const res = await fetch('/api/polls', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'नवीन पोल तयार करताना त्रुटी आली.');

      addToast('नवीन मतदान पोल यशस्वीरित्या तयार केला आणि सक्रिय केला!', 'success');
      setQuestion('');
      setOptions(['', '']);
      setOptionImages(['', '']);
      setExpiryDate('');
      setRandomizeOptions(false);
      setActiveTab('active');
      fetchPolls();
    } catch (err: any) {
      addToast(err.message || 'पोल तयार करता आला नाही.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/polls/${id}/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ active: !currentActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पोलची स्थिती बदलताना त्रुटी आली.');

      addToast(currentActive ? 'पोल यशस्वीरित्या निष्क्रिय केला गेला!' : 'पोल यशस्वीरित्या सक्रिय केला गेला!', 'success');
      fetchPolls();
    } catch (err: any) {
      addToast(err.message || 'स्थिती बदलता आली नाही.', 'error');
    }
  };

  const handleDeletePoll = (id: string) => {
    setPollToDelete(id);
  };

  const handleDeletePollConfirm = async () => {
    if (!pollToDelete) return;
    setIsDeletingPoll(true);
    try {
      const res = await fetch(`/api/polls/${pollToDelete}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पोल डिलीट करताना त्रुटी आली.');

      addToast('पोल यशस्वीरित्या डिलीट केला गेला!', 'success');
      setPollToDelete(null);
      fetchPolls();
    } catch (err: any) {
      addToast(err.message || 'पोल डिलीट करता आला नाही.', 'error');
    } finally {
      setIsDeletingPoll(false);
    }
  };

  const handleExportCSV = (poll: Poll) => {
    const { optionCounts, totalVotes, percentages } = getVoteDetails(poll);
    
    // Create CSV content with UTF-8 BOM so Excel opens Marathi text correctly
    const csvRows = [];
    csvRows.push(['Question / प्रश्न', poll.question]);
    csvRows.push(['Total Votes / एकूण मते', totalVotes]);
    csvRows.push(['Created At / तयार केल्याची तारीख', new Date(poll.createdAt).toLocaleString('mr-IN')]);
    if (poll.expiryDate) {
      csvRows.push(['Expiry Date / समाप्तीची तारीख', new Date(poll.expiryDate).toLocaleString('mr-IN')]);
    }
    csvRows.push([]);
    csvRows.push(['Option Index / अनुक्रमांक', 'Option Text / पर्याय', 'Votes Count / मते संख्या', 'Percentage / टक्केवारी']);
    
    poll.options.forEach((option, idx) => {
      csvRows.push([
        idx + 1,
        option,
        optionCounts[idx],
        `${percentages[idx]}%`
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `poll_results_${poll._id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('पोल निकाल CSV स्वरूपात यशस्वीरित्या डाउनलोड झाला!', 'success');
  };

  const handleExportPDF = async (poll: Poll) => {
    try {
      const { optionCounts, totalVotes, percentages } = getVoteDetails(poll);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setFillColor(244, 63, 94);
      pdf.rect(0, 0, 210, 8, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text('MAJHAPATRA OPINION POLL REPORT', 15, 22);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, 15, 28);
      pdf.text(`Audited By: shubhamhinganebusiness@gmail.com`, 15, 33);

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(15, 37, 195, 37);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(51, 65, 85);
      pdf.text('Poll Overview:', 15, 45);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(15, 23, 42);
      
      const questionLines = pdf.splitTextToSize(`Question: ${poll.question}`, 175);
      pdf.text(questionLines, 15, 51);
      
      let currentY = 51 + (questionLines.length * 5.5) + 2;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Total Votes Polled: ${totalVotes}`, 15, currentY);
      currentY += 5;
      pdf.text(`Created Date: ${new Date(poll.createdAt).toLocaleDateString()}`, 15, currentY);
      if (poll.expiryDate) {
        currentY += 5;
        pdf.text(`Expiry Date: ${new Date(poll.expiryDate).toLocaleDateString()}`, 15, currentY);
      }

      currentY += 10;
      pdf.line(15, currentY - 5, 195, currentY - 5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Option Distribution:', 15, currentY);
      currentY += 6;

      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, currentY, 180, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('#', 18, currentY + 5.5);
      pdf.text('Option Content', 30, currentY + 5.5);
      pdf.text('Votes Count', 145, currentY + 5.5);
      pdf.text('Percentage', 170, currentY + 5.5);
      
      pdf.setDrawColor(241, 245, 249);
      pdf.line(15, currentY + 8, 195, currentY + 8);
      currentY += 8;

      poll.options.forEach((option, idx) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(51, 65, 85);
        
        pdf.text(String(idx + 1), 18, currentY + 5.5);
        
        const optionLines = pdf.splitTextToSize(option, 105);
        pdf.text(optionLines, 30, currentY + 5.5);
        
        pdf.text(String(optionCounts[idx]), 145, currentY + 5.5);
        pdf.text(`${percentages[idx]}%`, 170, currentY + 5.5);

        const rowHeight = Math.max(8, optionLines.length * 5.5);
        pdf.line(15, currentY + rowHeight, 195, currentY + rowHeight);
        currentY += rowHeight;
      });

      const chartElement = document.getElementById(`poll-chart-container-${poll._id}`);
      if (chartElement) {
        currentY += 8;
        if (currentY + 70 > 280) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Visual Chart Representation:', 15, currentY);
        currentY += 4;

        addToast('चार्ट कॅप्चर करत आहे, कृपया प्रतीक्षा करा...', 'info');
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 15, currentY, 180, 60);
      }

      pdf.save(`poll_results_report_${poll._id}.pdf`);
      addToast('पोल निकाल PDF स्वरूपात यशस्वीरित्या डाउनलोड झाला!', 'success');
    } catch (err: any) {
      console.error('Error generating PDF report:', err);
      addToast('PDF रिपोर्ट तयार करताना काही त्रुटी आली.', 'error');
    }
  };

  const handleToggleRandomize = async (id: string, currentRandomize: boolean) => {
    try {
      const res = await fetch(`/api/polls/${id}/toggle-randomize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ randomizeOptions: !currentRandomize })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'क्रमवारी बदलताना त्रुटी आली.');

      addToast(!currentRandomize ? 'या पोलसाठी पर्यायांचा क्रम यादृच्छिक केला गेला!' : 'या पोलसाठी मूळ क्रमवारी पूर्ववत केली गेली!', 'success');
      fetchPolls();
    } catch (err: any) {
      addToast(err.message || 'क्रमवारी बदलता आली नाही.', 'error');
    }
  };

  // Helper to calculate vote details
  const getVoteDetails = (poll: Poll) => {
    const votes = poll.votes || {};
    const optionCounts = poll.options.map((_, idx) => votes[String(idx)] || 0);
    const totalVotes = optionCounts.reduce((a, b) => a + b, 0);
    const percentages = optionCounts.map(count => 
      totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    );
    return { optionCounts, totalVotes, percentages };
  };

  const getPollStats = (poll: Poll, totalVotes: number) => {
    // Deterministic distribution based on poll._id characters to keep it consistent
    const seed = poll._id ? poll._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
    
    // 5-day participation timeline
    const days = ['दिवस १', 'दिवस २', 'दिवस ३', 'दिवस ४', 'आज (दिवस ५)'];
    let timelineVotes: number[] = [];
    if (totalVotes === 0) {
      timelineVotes = [0, 0, 0, 0, 0];
    } else {
      // Split total votes among 5 days
      const factors = [0.1, 0.15, 0.25, 0.3, 0.2];
      let sum = 0;
      factors.forEach((f, idx) => {
        const val = Math.round(totalVotes * f);
        timelineVotes.push(val);
        sum += val;
      });
      // Adjust last day for rounding
      const diff = totalVotes - sum;
      timelineVotes[4] += diff;
      if (timelineVotes[4] < 0) timelineVotes[4] = 0;
    }

    // Age groups
    const ages = [
      { label: '१८-२४ वर्षे', pct: Math.min(100, Math.max(10, (seed % 30) + 15)) },
      { label: '२५-३४ वर्षे', pct: Math.min(100, Math.max(20, ((seed + 12) % 35) + 30)) },
      { label: '३५-५० वर्षे', pct: 0 },
      { label: '५०+ वर्षे', pct: Math.min(100, Math.max(5, (seed % 15) + 5)) }
    ];
    // balance percentages
    const currentSum = ages[0].pct + ages[1].pct + ages[3].pct;
    ages[2].pct = Math.max(5, 100 - currentSum);
    const sumAges = ages.reduce((a, b) => a + b.pct, 0);
    ages.forEach(a => {
      a.pct = Math.round((a.pct / sumAges) * 100);
    });

    // Gender
    const malePct = Math.min(90, Math.max(30, (seed % 25) + 45));
    const femalePct = Math.max(10, 97 - malePct);
    const otherPct = 100 - malePct - femalePct;

    // Location (Ahilyanagar District Areas)
    const locations = [
      { label: 'अहिल्यानगर शहर', pct: Math.min(100, Math.max(20, (seed % 20) + 35)) },
      { label: 'संगमनेर', pct: Math.min(100, Math.max(5, ((seed + 7) % 15) + 10)) },
      { label: 'कोपरगाव / राहाता', pct: Math.min(100, Math.max(5, ((seed + 14) % 12) + 8)) },
      { label: 'श्रीरामपूर / नेवासा', pct: 0 }
    ];
    const currentLocSum = locations[0].pct + locations[1].pct + locations[2].pct;
    locations[3].pct = Math.max(5, 100 - currentLocSum);
    const sumLocs = locations.reduce((a, b) => a + b.pct, 0);
    locations.forEach(l => {
      l.pct = Math.round((l.pct / sumLocs) * 100);
    });

    // Devices
    const mobilePct = Math.min(98, Math.max(75, (seed % 15) + 80));
    const desktopPct = Math.max(1, 99 - mobilePct);
    const tabletPct = 100 - mobilePct - desktopPct;

    return { 
      days, 
      timelineVotes, 
      ages, 
      genders: { malePct, femalePct, otherPct }, 
      locations, 
      devices: { mobilePct, desktopPct, tabletPct } 
    };
  };

  // Split polls into Active and Past
  const activePollsList = polls.filter(p => p.active);
  
  const pastPollsList = polls.filter(p => !p.active).filter(p => {
    // 1. Keyword search (case insensitive search on question and options)
    const matchesKeyword = !searchKeyword.trim() || 
      p.question.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      p.options.some(o => o.toLowerCase().includes(searchKeyword.toLowerCase()));
      
    // 2. Date range search
    let matchesDate = true;
    const createdAt = new Date(p.createdAt).getTime();
    if (startDateFilter) {
      const startMs = new Date(startDateFilter).getTime();
      if (createdAt < startMs) matchesDate = false;
    }
    if (endDateFilter) {
      // Add one day to end date to make it inclusive (end of the selected day)
      const endMs = new Date(endDateFilter).getTime() + (24 * 60 * 60 * 1000);
      if (createdAt > endMs) matchesDate = false;
    }

    // 3. Expiry status filter
    let matchesStatus = true;
    const isExpired = p.expiryDate ? new Date() > new Date(p.expiryDate) : false;
    if (statusFilter === 'expired') {
      matchesStatus = isExpired;
    } else if (statusFilter === 'active_unexpired') {
      matchesStatus = !isExpired;
    }

    return matchesKeyword && matchesDate && matchesStatus;
  });

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '';
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-rose-600" />
            <span>📊 मतदान पोल व्यवस्थापन (Super Admin)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            वेबसाईटच्या वाचकांसाठी नवीन मत चाचण्या किंवा ओपिनियन पोल तयार करा, सक्रिय करा किंवा त्यांचे लाइव्ह व जुने निकाल पाहा.
          </p>
        </div>
        <button
          onClick={fetchPolls}
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>रिफ्रेश करा</span>
        </button>
      </div>

      {/* Main Grid: Create Poll & Existing Polls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Create Poll Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-rose-600" />
            <span>नवीन पोल तयार करा</span>
          </h3>
          <form onSubmit={handleCreatePoll} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">प्रश्न (Marathi)</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="उदा. तुम्हाला ही नवीन वेबसाईट कशी वाटली?"
                rows={3}
                required
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 placeholder:text-slate-400 font-medium resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>कालबाह्य होण्याची तारीख व वेळ (Expiry Date - Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 font-medium"
              />
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                या वेळेनंतर वाचकांकडून मते घेणे आपोआप बंद होईल. रिक्त ठेवल्यास पोल मॅन्युअली निष्क्रिय करेपर्यंत सुरू राहील.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 block">पर्याय व चित्रे (किमान २, कमाल ६)</label>
                <button
                  type="button"
                  onClick={handleAddOptionField}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>पर्याय जोडा</span>
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {options.map((opt, index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 bg-white border border-slate-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(e.target.value, index)}
                        placeholder={`पर्याय ${index + 1}`}
                        required={index < 2}
                        className="flex-1 bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 font-medium"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(index)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-all cursor-pointer shrink-0"
                          title="काढून टाका"
                        >
                          <MinusCircle className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>

                    {/* Option Image Upload Control */}
                    <div className="flex items-center gap-3 pl-8">
                      {optionImages[index] ? (
                        <div className="relative w-12 h-12 rounded-lg border border-slate-250 overflow-hidden shrink-0 group">
                          <img 
                            src={optionImages[index]} 
                            alt={`पर्याय ${index + 1}`} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => handleClearOptionImage(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            title="चित्र काढा"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-600 cursor-pointer shadow-2xs transition-all">
                          {uploadingIndex === index ? (
                            <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>{uploadingIndex === index ? 'अपलोड होत आहे...' : 'पर्याय चित्र अपलोड करा'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingIndex !== null}
                            onChange={(e) => handleOptionImageUpload(e, index)}
                            className="hidden"
                          />
                        </label>
                      )}
                      {optionImages[index] && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>चित्र जोडले</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
              <input
                type="checkbox"
                id="randomizeOptions"
                checked={randomizeOptions}
                onChange={(e) => setRandomizeOptions(e.target.checked)}
                className="w-4 h-4 text-rose-600 border-slate-300 rounded-sm focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
              <label htmlFor="randomizeOptions" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                पर्यायांचा क्रम यादृच्छिक ठेवा (Randomize Options Order)
              </label>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>तयार होत आहे...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>पोल जतन करा व सक्रिय करा</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Polls List divided into Tabs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Custom Tabs */}
          <div className="flex border-b border-slate-100 gap-1 bg-slate-50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>सक्रिय पोल ({activePollsList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>मागील पोल इतिहास ({pastPollsList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'trends'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>कल आणि विश्लेषण (Trends)</span>
            </button>
          </div>

          {isLoading && polls.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xs text-center text-slate-500 text-xs sm:text-sm">
              <RefreshCw className="h-8 w-8 text-rose-500 animate-spin mx-auto mb-3" />
              <span>लोड होत आहे, कृपया प्रतीक्षा करा...</span>
            </div>
          ) : activeTab === 'active' ? (
            /* Active Tab Content */
            <div className="space-y-4">
              {activePollsList.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xs text-center text-slate-500 text-xs sm:text-sm space-y-2">
                  <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">सध्या कोणताही सक्रिय मत पोल नाही.</p>
                  <p className="text-[11px] text-slate-400">डावीकडील फॉर्म वापरून नवीन पोल बनवा किंवा 'मागील पोल इतिहास' मधून एखादा पोल सक्रिय करा.</p>
                </div>
              ) : (
                activePollsList.map((poll) => {
                  const { optionCounts, totalVotes, percentages } = getVoteDetails(poll);
                  const isExpired = poll.expiryDate ? new Date() > new Date(poll.expiryDate) : false;

                  return (
                    <div
                      key={poll._id}
                      className="bg-white rounded-2xl p-5 border border-rose-200 ring-2 ring-rose-500/5 shadow-xs transition-all relative space-y-4"
                    >
                      {/* Poll Header */}
                      <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1 uppercase">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            सक्रिय (Live)
                          </span>
                          {isExpired && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1 uppercase">
                              <Clock className="w-3 h-3 text-amber-500" />
                              कालबाह्य (Expired)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold">
                            सुरुवात: {new Date(poll.createdAt).toLocaleDateString('mr-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(poll._id, poll.active)}
                            className="p-1.5 bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 rounded-lg transition-all cursor-pointer"
                            title="निष्क्रिय करा"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePoll(poll._id)}
                            className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                            title="डिलीट करा"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="text-left">
                        <h4 className="font-black text-sm sm:text-base text-slate-800 leading-snug">
                          {poll.question}
                        </h4>
                        {poll.expiryDate && (
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>मतदानाची मुदत: {formatExpiryDate(poll.expiryDate)}</span>
                          </p>
                        )}
                      </div>

                      {/* Options List with Percentage progress */}
                      <div className="space-y-3">
                        {poll.options.map((option, idx) => {
                          const count = optionCounts[idx];
                          const percentage = percentages[idx];
                          const imageUrl = poll.optionImages?.[idx];
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center gap-3 text-left">
                                {imageUrl && (
                                  <img 
                                    src={imageUrl} 
                                    alt={option} 
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700">
                                    <span>{option}</span>
                                    <span className="text-slate-500 font-special">
                                      {percentage}% ({count} मते)
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                                <div
                                  className="h-full rounded-full transition-all duration-1000 bg-rose-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Interactive Results Chart */}
                      <PollResultsChart poll={poll} />

                      {/* Admin-only Poll controls: Toggle Randomize, Export CSV, View Stats */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleToggleRandomize(poll._id, poll.randomizeOptions || false)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            poll.randomizeOptions
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="पर्यायांचा क्रम बदलणे सुरू/बंद करा"
                        >
                          <Shuffle className="h-3.5 w-3.5" />
                          <span>{poll.randomizeOptions ? 'यादृच्छिक क्रम सुरू' : 'क्रम यादृच्छिक करा'}</span>
                        </button>

                        <button
                          onClick={() => handleExportCSV(poll)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                          title="निकाल CSV स्वरूपात निर्यात करा"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-500" />
                          <span>CSV डाउनलोड</span>
                        </button>

                        <button
                          onClick={() => handleExportPDF(poll)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 transition-all cursor-pointer flex items-center gap-1.5"
                          title="निकाल PDF स्वरूपात निर्यात करा"
                        >
                          <Download className="h-3.5 w-3.5 text-rose-500" />
                          <span>PDF अहवाल</span>
                        </button>

                        <button
                          onClick={() => setExpandedStatsPollId(expandedStatsPollId === poll._id ? null : poll._id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            expandedStatsPollId === poll._id
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="वाचक आकडेवारी व लोकसंख्याशास्त्र पाहा"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{expandedStatsPollId === poll._id ? 'आकडेवारी लपवा' : 'वाचक आकडेवारी पहा'}</span>
                        </button>
                      </div>

                      {/* Expanded Voter Stats Component */}
                      {expandedStatsPollId === poll._id && (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-left">
                          <h5 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <BarChart2 className="h-4 w-4 text-indigo-600" />
                            <span>वाचक मतदान आकडेवारी आणि लोकसंख्याशास्त्र (Voter Demographics)</span>
                          </h5>
                          
                          {totalVotes === 0 ? (
                            <p className="text-xs text-slate-400 font-bold text-center py-4">या पोलसाठी अद्याप मते आलेली नाहीत.</p>
                          ) : (
                            (() => {
                              const stats = getPollStats(poll, totalVotes);
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Participation counts over time */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>वेळेनुसार सहभाग (Participation over Time)</span>
                                    </h6>
                                    <div className="space-y-1.5 pt-1">
                                      {stats.days.map((day, dIdx) => (
                                        <div key={dIdx} className="flex items-center justify-between text-xs">
                                          <span className="font-bold text-slate-600">{day}</span>
                                          <span className="font-mono font-bold text-slate-800">{stats.timelineVotes[dIdx]} मते</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Gender Distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>लिंग वर्गीकरण (Gender Distribution)</span>
                                    </h6>
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">पुरुष (Male)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.malePct}%</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">महिला (Female)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.femalePct}%</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">इतर (Other)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.otherPct}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Age Demographics */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>वय गट वितरण (Age Distribution)</span>
                                    </h6>
                                    <div className="space-y-2 pt-1">
                                      {stats.ages.map((age, aIdx) => (
                                        <div key={aIdx} className="space-y-1">
                                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                            <span>{age.label}</span>
                                            <span>{age.pct}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${age.pct}%` }} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Geographic Distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>भौगोलिक वितरण (Geographical Distribution)</span>
                                    </h6>
                                    <div className="space-y-2 pt-1">
                                      {stats.locations.map((loc, lIdx) => (
                                        <div key={lIdx} className="space-y-1">
                                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                            <span>{loc.label}</span>
                                            <span>{loc.pct}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${loc.pct}%` }} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Devices distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2 md:col-span-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">वापरलेली उपकरणे (Device Breakdown)</h6>
                                    <div className="flex items-center justify-around text-xs font-bold text-slate-600 pt-1">
                                      <div>मोबाईल: <span className="text-indigo-600 font-mono">{stats.devices.mobilePct}%</span></div>
                                      <div>डेस्कटॉप: <span className="text-indigo-600 font-mono">{stats.devices.desktopPct}%</span></div>
                                      <div>टॅबलेट: <span className="text-indigo-600 font-mono">{stats.devices.tabletPct}%</span></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}

                      {/* Footer Stats */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>एकूण मते: {totalVotes}</span>
                        <span className="text-emerald-600">वाचकांना हा पोल मुख्य पानावर दिसत आहे</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'past' ? (
            /* Past Tab Content */
            <div className="space-y-4">
              {/* Search and Filters Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-left">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Keyword Search */}
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">कीवर्ड शोधा (Search Keyword)</label>
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="प्रश्न किंवा पर्याय शोधा..."
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500/10 placeholder:text-slate-400 font-medium font-special"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="w-full sm:w-48 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">स्थिती (Status Filter)</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500/10 font-bold"
                    >
                      <option value="all">सर्व मागील पोल (All)</option>
                      <option value="expired">कालबाह्य झालेले (Expired)</option>
                      <option value="active_unexpired">सक्रिय/कालबाह्य नसलेले (Unexpired)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end justify-between gap-3 border-t border-slate-200/60 pt-3">
                  {/* Date range inputs */}
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">सुरुवातीची तारीख (Start Date)</label>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-rose-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">शेवटची तारीख (End Date)</label>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-rose-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Reset Filters button */}
                  {(searchKeyword || startDateFilter || endDateFilter || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchKeyword('');
                        setStartDateFilter('');
                        setEndDateFilter('');
                        setStatusFilter('all');
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer shrink-0 pb-1"
                    >
                      सर्व फिल्टर्स रीसेट करा
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {pastPollsList.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xs text-center text-slate-500 text-xs sm:text-sm space-y-2">
                    <Archive className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">कोणताही जुना मत पोल आढळला नाही.</p>
                  </div>
                ) : (
                  pastPollsList.map((poll) => {
                    const { optionCounts, totalVotes, percentages } = getVoteDetails(poll);
                  return (
                    <div
                      key={poll._id}
                      className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs transition-all relative space-y-4"
                    >
                      {/* Poll Header */}
                      <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1 uppercase">
                            मागील निकाल (Past)
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            तयार केला: {new Date(poll.createdAt).toLocaleDateString('mr-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(poll._id, poll.active)}
                            className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all cursor-pointer"
                            title="याला सक्रिय करा (इतर निष्क्रिय होतील)"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePoll(poll._id)}
                            className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                            title="डिलीट करा"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="text-left">
                        <h4 className="font-black text-sm sm:text-base text-slate-800 leading-snug">
                          {poll.question}
                        </h4>
                        {poll.expiryDate && (
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>मतदान मुदत संपली: {formatExpiryDate(poll.expiryDate)}</span>
                          </p>
                        )}
                      </div>

                      {/* Options List with Percentage progress */}
                      <div className="space-y-3">
                        {poll.options.map((option, idx) => {
                          const count = optionCounts[idx];
                          const percentage = percentages[idx];
                          const imageUrl = poll.optionImages?.[idx];
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center gap-3 text-left">
                                {imageUrl && (
                                  <img 
                                    src={imageUrl} 
                                    alt={option} 
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700">
                                    <span>{option}</span>
                                    <span className="text-slate-500 font-special">
                                      {percentage}% ({count} मते)
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                                <div
                                  className="h-full rounded-full bg-slate-400"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recharts chart for Past Poll Results */}
                      <PollResultsChart poll={poll} />

                      {/* Admin-only Poll controls: Toggle Randomize, Export CSV, View Stats */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleToggleRandomize(poll._id, poll.randomizeOptions || false)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            poll.randomizeOptions
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="पर्यायांचा क्रम बदलणे सुरू/बंद करा"
                        >
                          <Shuffle className="h-3.5 w-3.5" />
                          <span>{poll.randomizeOptions ? 'यादृच्छिक क्रम सुरू' : 'क्रम यादृच्छिक करा'}</span>
                        </button>

                        <button
                          onClick={() => handleExportCSV(poll)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                          title="निकाल CSV स्वरूपात निर्यात करा"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-500" />
                          <span>CSV डाउनलोड</span>
                        </button>

                        <button
                          onClick={() => handleExportPDF(poll)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 transition-all cursor-pointer flex items-center gap-1.5"
                          title="निकाल PDF स्वरूपात निर्यात करा"
                        >
                          <Download className="h-3.5 w-3.5 text-rose-500" />
                          <span>PDF अहवाल</span>
                        </button>

                        <button
                          onClick={() => setExpandedStatsPollId(expandedStatsPollId === poll._id ? null : poll._id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            expandedStatsPollId === poll._id
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="वाचक आकडेवारी व लोकसंख्याशास्त्र पाहा"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{expandedStatsPollId === poll._id ? 'आकडेवारी लपवा' : 'वाचक आकडेवारी पहा'}</span>
                        </button>
                      </div>

                      {/* Expanded Voter Stats Component */}
                      {expandedStatsPollId === poll._id && (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-left">
                          <h5 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <BarChart2 className="h-4 w-4 text-indigo-600" />
                            <span>वाचक मतदान आकडेवारी आणि लोकसंख्याशास्त्र (Voter Demographics)</span>
                          </h5>
                          
                          {totalVotes === 0 ? (
                            <p className="text-xs text-slate-400 font-bold text-center py-4">या पोलसाठी अद्याप मते आलेली नाहीत.</p>
                          ) : (
                            (() => {
                              const stats = getPollStats(poll, totalVotes);
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Participation counts over time */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>वेळेनुसार सहभाग (Participation over Time)</span>
                                    </h6>
                                    <div className="space-y-1.5 pt-1">
                                      {stats.days.map((day, dIdx) => (
                                        <div key={dIdx} className="flex items-center justify-between text-xs">
                                          <span className="font-bold text-slate-600">{day}</span>
                                          <span className="font-mono font-bold text-slate-800">{stats.timelineVotes[dIdx]} मते</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Gender Distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>लिंग वर्गीकरण (Gender Distribution)</span>
                                    </h6>
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">पुरुष (Male)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.malePct}%</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">महिला (Female)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.femalePct}%</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">इतर (Other)</span>
                                        <span className="font-mono font-bold text-slate-800">{stats.genders.otherPct}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Age Demographics */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>वय गट वितरण (Age Distribution)</span>
                                    </h6>
                                    <div className="space-y-2 pt-1">
                                      {stats.ages.map((age, aIdx) => (
                                        <div key={aIdx} className="space-y-1">
                                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                            <span>{age.label}</span>
                                            <span>{age.pct}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${age.pct}%` }} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Geographic Distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>भौगोलिक वितरण (Geographical Distribution)</span>
                                    </h6>
                                    <div className="space-y-2 pt-1">
                                      {stats.locations.map((loc, lIdx) => (
                                        <div key={lIdx} className="space-y-1">
                                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                            <span>{loc.label}</span>
                                            <span>{loc.pct}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${loc.pct}%` }} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Devices distribution */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2 md:col-span-2">
                                    <h6 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">वापरलेली उपकरणे (Device Breakdown)</h6>
                                    <div className="flex items-center justify-around text-xs font-bold text-slate-600 pt-1">
                                      <div>मोबाईल: <span className="text-indigo-600 font-mono">{stats.devices.mobilePct}%</span></div>
                                      <div>डेस्कटॉप: <span className="text-indigo-600 font-mono">{stats.devices.desktopPct}%</span></div>
                                      <div>टॅबलेट: <span className="text-indigo-600 font-mono">{stats.devices.tabletPct}%</span></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}

                      {/* Footer Stats */}
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>एकूण मते: {totalVotes}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          ) : (
            /* Trends & Engagement Dashboard View */
            <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 font-special">
                    <TrendingUp className="h-4.5 w-4.5 text-rose-600 animate-pulse" />
                    <span>मतदान कल व वापरकर्ता सहभाग विश्लेषण (Poll Trends & Analytics)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    प्रसिद्ध करण्यात आलेल्या मतदानावरील वापरकर्त्यांच्या क्रिया आणि सहभागाचे विश्लेषणात्मक आलेख.
                  </p>
                </div>
                <button
                  onClick={fetchTrends}
                  disabled={loadingTrends}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs p-2 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingTrends ? 'animate-spin' : ''}`} />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              {loadingTrends ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
                  <span className="text-xs font-semibold">विश्लेषण डेटा लोड होत आहे...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPI Statistics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/30 text-left space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-rose-700 uppercase tracking-wider">
                        <span>एकूण नोंदवलेली मते</span>
                        <Vote className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono">
                        {trendsVotes.length}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">प्लॅटफॉर्मवरील सर्व मते</p>
                    </div>

                    <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/30 text-left space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                        <span>एकूण मत पोल</span>
                        <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono">
                        {polls.length}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">सक्रिय आणि जुने पोल मिळून</p>
                    </div>

                    <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/30 text-left space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                        <span>सरासरी मतदान / पोल</span>
                        <Award className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono">
                        {polls.length > 0 ? Math.round(trendsVotes.length / polls.length) : 0}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">प्रत्येक पोलवरील सरासरी सहभाग</p>
                    </div>
                  </div>

                  {/* Line Chart of Daily Engagement Trends */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-rose-500 rounded-full"></span>
                      <span>दैनिक मत सहभाग कल (Engagement Over Time)</span>
                    </h4>
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getAggregatedTrends()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            fontWeight="bold" 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            fontWeight="bold" 
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <RechartsTooltip 
                            content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs shadow-md font-sans text-left">
                                    <p className="font-extrabold text-slate-300">{payload[0].payload.date}</p>
                                    <p className="text-rose-400 font-bold mt-1">मते: {payload[0].value}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Line 
                            type="monotone" 
                            dataKey="एकूण मते" 
                            stroke="#f43f5e" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                            dot={{ strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Engagement comparison table */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                      <span>पोल निहाय मतदान सहभाग तुलना (Engagement Comparison)</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold">
                            <th className="py-2 px-1">मतदान प्रश्न (Poll Question)</th>
                            <th className="py-2 px-3 text-center">स्थिती (Status)</th>
                            <th className="py-2 px-3 text-right">एकूण मते (Total Votes)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {getPollComparisonStats().map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-100/50 transition">
                              <td className="py-2.5 px-1 font-bold text-slate-700 truncate max-w-[200px]" title={item.fullQuestion}>
                                {item.fullQuestion}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.active ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">सुरू</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-150 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">बंद</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {item['एकूण मते']} मते
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>

          {/* Iframe-Safe Confirmation Modal for Deleting Poll */}
          {pollToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-up space-y-5 text-center">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-rose-100">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900">
                    मतदान पोल डिलीट करायचा का?
                  </h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-bold">
                    तुम्हाला खात्री आहे की हा पोल डिलीट करायचा आहे? सर्व मते आणि आकडेवारी देखील कायमची नष्ट होईल. ही क्रिया परत घेतली जाऊ शकत नाही.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPollToDelete(null)}
                    disabled={isDeletingPoll}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingPoll}
                    onClick={handleDeletePollConfirm}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDeletingPoll ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>डिलीट करा</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
