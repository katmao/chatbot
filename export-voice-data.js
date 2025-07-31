const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIxaoORc3XBczgNENODK2qVYt7-IH9hkY",
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
    console.log('Starting voice interactions export...');
    console.log('Extracting interactions from voice_interactions collection...');
    
    // Extract from voice_interactions collection
    const collectionRef = collection(db, 'voice_interactions');
    const q = query(collectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const voiceInteractions = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      const interaction = {
        timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString(),
        userMessage: data.userMessage || data.user_message || data.message || '',
        assistantMessage: data.assistantMessage || data.assistant_message || data.response || '',
        turnNumber: data.turnNumber || data.turn_number || 1,
        sessionId: data.sessionId || data.session_id || 'unknown_session',
        prolificPid: data.prolificPid || data.prolific_pid || 'unknown_pid',
        interactionType: data.interactionType || 'voice'
      };
      
      voiceInteractions.push(interaction);
    });
    
    console.log(`Found ${voiceInteractions.length} voice interactions`);
    
    if (voiceInteractions.length === 0) {
      console.log('No voice interactions found in the voice_interactions collection.');
      console.log('This might be because:');
      console.log('1. No participants have used the voice-test branch yet');
      console.log('2. The Firebase saving logic was just added and needs to be deployed');
      console.log('3. There might be permission issues with the voice_interactions collection');
      return;
    }
    
    // Create CSV content
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID,Interaction Type\n';
    const csvRows = voiceInteractions.map(interaction => {
      return `"${interaction.timestamp}","${interaction.userMessage.replace(/"/g, '""')}","${interaction.assistantMessage.replace(/"/g, '""')}",${interaction.turnNumber},"${interaction.sessionId}","${interaction.prolificPid}","${interaction.interactionType}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `voice_interactions_${today}.csv`;
    
    // Write to file
    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`Successfully exported ${voiceInteractions.length} voice interactions to ${filename}`);
    console.log(`File saved as: ${path.resolve(filename)}`);
    console.log('\nNote: These are voice interactions where:');
    console.log('- Participants type their messages');
    console.log('- Agent responds with audio (text-to-speech)');
    console.log('- All interactions are marked as "voice" type');
    
  } catch (error) {
    console.error('Error exporting voice interactions:', error);
  }
}

// Run the export
exportVoiceInteractions(); 