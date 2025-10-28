const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

// Firebase configuration (same as your .env.local)
const firebaseConfig = {
  apiKey: "AIzaSyBkkGt1qlQK62dGzxi4AK1aZC5H2A7DPxY",
  authDomain: "chatroom-66981.firebaseapp.com",
  projectId: "chatroom-66981",
  storageBucket: "chatroom-66981.firebasestorage.app",
  messagingSenderId: "919496165622",
  appId: "1:919496165622:web:2557bcce7f1bbfab6ec4d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportVoiceInteractions() {
  try {
    console.log('Starting export...');
    
    // Get all voice interactions
    const q = query(collection(db, 'voice_interactions'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} voice interactions`);
    
    // Create CSV header
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID,Interaction Type\n';
    
    // Collect docs then sort by sessionId, then timestamp to group sessions together
    const interactions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      interactions.push({
        timestamp: data.timestamp,
        userMessage: data.userMessage || '',
        assistantMessage: data.assistantMessage || '',
        turnNumber: data.turnNumber ?? null,
        sessionId: data.sessionId || '',
        prolificPid: data.prolificPid || '',
        interactionType: data.interactionType || 'voice'
      });
    });

    interactions.sort((a, b) => {
      if (a.sessionId < b.sessionId) return -1;
      if (a.sessionId > b.sessionId) return 1;
      return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    // Create CSV rows from sorted interactions
    const csvRows = interactions.map((item) => {
      const timestampIso = item.timestamp.toDate().toISOString();
      const userMessage = `"${item.userMessage.replace(/"/g, '""')}"`;
      const assistantMessage = `"${item.assistantMessage.replace(/"/g, '""')}"`;
      const turnNumberOut = item.turnNumber ?? '';
      return `${timestampIso},${userMessage},${assistantMessage},${turnNumberOut},${item.sessionId},${item.prolificPid},${item.interactionType}`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Save to file
    const fs = require('fs');
    const filename = `voice_interactions_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvContent);
    
    console.log(`✅ Export completed! File saved as: ${filename}`);
    console.log(`📊 Total interactions exported: ${querySnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportVoiceInteractions();


