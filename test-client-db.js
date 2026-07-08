import { initializeApp } from 'firebase/app';
import { getFirestore, collection, limit, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function test() {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(firebaseConfigPath)) {
    console.error('No firebase-applet-config.json');
    return;
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Database ID:', firebaseConfig.firestoreDatabaseId);

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log('Client SDK initialized. Fetching news collection...');
    const snap = await getDocs(collection(db, 'news'));
    console.log('SUCCESS! Client SDK was able to read news. Count:', snap.size);
  } catch (err) {
    console.error('FAILED Client SDK:', err.message || err);
  }
}

test();
