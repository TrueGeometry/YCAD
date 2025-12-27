// commands/io_cmds.js
import { loadAndDisplayGLB } from '../loader.js';
import { addMessageToChat } from '../ui.js';

export const ioCommands = {
    '/add': {
        desc: 'Add model from file/URL',
        execute: (argRaw) => {
            if (argRaw.startsWith('http')) {
                loadAndDisplayGLB(argRaw, 'add');
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
    }
};