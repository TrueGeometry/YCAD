// commands/view_cmds.js
import { setCameraView, fitGeometryView } from '../viewer.js';
import { toggleFeatureTree } from '../tree.js';
import { addMessageToChat } from '../ui.js';

export const viewCommands = {
    '/view': {
        desc: 'Set camera (front, iso, fit...)',
        execute: (argRaw) => {
            const view = argRaw.toLowerCase();
            const validViews = ['front', 'top', 'side', 'iso'];
            if (view === 'fit') {
                fitGeometryView();
                addMessageToChat('system', 'Camera fitted to content.');
            } else if (validViews.includes(view)) {
                setCameraView(view);
                addMessageToChat('system', `Switched to ${view} view.`);
            } else {
                addMessageToChat('system', 'Usage: /view [front|side|top|iso|fit]');
            }
        }
    },
    '/tree': {
        desc: 'Toggle Feature Tree',
        execute: () => {
            toggleFeatureTree();
        }
    }
};