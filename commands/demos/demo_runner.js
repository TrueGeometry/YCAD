// commands/demos/demo_runner.js
import { addMessageToChat } from '../../ui.js';
import { appState } from '../../state.js';
import { updateFeatureTree } from '../../tree.js';
import { attachTransformControls } from '../../viewer.js';

// Text-to-Speech Helper
function speak(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
        // Safety timeout
        setTimeout(resolve, 8000);
    });
}

/**
 * Executes a list of demo steps.
 * @param {Function} executor - The main executeCommand function from commands.js
 * @param {Array} steps - Array of { cmd, delay, narration }
 */
export async function runDemoSequence(executor, steps) {
    addMessageToChat('system', '🎬 <b>Starting Build Demo...</b>');

    // 1. Hide existing geometry (Clean Slate)
    if (appState.scene) {
        appState.scene.children.forEach(child => {
            // Keep system objects visible
            if (child.name === 'Origin' || child.name === 'GridHelper' || child.name === 'Work Features') return;
            if (child.type.includes('Light') || child.type.includes('Camera')) return;
            if (child.type === 'TransformControls') return;
            
            // Hide User Objects
            child.visible = false;
        });

        // Reset Selection state
        appState.selectedObject = null;
        appState.currentDisplayObject = null;
        attachTransformControls(null);
        updateFeatureTree();
    }

    // Reset View
    executor('/view iso');
    
    // Ensure Origin is visible
    const origin = appState.scene.getObjectByName("Origin");
    if (origin) origin.visible = true;
    
    await new Promise(r => setTimeout(r, 1000));

    for (const step of steps) {
        if (step.narration) {
            addMessageToChat('agent', `🗣️ "${step.narration}"`);
            // Run speech and command execution in parallel or sequence depending on preference.
            // Here we start speech, then run command.
            speak(step.narration); 
        }

        addMessageToChat('system', `> ${step.cmd}`);
        
        // Execute logic
        await executor(step.cmd);

        // Wait
        const waitTime = step.delay || 1000;
        await new Promise(r => setTimeout(r, waitTime));
    }

    addMessageToChat('system', '✅ <b>Demo Complete.</b>');
    executor('/view fit');
}