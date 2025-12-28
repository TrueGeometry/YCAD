// chat-logic.js
// Handles Chat Input, Mentions, Screenshots, and Attachments UI.

import { appState } from './state.js';
import { sendMessage } from './chat.js';
import { addMessageToChat } from './ui.js';
import { getTaggableObjects } from './viewer.js';
import { captureComponentSnapshot, captureGroupSnapshot } from './capture.js';
import { getCommandList, executeCommand } from './commands.js';
import { KBE_ASSETS } from './kbe_data.js';

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

const PARAMETRIC_CATALOG = [
    { name: 'cube' }, { name: 'box' },
    { name: 'sphere' }, { name: 'cylinder' },
    { name: 'cone' }, { name: 'circle' },
    { name: 'ellipse' }, { name: 'plane' },
    { name: 'torus' }
];

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
            
            // Auto-select if only one suggestion remains
            if (mentionBox.style.display === 'block') {
                const items = mentionBox.querySelectorAll('.mention-item');
                if (items.length === 1) {
                    items[0].click();
                    return;
                }
            }

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
        
        // Context Awareness: Check the command at the start of input
        const firstWord = words[0] ? words[0].toLowerCase() : '';
        let context = 'scene'; // Default: Scene objects
        
        if (firstWord === '/kbe_model') {
            context = 'kbe';
        } else if (['/parametric', '/parameteric', '/addshape'].includes(firstWord)) {
            context = 'parametric';
        } else if (firstWord === '/sketch_on') {
            context = 'plane';
        }
        
        showMentionSuggestions(query, context);
    } else if (currentWord.startsWith('/')) {
        const query = currentWord.slice(1).toLowerCase();
        showCommandSuggestions(query);
    } else {
        hideMentionSuggestions();
    }
}

function showCommandSuggestions(query) {
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

function showMentionSuggestions(query, context) {
    mentionBox.innerHTML = '';
    mentionBox.style.display = 'none';
    let hasItems = false;

    if (context === 'kbe') {
        // KBE Context: Show only KBE catalog assets
        const filtered = KBE_ASSETS.filter(a => a.name.toLowerCase().includes(query));
        filtered.forEach(asset => {
             createMentionItem(asset.name, 'book-open', '#f59e0b', 'Catalog', () => {
                 applyMention({ name: asset.name, isCatalog: true });
             });
             hasItems = true;
        });
    } else if (context === 'parametric') {
        // Parametric Context: Show primitive shapes
        const filtered = PARAMETRIC_CATALOG.filter(p => p.name.toLowerCase().includes(query));
        filtered.forEach(item => {
             createMentionItem(item.name, 'box-select', '#8b5cf6', 'Parametric', () => {
                 applyMention({ name: item.name, isParametricType: true });
             });
             hasItems = true;
        });
    } else if (context === 'plane') {
        // Plane Context: Show only Work Planes (Origin or Custom)
        const objects = getTaggableObjects();
        const filtered = objects.filter(o => 
            o.name.toLowerCase().includes(query) && 
            o.object.userData && 
            o.object.userData.type === 'WorkPlane'
        );
        
        filtered.forEach(obj => {
             createMentionItem(obj.name, 'square', '#f59e0b', 'Work Plane', () => {
                 applyMention(obj);
             });
             hasItems = true;
        });
    } else {
        // Scene Context: Show objects in the scene (for tools like /move, /delete)
        const objects = getTaggableObjects();
        const filtered = objects.filter(o => o.name.toLowerCase().includes(query));
        filtered.forEach(obj => {
             createMentionItem(obj.name, 'box', '#3b82f6', 'Object', () => {
                 applyMention(obj);
             });
             hasItems = true;
        });
    }

    if (hasItems) {
        mentionBox.style.display = 'block';
        if (window.lucide) window.lucide.createIcons({ root: mentionBox });
    } else {
        hideMentionSuggestions();
    }
}

function createMentionItem(name, icon, color, subText, onClick) {
    const div = document.createElement('div');
    div.className = 'mention-item';
    div.innerHTML = `<i data-lucide="${icon}" style="color:${color};"></i> ${name} <span style="font-size:0.7em; color:#999; margin-left:auto">${subText}</span>`;
    div.addEventListener('click', onClick);
    mentionBox.appendChild(div);
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
    
    // Always insert with @ prefix as requested
    const newText = text.slice(0, startIdx) + '@' + obj.name + ' ' + text.slice(cursor);
    chatInput.value = newText;
    chatInput.focus();
    hideMentionSuggestions();

    // Trigger Snapshot logic ONLY if it is a specific scene object (and not a catalog/type item)
    if (!obj.isCatalog && !obj.isParametricType && obj.object) {
        const snapshot = captureComponentSnapshot(obj.object);
        if (snapshot) {
            appState.attachedImages.push(snapshot);
            renderAttachments();
        } else {
            console.warn("Failed to capture snapshot for", obj.name);
        }
    }
}

// --- Sending Logic ---

function handleMessageSend() {
    const message = chatInput.value.trim();
    
    if (message) {
         // 1. Check for explicit commands
         if (message.startsWith('/')) {
             executeCommand(message);
             chatInput.value = '';
             hideMentionSuggestions();
             return;
         }

         // 2. Check for implicit KBE Model load (shorthand: just @ModelName)
         // Matches "@SomeModel" exactly, ignoring surrounding whitespace
         const kbeMatch = message.match(/^@([\w\d_-]+)$/);
         if (kbeMatch) {
             const potentialName = kbeMatch[1];
             const isKBE = KBE_ASSETS.some(a => a.name.toLowerCase() === potentialName.toLowerCase());
             if (isKBE) {
                 executeCommand(`/kbe_model @${potentialName}`);
                 chatInput.value = '';
                 hideMentionSuggestions();
                 return;
             }
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