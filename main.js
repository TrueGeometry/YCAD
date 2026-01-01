// main.js
// Entry point: imports modules, binds events, and starts the app.

import { generateUUID } from './utils.js';
import { appState } from './state.js';
import { initThreeJS, onWindowResize } from './viewer.js';
import { initOrigin } from './origin.js'; // Import here
import { sendMessage } from './chat.js';
import { addMessageToChat } from './ui.js';
import { initTrends } from './trends.js';
import { initDemos } from './demos_ui.js';
import { initChatLogic } from './chat-logic.js';
import { bindGlobalEvents } from './events.js';
import { executeCommand } from './commands.js'; // Import executeCommand

// --- Initialization ---

appState.sessionId = generateUUID();
console.log("Session ID generated:", appState.sessionId);

const urlParams = new URLSearchParams(window.location.search);
appState.globalTxtValue = urlParams.get('txt');

// --- Start App ---
(async () => {
    try {
        // Initialize Components
        initTrends();
        initDemos();
        initChatLogic();
        bindGlobalEvents();

        await initThreeJS();
        initOrigin(); // Initialize Origin after scene is ready
        onWindowResize();
        
        if (window.lucide) window.lucide.createIcons();

        const initialQuery = urlParams.get('query');
        const demoKey = urlParams.get('demo');

        if (initialQuery) {
            addMessageToChat('user', initialQuery);
            
            // Check if initial query is a command
            if (initialQuery.trim().startsWith('/')) {
                await executeCommand(initialQuery);
            } else {
                await sendMessage(initialQuery);
            }
        } else if (demoKey) {
            // Handle Demo Mode
            // Small delay to ensure scene is fully ready
            setTimeout(async () => {
                addMessageToChat('system', `🚀 <b>Launching Demo: ${demoKey}</b>`);
                await executeCommand(`/tg_test_ui build ${demoKey}`);
            }, 500);
        } else {
             if (appState.currentDisplayObject) {
                 addMessageToChat('agent', "Hello! Describe the "+(appState.globalTxtValue || "part")+" you'd like to design.");
             }
        }
        
        const chatInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        if(sendButton) sendButton.disabled = false;
        if(chatInput) chatInput.focus();

    } catch (initError) {
         console.error("FATAL:", initError);
         addMessageToChat('agent', '⚠️ Critical error. Please refresh.');
    }
})();