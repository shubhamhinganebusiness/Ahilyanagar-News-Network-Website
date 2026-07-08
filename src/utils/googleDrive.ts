/**
 * Service to interact with the Google Drive API.
 */

export interface GoogleDriveFolder {
  id: string;
  name: string;
}

/**
 * Searches for a folder with the given name inside Google Drive.
 * Returns the folder ID if found, or null otherwise.
 */
export async function findFolder(accessToken: string, folderName: string): Promise<string | null> {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )}&fields=files(id,name)`;

  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive folder search failed: ${errText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a folder with the given name inside Google Drive.
 * Returns the created folder's ID.
 */
export async function createFolder(accessToken: string, folderName: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive folder creation failed: ${errText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Gets or creates a folder with the given name inside Google Drive.
 */
export async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  const existingId = await findFolder(accessToken, folderName);
  if (existingId) {
    return existingId;
  }
  return await createFolder(accessToken, folderName);
}

/**
 * Uploads or overwrites a JSON file inside a specific Google Drive folder.
 */
export async function uploadJsonFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: any
): Promise<string> {
  // 1. Check if the file already exists in the folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `'${folderId}' in parents and name='${fileName}' and trashed=false`
  )}&fields=files(id)`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  // 2. Prepare multipart upload boundary and content
  const boundary = 'majhapatra_drive_service_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(existingFileId ? {} : { parents: [folderId] }), // parents should only be specified on create, not update
  };

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(content, null, 2) +
    closeDelim;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const method = existingFileId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive file sync failed: ${errText}`);
  }

  const responseData = await response.json();
  return responseData.id;
}

/**
 * Synchronizes all site data (News and Site Settings) to 'Ahilyanagar News Network' folder in Google Drive.
 */
export async function syncAllSiteData(
  accessToken: string,
  newsList: any[],
  siteSettings: any
): Promise<{ success: boolean; folderId: string; timestamp: number }> {
  const folderName = 'Ahilyanagar News Network';
  
  // 1. Get or create target directory
  const folderId = await getOrCreateFolder(accessToken, folderName);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const newsFileName = `News_Backup_${todayStr}.json`;
  const settingsFileName = `SiteSettings_Backup_${todayStr}.json`;

  // 2. Upload news list and site settings in parallel
  await Promise.all([
    uploadJsonFile(accessToken, folderId, newsFileName, newsList),
    uploadJsonFile(accessToken, folderId, settingsFileName, siteSettings),
  ]);

  return {
    success: true,
    folderId,
    timestamp: Date.now(),
  };
}
