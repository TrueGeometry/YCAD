// commands/io_cmds.js
import { loadAndDisplayGLB } from '../loader.js';
import { addMessageToChat } from '../ui.js';
import { downloadSession, uploadAndRestoreSession, saveToCloud } from '../recorder.js';

export const ioCommands = {
    '/add': {
        desc: 'Add model from file/URL',
        execute: (argRaw, cmdString) => {
            if (argRaw.startsWith('http')) {
                loadAndDisplayGLB(argRaw, 'add', cmdString);
            } else if (!argRaw) {
                const btn = document.getElementById('add-file-btn');
                if (btn) btn.click();
                addMessageToChat('system', 'Opened file dialog (Add mode).');
            } else {
                addMessageToChat('system', `Usage: /add [url] or just /add to open file picker.`);
            }
        }
    },

    '/open': {
        desc: 'Replace scene with file',
        execute: () => {
            const btn = document.getElementById('load-file-btn');
            if (btn) btn.click();
            addMessageToChat('system', 'Opened file dialog (Replace mode).');
        }
    },

    '/save': {
        desc: 'Save session (JSON/Cloud)',
        execute: async (argRaw) => {
            const arg = argRaw ? argRaw.trim().toLowerCase() : '';
            
            if (arg === 'local') {
                downloadSession();
            } else if (arg === 'cloud') {
                await saveToCloud();
            } else {
                addMessageToChat('system', `
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <button onclick="window.executeCommand('/save local')" style="background:#2563eb; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center;">
                            <i data-lucide="download" style="width:14px; margin-right:4px;"></i> Download JSON
                        </button>
                        <button onclick="window.executeCommand('/save cloud')" style="background:#10b981; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center;">
                            <i data-lucide="cloud-upload" style="width:14px; margin-right:4px;"></i> Save to Cloud
                        </button>
                    </div>
                `);
                // Refresh icons
                if (window.lucide) setTimeout(() => window.lucide.createIcons(), 100);
            }
        }
    },
    '/download': { alias: '/save' },

    '/load': {
        desc: 'Load session (JSON) or script (TXT)',
        execute: () => {
            uploadAndRestoreSession();
        }
    },
    '/restore': { alias: '/load' }
};