// ui.js
// DOM manipulation for Chat and History.

import { loadAndDisplayGLB } from './loader.js';
import { appState } from './state.js';

const chatBody = document.getElementById('chat-box');
const historyPanel = document.getElementById('design-history');
const initialHistoryBtn = document.getElementById('initial-state-btn');
const loadingIndicator = document.getElementById('loading-indicator');

export function addMessageToChat(sender, message) {
    const messageDiv = document.createElement('div');
    let senderClass = 'agent-message';

    if (sender === 'user') senderClass = 'user-message';
    else if (sender === 'system') senderClass = 'system-message';

    messageDiv.classList.add('message', senderClass);
    messageDiv.innerHTML = message;
    chatBody.appendChild(messageDiv);
    
    // Use setTimeout to ensure DOM has updated before scrolling
    setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 0);
}

export function toggleLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
}

export function updateInitialStateButton(initialEntry) {
    if (!initialEntry) return;
    initialHistoryBtn.textContent = initialEntry.name;
    initialHistoryBtn.title = `Click to reload initial state: ${initialEntry.name}`;
    initialHistoryBtn.dataset.modelUrl = initialEntry.url || '';
}

export function addModelHistorySpan(entryData) {
    const existingSpan = historyPanel.querySelector(`span[data-model-url="${entryData.url}"]`);
    if (existingSpan) {
        existingSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
    }

    const entry = document.createElement('span');
    entry.textContent = entryData.name;
    entry.title = `Click to reload model: ${entryData.name}`;
    entry.dataset.modelUrl = entryData.url;

    entry.addEventListener('click', async (event) => {
        const urlToLoad = event.currentTarget.dataset.modelUrl;
        if (urlToLoad) {
            addMessageToChat('agent', `Reloading model: ${event.currentTarget.textContent}...`);
            await loadAndDisplayGLB(urlToLoad);
        }
    });

    historyPanel.appendChild(entry);
    historyPanel.scrollLeft = historyPanel.scrollWidth;
}

export function addHistoryEntry(appliedState, applyStateFunction) {
    if (!appliedState || typeof appliedState !== 'object') return;
    appState.historyCount++;
    const stateIndex = appState.historyStates.length;
    appState.historyStates.push(JSON.parse(JSON.stringify(appliedState)));

    const entry = document.createElement('span');
    entry.textContent = `Update ${appState.historyCount}`;
    entry.title = `Click to revert to Update ${appState.historyCount}`;
    entry.dataset.stateIndex = stateIndex;
    
    entry.addEventListener('click', () => {
         const indexToApply = parseInt(entry.dataset.stateIndex);
         const stateToApply = appState.historyStates[indexToApply];
         if (stateToApply && appState.currentDisplayObject) {
             applyStateFunction(stateToApply);
             appState.currentObjectState = JSON.parse(JSON.stringify(stateToApply));
             addMessageToChat('agent', `Applied state: ${entry.textContent}`);
         }
    });
    
    historyPanel.appendChild(entry);
    historyPanel.scrollLeft = historyPanel.scrollWidth;
}