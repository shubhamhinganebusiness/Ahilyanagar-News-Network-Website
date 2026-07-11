import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { PortalDatabase } from './server/db';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function bootstrap() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Trust proxy for secure cookies/headers when behind standard load balancers/proxies
  app.set('trust proxy', true);

  // Initialize and seed database (created first, but initialized asynchronously after server is listening)
  const db = new PortalDatabase();

  // Basic parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Create required directories and set proper permissions (to solve cPanel/Hostinger permissions errors)
  // We create both uppercase and lowercase variations to guarantee support for any deployment folder case
  const foldersToCreate = [
    'public/uploads',
    'public/Uploads',
    'public/Images',
    'public/images',
    'dist/uploads',
    'dist/Uploads',
    'dist/Images',
    'dist/images',
    'Images',
    'images',
    'uploads',
    'Uploads',
    'data'
  ];
  for (const folder of foldersToCreate) {
    const fullPath = path.join(process.cwd(), folder);
    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      // Explicitly set directory permissions to 755 to ensure hosting servers allow file-writing
      try {
        fs.chmodSync(fullPath, 0o755);
      } catch (chmodErr) {
        // Safe to ignore if unsupported on local OS/environment
      }
    } catch (dirErr) {
      console.warn(`Could not setup directory ${folder} on server startup:`, dirErr);
    }
  }

  const uploadDir = path.join(process.cwd(), 'public/uploads');

  // Highly robust helper to find files case-insensitively on disk in multiple folders
  const findFileCaseInsensitive = (parentDirs: string[], subDirs: string[], targetFilename: string): string | null => {
    const getCaseVariants = (str: string): string[] => {
      const s = str.trim();
      if (!s) return [];
      const lower = s.toLowerCase();
      const upper = s.toUpperCase();
      const capitalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      return Array.from(new Set([s, lower, upper, capitalized]));
    };

    const targetLower = targetFilename.toLowerCase();

    for (const parent of parentDirs) {
      for (const sub of subDirs) {
        const subVariants = getCaseVariants(sub);
        for (const subVariant of subVariants) {
          const folderPath = parent === '.' ? path.join(process.cwd(), subVariant) : path.join(process.cwd(), parent, subVariant);
          if (fs.existsSync(folderPath)) {
            try {
              const files = fs.readdirSync(folderPath);
              const match = files.find(f => f.toLowerCase() === targetLower);
              if (match) {
                return path.join(folderPath, match);
              }
            } catch (err) {
              // Ignore directory read issues
            }
          }
        }
      }
    }
    return null;
  };

  // Serve static uploads with persistent fallback to Firestore and case-flexible directory searching
  const serveUpload = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const filename = req.params.filename;
    
    // Check if file exists case-insensitively on disk first
    const diskPath = findFileCaseInsensitive(['public', 'dist', '.'], ['uploads', 'Uploads'], filename);
    if (diskPath) {
      return res.sendFile(diskPath, (err) => {
        if (err && !res.headersSent) {
          next();
        }
      });
    }

    // Not on disk - try loading from Firestore persistent backup
    try {
      const backup = await db.getUpload(filename);
      if (backup && backup.data) {
        // Recover the file and cache it locally
        let base64Data = backup.data;
        const base64Marker = ';base64,';
        const markerIndex = backup.data.indexOf(base64Marker);
        if (markerIndex !== -1) {
          base64Data = backup.data.substring(markerIndex + base64Marker.length);
        }
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Write to both uppercase and lowercase paths to be extremely redundant
        const targetFolders = [
          path.join(process.cwd(), 'public/uploads'),
          path.join(process.cwd(), 'public/Uploads'),
          path.join(process.cwd(), 'dist/uploads'),
          path.join(process.cwd(), 'dist/Uploads'),
          path.join(process.cwd(), 'uploads'),
          path.join(process.cwd(), 'Uploads')
        ];

        for (const folder of targetFolders) {
          try {
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            await fs.promises.writeFile(path.join(folder, filename), buffer);
          } catch (writeErr) {
            // Ignore (filesystem may be read-only)
          }
        }

        console.log(`Successfully recovered ${filename} from database backup.`);
        return res.contentType(backup.contentType || 'image/jpeg').send(buffer);
      }
    } catch (err) {
      console.error(`Failed to recover upload ${filename} from Firestore:`, err);
    }

    next();
  };

  app.get('/uploads/:filename', serveUpload);
  app.get('/Uploads/:filename', serveUpload);

  // Serve static Images with persistent fallback to Firestore and case-flexible directory searching
  const serveImage = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const filename = req.params.filename;

    // Check if file exists case-insensitively on disk first
    const diskPath = findFileCaseInsensitive(['public', 'dist', '.'], ['Images', 'images'], filename);
    if (diskPath) {
      return res.sendFile(diskPath, (err) => {
        if (err && !res.headersSent) {
          next();
        }
      });
    }

    // Not on disk - try loading from Firestore persistent backup
    try {
      const backup = await db.getUpload(filename);
      if (backup && backup.data) {
        // Recover the file and cache it locally
        let base64Data = backup.data;
        const base64Marker = ';base64,';
        const markerIndex = backup.data.indexOf(base64Marker);
        if (markerIndex !== -1) {
          base64Data = backup.data.substring(markerIndex + base64Marker.length);
        }
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Write to both uppercase and lowercase paths to be extremely redundant
        const targetFolders = [
          path.join(process.cwd(), 'public/Images'),
          path.join(process.cwd(), 'public/images'),
          path.join(process.cwd(), 'dist/Images'),
          path.join(process.cwd(), 'dist/images'),
          path.join(process.cwd(), 'Images'),
          path.join(process.cwd(), 'images')
        ];

        for (const folder of targetFolders) {
          try {
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            await fs.promises.writeFile(path.join(folder, filename), buffer);
          } catch (writeErr) {
            // Ignore (filesystem may be read-only)
          }
        }

        console.log(`Successfully recovered image ${filename} from database backup.`);
        return res.contentType(backup.contentType || 'image/jpeg').send(buffer);
      }
    } catch (err) {
      console.error(`Failed to recover image ${filename} from Firestore:`, err);
    }

    next();
  };

  app.get('/Images/:filename', serveImage);
  app.get('/images/:filename', serveImage);

  // Static assets serving with absolute support for both uppercase and lowercase directories
  const staticParents = ['public', 'dist', '.'];
  const uploadPaths = ['uploads', 'Uploads'];
  const imagePaths = ['Images', 'images'];

  for (const parent of staticParents) {
    for (const sub of uploadPaths) {
      app.use('/uploads', express.static(path.join(process.cwd(), parent, sub)));
      app.use('/Uploads', express.static(path.join(process.cwd(), parent, sub)));
    }
    for (const sub of imagePaths) {
      app.use('/Images', express.static(path.join(process.cwd(), parent, sub)));
      app.use('/images', express.static(path.join(process.cwd(), parent, sub)));
    }
  }

  // Enriched Auth Middleware that supports Super Admin AND Database Authors
  async function checkAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'अनधिकृत प्रवेश. लॉगिन आवश्यक आहे.' });
    }

    const [type, credentials] = authHeader.split(' ');
    if (type === 'Basic' && credentials) {
      try {
        const decoded = Buffer.from(credentials, 'base64').toString('ascii');
        const [user, pass] = decoded.split(':');
        
        // 1. Check if Super Admin
        if ((user === 'admin' && pass === 'marathi@123') || (user === '7719959593' && (pass === 'Shubham@9421@7719@0808' || pass === 'shubham@9421@7719@0808'))) {
          (req as any).user = {
            role: 'superadmin',
            username: user,
            name: 'Super Admin',
            email: 'shubhamhinganebusiness@gmail.com'
          };
          return next();
        }

        // Google Super Admin Verified Session Check
        if (user === 'google_admin' && pass === 'google_secret_verified_token_abc123') {
          (req as any).user = {
            role: 'superadmin',
            username: 'admin',
            name: 'Super Admin',
            email: 'shubhamhinganebusiness@gmail.com'
          };
          return next();
        }

        // 2. Check if valid Author in database
        const author = await db.getAuthorByUsername(user);
        if (author && author.password === pass) {
          (req as any).user = {
            role: 'author',
            username: author.username,
            name: author.name,
            email: author.email || `${author.username}@majhapatra.com`
          };
          return next();
        }
      } catch (err) {
        // Fallback or ignore parse errors
      }
    }

    return res.status(401).json({ error: 'वापरकर्ता नाव किंवा पासवर्ड चुकीचा आहे.' });
  }

  // Super Admin Only access enforcement middleware
  function superAdminOnly(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = (req as any).user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'हा बदल करण्याचा अधिकार केवळ मुख्य व्यवस्थापकाला (Super Admin) आहे.' });
    }
    next();
  }

  // Backward compatibility alias
  const adminAuth = checkAuth;

  // Backwards compatibility redirect for admin.html
  app.get('/admin.html', (req, res) => {
    res.redirect('/?page=admin');
  });

  // REST API Endpoints

  // 0. POST /api/news/generate-draft -> generate structured auto-draft with HTML and fields via Gemini (admin only)
  app.post('/api/news/generate-draft', adminAuth, async (req, res) => {
    try {
      const { topic, keyPoints, categorySuggestion } = req.body;

      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: 'मजकूर / मुख्य विषय असणे आवश्यक आहे.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API की सर्व्हरवर उपलब्ध नाही. कृपया Settings > Secrets तपासा.' });
      }

      const promptText = `Generate a complete, ready-to-publish news article about the topic: "${topic}".
Key points to cover if provided: "${keyPoints || "none specified"}".
Target category suggestion: "${categorySuggestion || "not specified"}".

Follow these rules strictly:
1. Article Structure (use semantic HTML5 tags inside the 'rawHtml' field):
   - <h1>: Headline (attention-grabbing, SEO-friendly, written in elegant Marathi)
   - <div class="meta">: Publication date (today's date (${new Date().toLocaleDateString('mr-IN', {day: 'numeric', month: 'long', year: 'numeric'})})), author ("AI News Desk"), category
   - <figure>: Paragraph image block using a category-appropriate Unsplash image from this list:
     - 'राष्ट्रीय': 'https://images.unsplash.com/photo-1532375811453-90d115c614be?auto=format&fit=crop&w=1200&q=80'
     - 'राज्य': 'https://images.unsplash.com/photo-1566847438217-76e82d383f84?auto=format&fit=crop&w=1200&q=80'
     - 'शहर': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80'
     - 'क्रीडा': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80'
     - 'मनोरंजन': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
     - 'अर्थव्यवस्था': 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80'
     - Fallback: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'
     Place the image inside <img src="..." alt="Alt Text" class="rounded-xl w-full max-h-[400px] object-cover">
     Add <figcaption> below with descriptive caption in Marathi.
   - <article>: Body text in Marathi divided into <p> paragraphs, with one <h2> subheading halfway.
   - <blockquote>: One relevant expert or witness quote (realistic but fictional, written in elegant Marathi).
   - <ul> or <ol>: At least one list in Marathi (e.g., key facts or highlights/takeaways).
   - <div class="tags">: Comma-separated topic tags (at least 3 tags, each prefixed with #).
   - Add inline CSS inside a <style> block for elegant, clean, high-contrast formatting (fonts: sans-serif, max-width: 100%, responsive, accent colors matching rose/slate layout).

2. Content Guidelines:
   - Language: Professional Marathi (मराठी).
   - Tone: Neutral, factual, and professional (like Reuters or AP).
   - Length: 400-600 words.
   - Include an appropriate Marathi dateline (e.g., "मुंबई — " or "नवी दिल्ली — " or "पुणे — ") based on the topic, in the first paragraph.
   - Return pure JSON matching the responseSchema.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Attention-grabbing headlines in Marathi suitable for a Marathi news portal.' },
              category: { type: Type.STRING, description: 'One of: "राष्ट्रीय", "राज्य", "शहर", "क्रीडा", "मनोरंजन", "अर्थव्यवस्था" depending on the topic.' },
              description: { type: Type.STRING, description: 'Brief click-worthy description in Marathi (approx 100-150 characters).' },
              plainTextContent: { type: Type.STRING, description: 'Detailed Marathi news paragraph text (at least 4-5 paragraphs) separated by simple double newlines, NO HTML or Markdown, strictly plaintext Marathi.' },
              rawHtml: { type: Type.STRING, description: 'Complete ready-to-publish news article in pure HTML format with NO markdown wrapper. Has Headline <h1>, meta info, figure, article body, blockquote, takeaways list, and tags.' }
            },
            required: ['title', 'category', 'description', 'plainTextContent', 'rawHtml']
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error('नो रिस्पॉन्स डेटा.');
      }
      
      const parsedDraft = JSON.parse(textOutput.trim());
      
      // Select appropriate Unsplash cover image based on selected category to ensure high quality cover
      const imageMap: Record<string, string> = {
        'राष्ट्रीय': 'https://images.unsplash.com/photo-1532375811453-90d115c614be?auto=format&fit=crop&w=1200&q=80',
        'राज्य': 'https://images.unsplash.com/photo-1566847438217-76e82d383f84?auto=format&fit=crop&w=1200&q=80',
        'शहर': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
        'क्रीडा': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
        'मनोरंजन': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
        'अर्थव्यवस्था': 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80'
      };
      
      const category = parsedDraft.category || 'राज्य';
      parsedDraft.imageURL = imageMap[category] || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';

      res.json(parsedDraft);
    } catch (err: any) {
      console.error('Gemini Draft generation error:', err);
      res.status(500).json({ error: 'AI च्या साहाय्याने बातमी तयार करताना एरर आला: ' + err.message });
    }
  });

  // Image proxy to convert Google Drive URLs to direct raw image streams (crucial for WhatsApp/crawler previews)
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const urlParam = req.query.url as string;
      if (!urlParam) {
        return res.status(400).send('No image URL specified.');
      }

      const trimmed = urlParam.trim();
      let targetUrl = trimmed;

      // Extract Google Drive ID if it's a Drive link
      const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const ucMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const id = (fileDMatch && fileDMatch[1]) || (ucMatch && ucMatch[1]);

      if (id) {
        // Fetch raw file content using direct download API
        targetUrl = `https://docs.google.com/uc?export=download&id=${id}`;
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image from remote source, status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err: any) {
      console.error('Image proxy error:', err);
      // Fallback to a default unsplash image
      try {
        const fallbackRes = await fetch('https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80');
        const arrayBuffer = await fallbackRes.arrayBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(Buffer.from(arrayBuffer));
      } catch (fbErr) {
        return res.status(500).send('Failed to serve image');
      }
    }
  });

  // Dynamic server-side TTS proxy to serve clean Marathi TTS audio without iframe/CORS issues
  app.get('/api/tts', async (req, res) => {
    try {
      const text = req.query.text as string;
      if (!text || !text.trim()) {
        return res.status(400).send('No text specified.');
      }

      const speed = req.query.speed as string || '1';
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.trim())}&tl=mr&client=tw-ob&ttsspeed=${speed}`;

      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });

      if (!response.ok) {
        throw new Error(`Google TTS failed with status: ${response.status}`);
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err: any) {
      console.error('TTS proxy error:', err);
      return res.status(500).send('Failed to play audio.');
    }
  });

  // Dynamic XML Sitemap for SEO search indexing
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const host = req.get('host') || 'ahilyanagarnewsnetwork.in';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;

      // Get all non-hidden articles to index
      const articles = await db.getAll(undefined, undefined, false);
      
      const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // 1. Homepage
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';

      // 2. Category Pages
      for (const cat of categories) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/?category=${encodeURIComponent(cat)}</loc>\n`;
        xml += '    <changefreq>daily</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }

      // 3. Dynamic Article Detail Pages
      for (const article of articles) {
        const dateStr = article.publishDate || new Date().toISOString();
        let formattedDate = dateStr;
        
        // Ensure valid ISO date for sitemap
        try {
          if (!isNaN(Date.parse(dateStr))) {
            formattedDate = new Date(dateStr).toISOString().split('T')[0];
          } else {
            formattedDate = new Date().toISOString().split('T')[0];
          }
        } catch {
          formattedDate = new Date().toISOString().split('T')[0];
        }

        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/?article=${article._id}</loc>\n`;
        xml += `    <lastmod>${formattedDate}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }

      xml += '</urlset>\n';

      res.header('Content-Type', 'application/xml');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('Sitemap generation error:', err);
      return res.status(500).send('Error generating sitemap');
    }
  });

  // 1. GET /api/news -> get all news (latest first) or filter by category/search
  app.get('/api/news', async (req, res) => {
    try {
      const category = req.query.category as string;
      const search = req.query.search as string;
      const includeHidden = req.query.includeHidden === 'true';
      
      let authorUsernameFilter: string | undefined;

      // Filter by author if user is authenticated as an Author
      if (includeHidden) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const [type, credentials] = authHeader.split(' ');
          if (type === 'Basic' && credentials) {
            try {
              const decoded = Buffer.from(credentials, 'base64').toString('ascii');
              const [user, pass] = decoded.split(':');
              
              if ((user === 'admin' && pass === 'marathi@123') || (user === '7719959593' && (pass === 'Shubham@9421@7719@0808' || pass === 'shubham@9421@7719@0808'))) {
                // Super admin sees all news
              } else {
                const author = await db.getAuthorByUsername(user);
                if (author && author.password === pass) {
                  authorUsernameFilter = author.username;
                }
              }
            } catch (authErr) {
              // Ignore decoding bugs and keep filter blank
            }
          }
        }
      }

      const articles = await db.getAll(category, search, includeHidden, authorUsernameFilter);
      if (!includeHidden) {
        db.recordVisit().catch(() => {});
      }
      res.json(articles);
    } catch (err: any) {
      console.error('API Error /news:', err);
      res.status(500).json({ error: 'बातम्या मिळवण्यात सर्व्हर त्रुटी आली.' });
    }
  });

  // 2. GET /api/news/:id -> get single news & increment views count
  app.get('/api/news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const article = await db.getById(id);
      
      if (!article) {
        return res.status(404).json({ error: 'दिलेली बातमी सापडली नाही.' });
      }
      
      db.recordVisit().catch(() => {});
      res.json(article);
    } catch (err: any) {
      console.error('API Error /news/:id:', err);
      res.status(500).json({ error: 'बातमी मिळवण्यात सर्व्हर त्रुटी आली.' });
    }
  });

  // GET /api/analytics -> get traffic analytics (admin only)
  app.get('/api/analytics', adminAuth, async (req, res) => {
    try {
      const data = await db.getAnalytics();
      res.json(data);
    } catch (err) {
      console.error('API Error GET /api/analytics:', err);
      res.status(500).json({ error: 'अॅनालिटिक्स डेटा मिळवताना त्रुटी आली.' });
    }
  });

  // GET /api/logs -> get administrative action logs (admin only)
  app.get('/api/logs', adminAuth, async (req, res) => {
    try {
      const data = await db.getLogs();
      res.json(data);
    } catch (err) {
      console.error('API Error GET /api/logs:', err);
      res.status(500).json({ error: 'कृती नोंदी मिळवताना त्रुटी आली.' });
    }
  });

  // POST /api/logs -> create administrative action log (admin only)
  app.post('/api/logs', adminAuth, async (req, res) => {
    try {
      const { action, details } = req.body;
      if (!action || !details) {
        return res.status(400).json({ error: 'कृती आणि तपशील आवश्यक आहेत.' });
      }
      const userEmail = (req as any).user?.email || 'shubhamhinganebusiness@gmail.com';
      const log = await db.createLog(action, details, userEmail);
      res.status(201).json(log);
    } catch (err: any) {
      console.error('API Error POST /api/logs:', err);
      res.status(500).json({ error: 'कृती नोंद जतन करताना त्रुटी आली.' });
    }
  });

  // 3. POST /api/news -> add new news (admin only)
  app.post('/api/news', adminAuth, async (req, res) => {
    try {
      const { title, category, description, content, imageURL, author, videoURL, tags, hidden, scheduledPublishDate } = req.body;

      if (!title || !category || !description || !content || !imageURL || !author) {
        return res.status(400).json({ error: 'कृपया सर्व आवश्यक फॉर्म फील्ड्स पूर्ण करा.' });
      }

      const validCategories = ['राष्ट्रीय', 'राज्य', 'शहर', 'क्रीडा', 'मनोरंजन', 'अर्थव्यवस्था'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'अवैध श्रेणी निवडली आहे.' });
      }

      const calculatedSlug = title.toLowerCase()
        .replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'news';

      const user = (req as any).user;
      const authorUsername = user.role === 'superadmin' ? (req.body.authorUsername || 'admin') : user.username;

      const newArticle = await db.create({
        title,
        slug: calculatedSlug,
        category,
        description,
        content,
        imageURL,
        author,
        videoURL: videoURL || '',
        tags: Array.isArray(tags) ? tags : [],
        hidden: !!hidden,
        authorUsername,
        scheduledPublishDate: scheduledPublishDate || '',
      });

      const userEmail = (req as any).user?.email || 'shubhamhinganebusiness@gmail.com';
      await db.createLog('नवीन बातमी प्रसिद्ध केली', `शीर्षक: "${newArticle.title}" (श्रेणी: ${newArticle.category})`, userEmail).catch(console.error);

      res.status(201).json(newArticle);
    } catch (err: any) {
      console.error('API Error POST /news:', err);
      res.status(500).json({ error: 'नवीन बातमी प्रकाशित करताना सर्व्हर त्रुटी आली.' });
    }
  });

  // PUT /api/news/:id -> edit news (admin only)
  app.put('/api/news/:id', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, description, content, imageURL, author, videoURL, tags, hidden, scheduledPublishDate } = req.body;

      if (!title || !category || !description || !content || !imageURL || !author) {
        return res.status(400).json({ error: 'कृपया सर्व आवश्यक फॉर्म फील्ड्स पूर्ण करा.' });
      }

      const validCategories = ['राष्ट्रीय', 'राज्य', 'शहर', 'क्रीडा', 'मनोरंजन', 'अर्थव्यवस्था'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'अवैध श्रेणी निवडली आहे.' });
      }

      // Author ownership validation
      const existingArticle = await db.getById(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'दिलेली बातमी सापडली नाही.' });
      }

      const user = (req as any).user;
      if (user.role === 'author' && existingArticle.authorUsername !== user.username) {
        return res.status(403).json({ error: 'तुम्हाला केवळ स्वतःच्या बातम्या बदलण्याचा अधिकार आहे.' });
      }

      const updateData: any = {
        title,
        category,
        description,
        content,
        imageURL,
        author,
        videoURL: videoURL || '',
        tags: Array.isArray(tags) ? tags : [],
        scheduledPublishDate: scheduledPublishDate || '',
      };
      if (hidden !== undefined) {
        updateData.hidden = !!hidden;
      }

      const updatedArticle = await db.update(id, updateData);

      const userEmail = (req as any).user?.email || 'shubhamhinganebusiness@gmail.com';
      await db.createLog('बातमी सुधारित केली', `शीर्षक: "${updatedArticle?.title}" (श्रेणी: ${updatedArticle?.category})`, userEmail).catch(console.error);

      res.json(updatedArticle);
    } catch (err: any) {
      console.error('API Error PUT /news/:id:', err);
      res.status(500).json({ error: 'बातमी बदलताना सर्व्हर त्रुटी आली.' });
    }
  });

  // 3.5 PATCH /api/news/:id/toggle-visibility -> toggle news visibility (admin only)
  app.patch('/api/news/:id/toggle-visibility', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { hidden } = req.body;

      if (hidden === undefined) {
        return res.status(400).json({ error: 'दृश्यमानता / hidden status आवश्यक आहे.' });
      }

      // Author ownership validation
      const existingArticle = await db.getById(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'दिलेली बातमी सापडली नाही.' });
      }

      const user = (req as any).user;
      if (user.role === 'author' && existingArticle.authorUsername !== user.username) {
        return res.status(403).json({ error: 'तुम्हाला केवळ स्वतःच्या बातम्यांची दृश्यमानता बदलण्याचा अधिकार आहे.' });
      }

      const updatedArticle = await db.update(id, { hidden: !!hidden });
      res.json(updatedArticle);
    } catch (err: any) {
      console.error('API Error PATCH /news/:id/toggle-visibility:', err);
      res.status(500).json({ error: 'बातमीची दृश्यमानता बदलताना सर्व्हर त्रुटी आली.' });
    }
  });

  // 4. DELETE /api/news/:id -> delete news (admin only)
  app.delete('/api/news/:id', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Author ownership validation
      const existingArticle = await db.getById(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'दिलेली बातमी सापडली नाही.' });
      }

      const user = (req as any).user;
      if (user.role === 'author' && existingArticle.authorUsername !== user.username) {
        return res.status(403).json({ error: 'तुम्हाला केवळ स्वतःच्या बातम्या डिलीट करण्याचा अधिकार आहे.' });
      }

      const deleted = await db.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'दिलेली बातमी सापडली नाही किंवा आधीच डिलीट केली गेली आहे.' });
      }
      
      const userEmail = (req as any).user?.email || 'shubhamhinganebusiness@gmail.com';
      await db.createLog('बातमी हटवली', `शीर्षक: "${existingArticle.title}" (श्रेणी: ${existingArticle.category})`, userEmail).catch(console.error);

      res.json({ success: true, message: 'बातमी यशस्वीरित्या डिलीट केली.' });
    } catch (err: any) {
      console.error('API Error DELETE /news/:id:', err);
      res.status(500).json({ error: 'बातमी डिलीट करताना सर्व्हर त्रुटी आली.' });
    }
  });

  // Helper to retrieve a valid Google Access Token (using the refresh token to refresh it if expired)
  async function getOrRefreshGoogleToken(db: any, reqToken?: string): Promise<string | null> {
    if (reqToken) return reqToken;
    try {
      const siteSettings = await db.getSettings();
      if (!siteSettings.googleAccessToken) return null;

      // Check if the current access token is valid by testing it against userinfo API
      const testRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${siteSettings.googleAccessToken}` }
      });
      
      if (testRes.ok) {
        return siteSettings.googleAccessToken;
      }

      if (siteSettings.googleRefreshToken) {
        console.log('Stored Google access token is invalid or expired. Refreshing using stored refresh token...');
        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
        
        if (clientId && clientSecret) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: siteSettings.googleRefreshToken,
              grant_type: 'refresh_token'
            })
          });
          
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.access_token) {
            console.log('Successfully refreshed Google access token.');
            await db.updateSettings({
              googleAccessToken: refreshData.access_token
            });
            return refreshData.access_token;
          } else {
            console.error('Google token refresh failed:', refreshData);
          }
        } else {
          console.warn('Google Client ID/Secret missing; cannot refresh token.');
        }
      }
      return siteSettings.googleAccessToken;
    } catch (err) {
      console.error('Error during Google token verification/refresh:', err);
      return null;
    }
  }

  // 4.5 POST /api/upload -> upload image from device (admin only)
  // Supports alternative routes /api/media-store and /api/save-image to bypass Hostinger / ModSecurity keyword restrictions
  app.post(['/api/upload', '/api/media-store', '/api/save-image'], adminAuth, async (req, res) => {
    try {
      const { name, data, targetField } = req.body;
      if (!name || !data) {
        return res.status(400).json({ error: 'फाईल नाव आणि डेटा आवश्यक आहे.' });
      }

      // Convert base64 data to binary buffer
      let base64Data = '';
      let contentType = 'image/jpeg';

      const base64Marker = ';base64,';
      const markerIndex = data.indexOf(base64Marker);

      if (markerIndex !== -1) {
        base64Data = data.substring(markerIndex + base64Marker.length);
        const prefix = data.substring(0, markerIndex);
        const mimeMatch = prefix.match(/^data:([^;]+)/);
        if (mimeMatch) {
          contentType = mimeMatch[1];
        }
      } else {
        base64Data = data;
      }

      const buffer = Buffer.from(base64Data, 'base64');

      const isDetailAd = targetField && typeof targetField === 'string' && targetField.startsWith('detailAd');

      // Create unique filename
      const cleanName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e5)}_${cleanName}`;
      
      let targetFolders: string[] = [];
      if (isDetailAd) {
        targetFolders = [
          path.join(process.cwd(), 'public/Images'),
          path.join(process.cwd(), 'public/images'),
          path.join(process.cwd(), 'dist/Images'),
          path.join(process.cwd(), 'dist/images'),
          path.join(process.cwd(), 'Images'),
          path.join(process.cwd(), 'images')
        ];
      } else {
        targetFolders = [
          path.join(process.cwd(), 'public/uploads'),
          path.join(process.cwd(), 'public/Uploads'),
          path.join(process.cwd(), 'dist/uploads'),
          path.join(process.cwd(), 'dist/Uploads'),
          path.join(process.cwd(), 'uploads'),
          path.join(process.cwd(), 'Uploads')
        ];
      }

      // Save to all target folders (try but don't fail if read-only filesystem)
      for (const folder of targetFolders) {
        try {
          if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
          }
          const filePath = path.join(folder, filename);
          await fs.promises.writeFile(filePath, buffer);
        } catch (writeErr) {
          // Ignore - folder could be read-only or unsupported
        }
      }

      // Also save to Firestore to persist across restarts/deploys
      try {
        await db.saveUpload(filename, contentType, data);
      } catch (dbErr) {
        console.warn(`Firestore backup upload failed for ${filename}:`, dbErr);
      }

      // Get a valid Google Access Token (falls back to saved settings and refreshes if needed)
      const googleToken = await getOrRefreshGoogleToken(db, req.headers['x-google-access-token'] as string);
      let googleDriveUrl = '';

      if (googleToken) {
        try {
          const siteSettings = await db.getSettings();
          let folderId = siteSettings.googleDriveUploadFolderId || '1hMqfiGvuMMErCxa__16tLzW-6i5fT0id';
          const folderName = `${siteSettings.channelName || 'माझापत्र'} अपलोड्स`;

          // If folderId is not saved in siteSettings, save it now to ensure frontend visibility
          if (folderId && !siteSettings.googleDriveUploadFolderId) {
            try {
              await db.updateSettings({
                googleDriveUploadFolderId: folderId,
                googleDriveUploadFolderName: 'अहिल्यानगर न्यूज नेटवर्क अपलोड्स (Google Drive Folder)'
              });
            } catch (settingsErr) {
              console.warn('Failed to save googleDriveUploadFolderId in settings:', settingsErr);
            }
          }

          // If no folderId cached, find or create it
          if (!folderId) {
            console.log(`Searching for Google Drive folder: "${folderName}"`);
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
              `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
            )}&fields=files(id,name)`;

            const searchRes = await fetch(searchUrl, {
              headers: { 'Authorization': `Bearer ${googleToken}` }
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json() as any;
              if (searchData.files && searchData.files.length > 0) {
                folderId = searchData.files[0].id;
                console.log(`Found existing Google Drive folder ID: ${folderId}`);
              }
            }

            if (!folderId) {
              console.log(`Creating new Google Drive folder: "${folderName}"`);
              const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${googleToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: folderName,
                  mimeType: 'application/vnd.google-apps.folder'
                })
              });

              if (createRes.ok) {
                const createData = await createRes.json() as any;
                folderId = createData.id;
                console.log(`Created new Google Drive folder ID: ${folderId}`);

                // Make folder publicly accessible so uploaded images show on site
                await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${googleToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                  })
                });
                console.log('Granted "anyone" with "reader" permission to the upload folder.');
              }
            }

            if (folderId) {
              await db.updateSettings({
                googleDriveUploadFolderId: folderId,
                googleDriveUploadFolderName: folderName
              });
            }
          }

          // Upload file directly into this Google Drive folder
          if (folderId) {
            console.log(`Uploading file ${filename} to Google Drive folder: ${folderId}`);
            const boundary = 'majhapatra_upload_multipart_boundary';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;

            const fileMetadata = {
              name: filename,
              parents: [folderId]
            };

            const headerPart = Buffer.from(
              delimiter +
              'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
              JSON.stringify(fileMetadata) +
              delimiter +
              `Content-Type: ${contentType}\r\n\r\n`
            );
            const footerPart = Buffer.from(close_delim);

            const multipartBody = Buffer.concat([
              headerPart,
              buffer,
              footerPart
            ]);

            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${googleToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
              },
              body: multipartBody
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json() as any;
              const fileId = uploadData.id;
              
              // Grant public read ("anyone" with "reader" role) permission on the uploaded file so it shows on the website
              try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${googleToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                  })
                });
                console.log(`Successfully granted public read permission to uploaded file ID: ${fileId}`);
              } catch (permErr) {
                console.warn(`Failed to set public read permission on uploaded file ID ${fileId}:`, permErr);
              }

              googleDriveUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
              console.log(`File uploaded successfully to Google Drive. Direct URL: ${googleDriveUrl}`);
            } else {
              const uploadErrText = await uploadRes.text();
              console.error('Google Drive file upload failed:', uploadErrText);
            }
          }
        } catch (driveErr) {
          console.error('Google Drive auto-saving failed, using local/Firestore fallback:', driveErr);
        }
      }

      // Return Google Drive URL if uploaded successfully, otherwise local relative URL
      const finalUrl = googleDriveUrl || (isDetailAd ? `/Images/${filename}` : `/uploads/${filename}`);
      res.json({ url: finalUrl });
    } catch (err: any) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'इमेज अपलोड करता आली नाही.' });
    }
  });

  // 5. GET /api/settings -> get site customization settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.getSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('API Error GET /api/settings:', err);
      res.status(500).json({ error: 'साइट रचना वाचण्यात अडचणी आल्या.' });
    }
  });

  // 6. POST /api/settings -> update site customization settings (superadmin only)
  app.post('/api/settings', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const updated = await db.updateSettings(req.body);

      const userEmail = (req as any).user?.email || 'shubhamhinganebusiness@gmail.com';
      await db.createLog('साइट रचना/सेटिंग्ज बदलल्या', 'मुख्य व्यवस्थापकाने चॅनेलची माहिती किंवा जाहिराती बदलल्या.', userEmail).catch(console.error);

      res.json(updated);
    } catch (err: any) {
      console.error('API Error POST /api/settings:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      // If error contains Firestore details, parse or display them neatly
      let parsedError = errMsg;
      try {
        if (errMsg.startsWith('{') && errMsg.endsWith('}')) {
          const parsed = JSON.parse(errMsg);
          parsedError = parsed.error || errMsg;
        }
      } catch (pe) {
        // ignore
      }
      res.status(500).json({ error: `साइट रचना जतन करण्यात अडचण आली: ${parsedError}` });
    }
  });

  // Login Endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'कृपया युझरनेम आणि पासवर्ड दोन्ही प्रविष्ट करा.' });
      }

      const lowerUser = username.trim().toLowerCase();
      // 1. Check Super Admin
      if ((lowerUser === 'admin' && password === 'marathi@123') || (lowerUser === '7719959593' && (password === 'Shubham@9421@7719@0808' || password === 'shubham@9421@7719@0808'))) {
        const token = 'Basic ' + Buffer.from(lowerUser + ':' + password).toString('base64');
        return res.json({
          success: true,
          role: 'superadmin',
          username: lowerUser,
          name: 'Super Admin',
          token
        });
      }

      // 2. Check Database Authors
      const author = await db.getAuthorByUsername(lowerUser);
      if (author && author.password === password) {
        const token = 'Basic ' + Buffer.from(author.username + ':' + author.password).toString('base64');
        return res.json({
          success: true,
          role: 'author',
          username: author.username,
          name: author.name,
          email: author.email,
          token
        });
      }

      // 3. Fallback Demo Reader for Iframe/Sandbox testing
      if (lowerUser === 'reader' && password === 'reader@123') {
        const token = 'Basic ' + Buffer.from('reader:reader@123').toString('base64');
        return res.json({
          success: true,
          role: 'reader',
          username: 'reader',
          name: 'वाचक (Marathi Reader)',
          email: 'reader@majhapatra.com',
          token
        });
      }

      return res.status(401).json({ error: 'चुकीचे युझरनेम किंवा पासवर्ड.' });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'लॉगिन करताना तांत्रिक त्रुटी आली.' });
    }
  });

  // Firebase Public Config for Client Initialisation
  app.get('/api/auth/firebase-config', (req, res) => {
    try {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(firebaseConfigPath)) {
        return res.status(404).json({ error: 'Firebase configuration not found on server.' });
      }
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      res.json({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
        measurementId: firebaseConfig.measurementId || ""
      });
    } catch (err: any) {
      console.error('Error reading firebase-applet-config.json:', err);
      res.status(500).json({ error: 'Failed to retrieve Firebase configuration.' });
    }
  });

  // Firebase Auth Verification Endpoint for Google Sign-In
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'ID Token गहाळ आहे.' });
      }

      // Read API key from firebase-applet-config.json
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(firebaseConfigPath)) {
        return res.status(500).json({ error: 'Firebase configuration not found on server.' });
      }
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      const apiKey = firebaseConfig.apiKey;

      // Verify the Firebase ID Token using Google/Firebase Identity Toolkit REST API
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const verifyData: any = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
        return res.status(401).json({ error: 'अवैध आयडी टोकन. लॉगिन नाकारले.' });
      }

      const firebaseUser = verifyData.users[0];
      const email = firebaseUser.email.trim().toLowerCase();

      let role = 'reader';
      let username = 'reader_' + (firebaseUser.localId || 'user').substring(0, 10);
      let name = firebaseUser.displayName || 'वाचक (Reader)';
      let token = 'Basic ' + Buffer.from('reader:' + (firebaseUser.localId || 'user')).toString('base64');

      const ALLOWED_SUPERADMINS = [
        'shubhamhinganebusiness@gmail.com', 
        'ahilyanagarnewsnetwork@gmail.com',
        'karjatnewsnetwok@gmail.com',
        'shubhamhingane7719@gmail.com'
      ];
      if (ALLOWED_SUPERADMINS.includes(email)) {
        role = 'superadmin';
        username = 'admin';
        name = firebaseUser.displayName || 'Super Admin';
        token = 'Basic ' + Buffer.from('google_admin:google_secret_verified_token_abc123').toString('base64');
      } else {
        // Check if matching author email
        const authors = await db.getAuthors();
        const matchedAuthor = authors.find(a => a.email && a.email.trim().toLowerCase() === email);
        if (matchedAuthor) {
          role = 'author';
          username = matchedAuthor.username;
          name = matchedAuthor.name;
          token = 'Basic ' + Buffer.from(matchedAuthor.username + ':' + matchedAuthor.password).toString('base64');
        }
      }

      res.json({
        role,
        username,
        name,
        email,
        token,
        photoUrl: firebaseUser.photoUrl || ''
      });
    } catch (err: any) {
      console.error('Firebase Auth verification error:', err);
      res.status(500).json({ error: 'लॉगिन करताना तांत्रिक त्रुटी आली.' });
    }
  });

  // Google Sign-In URL Generation for Super Admin
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({ error: 'Google Client ID सर्व्हरवर कॉन्फिगर केलेला नाही. कृपया Settings > Secrets मध्ये GOOGLE_CLIENT_ID सेट करा.' });
    }
    
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const redirectUri = `${protocol}://${host}/auth/callback/google`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  // Google OAuth Callback Handler for Super Admin with strict Email verification
  app.get('/auth/callback/google', async (req, res) => {
    const { code, error } = req.query;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    
    if (error) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 25px; text-align: center; background-color: #fef2f2; color: #991b1b;">
            <h3>लॉगिन एरर</h3>
            <p>${error}</p>
            <button onclick="window.close()" style="margin-top: 20px; background-color: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">बंद करा</button>
          </body>
        </html>
      `);
    }
    
    if (!code) {
      return res.status(400).send('अवैध विनंती. Code गहाळ आहे.');
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 25px; text-align: center; background-color: #fef2f2; color: #991b1b; max-width: 500px; margin: 40px auto; border-radius: 12px; border: 1px solid #fee2e2;">
            <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 12px;">Google OAuth कॉन्फिगरेशन त्रुटी</h3>
            <p style="font-size: 14px; color: #7f1d1d; line-height: 1.6;">सर्व्हरवर <code>GOOGLE_CLIENT_ID</code> किंवा <code>GOOGLE_CLIENT_SECRET</code> सेट केलेले नाही.</p>
            <div style="text-align: left; background: #fff; padding: 15px; border-radius: 8px; font-size: 12px; margin-top: 15px; border: 1px solid #fecaca; font-family: sans-serif;">
              <b>आवश्यकता:</b><br/>
              1. Google Cloud Console वर जा.<br/>
              2. OAuth 2.0 Client ID तयार करा.<br/>
              3. Redirect URI म्हणून हे जोडा:<br/>
              <code>${protocol}://${req.get('host')}/auth/callback/google</code><br/>
              4. AI Studio Settings > Secrets मध्ये हे सेट करा:<br/>
              - GOOGLE_CLIENT_ID<br/>
              - GOOGLE_CLIENT_SECRET
            </div>
            <button onclick="window.close()" style="margin-top: 20px; background-color: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">बंद करा</button>
          </body>
        </html>
      `);
    }
    
    try {
      const redirectUri = `${protocol}://${req.get('host')}/auth/callback/google`;
      
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const tokenData = await tokenRes.json();
      
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'टोकन मिळवण्यात अडचण आली.');
      }
      
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      
      const userInfo = await userRes.json();
      
      if (!userRes.ok || !userInfo.email) {
        throw new Error('वापरकर्त्याची माहिती मिळवता आली नाही.');
      }
      
      const email = userInfo.email.trim().toLowerCase();
      
      const ALLOWED_SUPERADMINS = [
        'shubhamhinganebusiness@gmail.com', 
        'ahilyanagarnewsnetwork@gmail.com',
        'karjatnewsnetwok@gmail.com',
        'shubhamhingane7719@gmail.com'
      ];
      if (!ALLOWED_SUPERADMINS.includes(email)) {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; padding: 25px; text-align: center; background-color: #fef2f2; color: #991b1b; max-width: 500px; margin: 40px auto; border-radius: 12px; border: 1px solid #fee2e2;">
              <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 12px;">प्रवेश नाकारला (Access Denied)</h3>
              <p style="font-size: 14px; line-height: 1.6;">हा ईमेल पत्ता (<code>${userInfo.email}</code>) मुख्य व्यवस्थापक (Super Admin) लॉगिनसाठी अधिकृत नाही.</p>
              <p style="font-size: 13px; color: #7f1d1d; margin-top: 15px; font-weight: bold;">फक्त अधिकृत ईमेलवरून लॉगिन करण्याची परवानगी आहे.</p>
              <button onclick="window.close()" style="margin-top: 20px; background-color: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">बंद करा</button>
            </body>
          </html>
        `);
      }

      // Save tokens to settings for automatic Google Drive background integration
      const settingsUpdate: any = {
        googleAccessToken: tokenData.access_token
      };
      if (tokenData.refresh_token) {
        settingsUpdate.googleRefreshToken = tokenData.refresh_token;
      }
      await db.updateSettings(settingsUpdate);
      
      const token = 'Basic ' + Buffer.from('google_admin:google_secret_verified_token_abc123').toString('base64');
      
      res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h3>लॉगिन यशस्वी झाले!</h3>
            <p>कृपया थांबा, विंडो बंद होत आहे...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  payload: {
                    role: 'superadmin',
                    username: 'admin',
                    name: 'Super Admin',
                    token: '${token}'
                  }
                }, '*');
                window.close();
              } else {
                window.location.href = '/?page=admin';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google OAuth Exchange Error:', err);
      res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 25px; text-align: center; background-color: #fef2f2; color: #991b1b;">
            <h3>गूगल लॉगिन एरर</h3>
            <p>${err.message || 'तांत्रिक अडचण आली.'}</p>
            <button onclick="window.close()" style="margin-top: 20px; background-color: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">बंद करा</button>
          </body>
        </html>
      `);
    }
  });

  // Authors management (only Super Admin)
  app.get('/api/authors', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const list = await db.getAuthors();
      const safeList = list.map(({ password, ...rest }) => rest);
      res.json(safeList);
    } catch (err: any) {
      console.error('Error in GET /api/authors:', err);
      res.status(500).json({ error: 'लेखकांची यादी मिळवण्यात तांत्रिक अडचण आली.', details: err.message });
    }
  });

  app.post('/api/authors', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { username, password, name, email } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ error: 'नाव, युझरनेम आणि पासवर्ड भरणे आवश्यक आहे.' });
      }

      const lowerUser = username.trim().toLowerCase();
      if (lowerUser === 'admin') {
        return res.status(400).json({ error: 'हे युझरनेम आरक्षित आहे, कृपया दुसरे नाव निवडा.' });
      }

      const exists = await db.getAuthorByUsername(lowerUser);
      if (exists) {
        return res.status(400).json({ error: 'हे युझरनेम आधीच वापरात आहे. कृपया दुसरे युझरनेम निवडा.' });
      }

      const newAuthor = await db.createAuthor({
        username: lowerUser,
        password,
        name,
        email: email || ''
      });

      res.status(201).json({ success: true, author: { id: newAuthor._id, username: newAuthor.username, name: newAuthor.name } });
    } catch (err: any) {
      console.error('Create author error:', err);
      res.status(500).json({ error: 'लेखकाचे प्रोफाईल तयार करताना चूक झाली.' });
    }
  });

  app.delete('/api/authors/:id', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await db.deleteAuthor(id);
      if (!success) {
        return res.status(404).json({ error: 'दिलेला लेखक सापडला नाही किंवा आधीच डिलीट केला आहे.' });
      }
      res.json({ success: true, message: 'लेखक यशस्वीरित्या हटवला गेला.' });
    } catch (err: any) {
      res.status(500).json({ error: 'लेखक डिलीट करताना चूक झाली.' });
    }
  });

  // Polls API
  // 1. GET /api/polls - Public
  app.get('/api/polls', async (req, res) => {
    try {
      const list = await db.getPolls();
      res.json(list);
    } catch (err: any) {
      console.error('Error in GET /api/polls:', err);
      res.status(500).json({ error: 'मतदानावरील पोल मिळवण्यात तांत्रिक अडचण आली.', details: err.message });
    }
  });

  // 2. POST /api/polls - Super Admin Only
  app.post('/api/polls', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { question, options, expiryDate, optionImages, randomizeOptions } = req.body;
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'कृपया एक प्रश्न आणि किमान २ पर्याय भरा.' });
      }
      const newPoll = await db.createPoll(
        question.trim(), 
        options.map(o => o.trim()), 
        expiryDate,
        optionImages ? optionImages.map((img: string) => img || '') : undefined,
        !!randomizeOptions
      );
      res.status(201).json({ success: true, poll: newPoll });
    } catch (err: any) {
      console.error('Error in POST /api/polls:', err);
      res.status(500).json({ error: 'नवीन पोल तयार करताना अडचण आली.' });
    }
  });

  // 3. POST /api/polls/:id/vote - Public
  app.post('/api/polls/:id/vote', async (req, res) => {
    try {
      const { id } = req.params;
      const { optionIndex, username, email } = req.body;
      if (optionIndex === undefined || optionIndex === null) {
        return res.status(400).json({ error: 'पर्याय निवडणे आवश्यक आहे.' });
      }

      // Fetch the poll first to get the optionText and question
      const polls = await db.getPolls();
      const poll = polls.find(p => p._id === id);
      if (!poll) {
        return res.status(404).json({ error: 'दिलेला पोल सापडला नाही.' });
      }

      const success = await db.votePoll(id, String(optionIndex));
      if (!success) {
        return res.status(404).json({ error: 'दिलेला पोल सापडला नाही.' });
      }

      // If voter is logged in, also record individual vote for 'My Activity' tab
      if (email && username) {
        const optionText = poll.options[Number(optionIndex)] || `पर्याय ${Number(optionIndex) + 1}`;
        await db.saveUserVote({
          username,
          email,
          pollId: id,
          optionIndex: Number(optionIndex),
          optionText,
          question: poll.question,
          votedAt: new Date().toISOString()
        });
      }

      res.json({ success: true, message: 'तुमचे मत यशस्वीरित्या नोंदवले गेले!' });
    } catch (err: any) {
      console.error('Error in POST /api/polls/:id/vote:', err);
      const isExpired = err.message && err.message.includes('कालबाह्य');
      res.status(400).json({ error: isExpired ? err.message : 'मत नोंदवताना चूक झाली.' });
    }
  });

  // GET /api/user-votes - Get past polls voted on by current logged-in user
  app.get('/api/user-votes', async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: 'ईमेल आवश्यक आहे.' });
      }
      const votes = await db.getUserVotes(email);
      res.json(votes);
    } catch (err: any) {
      console.error('Error in GET /api/user-votes:', err);
      res.status(500).json({ error: 'वापरकर्त्याचे मत नोंदणी इतिहास मिळवण्यात त्रुटी.' });
    }
  });

  // GET /api/admin/poll-trends - Super Admin Only
  app.get('/api/admin/poll-trends', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const votes = await db.getAllUserVotes();
      res.json(votes);
    } catch (err: any) {
      console.error('Error in GET /api/admin/poll-trends:', err);
      res.status(500).json({ error: 'ट्रेन्ड्स मिळवताना त्रुटी आली.' });
    }
  });

  // GET /api/notifications - Get notifications for user by email
  app.get('/api/notifications', async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: 'ईमेल आवश्यक आहे.' });
      }
      const notifs = await db.getUserNotifications(email);
      res.json(notifs);
    } catch (err: any) {
      console.error('Error in GET /api/notifications:', err);
      res.status(500).json({ error: 'सूचना मिळवण्यात त्रुटी आली.' });
    }
  });

  // POST /api/notifications/:id/read - Mark notification as read
  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await db.markNotificationAsRead(id);
      res.json({ success });
    } catch (err: any) {
      console.error('Error in POST /api/notifications/:id/read:', err);
      res.status(500).json({ error: 'सूचना वाचलेली म्हणून चिन्हांकित करण्यात त्रुटी.' });
    }
  });

  // GET /api/polls/:id/comments - Public (Get comments on a poll)
  app.get('/api/polls/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await db.getCommentsByPollId(id);
      res.json(comments);
    } catch (err: any) {
      console.error('Error in GET /api/polls/:id/comments:', err);
      res.status(500).json({ error: 'कमेंट्स लोड करताना तांत्रिक अडचण आली.' });
    }
  });

  // POST /api/polls/:id/comments - Public (Write comment on a poll)
  app.post('/api/polls/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, name, email, photoUrl, commentText } = req.body;
      if (!username || !name || !commentText) {
        return res.status(400).json({ error: 'नाव, युझरनेम आणि कमेंटचा मजकूर आवश्यक आहे.' });
      }
      const comment = await db.createComment({
        pollId: id,
        username,
        name,
        email: email || '',
        photoUrl: photoUrl || '',
        commentText: commentText.trim(),
        createdAt: new Date().toISOString(),
        upvotes: 0,
        upvotedUsers: []
      });
      res.status(201).json({ success: true, comment });
    } catch (err: any) {
      console.error('Error in POST /api/polls/:id/comments:', err);
      res.status(500).json({ error: 'कमेंट जतन करताना अडचण आली.' });
    }
  });

  // POST /api/comments/:commentId/upvote - Public (Upvote a comment)
  app.post('/api/comments/:commentId/upvote', async (req, res) => {
    try {
      const { commentId } = req.params;
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'अपव्होट करण्यासाठी लॉगिन आवश्यक आहे.' });
      }
      const success = await db.upvoteComment(commentId, email);
      if (!success) {
        return res.status(404).json({ error: 'कमेंट सापडली नाही.' });
      }
      res.json({ success: true, message: 'अपव्होट अपडेट झाले.' });
    } catch (err: any) {
      console.error('Error in POST /api/comments/:commentId/upvote:', err);
      res.status(500).json({ error: 'अपव्होट करताना अडचण आली.' });
    }
  });

  // GET /api/admin/voter-stats - Super Admin Only (Get cumulative participation timeline counts)
  app.get('/api/admin/voter-stats', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const allVotes = await db.getAllUserVotes();
      res.json(allVotes);
    } catch (err: any) {
      console.error('Error in GET /api/admin/voter-stats:', err);
      res.status(500).json({ error: 'मतदार आकडेवारी मिळवताना त्रुटी.' });
    }
  });

  // 4. POST /api/polls/:id/toggle - Super Admin Only
  app.post('/api/polls/:id/toggle', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const success = await db.togglePollActive(id, !!active);
      if (!success) {
        return res.status(404).json({ error: 'दिलेला पोल सापडला नाही.' });
      }
      res.json({ success: true, message: 'पोलची स्थिती यशस्वीरित्या बदलली.' });
    } catch (err: any) {
      console.error('Error in POST /api/polls/:id/toggle:', err);
      res.status(500).json({ error: 'पोलची स्थिती बदलताना चूक झाली.' });
    }
  });

  // 4.5 POST /api/polls/:id/toggle-randomize - Super Admin Only
  app.post('/api/polls/:id/toggle-randomize', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { randomizeOptions } = req.body;
      const success = await db.togglePollRandomize(id, !!randomizeOptions);
      if (!success) {
        return res.status(404).json({ error: 'दिलेला पोल सापडला नाही.' });
      }
      res.json({ success: true, message: 'पोल पर्यायांची क्रमवारी बदलण्यात यश.' });
    } catch (err: any) {
      console.error('Error in POST /api/polls/:id/toggle-randomize:', err);
      res.status(500).json({ error: 'क्रमवारी बदलताना चूक झाली.' });
    }
  });

  // 5. DELETE /api/polls/:id - Super Admin Only
  app.delete('/api/polls/:id', checkAuth, superAdminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await db.deletePoll(id);
      if (!success) {
        return res.status(404).json({ error: 'दिलेला पोल सापडला नाही.' });
      }
      res.json({ success: true, message: 'पोल यशस्वीरित्या डिलीट केला गेला.' });
    } catch (err: any) {
      console.error('Error in DELETE /api/polls/:id:', err);
      res.status(500).json({ error: 'पोल डिलीट करताना चूक झाली.' });
    }
  });

  // Helper block to escape values for safe inclusion in HTML tags
  function escapeHtml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Robust function to resolve Google Drive URLs to static direct image CDN links (lh3.googleusercontent.com/d/{id})
  function resolveDriveUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
    }
    const ucMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
    }
    return trimmed;
  }

  let globalVite: any = null;

  // Helper to serve HTML with dynamically injected metadata (supports social media previews flawlessly)
  async function serveHtmlWithMetadata(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const articleId = (req.query.article || '') as string;
      const isProd = process.env.NODE_ENV === 'production';
      const indexPath = isProd 
        ? path.join(process.cwd(), 'dist/index.html')
        : path.join(process.cwd(), 'index.html');

      if (!fs.existsSync(indexPath)) {
        return next();
      }

      let html = await fs.promises.readFile(indexPath, 'utf-8');

      // Fetch site settings for fallback/default values
      const settings = await db.getSettings();
      const defaultTitle = (settings.channelName && settings.channelName !== 'माझापत्र')
        ? settings.channelName
        : 'अहिल्यानगर न्यूज नेटवर्क';
      const defaultDesc = settings.channelTagline || 'माझा महाराष्ट्र, माझे पत्र';
      
      let imageUrl = settings.channelLogoUrl;
      if (!imageUrl || imageUrl === '/logo.jpg' || imageUrl === '/Images/logo.jpg' || imageUrl.includes('unsplash.com')) {
        imageUrl = 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link';
      }

      let title = defaultTitle;
      let description = defaultDesc;

      // If an article is being requested, fetch national/local news info
      if (articleId) {
        const article = await db.getById(articleId);
        if (article) {
          title = `${article.title} | ${defaultTitle}`;
          description = article.description || '';
          imageUrl = article.imageURL || imageUrl;
        }
      }

      // Ensure imageUrl is absolute and properly proxied if Google Drive to avoid user-agent/crawler issues
      const host = req.get('host') || 'majhapatra.com';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const absoluteUrl = `${protocol}://${host}${req.originalUrl}`;

      if (imageUrl && (imageUrl.includes('drive.google.com') || imageUrl.includes('docs.google.com') || imageUrl.includes('lh3.googleusercontent.com'))) {
        imageUrl = `${protocol}://${host}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      } else {
        imageUrl = resolveDriveUrl(imageUrl);
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
          imageUrl = `${protocol}://${host}${imageUrl}`;
        }
      }

      // Generate structured SEO metadata JSON-LD schemas
      let structuredSchema = '';
      try {
        let schemaObject: any = {};
        if (articleId) {
          const article = await db.getById(articleId);
          if (article) {
            schemaObject = {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": absoluteUrl
              },
              "headline": article.title,
              "image": [imageUrl],
              "datePublished": article.publishDate || new Date().toISOString(),
              "dateModified": article.publishDate || new Date().toISOString(),
              "author": {
                "@type": "Person",
                "name": article.author || "अहिल्यानगर न्यूज नेटवर्क प्रतिनिधी",
                "jobTitle": "Reporter"
              },
              "publisher": {
                "@type": "NewsMediaOrganization",
                "name": defaultTitle,
                "url": `${protocol}://${host}`,
                "logo": {
                  "@type": "ImageObject",
                  "url": `${protocol}://${host}/api/image-proxy?url=${encodeURIComponent(settings.channelLogoUrl || 'https://drive.google.com/file/d/1ggY7LBCLSwNPcQO1DttuRWidMWU7XMAS/view?usp=drive_link')}`
                }
              },
              "description": article.description || description
            };
          }
        } else {
          schemaObject = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": defaultTitle,
            "alternateName": "Ahilyanagar News Network",
            "url": `${protocol}://${host}`,
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${protocol}://${host}/?search={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          };
        }
        structuredSchema = `\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaObject, null, 2)}\n    </script>`;
      } catch (err) {
        console.error('Error generating JSON-LD Schema:', err);
      }

      // Build target open graph and meta tag strings
      const metaTags = `
    <!-- HTML Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl)}" />

    <!-- Google / Search Engine Tags -->
    <meta itemprop="name" content="${escapeHtml(title)}" />
    <meta itemprop="description" content="${escapeHtml(description)}" />
    <meta itemprop="image" content="${escapeHtml(imageUrl)}" />

    <!-- Open Graph / Facebook / WhatsApp / LinkedIn -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="${escapeHtml(defaultTitle)}" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(absoluteUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    ${structuredSchema}
      `;

      // Remove any existing Open Graph, Twitter, description, and title tags to prevent duplicates
      html = html.replace(/<title>[^]*?<\/title>/gi, '');
      html = html.replace(/<meta\s+(?:property|name)="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
      html = html.replace(/<meta\s+(?:property|name)="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '');

      // Inject new meta tags and title immediately inside <head>
      html = html.replace(/<head>/i, `<head>${metaTags}`);

      if (!isProd && globalVite) {
        // Under Vite development, apply original Vite index transformations
        html = await globalVite.transformIndexHtml(req.originalUrl, html);
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (err) {
      console.error('Error serving dynamic metadata page:', err);
      return next();
    }
  }

  // Intercept requests to / or /index.html to dynamically inject Open Graph, Twitter Cards, and meta tags for shared links
  app.get(['/', '/index.html'], serveHtmlWithMetadata);

  // Integrate Vite dev middleware OR static production static server
  if (process.env.NODE_ENV !== 'production') {
    globalVite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(globalVite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', serveHtmlWithMetadata);
  }

  // 24 hours before poll expires notifications
  async function checkExpiringPollsAndNotify() {
    try {
      const polls = await db.getPolls();
      const now = new Date();
      
      for (const poll of polls) {
        if (!poll.expiryDate || !poll.active) continue;
        const expiry = new Date(poll.expiryDate);
        if (isNaN(expiry.getTime())) continue;

        const diffMs = expiry.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Target polls expiring in the next 24 hours (specifically, between 0 and 26 hours from now)
        if (diffHours > 0 && diffHours <= 26) {
          const votesMap = poll.votes || {};
          let topOptionIndex = -1;
          let maxVotes = -1;
          poll.options.forEach((opt, idx) => {
            const count = votesMap[String(idx)] || 0;
            if (count > maxVotes) {
              maxVotes = count;
              topOptionIndex = idx;
            }
          });
          const topOptionText = topOptionIndex !== -1 ? poll.options[topOptionIndex] : "अद्याप कोणतीही मते नाहीत";

          // Fetch all user votes to find who voted on this poll
          const allUserVotes = await db.getAllUserVotes();
          const pollVotes = allUserVotes.filter(v => v.pollId === poll._id);

          for (const vote of pollVotes) {
            if (!vote.email) continue;
            const userEmail = vote.email.toLowerCase();

            // Check if already notified
            const existingNotifs = await db.getUserNotifications(userEmail);
            const alreadyNotified = existingNotifs.some(n => n.pollId === poll._id);

            if (!alreadyNotified) {
              await db.saveNotification({
                email: userEmail,
                pollId: poll._id,
                title: "⏳ मतदान कौल संपत आहे! (Poll Closing Soon)",
                message: `तुमचा सहभाग असलेला '${poll.question}' हा पोल पुढील २४ तासांत संपेल. सध्याचा आघाडीचा पर्याय: '${topOptionText}' (एकूण मते: ${maxVotes}).`,
                read: false,
                createdAt: new Date().toISOString()
              });
              console.log(`[Notification] Created expiring notification for ${userEmail} on poll ${poll._id}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during automatic expiring poll check:', err);
    }
  }

  // Run immediately on boot and then check every 5 minutes
  setTimeout(() => {
    checkExpiringPollsAndNotify();
    setInterval(checkExpiringPollsAndNotify, 5 * 60 * 1000);
  }, 10000);

  // Bind and listen to 3000 on 0.0.0.0
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running beautifully on: http://0.0.0.0:${PORT}`);
    
    // Initialize database connection asynchronously after server starts listening
    console.log('Post-startup: Initializing database connection...');
    try {
      await db.initialize();
      console.log('Post-startup: Database initialized successfully!');
    } catch (dbErr) {
      console.error('Post-startup database initialization failed:', dbErr);
    }
  });
}

bootstrap().catch(err => {
  console.error('Server startup failed critically!', err);
});
