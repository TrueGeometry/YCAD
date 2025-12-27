// chat-logic.js
// Handles Chat Input, Mentions, Screenshots, and Attachments UI.

import { appState } from './state.js';
import { sendMessage } from './chat.js';
import { addMessageToChat } from './ui.js';
import { getTaggableObjects } from './viewer.js';
import { captureComponentSnapshot, captureGroupSnapshot } from './capture.js';
import { getCommandList, executeCommand } from './commands.js';

// DOM Elements
const chatInput = document.getElementById('message-input');
const inputArea = document.getElementById('input-area');
const sendButton = document.getElementById('send-button');
const screenshotBtn = document.getElementById('screenshot-btn');
const attachmentPreview = document.getElementById('attachment-preview');
const mentionBox = document.getElementById('mention-suggestions') || document.createElement('div');

if (!document.getElementById('mention-suggestions')) {
    mentionBox.id = 'mention-suggestions';
    inputArea.appendChild(mentionBox);
}

export function initChatLogic() {
    // Screenshot Button
    screenshotBtn.addEventListener('click', handleScreenshot);

    // Input Events
    chatInput.addEventListener('input', (e) => {
        sendButton.disabled = !chatInput.value.trim();
        checkForMention(chatInput.value, chatInput.selectionStart);
    });

    chatInput.addEventListener('click', () => {
        checkForMention(chatInput.value, chatInput.selectionStart);
    });

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleMessageSend();
        }
    });

    // Send Button
    sendButton.addEventListener('click', () => {
        handleMessageSend();
    });

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!mentionBox.contains(e.target) && e.target !== chatInput) {
            hideMentionSuggestions();
        }
    });
}

// --- Attachment Logic ---

export function renderAttachments() {
    attachmentPreview.innerHTML = ''; // Clear current content
    
    if (appState.attachedImages.length === 0) {
        attachmentPreview.classList.add('hidden');
        return;
    }
    
    attachmentPreview.classList.remove('hidden');
    
    appState.attachedImages.forEach((imgSrc, index) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'attachment-thumb';
        
        const img = document.createElement('img');
        img.src = imgSrc;
        thumbContainer.appendChild(img);
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'attachment-delete';
        deleteBtn.innerHTML = '✕';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeAttachment(index);
        };
        thumbContainer.appendChild(deleteBtn);
        
        attachmentPreview.appendChild(thumbContainer);
    });
}

function removeAttachment(index) {
    appState.attachedImages.splice(index, 1);
    renderAttachments();
}

function handleScreenshot() {
    if (!appState.renderer || !appState.scene || !appState.camera) return;
    
    // Render current frame to ensure it is fresh
    appState.renderer.render(appState.scene, appState.camera);
    
    // Capture data URL
    const dataUrl = appState.renderer.domElement.toDataURL('image/png');
    
    // Add to state
    appState.attachedImages.push(dataUrl);
    
    // Update UI
    renderAttachments();
    
    // Optional: Focus chat input
    chatInput.focus();
}

// --- Mention & Command Logic ---

function checkForMention(text, cursorIndex) {
    // Find the word being typed at the cursor
    const textBefore = text.slice(0, cursorIndex);
    const words = textBefore.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@')) {
        const query = currentWord.slice(1).toLowerCase();
        showMentionSuggestions(query);
    } else if (currentWord.startsWith('/')) {
        const query = currentWord.slice(1).toLowerCase();
        showCommandSuggestions(query);
    } else {
        hideMentionSuggestions();
    }
}

function showCommandSuggestions(query) {
    // Get command list from commands.js
    const commands = getCommandList();
    const filtered = commands.filter(c => c.cmd.toLowerCase().startsWith('/' + query));

    if (filtered.length === 0) {
        hideMentionSuggestions();
        return;
    }

    mentionBox.innerHTML = '';
    mentionBox.style.display = 'block';

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mention-item';
        div.innerHTML = `
            <i data-lucide="terminal" style="color:#2563eb;"></i> 
            <span style="font-weight:600; color:#1f2937;">${item.cmd}</span> 
            <span style="font-size:0.8em; color:#9ca3af; margin-left:auto;">${item.desc}</span>
        `;
        
        div.addEventListener('click', () => {
             applyCommand(item.cmd);
        });
        
        mentionBox.appendChild(div);
    });
    
    if (window.lucide) window.lucide.createIcons({ root: mentionBox });
}

function applyCommand(cmdStr) {
    const text = chatInput.value;
    const cursor = chatInput.selectionStart;
    
    // Find start of the command
    const textBefore = text.slice(0, cursor);
    const lastSpace = textBefore.lastIndexOf(' ');
    const startIdx = lastSpace === -1 ? 0 : lastSpace + 1;
    
    // Replace with command + space
    const newText = text.slice(0, startIdx) + cmdStr + ' ' + text.slice(cursor);
    chatInput.value = newText;
    chatInput.focus();
    hideMentionSuggestions();
}

function showMentionSuggestions(query) {
    const objects = getTaggableObjects();
    const filtered = objects.filter(o => o.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        hideMentionSuggestions();
        return;
    }

    mentionBox.innerHTML = '';
    mentionBox.style.display = 'block';

    filtered.forEach(obj => {
        const div = document.createElement('div');
        div.className = 'mention-item';
        div.innerHTML = `<i data-lucide="box"></i> ${obj.name}`;
        
        div.addEventListener('click', () => {
             applyMention(obj);
        });
        
        mentionBox.appendChild(div);
    });

    if (window.lucide) window.lucide.createIcons({ root: mentionBox });
}

function hideMentionSuggestions() {
    mentionBox.style.display = 'none';
}

function applyMention(obj) {
    const text = chatInput.value;
    const cursor = chatInput.selectionStart;
    
    // Find start of the @mention
    const textBefore = text.slice(0, cursor);
    const lastSpace = textBefore.lastIndexOf(' ');
    const startIdx = lastSpace === -1 ? 0 : lastSpace + 1;
    
    const newText = text.slice(0, startIdx) + '@' + obj.name + ' ' + text.slice(cursor);
    chatInput.value = newText;
    chatInput.focus();
    hideMentionSuggestions();

    // Trigger Snapshot logic
    const snapshot = captureComponentSnapshot(obj.object);
    if (snapshot) {
        appState.attachedImages.push(snapshot);
        renderAttachments();
    } else {
        console.warn("Failed to capture snapshot for", obj.name);
    }
}

// --- Sending Logic ---

function handleMessageSend() {
    const message = chatInput.value.trim();
    
    if (message) {
         // Check for commands
         if (message.startsWith('/')) {
             executeCommand(message);
             chatInput.value = '';
             hideMentionSuggestions();
             return;
         }

         // --- Check for multiple mentions to create a group shot ---
         const mentions = (message.match(/@[\w\d_-]+/g) || [])
                            .map(m => m.substring(1).toLowerCase());
         
         if (mentions.length > 1) {
             const allObjects = getTaggableObjects();
             // Find matched objects
             const groupTargets = [];
             const seenUUIDs = new Set();
             
             mentions.forEach(mName => {
                 const match = allObjects.find(obj => obj.name.toLowerCase() === mName);
                 if (match && !seenUUIDs.has(match.uuid)) {
                     groupTargets.push(match.object);
                     seenUUIDs.add(match.uuid);
                 }
             });

             if (groupTargets.length > 1) {
                 const groupShot = captureGroupSnapshot(groupTargets);
                 if (groupShot) {
                     appState.attachedImages.push(groupShot);
                     // Display info
                     let displayMsg = `<br><i>Automatically combined ${groupTargets.length} components:</i><br>`;
                     displayMsg += `<img src="${groupShot}" class="chat-image-attachment" alt="Group Snapshot">`;
                     addMessageToChat('user', displayMsg);
                 }
             }
         }
         
         // Display manual attachments in chat
         let displayMsg = message;
         const manualImages = appState.attachedImages.slice(0, appState.attachedImages.length - (mentions.length > 1 ? 1 : 0));
         
         if (appState.attachedImages.length > 0) {
             appState.attachedImages.forEach(img => {
                  displayMsg += `<br><img src="${img}" class="chat-image-attachment" alt="Attached Snapshot">`;
             });
         }
         
         addMessageToChat('user', displayMsg);
        
        sendMessage(message);
        chatInput.value = '';
        hideMentionSuggestions();
        renderAttachments(); 
    }
}