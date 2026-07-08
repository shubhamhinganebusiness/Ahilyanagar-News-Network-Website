import React, { useState, useEffect } from 'react';
import { safeLocalStorage as localStorage } from '../utils/safeStorage';
import { 
  FileText, 
  FolderOpen, 
  Download, 
  UploadCloud, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  Database,
  Lock,
  ArrowRight,
  Eye,
  PieChart as PieIcon,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { News, SiteCustomization } from '../types';

interface GoogleDrivePanelProps {
  googleAccessToken: string | null;
  onGoogleLogin: () => Promise<void>;
  newsList: News[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onImportDraft: (title: string, content: string, description: string, existingArticleId?: string, existingArticleData?: any) => void;
  siteSettings: SiteCustomization;
  userRole: 'superadmin' | 'author' | null;
  adminToken?: string;
  onSaveSettings?: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
}

export default function GoogleDrivePanel({
  googleAccessToken,
  onGoogleLogin,
  newsList,
  addToast,
  onImportDraft,
  siteSettings,
  userRole,
  adminToken,
  onSaveSettings
}: GoogleDrivePanelProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);
  const [isImportingId, setIsImportingId] = useState<string | null>(null);
  const [lastExportedUrl, setLastExportedUrl] = useState<string | null>(null);
  const [lastExportedName, setLastExportedName] = useState<string | null>(null);

  // Backup states
  const [backupFolder, setBackupFolder] = useState<{ id: string; name: string } | null>(() => {
    const id = localStorage.getItem('mp_backup_folder_id');
    const name = localStorage.getItem('mp_backup_folder_name');
    return id && name ? { id, name } : null;
  });

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupFolderUrl, setBackupFolderUrl] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatus, setBackupStatus] = useState<string>('');

  // Storage and Quota states
  const [quota, setQuota] = useState<{ limit: number; usage: number; backupFolderSize: number } | null>(null);
  const [folderFilesCount, setFolderFilesCount] = useState<number>(0);

  // Conflict Resolution states
  const [importConflict, setImportConflict] = useState<{
    fileName: string;
    fileId: string;
    htmlContent: string;
    description: string;
    existingItem: News;
  } | null>(null);

  const [backupConflict, setBackupConflict] = useState<{
    newsMetadata: any;
    newsBody: string;
    settingsMetadata: any;
    settingsBody: string;
    newsFileName: string;
    settingsFileName: string;
    folderId: string;
    existingNewsFileId?: string;
    existingSettingsFileId?: string;
  } | null>(null);

  // Custom Google Drive Image upload destination folder states
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [browsingFolders, setBrowsingFolders] = useState<DriveFile[]>([]);
  const [browsingLoading, setBrowsingLoading] = useState(false);
  const [browsingPath, setBrowsingPath] = useState<{ id: string; name: string }[]>([]);
  const [creatingFolderName, setCreatingFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Simple Image Gallery states
  const [galleryImages, setGalleryImages] = useState<DriveFile[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<DriveFile | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  const fetchBrowsingFolders = async (parentId: string) => {
    if (!googleAccessToken) return;
    setBrowsingLoading(true);
    try {
      const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=name`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBrowsingFolders(data.files || []);
      } else {
        console.error('Failed to fetch browsing folders');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBrowsingLoading(false);
    }
  };

  const handleCreateFolder = async (folderName: string, parentId: string) => {
    if (!folderName.trim() || !googleAccessToken) return;
    setIsCreatingFolder(true);
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        })
      });
      if (res.ok) {
        addToast('नवीन फोल्डर यशस्वीरित्या तयार केले गेले!', 'success');
        setCreatingFolderName('');
        fetchBrowsingFolders(parentId);
      } else {
        addToast('नवीन फोल्डर तयार करण्यात अडचण आली.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('नवीन फोल्डर तयार करताना त्रुटी आली.', 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const saveImageFolderSettings = async (folderId: string, folderName: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminToken || ''
        },
        body: JSON.stringify({
          ...siteSettings,
          googleDriveUploadFolderId: folderId,
          googleDriveUploadFolderName: folderName
        })
      });
      if (!res.ok) throw new Error();
      addToast('इमेज अपलोड डेस्टिनेशन फोल्डर यशस्वीरित्या जतन केले गेले!', 'success');
      onSaveSettings?.();
    } catch (err) {
      console.error(err);
      addToast('सेटिंग्ज जतन करताना त्रुटी आली.', 'error');
    }
  };

  const fetchGalleryImages = async () => {
    if (!googleAccessToken) return;
    setLoadingGallery(true);
    try {
      let folderId = siteSettings?.googleDriveUploadFolderId;
      if (!folderId) {
        // Search default folder
        const folderName = `${siteSettings?.channelName || 'माझापत्र'} अपलोड्स`;
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        )}&fields=files(id,name)`;
        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            folderId = searchData.files[0].id;
          }
        }
      }

      if (folderId) {
        const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
        const filesUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,webContentLink)&orderBy=modifiedTime desc&pageSize=10`;
        const res = await fetch(filesUrl, {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGalleryImages(data.files || []);
        }
      } else {
        setGalleryImages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete || !googleAccessToken) return;
    setIsDeletingImage(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${imageToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      });
      if (res.ok || res.status === 204) {
        addToast('चित्र गुगल ड्राईव्हमधून यशस्वीरित्या डिलीट केले गेले!', 'success');
        setImageToDelete(null);
        fetchGalleryImages();
      } else {
        addToast('चित्र डिलीट करताना अडचण आली.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('चित्र डिलीट करताना तांत्रिक त्रुटी आली.', 'error');
    } finally {
      setIsDeletingImage(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      fetchGalleryImages();
    }
  }, [googleAccessToken, siteSettings?.googleDriveUploadFolderId, siteSettings?.channelName]);

  const fetchFolderFilesAndQuota = async (folderIdToUse?: string) => {
    if (!googleAccessToken) return;
    try {
      // 1. Fetch overall Drive quota
      const quotaRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });
      let limit = 15 * 1024 * 1024 * 1024; // 15 GB default fallback
      let usage = 0;
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        if (quotaData.storageQuota) {
          limit = parseInt(quotaData.storageQuota.limit) || limit;
          usage = parseInt(quotaData.storageQuota.usage) || 0;
        }
      }

      // 2. Identify the backup folder ID
      let folderId = folderIdToUse || backupFolder?.id;
      if (!folderId) {
        const folderName = 'माझापत्र बॅकअप';
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        )}&fields=files(id,name)`;

        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            folderId = searchData.files[0].id;
          }
        }
      }

      let backupFolderSize = 0;
      let count = 0;

      if (folderId) {
        const filesUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folderId}' in parents and trashed=false`
        )}&fields=files(id,name,size,mimeType)`;

        const filesRes = await fetch(filesUrl, {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          count = filesData.files?.length || 0;
          if (filesData.files) {
            for (const f of filesData.files) {
              backupFolderSize += parseInt(f.size || '0');
            }
          }
        }
      }

      setFolderFilesCount(count);
      setQuota({
        limit,
        usage,
        backupFolderSize
      });
    } catch (err) {
      console.error('Failed to fetch folder files and quota:', err);
    }
  };

  const handleManualBackup = async (overrideMode?: 'overwrite' | 'copy') => {
    if (!googleAccessToken) {
      addToast('कृपया प्रथम गुगल ड्राईव्ह कनेक्ट करा.', 'info');
      return;
    }

    setIsBackingUp(true);
    setBackupProgress(5);
    setBackupStatus('बॅकअप प्रक्रिया सुरू करत आहे...');
    setBackupFolderUrl(null);

    try {
      let folderId = backupFolder?.id;
      const folderName = backupFolder?.name || 'माझापत्र बॅकअप';

      setBackupProgress(15);
      setBackupStatus('गुगल ड्राइव्ह फोल्डर तपासत आहे...');

      if (!folderId) {
        // Search query for the folder
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        )}&fields=files(id,name)`;

        const searchRes = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`
          }
        });

        if (!searchRes.ok) {
          throw new Error('गुगल ड्राइव्ह फोल्डर शोधण्यात अपयश आले.');
        }

        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
          setBackupFolder({ id: folderId, name: folderName });
          localStorage.setItem('mp_backup_folder_id', folderId);
          localStorage.setItem('mp_backup_folder_name', folderName);
        } else {
          setBackupStatus('नवीन बॅकअप फोल्डर तयार करत आहे...');
          // Create the folder
          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder'
            })
          });

          if (!createRes.ok) {
            throw new Error('गुगल ड्राइव्हवर बॅकअप फोल्डर तयार करण्यात अपयश आले.');
          }

          const createData = await createRes.json();
          folderId = createData.id;
          setBackupFolder({ id: folderId, name: folderName });
          localStorage.setItem('mp_backup_folder_id', folderId);
          localStorage.setItem('mp_backup_folder_name', folderName);
        }
      }

      setBackupProgress(30);
      setBackupStatus('जुने बॅकअप तपासून विवाद (Conflicts) पाहत आहे...');

      const todayStr = new Date().toISOString().split('T')[0];
      const newsDefaultName = `News_Backup_${todayStr}.json`;
      const settingsDefaultName = `SiteSettings_Backup_${todayStr}.json`;

      if (!overrideMode) {
        // Search for existing file names with today's date
        const checkUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folderId}' in parents and (name='${newsDefaultName}' or name='${settingsDefaultName}') and trashed=false`
        )}&fields=files(id,name)`;

        const checkRes = await fetch(checkUrl, {
          headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const filesFound = checkData.files || [];
          const newsFile = filesFound.find((f: any) => f.name === newsDefaultName);
          const settingsFile = filesFound.find((f: any) => f.name === settingsDefaultName);

          if (newsFile || settingsFile) {
            setBackupProgress(0);
            setIsBackingUp(false);
            setBackupStatus('');
            setBackupConflict({
              newsFileName: newsDefaultName,
              settingsFileName: settingsDefaultName,
              newsMetadata: {
                name: newsDefaultName,
                parents: [folderId],
                mimeType: 'application/json'
              },
              newsBody: JSON.stringify(newsList, null, 2),
              settingsMetadata: {
                name: settingsDefaultName,
                parents: [folderId],
                mimeType: 'application/json'
              },
              settingsBody: JSON.stringify(siteSettings, null, 2),
              folderId,
              existingNewsFileId: newsFile?.id,
              existingSettingsFileId: settingsFile?.id
            });
            addToast('विद्यमान बॅकअप सापडला. कृपया संघर्ष सोडवा.', 'info');
            return;
          }
        }
      }

      let finalNewsName = newsDefaultName;
      let finalSettingsName = settingsDefaultName;

      if (overrideMode === 'copy') {
        const hms = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        finalNewsName = `News_Backup_${todayStr}_${hms}.json`;
        finalSettingsName = `SiteSettings_Backup_${todayStr}_${hms}.json`;
      } else if (overrideMode === 'overwrite') {
        setBackupStatus('जुना बॅकअप साफ करत आहे (Cleaning old duplicate files)...');
        if (backupConflict?.existingNewsFileId) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${backupConflict.existingNewsFileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
          });
        }
        if (backupConflict?.existingSettingsFileId) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${backupConflict.existingSettingsFileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
          });
        }
      }

      setBackupProgress(50);
      setBackupStatus('बातम्यांचा डेटा अपलोड करत आहे (Uploading 1/2 files: News)...');

      const boundary = 'majhapatra_backup_multipart_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const newsMetadata = {
        name: finalNewsName,
        parents: [folderId],
        mimeType: 'application/json'
      };

      const newsBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(newsMetadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(newsList, null, 2) +
        close_delim;

      const newsBackupRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: newsBody
      });

      if (!newsBackupRes.ok) {
        throw new Error('बातम्यांचा (News) बॅकअप अपलोड करण्यात अपयश आले.');
      }

      setBackupProgress(80);
      setBackupStatus('साइट रचना डेटा अपलोड करत आहे (Uploading 2/2 files: Settings)...');

      const settingsMetadata = {
        name: finalSettingsName,
        parents: [folderId],
        mimeType: 'application/json'
      };

      const settingsBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(settingsMetadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(siteSettings, null, 2) +
        close_delim;

      const settingsBackupRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: settingsBody
      });

      if (!settingsBackupRes.ok) {
        throw new Error('साइट रचनेचा (SiteSettings) बॅकअप अपलोड करण्यात अपयश आले.');
      }

      setBackupProgress(100);
      setBackupStatus('बॅकअप प्रक्रिया यशस्वीरित्या पूर्ण झाली!');

      const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      setBackupFolderUrl(folderUrl);
      setBackupConflict(null);
      addToast('गुगल ड्राईव्हवर यशस्वीरित्या बॅकअप जतन केला गेला!', 'success');
      
      // Update usage stats after a tiny delay
      setTimeout(() => {
        fetchFolderFilesAndQuota(folderId);
        setBackupProgress(0);
        setBackupStatus('');
      }, 2500);

    } catch (err: any) {
      console.error('Backup failed:', err);
      addToast(err.message || 'बॅकअप घेताना त्रुटी उद्भवली.', 'error');
      setBackupProgress(0);
      setBackupStatus('');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectBackupFolder = () => {
    if (!googleAccessToken) {
      addToast('कृपया प्रथम गुगल ड्राईव्ह कनेक्ट करा.', 'info');
      return;
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
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setMimeTypes('application/vnd.google-apps.folder')
        .setSelectFolderEnabled(true);

      // @ts-ignore
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(googleAccessToken)
        .setCallback(async (data: any) => {
          // @ts-ignore
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            const folderId = file.id;
            const folderName = file.name;
            setBackupFolder({ id: folderId, name: folderName });
            localStorage.setItem('mp_backup_folder_id', folderId);
            localStorage.setItem('mp_backup_folder_name', folderName);
            addToast(`बॅकअप फोल्डर यशस्वीरित्या सेट झाले: '${folderName}'`, 'success');
            fetchFolderFilesAndQuota(folderId);
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    };

    loadPicker();
  };

  // Fetch Google Docs from Google Drive
  const fetchGoogleDocs = async (search?: string) => {
    if (!googleAccessToken) return;
    try {
      setLoadingFiles(true);
      
      // We only fetch Google Docs to keep the list clean and focused
      let q = "mimeType='application/vnd.google-apps.document' and trashed = false";
      if (search) {
        // Safe string escaping for Drive search query
        const escapedSearch = search.replace(/'/g, "\\'");
        q += ` and name contains '${escapedSearch}'`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          addToast('गुगल ड्राईव्ह सेशन कालबाह्य झाले आहे. कृपया पुन्हा जोडा.', 'error');
          return;
        }
        throw new Error('गुगल ड्राईव्हवरून फाईल्स मिळवण्यात अडचण आली.');
      }
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error('Error fetching Google Docs:', err);
      addToast(err.message || 'फायली लोड करताना त्रुटी आली.', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      fetchGoogleDocs();
      fetchFolderFilesAndQuota();
    }
  }, [googleAccessToken, backupFolder?.id]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      await onGoogleLogin();
      addToast('गुगल ड्राईव्हशी यशस्वीरित्या जोडले गेले!', 'success');
    } catch (err) {
      console.error(err);
      addToast('गुगल ड्राईव्ह अधिकृतता अयशस्वी झाली.', 'error');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Import draft from a selected Google Doc
  const handleImportDoc = async (fileId: string, fileName: string) => {
    setIsImportingId(fileId);
    try {
      // 1. Fetch plain text to generate a clean description
      const textRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });
      
      let description = '';
      if (textRes.ok) {
        const fullText = await textRes.text();
        // Cut short description (first 200 chars)
        description = fullText.slice(0, 180).replace(/\s+/g, ' ').trim();
        if (fullText.length > 180) description += '...';
      }

      // 2. Fetch HTML to load into the Rich Text Editor with rich styles intact
      const htmlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`, {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });
      
      if (!htmlRes.ok) {
        throw new Error('गुगल डॉक मसुदा आयात करण्यात अपयश आले.');
      }
      
      let htmlContent = await htmlRes.text();

      // Simple HTML cleanup for Google Doc boilerplate
      // Extract what's inside the <body> tag to prevent loading full html, head, style headers directly
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        htmlContent = bodyMatch[1];
      }
      
      // Clean up inline styles that might mess up Tailwind typography
      htmlContent = htmlContent.replace(/style="[^"]*"/g, '');

      // Check for conflict (existing news with same title)
      const existingItem = newsList.find(item => item.title.trim().toLowerCase() === fileName.trim().toLowerCase());
      if (existingItem) {
        setImportConflict({
          fileName,
          fileId,
          htmlContent,
          description,
          existingItem
        });
        addToast('या शीर्षकाची बातमी आधीपासून अस्तित्वात आहे. कृपया संघर्ष सोडवा.', 'info');
        return;
      }

      // Trigger callback to set states in AdminPanel and switch view to Publish Form
      onImportDraft(fileName, htmlContent, description);
      addToast(`'${fileName}' यशस्वीरित्या मसुदा म्हणून आयात केले!`, 'success');
    } catch (err: any) {
      console.error('Error importing Doc:', err);
      addToast(err.message || 'मसुदा आयात करताना अडचण आली.', 'error');
    } finally {
      setIsImportingId(null);
    }
  };

  // Export news to Google Drive as a formatted Google Doc
  const handleExportNews = async (newsItem: News) => {
    if (!googleAccessToken) {
      addToast('कृपया प्रथम गुगल ड्राईव्ह कनेक्ट करा.', 'info');
      return;
    }
    
    setIsExportingId(newsItem._id);
    setLastExportedUrl(null);
    setLastExportedName(null);

    try {
      const docTitle = `माझापत्र - ${newsItem.title}`;
      
      // Structure dynamic HTML to send
      const dateStr = newsItem.publishDate || new Date().toISOString();
      const formattedDate = new Date(dateStr).toLocaleDateString('mr-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const docHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${newsItem.title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { color: #e11d48; font-size: 28px; border-bottom: 2px solid #fda4af; padding-bottom: 10px; margin-bottom: 5px; }
            .meta { color: #64748b; font-size: 13px; margin-bottom: 30px; font-weight: bold; }
            .badge { background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1; }
            .content { font-size: 16px; margin-top: 20px; text-align: justify; }
            footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>${newsItem.title}</h1>
          <div class="meta">
            <span class="badge">वर्गवारी: ${newsItem.category}</span> &nbsp;|&nbsp; 
            <strong>लेखक:</strong> ${newsItem.author || 'माझापत्र प्रतिनिधी'} &nbsp;|&nbsp; 
            <strong>प्रसिद्ध वेळ:</strong> ${formattedDate}
          </div>
          <div class="content">
            ${newsItem.content || `<p>${newsItem.description}</p>`}
          </div>
          <footer>
            <p>© माझापत्र मराठी न्यूज नेटवर्क - महाराष्ट्राचे हक्काचे व्यासपीठ</p>
          </footer>
        </body>
        </html>
      `;

      // Construct Multipart Request Body for Google Drive upload with conversion to application/vnd.google-apps.document
      const metadata = {
        name: docTitle,
        mimeType: 'application/vnd.google-apps.document' // Force Conversion to Google Doc
      };

      const boundary = 'majhapatra_drive_export_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
        docHtml +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
      });

      if (!response.ok) {
        throw new Error('गुगल ड्राइव्हवर फाईल तयार करण्यात अपयश आले.');
      }

      const fileData = await response.json();
      const docUrl = `https://docs.google.com/document/d/${fileData.id}/edit`;
      
      setLastExportedUrl(docUrl);
      setLastExportedName(docTitle);
      addToast(`'${newsItem.title}' गुगल ड्राईव्हवर यशस्वीरित्या निर्यात केली!`, 'success');
    } catch (err: any) {
      console.error('Error exporting news:', err);
      addToast(err.message || 'बातमी निर्यात करताना त्रुटी आली.', 'error');
    } finally {
      setIsExportingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-slate-900 animate-fade-in">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-80 h-32 bg-rose-400/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-rose-700/50 border border-rose-400/30 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              Google Workspace Integration
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-special">
              गुगल ड्राईव्ह एकत्रीकरण (Google Drive API)
            </h2>
            <p className="text-rose-100 text-xs sm:text-sm font-medium leading-relaxed">
              पत्रकार आणि संपादकांसाठी सुवर्णसंधी! गुगल ड्राईव्हमधील डॉक्युमेंट्स (Google Docs) थेट बातमी म्हणून आयात करा किंवा प्रसिद्ध झालेल्या बातम्यांचा बॅकअप गुगल डॉक्स स्वरूपात ड्राईव्हवर जतन करा.
            </p>
          </div>
          
          <div className="shrink-0">
            {googleAccessToken ? (
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4.5 py-3 rounded-2xl flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
                <div className="text-left">
                  <p className="text-[10px] text-rose-100 font-bold uppercase tracking-wider">कनेक्ट केलेले खाते</p>
                  <p className="text-sm font-black text-white">गुगल ड्राईव्ह सक्रिय</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAuthorize}
                disabled={isAuthorizing}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-rose-600 font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="h-4.5 w-4.5 text-rose-500" />
                <span>{isAuthorizing ? 'जोडणी होत आहे...' : 'गुगल ड्राईव्हशी जोडा'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Export Alert Box after successful exports */}
      {lastExportedUrl && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex items-start gap-3.5 animate-bounce-short">
          <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-left flex-1">
            <h4 className="text-sm font-black text-emerald-900">यशस्वीरित्या गुगल डॉक तयार केले!</h4>
            <p className="text-xs text-emerald-700 font-bold">बातमी जतन केली: <span className="font-mono text-[11px] font-black text-slate-800">{lastExportedName}</span></p>
            <div className="pt-1.5">
              <a 
                href={lastExportedUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-rose-700 underline"
              >
                <span>नवीन गुगल डॉक उघडा</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Feature Layout */}
      {!googleAccessToken ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-5 max-w-xl mx-auto shadow-xs">
          <div className="bg-rose-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-rose-100">
            <Lock className="h-8 w-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">गुगल ड्राईव्ह ब्लॉक आहे</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              मसुदा आयात करण्यासाठी आणि बातम्या निर्यात करण्यासाठी सुरक्षितपणे आपल्या गुगल अकाउंटद्वारे परवानगी देणे आवश्यक आहे.
            </p>
          </div>
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="gsi-material-button mx-auto shrink-0"
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-sans font-bold">Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Import Drafts (Google Docs) */}
          <div className="lg:col-span-6 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-rose-500" />
                  <span>मसुदा आयात करा (Google Docs)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">गुगल डॉक्स फाईल्स थेट बातमी मसुद्यात रुपांतरित करा</p>
              </div>
              <button
                onClick={() => fetchGoogleDocs()}
                disabled={loadingFiles}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl p-2 cursor-pointer transition disabled:opacity-50"
                title="रिफ्रेश फायली"
              >
                <RefreshCw className={`h-4 w-4 text-slate-500 ${loadingFiles ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="गुगल डॉक फाईलचे नाव शोधा..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchGoogleDocs(e.target.value);
                }}
                className="w-full bg-slate-50/50 border border-slate-200/75 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 font-sans"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Docs List */}
            {loadingFiles ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-40 bg-slate-100 rounded"></div>
                        <div className="h-2 w-20 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-slate-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200/50">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-600">कोणतीही डॉक्युमेंट सापडली नाही</h4>
                  <p className="text-[10px] text-slate-400 font-medium">तुमच्या गुगल ड्राईव्हवर गुगल डॉक्युमेंट्स आहेत का ते तपासा.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1.5 scrollbar-thin">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="group border border-slate-100 hover:border-rose-100 hover:bg-rose-50/10 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-blue-50 text-blue-600 rounded-xl p-2.5 group-hover:bg-rose-50 group-hover:text-rose-600 transition shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 text-left space-y-0.5">
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-rose-700 transition truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 font-sans">
                          <Clock className="h-3 w-3" />
                          <span>संपादित वेळ: {new Date(file.modifiedTime).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportDoc(file.id, file.name)}
                      disabled={isImportingId !== null}
                      className="bg-slate-50 hover:bg-rose-600 text-slate-700 hover:text-white font-extrabold text-xs px-3 py-2 rounded-xl border border-slate-200/60 hover:border-rose-600 transition shrink-0 flex items-center gap-1 hover:shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isImportingId === file.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>आयात</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Export Existing News */}
          <div className="lg:col-span-6 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-50">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 text-left">
                <Database className="h-5 w-5 text-rose-500" />
                <span>बातम्या जतन करा (Export to Drive)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold text-left">पोर्टलवरील कोणतीही बातमी गुगल डॉक म्हणून ड्राईव्हवर सेव्ह करा</p>
            </div>

            {/* List of News available to export */}
            {newsList.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-500">निर्यात करण्यासाठी सध्या बातम्या उपलब्ध नाहीत</h4>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[515px] pr-1.5 scrollbar-thin">
                {newsList.map((item) => (
                  <div 
                    key={item._id} 
                    className="group border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/10 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition"
                  >
                    <div className="min-w-0 text-left space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 border border-slate-200/40 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold font-sans">
                          {new Date(item.publishDate).toLocaleDateString('mr-IN')}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-900 transition line-clamp-2 leading-tight">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleExportNews(item)}
                      disabled={isExportingId !== null}
                      className="bg-slate-50 hover:bg-emerald-600 text-slate-700 hover:text-white font-extrabold text-xs px-3.5 py-2 rounded-xl border border-slate-200/60 hover:border-emerald-600 transition shrink-0 flex items-center gap-1.5 hover:shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isExportingId === item._id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      <span>निर्यात</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Superadmin manual backup section */}
          {userRole === 'superadmin' && (
            <div className="lg:col-span-12 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6 text-left">
              <div className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Database className="h-5 w-5 text-rose-500" />
                    <span>गुगल ड्राईव्ह बॅकअप (Google Drive Backup)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">बातमी (News) आणि साइट रचना (SiteSettings) डेटा सुरक्षितपणे सेव्ह करा</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectBackupFolder}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-600 font-extrabold bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-100 transition cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>बॅकअप फोल्डर निवडा (Picker API)</span>
                  </button>

                  {backupFolderUrl && (
                    <a
                      href={backupFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 transition shrink-0"
                    >
                      <span>📁 बॅकअप फोल्डर उघडा</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress and status indicators */}
              {isBackingUp && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      <span>{backupStatus}</span>
                    </span>
                    <span>{backupProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${backupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Folder quota & Pie chart */}
                <div className="lg:col-span-7 bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
                      <PieIcon className="h-4 w-4 text-rose-500" />
                      <span>ड्राईव्ह स्टोरेज आणि बॅकअप माहिती (Drive Space & Backup)</span>
                    </h4>
                    <span className="bg-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-0.5 rounded-full font-sans">
                      {folderFilesCount} फायली
                    </span>
                  </div>

                  {quota ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      {/* Pie chart */}
                      <div className="h-44 w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'इतर वापर (Other Used)',
                                  value: Math.max(0, quota.usage - quota.backupFolderSize),
                                  color: '#cbd5e1' // slate-300
                                },
                                {
                                  name: 'माझापत्र बॅकअप (Backup Size)',
                                  value: quota.backupFolderSize,
                                  color: '#e11d48' // rose-600
                                },
                                {
                                  name: 'शिल्लक जागा (Free Space)',
                                  value: Math.max(0, quota.limit - quota.usage),
                                  color: '#10b981' // emerald-500
                                }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#94a3b8" />
                              <Cell fill="#f43f5e" />
                              <Cell fill="#10b981" />
                            </Pie>
                            <Tooltip 
                              formatter={(value: any) => {
                                const mb = (value / (1024 * 1024)).toFixed(2);
                                return `${mb} MB`;
                              }}
                              contentStyle={{ fontSize: '11px', borderRadius: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">एकूण जागा</span>
                          <span className="text-xs font-black text-slate-800 font-sans">
                            {(quota.limit / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </span>
                        </div>
                      </div>

                      {/* Legends / statistics details */}
                      <div className="space-y-2.5 text-xs text-slate-600 font-sans font-bold">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-rose-500 shrink-0"></div>
                          <div className="flex-1 text-left">
                            <span className="text-slate-500 text-[10px] block">बॅकअप फोल्डर आकार</span>
                            <span className="text-slate-800 text-xs font-black">
                              {(quota.backupFolderSize / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-[#94a3b8] shrink-0"></div>
                          <div className="flex-1 text-left">
                            <span className="text-slate-500 text-[10px] block">इतर गुगल ड्राईव्ह वापर</span>
                            <span className="text-slate-800 text-xs font-black">
                              {(Math.max(0, quota.usage - quota.backupFolderSize) / (1024 * 1024 * 1024)).toFixed(2)} GB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0"></div>
                          <div className="flex-1 text-left">
                            <span className="text-slate-500 text-[10px] block">एकूण शिल्लक जागा (Free Space)</span>
                            <span className="text-emerald-600 text-xs font-black">
                              {(Math.max(0, quota.limit - quota.usage) / (1024 * 1024 * 1024)).toFixed(2)} GB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">
                      स्टोरेज माहिती लोड करत आहे...
                    </div>
                  )}
                </div>

                {/* Right side: Actions details & triggering buttons */}
                <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 border border-slate-200/80 rounded-2xl bg-white space-y-4">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-slate-700">सक्रिय बॅकअप फोल्डर (Active Folder):</h4>
                    <div className="bg-rose-50/40 border border-rose-100/50 rounded-xl px-3.5 py-3 text-xs flex items-center gap-2 text-rose-800 font-extrabold">
                      <FolderOpen className="h-5 w-5 text-rose-500 shrink-0" />
                      <div className="min-w-0 text-left">
                        <span className="text-[10px] text-rose-500 block uppercase font-bold">गुगल ड्राईव्ह मार्ग</span>
                        <span className="truncate block font-black text-slate-800">
                          {backupFolder ? backupFolder.name : 'माझापत्र बॅकअप (Default Folder)'}
                        </span>
                      </div>
                    </div>

                    <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4 font-bold leading-relaxed">
                      <li>यात बातमी यादी (News List) मसुद्यांसह JSON मध्ये सुरक्षित होते.</li>
                      <li>यामध्ये लोगो, थीम रंगांची साइट रचना (SiteSettings) समाविष्ट असेल.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleManualBackup()}
                      disabled={isBackingUp}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-xs hover:shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isBackingUp ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>बॅकअप सुरू आहे...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4.5 w-4.5" />
                          <span>मॅन्युअल बॅकअप सुरू करा</span>
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-slate-400 font-medium text-center mt-2.5">
                      जुने बॅकअप सुरक्षित ठेवून आजच्या तारखेची नवीन सुरक्षित फाईल गुगल ड्राइव्हवर बनवली जाईल.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IMAGE FOLDER CONFIGURATION & GALLERY (ADMIN PANEL) */}
          {userRole === 'superadmin' && (
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {/* Folder Configuration Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="pb-3 border-b border-slate-50">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-rose-500" />
                    <span>चित्रांसाठी गुगल ड्राईव्ह फोल्डर (News Image Upload Folder)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">नवीन बातम्यांची चित्रे गुगल ड्राईव्हमध्ये कुठे सेव्ह करायची ते ठरवा</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="bg-rose-50 text-rose-600 rounded-xl p-2 shrink-0 border border-rose-100">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">सध्या निवडलेले फोल्डर</span>
                        <span className="text-sm font-black text-slate-800 truncate block">
                          {siteSettings?.googleDriveUploadFolderName || `${siteSettings?.channelName || 'माझापत्र'} अपलोड्स (Default)`}
                        </span>
                        {siteSettings?.googleDriveUploadFolderId && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                            ID: {siteSettings.googleDriveUploadFolderId}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBrowsingPath([{ id: 'root', name: 'माझा ड्राईव्ह (My Drive)' }]);
                        fetchBrowsingFolders('root');
                        setShowFolderBrowser(true);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                      <span>नवीन फोल्डर निवडा / तयार करा</span>
                    </button>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100/70 rounded-2xl p-4 text-[11px] text-amber-800 font-bold leading-relaxed space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      टीप (Note):
                    </p>
                    <p>गुगल ड्राईव्ह फोल्डर निवडल्यास, थेट अपलोड केलेली चित्रे आपोआप त्या फोल्डरमध्ये जतन केली जातील व बातमी वाचकांना वेबसाईटवर योग्य प्रकारे दिसण्यासाठी त्यांना public ("anyone with reader") परवानग्या दिल्या जातील.</p>
                  </div>
                </div>
              </div>

              {/* Simple Image Gallery Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-rose-500" />
                        <span>अपलोड केलेली चित्रे (Uploaded Gallery)</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold">या फोल्डरमध्ये नुकतीच सेव्ह झालेली शेवटची १० चित्रे</p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchGalleryImages}
                      disabled={loadingGallery}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl p-2 cursor-pointer transition"
                      title="गॅलरी रिफ्रेश करा"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loadingGallery ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingGallery ? (
                    <div className="grid grid-cols-5 gap-2.5 py-6">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="aspect-square bg-slate-100 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : galleryImages.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <FolderOpen className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">या फोल्डरमध्ये कोणतीही चित्रे आढळली नाहीत.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-4">
                      {galleryImages.map((img) => (
                        <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-150 bg-slate-50 hover:shadow-md transition">
                          <img
                            src={`https://lh3.googleusercontent.com/d/${img.id}`}
                            alt={img.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${img.id}&sz=w200`;
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition duration-250 flex flex-col justify-between p-2">
                            <span className="text-[9px] font-bold text-white truncate w-full" title={img.name}>
                              {img.name.substring(img.name.indexOf('_') + 1 || 0)}
                            </span>

                            <div className="flex justify-center gap-1.5">
                              <a
                                href={`https://drive.google.com/file/d/${img.id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-lg p-1.5 transition"
                                title="ड्राईव्हमध्ये उघडा"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://lh3.googleusercontent.com/d/${img.id}`);
                                  addToast('चित्र लिंक कॉपी झाली!', 'success');
                                }}
                                className="bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-lg p-1.5 transition cursor-pointer"
                                title="लिंक कॉपी करा"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setImageToDelete(img)}
                                className="bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-lg p-1.5 transition cursor-pointer"
                                title="डिलीट करा"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Folder Browser Modal overlay */}
          {showFolderBrowser && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-slide-up space-y-4">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <FolderOpen className="h-4.5 w-4.5 text-rose-500" />
                      <span>चित्रांसाठी गुगल ड्राईव्ह फोल्डर निवडा</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold">फोल्डर निवडून 'हे फोल्डर निवडा' बटन दाबा</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFolderBrowser(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-black p-1.5 hover:bg-slate-100 rounded-lg transition"
                  >
                    बंद करा
                  </button>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {browsingPath.map((node, index) => (
                    <React.Fragment key={node.id}>
                      {index > 0 && <span className="text-slate-350">/</span>}
                      <button
                        type="button"
                        onClick={() => {
                          const newPath = browsingPath.slice(0, index + 1);
                          setBrowsingPath(newPath);
                          fetchBrowsingFolders(node.id);
                        }}
                        className={`hover:text-rose-600 transition truncate max-w-[120px] ${
                          index === browsingPath.length - 1 ? 'text-rose-600 font-extrabold' : ''
                        }`}
                      >
                        {node.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Create New Folder Inline Input */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl p-2">
                  <input
                    type="text"
                    placeholder="नवीन फोल्डरचे नाव लिहा..."
                    value={creatingFolderName}
                    onChange={(e) => setCreatingFolderName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden font-sans"
                  />
                  <button
                    type="button"
                    disabled={isCreatingFolder || !creatingFolderName.trim()}
                    onClick={() => {
                      const currentFolder = browsingPath[browsingPath.length - 1];
                      handleCreateFolder(creatingFolderName, currentFolder.id);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-extrabold px-3 py-2 rounded-lg transition shrink-0"
                  >
                    {isCreatingFolder ? 'तयार होत आहे...' : 'फोल्डर बनवा'}
                  </button>
                </div>

                {/* Folder List Content */}
                <div className="flex-1 overflow-y-auto min-h-[220px] space-y-2 pr-1.5 scrollbar-thin">
                  {browsingLoading ? (
                    <div className="space-y-2 py-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-10 bg-slate-50 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : browsingFolders.length === 0 ? (
                    <div className="text-center py-10 space-y-1">
                      <FolderOpen className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-bold">यात उप-फोल्डर आढळले नाहीत.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {browsingFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/10 transition cursor-pointer"
                          onClick={() => {
                            setBrowsingPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
                            fetchBrowsingFolders(folder.id);
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 text-left">
                            <FolderOpen className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                            <span className="text-xs font-black text-slate-700 truncate">{folder.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">उघडा</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setShowFolderBrowser(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentFolder = browsingPath[browsingPath.length - 1];
                      saveImageFolderSettings(currentFolder.id, currentFolder.name);
                      setShowFolderBrowser(false);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition"
                  >
                    हे फोल्डर निवडा
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Image Delete Confirmation Dialog overlay */}
          {imageToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-up space-y-5 text-center">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-rose-100">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900">
                    चित्र गुगल ड्राईव्हमधून डिलीट करायचे का?
                  </h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-bold">
                    तुम्हाला खात्री आहे का की तुम्ही "{imageToDelete.name.substring(imageToDelete.name.indexOf('_') + 1 || 0)}" हे चित्र डिलीट करू इच्छिता? ही क्रिया परत घेतली जाऊ शकत नाही.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setImageToDelete(null)}
                    disabled={isDeletingImage}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingImage}
                    onClick={handleDeleteImage}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDeletingImage ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>डिलीट करा</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import Conflict Resolution Dialog overlay */}
          {importConflict && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-slide-up space-y-5">
                <div className="flex items-start space-x-3.5">
                  <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl shrink-0 border border-amber-100">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1 text-left">
                    <h3 className="text-sm font-black text-slate-900 font-sans">
                      बातमी आधीपासून अस्तित्वात आहे! (Duplicate Title)
                    </h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-bold">
                      गुगल डॉक मधील <span className="text-rose-600 font-black">"{importConflict.fileName}"</span> या नावाचा मसुदा/बातमी आधीपासूनच वेबसाईटवर अस्तित्वात आहे. कृपया खालीलपैकी एक पर्याय निवडा:
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      // Create New Draft (Appends COPY)
                      const copyTitle = `${importConflict.fileName} (नवीन प्रत)`;
                      onImportDraft(copyTitle, importConflict.htmlContent, importConflict.description);
                      setImportConflict(null);
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs py-3 px-4 rounded-xl border border-emerald-100 transition cursor-pointer text-left flex items-center gap-2.5"
                  >
                    <span className="bg-emerald-200 text-emerald-900 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shrink-0">१</span>
                    <span>नवीन मसुदा म्हणून आयात करा (नवीन प्रत बनवा)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Overwrite / Edit Existing
                      onImportDraft(
                        importConflict.fileName,
                        importConflict.htmlContent,
                        importConflict.description,
                        importConflict.existingItem._id,
                        importConflict.existingItem
                      );
                      setImportConflict(null);
                    }}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs py-3 px-4 rounded-xl border border-amber-100 transition cursor-pointer text-left flex items-center gap-2.5"
                  >
                    <span className="bg-amber-200 text-amber-900 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shrink-0">२</span>
                    <span>विद्यमान बातमी बदला (Overwrite & Edit Mode)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportConflict(null)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-200 transition cursor-pointer text-center"
                  >
                    रद्द करा (Cancel Import)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backup Conflict Resolution Dialog overlay */}
          {backupConflict && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" style={{ margin: 0 }}>
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-slide-up space-y-5">
                <div className="flex items-start space-x-3.5">
                  <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl shrink-0 border border-amber-100">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1 text-left">
                    <h3 className="text-sm font-black text-slate-900 font-sans">
                      आजचा बॅकअप आधीपासून अस्तित्वात आहे!
                    </h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-bold">
                      या बॅकअप फोल्डरमध्ये आजच्या तारखेचा (<span className="text-slate-800 font-black">{new Date().toLocaleDateString('mr-IN')}</span>) बॅकअप आधीपासून जतन केलेला आहे. तुम्ही काय करू इच्छिता?
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleManualBackup('overwrite');
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs py-3 px-4 rounded-xl border border-rose-100 transition cursor-pointer text-left flex items-center gap-2.5"
                  >
                    <span className="bg-rose-200 text-rose-900 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shrink-0">१</span>
                    <span>जुना बॅकअप नवीन फाईलने बदला (Overwrite/Replace)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleManualBackup('copy');
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs py-3 px-4 rounded-xl border border-emerald-100 transition cursor-pointer text-left flex items-center gap-2.5"
                  >
                    <span className="bg-emerald-200 text-emerald-900 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shrink-0">२</span>
                    <span>नवीन वेगळी प्रत तयार करा (Keep Both File Copies)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackupConflict(null)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-200 transition cursor-pointer text-center"
                  >
                    रद्द करा (Cancel Backup)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
