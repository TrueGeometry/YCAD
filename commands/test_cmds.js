// commands/test_cmds.js
import { addMessageToChat } from '../ui.js';

// Helper for Text-to-Speech
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any currently playing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; 
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

export function getTestCommands(executor) {
    return {
        '/tg_test_ui': {
            desc: 'Run automated full-system UI test',
            execute: async () => {
                addMessageToChat('system', '🧪 <b>Starting UI Test Suite...</b>');
                speak("Starting User Interface Test Suite.");
                
                // Sequence of commands to validate functionality with Narration
                const steps = [
                    { cmd: '/view iso', delay: 2000, narration: "Setting up isometric view." },
                    
                    // Test Origin Toggle
                    { cmd: '/origin', delay: 1500, narration: "Hiding the origin geometry." },
                    { cmd: '/origin', delay: 1500, narration: "Showing the origin geometry." },

                    // Test Offset Origin Geometry
                    { cmd: '/workplane offset XY 15', delay: 1500, narration: "Creating an offset work plane." }, 
                    { cmd: '/view fit', delay: 500 }, // Fit view to show plane
                    { cmd: '/workaxis offset X Y 5', delay: 1500, narration: "Creating an offset work axis." },
                    { cmd: '/view fit', delay: 500 }, // Fit view

                    // Test Rotated Origin Geometry
                    { cmd: '/workplane angle XY X 45', delay: 1500, narration: "Creating a rotated work plane." },
                    { cmd: '/workaxis angle Y Z 30', delay: 1500, narration: "Creating a rotated work axis." },
                    { cmd: '/view fit', delay: 500 },

                    // Add a specific test model
                    { cmd: '/add https://s3-us-west-2.amazonaws.com/pion.truegeometry.com/geometryProgram//tmp/TGREC-da7882e70302eccc0b9e3537fb04a82c.glb', delay: 4000, narration: "Loading 3D model from URL." },
                    { cmd: '/view fit', delay: 1000, narration: "Focusing on the new model." },

                    // Test Manipulation
                    { cmd: '/move 5 5 0', delay: 1500, narration: "Moving the object." },
                    { cmd: '/view fit', delay: 500 },
                    { cmd: '/rotate 45 45 0', delay: 1500, narration: "Rotating the object." },
                    
                    // Test Patterning (Rectangular)
                    { cmd: '/pattern rect 2 2 12 12', delay: 3000, narration: "Generating a rectangular pattern." },
                    { cmd: '/view fit', delay: 1000, narration: "Zooming out to show full pattern." },
                    
                    // Test Patterning (Circular around Global Z)
                    { cmd: '/pattern circ 4 360 z', delay: 3000, narration: "Generating a circular pattern around the global Z axis." },
                    { cmd: '/view fit', delay: 1000 },

                    // Test Patterning (Circular around CUSTOM Work Axis created earlier)
                    { cmd: '/pattern circ 6 360 X_Axis_Offset_Y5', delay: 3000, narration: "Generating a circular pattern around a custom work axis." },
                    { cmd: '/view fit', delay: 1000, narration: "Final zoom to show complex assembly." },
                    
                    // Test Visual Aids
                    { cmd: '/bounds', delay: 1500, narration: "Toggling bounding box." },
                    { cmd: '/wireframe', delay: 1500, narration: "Switching to wireframe mode." },
                    { cmd: '/wireframe', delay: 1000, narration: "Reverting to solid mode." }, 
                    
                    // Test Analysis Tools
                    { cmd: '/section y', delay: 2000, narration: "Enabling cross section view." },
                    { cmd: '/section off', delay: 1000, narration: "Disabling cross section." },
                    { cmd: '/props', delay: 2500, narration: "Calculating physical properties." },
                    
                    // Final View adjustment
                    { cmd: '/view iso', delay: 1500, narration: "Switching to isometric view." },
                    { cmd: '/view fit', delay: 1000, narration: "Test suite complete." }
                ];

                for (const step of steps) {
                    if (step.narration) speak(step.narration);
                    addMessageToChat('system', `> Auto-Executing: <b>${step.cmd}</b>`);
                    executor(step.cmd);
                    await new Promise(r => setTimeout(r, step.delay));
                }
                
                speak("Test suite completed successfully.");
                addMessageToChat('system', '✅ <b>Test Suite Completed Successfully.</b>');
            }
        }
    };
}