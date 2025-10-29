const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
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

    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    const rows = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const timestampIso = data.timestamp.toDate().toISOString();
      const userMessage = data.userMessage ? data.userMessage.replace(/"/g, '""') : '';
      const assistantMessage = data.assistantMessage ? data.assistantMessage.replace(/"/g, '""') : '';
      rows.push(
        `${timestampIso},"${userMessage}","${assistantMessage}",${data.turnNumber ?? ''},${data.sessionId ?? ''},${data.prolificPid ?? ''}`,
      );
    });

    const csvContent = csvHeader + rows.join('\n');
    const filename = `chat_interactions_${targetDateArg}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`Export complete. Wrote ${rows.length} rows to ${filename}`);
  } catch (error) {
    console.error('Failed to export chat interactions:', error);
    process.exit(1);
  }
}

exportChatInteractionsForDate();
