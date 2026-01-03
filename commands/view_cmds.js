// commands/view_cmds.js
import { setCameraView, fitGeometryView } from '../viewer.js';
import { toggleFeatureTree } from '../tree.js';
import { addMessageToChat } from '../ui.js';
import { resolveTarget } from './utils.js';
import { addAnnotation, toggleAnnotations, clearAnnotations } from '../annotation.js';

export const viewCommands = {
    '/view': {
        desc: 'Set camera (front, iso, fit, top, side...)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const view = args[0].toLowerCase();
            const validViews = ['front', 'top', 'side', 'right', 'left', 'back', 'bottom', 'iso'];
            
            if (view === 'fit') {
                // Check if optional size argument is provided
                // e.g., /view fit 1000
                const sizeArg = args[1];
                if (sizeArg && !isNaN(parseFloat(sizeArg))) {
                    fitGeometryView(parseFloat(sizeArg));
                    addMessageToChat('system', `Camera view adjusted to size ${sizeArg}.`);
                } else {
                    fitGeometryView();
                    addMessageToChat('system', 'Camera fitted to visible content.');
                }
            } else if (validViews.includes(view)) {
                setCameraView(view);
                addMessageToChat('system', `Switched to ${view} view.`);
            } else {
                addMessageToChat('system', 'Usage: /view [front|back|top|bottom|left|right|iso|fit [size]]');
            }
        }
    },
    '/tree': {
        desc: 'Toggle Feature Tree (or /tree rebuild)',
        execute: async (argRaw) => {
            if (argRaw && argRaw.trim().toLowerCase() === 'rebuild') {
                // Dynamic import to avoid circular dependency with recorder.js -> commands.js
                const { rebuildCurrentSession } = await import('../recorder.js');
                await rebuildCurrentSession();
            } else {
                toggleFeatureTree();
            }
        }
    },
    '/annotate': {
        desc: 'Annotate object (@Obj text) or toggle (on/off/clear)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const cmd = args[0].toLowerCase();
            
            // Sub-commands
            if (cmd === 'off') {
                toggleAnnotations('off');
                return;
            } else if (cmd === 'on') {
                toggleAnnotations('on');
                return;
            } else if (cmd === 'clear') {
                clearAnnotations();
                return;
            }
            
            // Annotation creation: /annotate @Obj Text
            const { object, name } = resolveTarget(argRaw);
            
            // Extract text: Remove the @Mention part - updated regex for dots
            const text = argRaw.replace(/@[\w\d_.-]+/, '').trim();
            
            if (object) {
                if (!text) {
                    addMessageToChat('system', 'Usage: /annotate @Object Label Text');
                } else {
                    addAnnotation(object, text);
                }
            } else {
                addMessageToChat('system', '⚠️ Object not found. Usage: /annotate @Object Label Text');
            }
        }
    },
    '/hideannotations': {
        desc: 'Hide all annotations',
        execute: () => { toggleAnnotations('off'); }
    },
    '/showannotations': {
        desc: 'Show all annotations',
        execute: () => { toggleAnnotations('on'); }
    }
};