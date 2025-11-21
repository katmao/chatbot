const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: 'AIzaSyBkkGt1qlQK62dGzxi4AK1aZC5H2A7DPxY',
  authDomain: 'chatroom-66981.firebaseapp.com',
  projectId: 'chatroom-66981',
  storageBucket: 'chatroom-66981.firebasestorage.app',
  messagingSenderId: '919496165622',
  appId: '1:919496165622:web:2557bcce7f1bbfab6ec4d7',
};

const targetDateArg = process.argv[2];

if (!targetDateArg) {
  console.error('Usage: node scripts/export-chat-interactions-by-date.js <YYYY-MM-DD>');
  process.exit(1);
}

const targetDate = new Date(`${targetDateArg}T00:00:00Z`);
if (Number.isNaN(targetDate.getTime())) {
  console.error('Invalid date. Expected format YYYY-MM-DD');
  process.exit(1);
}

const startOfDay = targetDate;
const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const etTimeZone = 'America/New_York';

function formatTimestampInET(timestamp) {
  // Format as YYYY-MM-DD HH:mm:ss with Eastern time (handles DST)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: etTimeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).formatToParts(timestamp.toDate());

  const lookup = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') lookup[type] = value;
  });

  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}:${lookup.second} ${lookup.timeZoneName || 'ET'}`;
}

async function exportChatInteractionsForDate() {
  try {
    console.log(`Fetching chat interactions for ${targetDateArg}...`);

    const q = query(
      collection(db, 'chat_interactions'),
      where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
      where('timestamp', '<', Timestamp.fromDate(endOfDay)),
      orderBy('timestamp', 'asc'),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No chat interactions found for that date.');
      return;
    }

    const rows = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      rows.push({
        timestamp: data.timestamp,
        userMessage: data.userMessage || '',
        assistantMessage: data.assistantMessage || '',
        turnNumber: data.turnNumber ?? '',
        sessionId: data.sessionId || '',
        prolificPid: data.prolificPid || '',
      });
    });

    rows.sort((a, b) => {
      if (a.sessionId < b.sessionId) return -1;
      if (a.sessionId > b.sessionId) return 1;
      return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    const csvRows = rows.map(row => {
      const ts = formatTimestampInET(row.timestamp);
      const user = String(row.userMessage).replace(/"/g, '""');
      const assistant = String(row.assistantMessage).replace(/"/g, '""');
      return `${ts},"${user}","${assistant}",${row.turnNumber},${row.sessionId},${row.prolificPid}`;
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const filename = `chat_interactions_${targetDateArg}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`Export complete. Wrote ${csvRows.length} rows to ${filename}`);
  } catch (error) {
    console.error('Failed to export chat interactions:', error);
    process.exit(1);
  }
}

exportChatInteractionsForDate();
