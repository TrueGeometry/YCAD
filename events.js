// events.js
// Handles general toolbar and UI event bindings.

import { appState } from './state.js';
import { setCameraView, setTransformMode, applyTheme, onWindowResize, fitGeometryView } from './viewer.js';
import { toggleTool, toggleWireframe, toggleBoundingBox, onCanvasClick } from './tools.js';
import { toggleSectionMode, updateSectionAxis, toggleSectionFlip, updateSectionPosition } from './section.js';
import { togglePropertiesMode, showPhysicalProperties } from './properties.js';
import { generateReport } from './report.js';
import { loadAndDisplayGLB, createInitialCube } from './loader.js';
import { toggleFeatureTree } from './tree.js';
import { toggleCollisions } from './collisions.js'; 
import { toggleOrigin } from './origin.js'; 
import { addMessageToChat } from './ui.js';
import { recordAction, downloadSession, uploadAndRestoreSession } from './recorder.js'; // Import recorder

export function bindGlobalEvents() {
    // Session Controls
    const saveSessionBtn = document.getElementById('save-session-btn');
    if (saveSessionBtn) saveSessionBtn.addEventListener('click', downloadSession);
    
    const loadSessionBtn = document.getElementById('load-session-btn');
    if (loadSessionBtn) loadSessionBtn.addEventListener('click', uploadAndRestoreSession);

    // View Controls
    document.getElementById('front-view-btn').addEventListener('click', () => { setCameraView('front'); recordAction('view', 'front'); });
    document.getElementById('side-view-btn').addEventListener('click', () => { setCameraView('side'); recordAction('view', 'side'); });
    document.getElementById('top-view-btn').addEventListener('click', () => { setCameraView('top'); recordAction('view', 'top'); });
    document.getElementById('iso-view-btn').addEventListener('click', () => { setCameraView('iso'); recordAction('view', 'iso'); });
    document.getElementById('fit-view-btn').addEventListener('click', () => { fitGeometryView(); recordAction('view', 'fit'); });

    // Manipulation Controls
    document.getElementById('translate-btn').addEventListener('click', () => { setTransformMode('translate'); recordAction('mode', 'translate'); });
    document.getElementById('rotate-btn').addEventListener('click', () => { setTransformMode('rotate'); recordAction('mode', 'rotate'); });

    // Tools
    document.getElementById('measure-btn').addEventListener('click', () => { toggleTool('distance'); recordAction('tool', 'distance'); });
    document.getElementById('angle-btn').addEventListener('click', () => { toggleTool('angle'); recordAction('tool', 'angle'); });
    document.getElementById('wireframe-btn').addEventListener('click', () => { toggleWireframe(); recordAction('tool', 'wireframe'); });
    document.getElementById('bounds-btn').addEventListener('click', () => { toggleBoundingBox(); recordAction('tool', 'bounds'); });
    document.getElementById('section-btn').addEventListener('click', () => { toggleSectionMode(); recordAction('tool', 'section'); });
    document.getElementById('props-btn').addEventListener('click', () => { togglePropertiesMode(); recordAction('tool', 'props'); });
    document.getElementById('report-btn').addEventListener('click', () => { generateReport(); /* Reports not recorded as persistent state */ });
    document.getElementById('tree-btn').addEventListener('click', () => { toggleFeatureTree(); recordAction('tool', 'tree'); });
    document.getElementById('collision-btn').addEventListener('click', () => { toggleCollisions(); recordAction('tool', 'collision'); });
    document.getElementById('origin-btn').addEventListener('click', () => { toggleOrigin(); recordAction('tool', 'origin'); });

    // Theme Controls
    const themeBtn = document.getElementById('theme-btn');
    const themeControls = document.getElementById('theme-controls');

    themeBtn.addEventListener('click', () => {
        themeControls.classList.toggle('visible');
        themeBtn.classList.toggle('active-mode');
    });

    document.querySelectorAll('.theme-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.target.dataset.theme;
            applyTheme(theme);
            recordAction('theme', theme); // Record theme change
            themeControls.classList.remove('visible');
            themeBtn.classList.remove('active-mode');
        });
    });

    // Section Controls
    document.getElementById('sect-x').addEventListener('click', () => { updateSectionAxis('x'); recordAction('section_axis', 'x'); });
    document.getElementById('sect-y').addEventListener('click', () => { updateSectionAxis('y'); recordAction('section_axis', 'y'); });
    document.getElementById('sect-z').addEventListener('click', () => { updateSectionAxis('z'); recordAction('section_axis', 'z'); });
    document.getElementById('sect-flip').addEventListener('click', () => { toggleSectionFlip(); recordAction('section_flip', null); });
    document.getElementById('sect-slider').addEventListener('input', updateSectionPosition); // Slider drag is too granular to record every event

    // Properties Controls
    const materialSelect = document.getElementById('material-select');
    const densityInput = document.getElementById('density-input');
    materialSelect.addEventListener('change', () => {
        if (materialSelect.value !== 'custom') {
            densityInput.value = materialSelect.value;
        }
    });
    document.getElementById('calc-props-btn').addEventListener('click', showPhysicalProperties);

    // File Upload Logic
    const loadFileBtn = document.getElementById('load-file-btn');
    const addFileBtn = document.getElementById('add-file-btn');
    const fileInput = document.getElementById('file-upload-input');
    let currentUploadMode = 'replace'; 

    if (fileInput) {
        if (loadFileBtn) {
            loadFileBtn.addEventListener('click', () => {
                currentUploadMode = 'replace';
                fileInput.click();
            });
        }
        if (addFileBtn) {
            addFileBtn.addEventListener('click', () => {
                currentUploadMode = 'add';
                fileInput.click();
            });
        }

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                loadAndDisplayGLB(url, currentUploadMode).then(() => {
                    if(currentUploadMode === 'replace') {
                        addMessageToChat('system', `Opened file: ${file.name}`);
                    } else {
                        addMessageToChat('system', `Added file: ${file.name}`);
                    }
                    // We cannot easily record Blob URLs for restoration across sessions.
                    // We only record that a user manually loaded a file.
                    addMessageToChat('system', '⚠️ Note: Locally loaded files cannot be restored in a saved session. Use /add [URL] for persistent sessions.');
                    fileInput.value = '';
                });
            }
        });
    }

    // Canvas Interactions
    const designCanvas = document.getElementById('design-canvas');
    if(designCanvas) designCanvas.addEventListener('click', onCanvasClick);

    // History Reset
    const initialHistoryBtn = document.getElementById('initial-state-btn');
    if(initialHistoryBtn) {
        initialHistoryBtn.addEventListener('click', async () => {
            const initialEntry = appState.historyStates[0];
            if (!initialEntry) {
                addMessageToChat('agent', "⚠️ Cannot restore initial state.");
                return;
            }
            addMessageToChat('agent', `Reloading initial state: ${initialEntry.name}...`);
            if (initialEntry.url) {
                await loadAndDisplayGLB(initialEntry.url, 'replace');
                recordAction('cmd', `/add ${initialEntry.url}`); // Treat as an add/load command for consistency
            } else {
                // ... handling basic cube ...
            }
        });
    }

    // Resize Handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onWindowResize, 50);
    });
}