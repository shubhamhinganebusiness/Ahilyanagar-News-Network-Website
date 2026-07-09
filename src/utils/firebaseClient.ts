import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { firebaseAppletConfig } from '../firebase-config-fallback';
import { News, Poll, SiteCustomization, UserVote, PollComment, SystemLog, SiteNotification } from '../types';

// Detect client-only mode or fallback flag
let isClientOnlyModeCached = false;

export function setClientOnlyMode(enabled: boolean) {
  isClientOnlyModeCached = enabled;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('majhapatra_client_only_mode', enabled ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }
}

export function isClientOnlyMode(): boolean {
  if (isClientOnlyModeCached) return true;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('majhapatra_client_only_mode');
      if (stored === 'true') {
        isClientOnlyModeCached = true;
        return true;
      }
    } catch (e) {
      // ignore
    }
  }
  return false;
}

// Lazy initialization of Firebase Client SDK
let dbInstance: any = null;

export function getFirestoreDb() {
  if (!dbInstance) {
    const app = getApps().length === 0 ? initializeApp(firebaseAppletConfig) : getApp();
    dbInstance = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);
  }
  return dbInstance;
}

// ---------------- SITE SETTINGS ----------------

export async function getDirectSettings(): Promise<SiteCustomization> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'settings', 'site');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SiteCustomization;
  }
  throw new Error('Default site settings not found in Firestore.');
}

export async function saveDirectSettings(settings: Partial<SiteCustomization>): Promise<SiteCustomization> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'settings', 'site');
  await setDoc(docRef, settings, { merge: true });
  const updatedSnap = await getDoc(docRef);
  return updatedSnap.data() as SiteCustomization;
}

// ---------------- NEWS ARTICLES ----------------

export async function getDirectNews(
  category?: string,
  search?: string,
  includeHidden: boolean = false,
  authorUsername?: string
): Promise<News[]> {
  const db = getFirestoreDb();
  const newsCol = collection(db, 'news');
  
  // Fetch all documents (standard Firestore query limitations make complex in-client filtering easier and more robust)
  const snap = await getDocs(newsCol);
  let list: News[] = [];
  
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      _id: d.id,
      ...data
    } as News);
  });

  // Filter in client code to match server.ts logic perfectly
  if (!includeHidden) {
    list = list.filter((item) => !item.hidden);
  }

  if (category && category !== 'सर्व') {
    list = list.filter((item) => item.category === category);
  }

  if (authorUsername) {
    list = list.filter((item) => item.authorUsername?.toLowerCase() === authorUsername.toLowerCase());
  }

  if (search && search.trim()) {
    const queryStr = search.toLowerCase().trim();
    list = list.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(queryStr);
      const matchDesc = item.description?.toLowerCase().includes(queryStr);
      const matchContent = item.content?.toLowerCase().includes(queryStr);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(queryStr));
      return !!(matchTitle || matchDesc || matchContent || matchTags);
    });
  }

  // Sort by publishDate descending (latest first)
  list.sort((a, b) => {
    const dateA = new Date(a.publishDate || 0).getTime();
    const dateB = new Date(b.publishDate || 0).getTime();
    return dateB - dateA;
  });

  return list;
}

export async function createDirectNews(newsData: Omit<News, '_id'>): Promise<News> {
  const db = getFirestoreDb();
  const newsCol = collection(db, 'news');
  const payload = {
    ...newsData,
    views: newsData.views || 0,
    publishDate: newsData.publishDate || new Date().toISOString()
  };
  const docRef = await addDoc(newsCol, payload);
  return {
    _id: docRef.id,
    ...payload
  } as News;
}

export async function updateDirectNews(id: string, newsData: Partial<News>): Promise<News> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'news', id);
  // Clean up _id from data if present to prevent writing _id into document fields
  const dataToUpdate = { ...newsData };
  delete dataToUpdate._id;
  
  await updateDoc(docRef, dataToUpdate);
  const updatedSnap = await getDoc(docRef);
  return {
    _id: id,
    ...updatedSnap.data()
  } as News;
}

export async function deleteDirectNews(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'news', id);
  await deleteDoc(docRef);
  return true;
}

// ---------------- POLLS ----------------

export async function getDirectPolls(): Promise<Poll[]> {
  const db = getFirestoreDb();
  const pollsCol = collection(db, 'polls');
  const snap = await getDocs(pollsCol);
  
  const list: Poll[] = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      _id: d.id,
      ...data,
      votes: data.votes || {}
    } as Poll);
  });

  // Sort by createdAt descending
  list.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return list;
}

export async function createDirectPoll(pollData: {
  question: string;
  options: string[];
  expiryDate?: string;
  optionImages?: string[];
  randomizeOptions?: boolean;
}): Promise<Poll> {
  const db = getFirestoreDb();
  const pollsCol = collection(db, 'polls');
  
  const votesObj: Record<string, number> = {};
  pollData.options.forEach((_, idx) => {
    votesObj[String(idx)] = 0;
  });

  const payload = {
    question: pollData.question,
    options: pollData.options,
    votes: votesObj,
    active: true,
    createdAt: new Date().toISOString(),
    expiryDate: pollData.expiryDate || null,
    optionImages: pollData.optionImages || [],
    randomizeOptions: !!pollData.randomizeOptions
  };

  const docRef = await addDoc(pollsCol, payload);
  return {
    _id: docRef.id,
    ...payload
  } as Poll;
}

export async function toggleDirectPollActive(id: string, active: boolean): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'polls', id);
  await updateDoc(docRef, { active });
  return true;
}

export async function toggleDirectPollRandomize(id: string, randomizeOptions: boolean): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'polls', id);
  await updateDoc(docRef, { randomizeOptions });
  return true;
}

export async function deleteDirectPoll(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'polls', id);
  await deleteDoc(docRef);
  return true;
}

export async function voteDirectPoll(
  pollId: string,
  email: string,
  optionIndex: number,
  oldOptionIndex: number | null
): Promise<{ success: boolean; poll: Poll }> {
  const db = getFirestoreDb();
  const pollRef = doc(db, 'polls', pollId);
  const userVoteCol = collection(db, 'user_votes');
  
  // Get latest poll data
  const pollSnap = await getDoc(pollRef);
  if (!pollSnap.exists()) {
    throw new Error('दिलेला पोल अस्तित्वात नाही.');
  }

  const poll = pollSnap.data() as Poll;
  const votes = { ...(poll.votes || {}) };

  // Initialize count keys if not existing
  poll.options.forEach((_, idx) => {
    if (votes[String(idx)] === undefined) {
      votes[String(idx)] = 0;
    }
  });

  // Calculate vote adjustments
  if (oldOptionIndex !== null && oldOptionIndex !== undefined) {
    votes[String(oldOptionIndex)] = Math.max(0, (votes[String(oldOptionIndex)] || 1) - 1);
  }
  votes[String(optionIndex)] = (votes[String(optionIndex)] || 0) + 1;

  // Use a batch write for atomicity
  const batch = writeBatch(db);
  batch.update(pollRef, { votes });

  // If user changed vote, update or delete previous vote
  const userEmail = email.toLowerCase().trim();
  if (oldOptionIndex !== null && oldOptionIndex !== undefined) {
    const q = query(userVoteCol, where('email', '==', userEmail), where('pollId', '==', pollId));
    const querySnap = await getDocs(q);
    querySnap.forEach((docToDel) => {
      batch.delete(docToDel.ref);
    });
  }

  // Create new vote record
  const voteDocRef = doc(userVoteCol);
  const votePayload = {
    username: userEmail.split('@')[0],
    email: userEmail,
    pollId,
    optionIndex,
    optionText: poll.options[optionIndex],
    question: poll.question,
    votedAt: new Date().toISOString()
  };
  batch.set(voteDocRef, votePayload);

  await batch.commit();

  return {
    success: true,
    poll: {
      _id: pollId,
      ...poll,
      votes
    }
  };
}

// ---------------- COMMENTS ----------------

export async function getDirectComments(pollId: string): Promise<PollComment[]> {
  const db = getFirestoreDb();
  const commentsCol = collection(db, 'poll_comments');
  const q = query(commentsCol, where('pollId', '==', pollId));
  const snap = await getDocs(q);

  const list: PollComment[] = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      _id: d.id,
      ...data,
      upvotes: data.upvotes || 0,
      upvotedUsers: data.upvotedUsers || []
    } as PollComment);
  });

  // Sort by upvotes desc, then createdAt desc
  list.sort((a, b) => {
    if (b.upvotes !== a.upvotes) {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return list;
}

export async function addDirectComment(commentData: {
  pollId: string;
  username: string;
  name: string;
  email: string;
  photoUrl: string;
  commentText: string;
}): Promise<PollComment> {
  const db = getFirestoreDb();
  const commentsCol = collection(db, 'poll_comments');

  const payload = {
    pollId: commentData.pollId,
    username: commentData.username,
    name: commentData.name,
    email: commentData.email.toLowerCase(),
    photoUrl: commentData.photoUrl || '',
    commentText: commentData.commentText,
    createdAt: new Date().toISOString(),
    upvotes: 0,
    upvotedUsers: []
  };

  const docRef = await addDoc(commentsCol, payload);
  return {
    _id: docRef.id,
    ...payload
  } as PollComment;
}

export async function upvoteDirectComment(commentId: string, email: string): Promise<boolean> {
  const db = getFirestoreDb();
  const commentRef = doc(db, 'poll_comments', commentId);
  const snap = await getDoc(commentRef);
  if (!snap.exists()) {
    throw new Error('कमेंट सापडली नाही.');
  }

  const comment = snap.data() as PollComment;
  const upvotedUsers = comment.upvotedUsers ? [...comment.upvotedUsers] : [];
  const userEmail = email.toLowerCase().trim();

  const index = upvotedUsers.indexOf(userEmail);
  let newUpvotes = comment.upvotes || 0;

  if (index !== -1) {
    // Remove upvote
    upvotedUsers.splice(index, 1);
    newUpvotes = Math.max(0, newUpvotes - 1);
  } else {
    // Add upvote
    upvotedUsers.push(userEmail);
    newUpvotes += 1;
  }

  await updateDoc(commentRef, {
    upvotes: newUpvotes,
    upvotedUsers
  });

  return true;
}

// ---------------- USER VOTES HISTORY ----------------

export async function getDirectUserVotes(email: string): Promise<UserVote[]> {
  const db = getFirestoreDb();
  const votesCol = collection(db, 'user_votes');
  const q = query(votesCol, where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);

  const list: UserVote[] = [];
  snap.forEach((d) => {
    list.push({
      _id: d.id,
      ...d.data()
    } as UserVote);
  });
  return list;
}

// ---------------- NOTIFICATIONS ----------------

export async function getDirectNotifications(email: string): Promise<SiteNotification[]> {
  const db = getFirestoreDb();
  const col = collection(db, 'notifications');
  const q = query(col, where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);

  const list: SiteNotification[] = [];
  snap.forEach((d) => {
    list.push({
      _id: d.id,
      ...d.data()
    } as SiteNotification);
  });

  // Sort by createdAt desc
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

// ---------------- LOGS ----------------

export async function createDirectLog(action: string, details: string, userEmail: string): Promise<SystemLog> {
  const db = getFirestoreDb();
  const col = collection(db, 'logs');
  const payload = {
    action,
    details,
    userEmail: userEmail.toLowerCase(),
    timestamp: new Date().toISOString()
  };
  const docRef = await addDoc(col, payload);
  return {
    _id: docRef.id,
    ...payload
  } as SystemLog;
}
