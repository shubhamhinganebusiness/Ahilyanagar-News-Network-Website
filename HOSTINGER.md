# Hostinger Deployment Guide 🚀

This guide explains how to host your news portal application on **Hostinger** (using either a **Node.js Startup Plan** or a **VPS Hosting** package) and ensure all online functions (Admin Panel, Google Sign-in, Firebase Firestore/Storage, and AI features) work flawlessly.

---

## 📋 1. Prerequisites & Preparation

1. **Node.js Version**: Select **Node.js 18 or higher** (Node.js 20 is recommended) in your Hostinger panel.
2. **Database & Storage**: Ensure your `firebase-applet-config.json` is uploaded to the root directory. The application uses this configuration to securely connect to Firebase Firestore and Firebase Storage.

---

## 🛠️ 2. Build the Production Files

Before uploading, compile the application to bundle both the client (Vite/React) and the backend (Express) into optimized production code:

1. In your project directory, run:
   ```bash
   npm run build
   ```
2. This creates a `dist/` folder containing:
   - All static frontend assets (`dist/index.html`, CSS, JS, images).
   - The bundled backend entry point: `dist/server.cjs` (optimized CommonJS file).

---

## 📤 3. Uploading Files to Hostinger

You can upload your files via **File Manager** in the Hostinger hPanel or via **FTP/SFTP** (using FileZilla).

### Upload Checklist:
Only upload the essential files. **Do NOT upload the `node_modules` folder** (it will be installed fresh on the server).

Upload these files & folders to your domain's root folder (`public_html` or the specified Node.js application directory):
- `dist/` (Entire folder containing built frontend & backend bundle)
- `public/` (Contains public assets and upload folder)
- `data/` (Highly critical: stores your local news, settings, custom logs, and image fallbacks)
- `firebase-applet-config.json` (Required for Firestore & Storage connection)
- `package.json`
- `package-lock.json`
- `.env` (Create this file directly in the Hostinger File Manager to store secrets)

---

## ⚙️ 4. Configuring Environment Variables (`.env`)

Create a `.env` file in the root directory on Hostinger and fill in your production credentials:

```env
# Set Node environment to production
NODE_ENV=production

# The port will be dynamically assigned by Hostinger, but you can define a fallback
PORT=3000

# Gemini AI Integration (Required for AI generation of drafts)
GEMINI_API_KEY="your-gemini-api-key-here"

# Google Sign-In Credentials (Required for Super Admin Login / Google Drive)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

---

## 🚀 5. Starting the Node.js App on Hostinger hPanel

### If using Hostinger Node.js Hosting:
1. Log in to your **Hostinger hPanel**.
2. Go to **Websites** > **Manage** > **Node.js Dashboard**.
3. Set the following settings:
   - **Node.js Version**: `20.x` or `18.x`.
   - **Application Directory**: Set to your root path (e.g., `/public_html` or your designated folder).
   - **Application Startup File**: Point this to `dist/server.cjs`.
   - **Environment Variables**: You can define them here or use the `.env` file uploaded to your root.
4. Click **Install Dependencies** (this runs `npm install` based on the uploaded `package.json`).
5. Click **Start App** to boot your server online.

### If using Hostinger VPS (with PM2):
If you are on a VPS, connect via SSH and run:
```bash
# 1. Go to application root
cd /path/to/your/app

# 2. Install production dependencies
npm install --production

# 3. Start the application with PM2 manager (ensures app restarts on crashes)
pm2 start dist/server.cjs --name "news-portal"

# 4. Save PM2 list to persist on system reboot
pm2 save
pm2 startup
```

---

## 🔑 6. Config Google Sign-In for Admin Login

Because your domain name has changed (e.g., from `localhost` to `yourdomain.com`), you must register your production URL with Google OAuth to prevent authentication errors:

1. Open the **Google Cloud Console** (https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services** > **Credentials**.
3. Under **OAuth 2.0 Client IDs**, edit your Web Client ID.
4. Add your production domain under:
   - **Authorized JavaScript Origins**: `https://yourdomain.com`
   - **Authorized Redirect URIs**: `https://yourdomain.com/auth/callback/google`
5. Click **Save**.
6. The Super Admin login will now authorize and log in perfectly on your live domain!

---

## 💾 7. Verifying Features & Media Uploads

- **Firestore**: All articles, settings, polls, and authors will load securely because `dist/server.cjs` automatically reads `firebase-applet-config.json` to instantiate the database connection.
- **Bulletproof Media Uploads**: 
  1. The client-side automatically compresses all uploads to keep them extremely fast and compact (under 150KB).
  2. The application checks if direct Firebase Storage upload is configured. If not, it falls back to secure server uploads.
  3. The server implements a **Double-Persistent Fallback** for uploads:
     - It tries to save files to disk (`public/uploads` and `dist/uploads`).
     - It **simultaneously** backs up files to the secure local database store in `data/uploads.json` AND to Firestore.
     - Even if Hostinger's filesystem is read-only, ephemeral, or wipes folders on server restarts, the images are safely fetched and rendered directly from the `data/uploads.json` database fallback seamlessly!
  4. **Always ensure the `data/` folder is uploaded and has write permissions.**
