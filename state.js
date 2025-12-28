// state.js
// Holds the central state of the application to be shared across modules.

import * as THREE from 'three';

export const appState = {
    // Three.js Core Objects
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    transformControls: null,
    lights: {
        ambient: null,
        directional: null,
        grid: null
    },

    // Application Data
    sessionId: null,
    globalTxtValue: null,
    
    // Model State
    currentDisplayObject: null, // Points to the most recently loaded or currently selected object
    selectedObject: null,       // Specific object selected for transformation
    
    // Attachment State
    attachedImages: [], // Array of Base64 strings for manual attachments

    // History (Legacy support for parameters)
    initialObjectState: {},
    currentObjectState: {},
    historyStates: [],
    historyCount: 0,

    // Undo/Redo System (New)
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 20,

    // Session Recording
    actionLog: [], // Stores { type, payload, timestamp }
    isReplaying: false // Flag to prevent recording while restoring
};