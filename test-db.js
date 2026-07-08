import { Firestore } from '@google-cloud/firestore';
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

  console.log('\n--- Testing with Custom Named Database ---');
  try {
    const db1 = new Firestore({
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId
    });
    const snap1 = await db1.collection('news').limit(1).get();
    console.log('SUCCESS! Custom Named Database is accessible. Empty:', snap1.empty);
  } catch (err) {
    console.error('FAILED Custom Named Database:', err.message || err);
  }

  console.log('\n--- Testing with (default) Database ---');
  try {
    const db2 = new Firestore({
      projectId: firebaseConfig.projectId,
      databaseId: '(default)'
    });
    const snap2 = await db2.collection('news').limit(1).get();
    console.log('SUCCESS! (default) Database is accessible. Empty:', snap2.empty);
  } catch (err) {
    console.error('FAILED (default) Database:', err.message || err);
  }
}

test();
