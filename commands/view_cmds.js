// commands/view_cmds.js
import { setCameraView, fitGeometryView } from '../viewer.js';
import { toggleFeatureTree } from '../tree.js';
import { addMessageToChat } from '../ui.js';
import { resolveTarget } from './utils.js';
import { addAnnotation, toggleAnnotations, clearAnnotations } from '../annotation.js';

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