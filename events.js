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
import { toggleOrigin } from './origin.js'; // Import origin toggle
import { addMessageToChat } from './ui.js';

export function bindGlobalEvents() {
    // View Controls
    document.getElementById('front-view-btn').addEventListener('click', () => setCameraView('front'));
    document.getElementById('side-view-btn').addEventListener('click', () => setCameraView('side'));
    document.getElementById('top-view-btn').addEventListener('click', () => setCameraView('top'));
    document.getElementById('iso-view-btn').addEventListener('click', () => setCameraView('iso'));
    document.getElementById('fit-view-btn').addEventListener('click', () => fitGeometryView());

    // Manipulation Controls
    document.getElementById('translate-btn').addEventListener('click', () => setTransformMode('translate'));
    document.getElementById('rotate-btn').addEventListener('click', () => setTransformMode('rotate'));

    // Tools
    document.getElementById('measure-btn').addEventListener('click', () => toggleTool('distance'));
    document.getElementById('angle-btn').addEventListener('click', () => toggleTool('angle'));
    document.getElementById('wireframe-btn').addEventListener('click', toggleWireframe);
    document.getElementById('bounds-btn').addEventListener('click', toggleBoundingBox);
    document.getElementById('section-btn').addEventListener('click', toggleSectionMode);
    document.getElementById('props-btn').addEventListener('click', togglePropertiesMode);
    document.getElementById('report-btn').addEventListener('click', generateReport);
    document.getElementById('tree-btn').addEventListener('click', toggleFeatureTree);
    document.getElementById('collision-btn').addEventListener('click', toggleCollisions);
    document.getElementById('origin-btn').addEventListener('click', toggleOrigin);

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
            themeControls.classList.remove('visible');
            themeBtn.classList.remove('active-mode');
        });
    });

    // Section Controls
    document.getElementById('sect-x').addEventListener('click', () => updateSectionAxis('x'));
    document.getElementById('sect-y').addEventListener('click', () => updateSectionAxis('y'));
    document.getElementById('sect-z').addEventListener('click', () => updateSectionAxis('z'));
    document.getElementById('sect-flip').addEventListener('click', toggleSectionFlip);
    document.getElementById('sect-slider').addEventListener('input', updateSectionPosition);

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
            } else {
                if (appState.currentDisplayObject) {
                appState.scene.remove(appState.currentDisplayObject);
                    if (appState.currentDisplayObject.geometry) appState.currentDisplayObject.geometry.dispose();
                appState.currentDisplayObject = null;
                }
                createInitialCube();
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