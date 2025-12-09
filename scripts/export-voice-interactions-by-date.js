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

const startDateArg = process.argv[2];
const endDateArg = process.argv[3];

if (!startDateArg) {
  console.error('Usage: node scripts/export-voice-interactions-by-date.js <START_YYYY-MM-DD> [END_YYYY-MM-DD]');
  process.exit(1);
}

const startDate = new Date(`${startDateArg}T00:00:00Z`);
if (Number.isNaN(startDate.getTime())) {
  console.error('Invalid start date. Expected format YYYY-MM-DD');
  process.exit(1);
}

const endDate = endDateArg ? new Date(`${endDateArg}T00:00:00Z`) : startDate;
if (Number.isNaN(endDate.getTime())) {
  console.error('Invalid end date. Expected format YYYY-MM-DD');
  process.exit(1);
}

if (endDate < startDate) {
  console.error('End date must be on or after start date.');
  process.exit(1);
}

const startOfRange = startDate;
const endOfRange = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

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

async function exportVoiceInteractionsForDate() {
  try {
    const endLabel = endDateArg || startDateArg;
    console.log(
      `Fetching voice interactions from ${startDateArg}${endDateArg ? ` to ${endLabel}` : ''}...`,
    );

    const q = query(
      collection(db, 'voice_interactions'),
      where('timestamp', '>=', Timestamp.fromDate(startOfRange)),
      where('timestamp', '<', Timestamp.fromDate(endOfRange)),
      orderBy('timestamp', 'asc'),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No voice interactions found for that date range.');
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
        interactionType: data.interactionType || 'voice',
      });
    });

    rows.sort((a, b) => {
      if (a.sessionId < b.sessionId) return -1;
      if (a.sessionId > b.sessionId) return 1;
      return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID,Interaction Type\n';
    const csvRows = rows.map(row => {
      const ts = formatTimestampInET(row.timestamp);
      const user = String(row.userMessage).replace(/"/g, '""');
      const assistant = String(row.assistantMessage).replace(/"/g, '""');
      return `${ts},"${user}","${assistant}",${row.turnNumber},${row.sessionId},${row.prolificPid},${row.interactionType}`;
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const filename =
      startDateArg === endLabel
        ? `voice_interactions_${startDateArg}.csv`
        : `voice_interactions_${startDateArg}_to_${endLabel}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`Export complete. Wrote ${csvRows.length} rows to ${filename}`);
  } catch (error) {
    console.error('Failed to export voice interactions:', error);
    process.exit(1);
  }
}

exportVoiceInteractionsForDate();
