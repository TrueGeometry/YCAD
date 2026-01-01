// events.js
// Handles general toolbar and UI event bindings.

import { appState } from './state.js';
import { setCameraView, setTransformMode, applyTheme, onWindowResize, fitGeometryView, toggleSplitView } from './viewer.js';
import { toggleTool, toggleWireframe, toggleBoundingBox, onCanvasClick, onCanvasMove } from './tools.js';
import { toggleSectionMode, updateSectionAxis, toggleSectionFlip, updateSectionPosition } from './section.js';
import { togglePropertiesMode, showPhysicalProperties } from './properties.js';
import { generateReport } from './report.js';
import { loadAndDisplayGLB, createInitialCube } from './loader.js';
import { toggleFeatureTree } from './tree.js';
import { toggleCollisions } from './collisions.js'; 
import { toggleOrigin } from './origin.js'; 
import { addMessageToChat } from './ui.js';
import { recordAction, downloadSession, uploadAndRestoreSession } from './recorder.js'; 
import { createSketchShape, exitSketchMode, togglePolylineTool, finishPolyline, promptForEquation, toggleCompositePanel, addCompositeSegmentRow, createCompositeFromUI } from './sketch.js'; 
import { executeCommand } from './commands.js'; 
import { performUndo, performRedo } from './history.js'; // Import History

// Helper to safely bind click events
function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
    else console.warn(`Element #${id} not found for binding.`);
}

export function bindGlobalEvents() {
    // Session Controls
    bindClick('save-session-btn', downloadSession);
    bindClick('load-session-btn', uploadAndRestoreSession);

    // View Controls
    bindClick('split-view-btn', () => { toggleSplitView(); recordAction('view', 'split_toggle'); });
    bindClick('front-view-btn', () => { setCameraView('front'); recordAction('view', 'front'); });
    bindClick('side-view-btn', () => { setCameraView('side'); recordAction('view', 'side'); });
    bindClick('top-view-btn', () => { setCameraView('top'); recordAction('view', 'top'); });
    bindClick('iso-view-btn', () => { setCameraView('iso'); recordAction('view', 'iso'); });
    bindClick('fit-view-btn', () => { fitGeometryView(); recordAction('view', 'fit'); });

    // Manipulation Controls
    bindClick('translate-btn', () => { setTransformMode('translate'); recordAction('mode', 'translate'); });
    bindClick('rotate-btn', () => { setTransformMode('rotate'); recordAction('mode', 'rotate'); });

    // CSG / Modeling Controls
    bindClick('extrude-btn', () => {
         // Auto-execute extrude on selected object
         if(appState.selectedObject) executeCommand('/extrude');
         else addMessageToChat('system', 'Select a sketch to extrude.');
    });

    bindClick('csg-sub-btn', () => {
         addMessageToChat('system', 'To Subtract: type <b>/subtract @Target @Tool</b> (e.g., /subtract @Cube @Cylinder)');
    });

    bindClick('csg-union-btn', () => {
         addMessageToChat('system', 'To Union: type <b>/union @Obj1 @Obj2</b>');
    });

    // Tools
    bindClick('measure-btn', () => { toggleTool('distance'); recordAction('tool', 'distance'); });
    bindClick('angle-btn', () => { toggleTool('angle'); recordAction('tool', 'angle'); });
    bindClick('section-btn', () => { toggleSectionMode(); recordAction('tool', 'section'); });
    bindClick('props-btn', () => { togglePropertiesMode(); recordAction('tool', 'props'); });
    bindClick('report-btn', () => { generateReport(); });
    bindClick('tree-btn', () => { toggleFeatureTree(); recordAction('tool', 'tree'); });
    bindClick('wireframe-btn', () => { toggleWireframe(); recordAction('tool', 'wireframe'); });
    bindClick('bounds-btn', () => { toggleBoundingBox(); recordAction('tool', 'bounds'); });
    bindClick('collision-btn', () => { toggleCollisions(); recordAction('tool', 'collision'); });
    bindClick('origin-btn', () => { toggleOrigin(); recordAction('tool', 'origin'); });

    // Undo / Redo UI
    bindClick('undo-btn', performUndo);
    bindClick('redo-btn', performRedo);

    // Keyboard Shortcuts for Undo/Redo
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            performUndo();
        }
        // Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            performRedo();
        }
    });

    // Sketch Panel Controls
    bindClick('sketch-line-btn', () => { createSketchShape('line', []); recordAction('sketch', 'line'); });
    bindClick('sketch-rect-btn', () => { createSketchShape('rect', []); recordAction('sketch', 'rect'); });
    bindClick('sketch-circle-btn', () => { createSketchShape('circle', []); recordAction('sketch', 'circle'); });
    bindClick('sketch-eq-btn', () => { promptForEquation(); recordAction('sketch', 'equation'); }); 
    bindClick('sketch-composite-btn', () => { toggleCompositePanel(); recordAction('sketch', 'composite_panel'); });
    bindClick('sketch-poly-btn', () => { togglePolylineTool(); recordAction('sketch', 'polyline_tool'); });
    
    // Boolean Buttons
    bindClick('sketch-bool-union-btn', () => { 
        const input = document.getElementById('message-input');
        input.value = '/sketch_union ';
        input.focus();
        addMessageToChat('system', 'Sketch Union: Type <b>@Target @Tool</b> to merge profiles.');
    });
    bindClick('sketch-bool-sub-btn', () => { 
        const input = document.getElementById('message-input');
        input.value = '/sketch_subtract ';
        input.focus();
        addMessageToChat('system', 'Sketch Subtract: Type <b>@Target @Tool</b> to cut profile.');
    });
    bindClick('sketch-bool-int-btn', () => { 
        const input = document.getElementById('message-input');
        input.value = '/sketch_intersect ';
        input.focus();
        addMessageToChat('system', 'Sketch Intersect: Type <b>@Target @Tool</b> to keep overlap.');
    });
    
    bindClick('sketch-ok-btn', () => { 
        finishPolyline(); 
        exitSketchMode(); 
        recordAction('sketch', 'ok'); 
    });
    
    bindClick('sketch-cancel-btn', () => { exitSketchMode(); recordAction('sketch', 'cancel'); });

    // Composite Builder Controls
    bindClick('comp-close-btn', () => { toggleCompositePanel(); });
    bindClick('comp-add-eq', () => { addCompositeSegmentRow('equation'); });
    bindClick('comp-add-line', () => { addCompositeSegmentRow('line'); });
    bindClick('comp-create-btn', () => { createCompositeFromUI(); recordAction('sketch', 'composite_create'); });

    // Script Paste Controls
    const scriptPopup = document.getElementById('script-input-popup');
    const scriptOverlay = document.getElementById('script-overlay');
    const scriptText = document.getElementById('script-textarea');
    const lineNumbers = document.getElementById('script-line-numbers');
    
    const closeScriptPopup = () => {
        if(scriptPopup) scriptPopup.style.display = 'none';
        if(scriptOverlay) scriptOverlay.style.display = 'none';
    };

    bindClick('paste-script-btn', () => {
        if(scriptPopup) {
            scriptPopup.style.display = 'flex'; // Flex for internal layout
            if(scriptOverlay) scriptOverlay.style.display = 'block';
            scriptText.focus();
            if(window.lucide) window.lucide.createIcons({ root: scriptPopup });
        }
    });
    
    bindClick('script-close-btn', closeScriptPopup);
    bindClick('script-clear-btn', () => { 
        if(scriptText) {
            scriptText.value = ''; 
            if(lineNumbers) lineNumbers.innerHTML = '1';
        } 
    });
    
    if(scriptText) {
        // Line number sync
        scriptText.addEventListener('input', () => {
            const lines = scriptText.value.split('\n').length;
            if(lineNumbers) {
                lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
            }
        });
        // Scroll sync
        scriptText.addEventListener('scroll', () => {
            if(lineNumbers) lineNumbers.scrollTop = scriptText.scrollTop;
        });
    }
    
    bindClick('script-run-btn', async () => {
        if(!scriptText) return;
        const content = scriptText.value;
        if(!content.trim()) return;
        
        closeScriptPopup();
        
        const lines = content.split(/\r?\n/);
        addMessageToChat('system', `📜 <b>Running Pasted Script (${lines.length} lines)</b>`);
        
        // Execute line by line
        for (const line of lines) {
            const cmd = line.trim();
            if (cmd && !cmd.startsWith('#') && !cmd.startsWith('//')) {
                // Auto-prepend / if missing, assuming it is a command from a script context
                let commandToRun = cmd.startsWith('/') ? cmd : '/' + cmd;
                await executeCommand(commandToRun);
                // Small delay to allow UI/Three.js updates between heavy operations
                await new Promise(r => setTimeout(r, 50)); 
            }
        }
        addMessageToChat('system', '✅ Script execution finished.');
    });

    // Theme Controls
    const themeBtn = document.getElementById('theme-btn');
    const themeControls = document.getElementById('theme-controls');

    if (themeBtn && themeControls) {
        themeBtn.addEventListener('click', () => {
            themeControls.classList.toggle('visible');
            themeBtn.classList.toggle('active-mode');
        });
    }

    document.querySelectorAll('.theme-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.target.dataset.theme;
            applyTheme(theme);
            recordAction('theme', theme); // Record theme change
            if (themeControls) themeControls.classList.remove('visible');
            if (themeBtn) themeBtn.classList.remove('active-mode');
        });
    });

    // Section Controls
    bindClick('sect-x', () => { updateSectionAxis('x'); recordAction('section_axis', 'x'); });
    bindClick('sect-y', () => { updateSectionAxis('y'); recordAction('section_axis', 'y'); });
    bindClick('sect-z', () => { updateSectionAxis('z'); recordAction('section_axis', 'z'); });
    bindClick('sect-flip', () => { toggleSectionFlip(); recordAction('section_flip', null); });
    
    const sectSlider = document.getElementById('sect-slider');
    if (sectSlider) sectSlider.addEventListener('input', updateSectionPosition); 

    // Properties Controls
    const materialSelect = document.getElementById('material-select');
    const densityInput = document.getElementById('density-input');
    if (materialSelect && densityInput) {
        materialSelect.addEventListener('change', () => {
            if (materialSelect.value !== 'custom') {
                densityInput.value = materialSelect.value;
            }
        });
    }
    bindClick('calc-props-btn', showPhysicalProperties);

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
                    addMessageToChat('system', `Opened file: ${file.name}`);
                    fileInput.value = '';
                });
            }
        });
    }

    // Canvas Interactions
    const designCanvas = document.getElementById('design-canvas');
    if(designCanvas) {
        designCanvas.addEventListener('click', onCanvasClick);
        designCanvas.addEventListener('mousemove', onCanvasMove);
    }

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
                recordAction('cmd', `/add ${initialEntry.url}`); 
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