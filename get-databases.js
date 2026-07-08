import fs from 'fs';
import path from 'path';

async function listDatabases() {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(firebaseConfigPath)) {
    console.error('No firebase-applet-config.json');
    return;
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  const projectId = firebaseConfig.projectId;
  console.log('Project ID:', projectId);

  try {
    // 1. Get Access Token from Metadata Server
    console.log('Fetching access token from metadata server...');
    const tokenRes = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' }
    });
    if (!tokenRes.ok) {
      throw new Error(`Failed to get token: ${tokenRes.statusText}`);
    }
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    console.log('Successfully obtained OAuth2 access token.');

    // 2. Call Firestore REST API to List Databases
    console.log('Calling Firestore REST API to list databases...');
    const dbsRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!dbsRes.ok) {
      const errorText = await dbsRes.text();
      throw new Error(`Failed to list databases: ${dbsRes.status} ${dbsRes.statusText} - ${errorText}`);
    }
    const dbsData = await dbsRes.json();
    console.log('\n--- Firestore Databases List ---');
    console.log(JSON.stringify(dbsData, null, 2));

  } catch (err) {
    console.error('ERROR during diagnosis:', err.message || err);
  }
}

listDatabases();
