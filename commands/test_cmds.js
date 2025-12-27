// commands/test_cmds.js
import { addMessageToChat } from '../ui.js';
import { TRANSLATIONS } from './test_lang.js';

// Helper for Text-to-Speech
function speak(text, langCode) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }
        
        // Cancel existing to ensure clean start
        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (langCode) {
            utterance.lang = langCode;
            const voices = window.speechSynthesis.getVoices();
            // Try to find an exact match or a loose region match
            const voice = voices.find(v => v.lang === langCode) || 
                          voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
            if (voice) utterance.voice = voice;
        }

        utterance.rate = 1.0; 
        utterance.pitch = 1.0;
        
        // Resolve promise when speech ends
        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
            console.warn("Speech synthesis error:", e);
            resolve(); // Resolve anyway to not block test
        };

        window.speechSynthesis.speak(utterance);

        // Safety timeout: if browser speech hangs (common issue), force resolve after 10s
        setTimeout(resolve, 10000);
    });
}

export function getTestCommands(executor) {
    return {
        '/tg_test_ui': {
            desc: 'Run automated full-system UI test. Usage: /tg_test_ui [english|hindi|spanish|chinese|russian]',
            execute: async (argRaw) => {
                const langKey = argRaw ? argRaw.trim().toLowerCase() : 'english';
                // Fallback to English if language not found
                const langData = TRANSLATIONS[langKey] || TRANSLATIONS['english'];
                const { code, ...txt } = langData;

                addMessageToChat('system', `🧪 <b>${txt.start}</b> (${langKey})`);
                await speak(txt.start, code);
                
                // Sequence of commands to validate functionality with Narration
                const steps = [
                    { cmd: '/view iso', delay: 2000, narration: txt.iso },
                    
                    // Test Origin Toggle
                    { cmd: '/origin', delay: 1500, narration: txt.origin_hide },
                    { cmd: '/origin', delay: 1500, narration: txt.origin_show },

                    // Test Offset Origin Geometry
                    { cmd: '/workplane offset XY 15', delay: 1500, narration: txt.offset_plane }, 
                    { cmd: '/view fit', delay: 500 }, // Fit view to show plane
                    { cmd: '/workaxis offset X Y 5', delay: 1500, narration: txt.offset_axis },
                    { cmd: '/view fit', delay: 500 }, // Fit view

                    // Test Rotated Origin Geometry
                    { cmd: '/workplane angle XY X 45', delay: 1500, narration: txt.rot_plane },
                    { cmd: '/workaxis angle Y Z 30', delay: 1500, narration: txt.rot_axis },
                    { cmd: '/view fit', delay: 500 },

                    // Add a specific test model
                    { cmd: '/add https://s3-us-west-2.amazonaws.com/pion.truegeometry.com/geometryProgram//tmp/TGREC-da7882e70302eccc0b9e3537fb04a82c.glb', delay: 4000, narration: txt.load_model },
                    { cmd: '/view fit', delay: 1000, narration: txt.focus_model },

                    // Test Manipulation
                    { cmd: '/move 5 5 0', delay: 1500, narration: txt.move },
                    { cmd: '/view fit', delay: 500 },
                    { cmd: '/rotate 45 45 0', delay: 1500, narration: txt.rotate },
                    
                    // Test Patterning (Rectangular)
                    { cmd: '/pattern rect 2 2 12 12', delay: 3000, narration: txt.pat_rect },
                    { cmd: '/view fit', delay: 1000, narration: txt.zoom_pat },
                    
                    // Test Patterning (Circular around Global Z)
                    { cmd: '/pattern circ 4 360 z', delay: 3000, narration: txt.pat_circ_z },
                    { cmd: '/view fit', delay: 1000 },

                    // Test Patterning (Circular around CUSTOM Work Axis created earlier)
                    { cmd: '/pattern circ 6 360 X_Axis_Offset_Y5', delay: 3000, narration: txt.pat_circ_custom },
                    { cmd: '/view fit', delay: 1000, narration: txt.final_zoom },
                    
                    // Test Visual Aids
                    { cmd: '/bounds', delay: 1500, narration: txt.bounds },
                    { cmd: '/wireframe', delay: 1500, narration: txt.wireframe },
                    { cmd: '/wireframe', delay: 1000, narration: txt.solid }, 
                    
                    // Test Analysis Tools
                    { cmd: '/section y', delay: 2000, narration: txt.section_on },
                    { cmd: '/section off', delay: 1000, narration: txt.section_off },
                    { cmd: '/props', delay: 2500, narration: txt.props },

                    // Test Measurement Tools (Automated Selection)
                    // Measures distance between (0,0,0) and (5,0,0)
                    { cmd: '/measure dist 0 0 0 5 0 0', delay: 3000, narration: txt.measure_dist },
                    // Measures 90 deg angle: Vertex(0,0,0) -> P1(5,0,0) -> P2(0,5,0)
                    { cmd: '/measure angle 0 0 0 5 0 0 0 5 0', delay: 3000, narration: txt.measure_angle },
                    { cmd: '/measure off', delay: 1000, narration: txt.measure_off },

                    // Test Collision Detection
                    // Move object to position 17,5,0 (Original was at 5,5,0. Rect pattern dx=12 creates a copy at 17,5,0. Overlap!)
                    { cmd: '/collision', delay: 1500, narration: txt.col_enable },
                    { cmd: '/move 17 5 0', delay: 3000, narration: txt.col_trigger }, 
                    { cmd: '/move 5 5 0', delay: 2000, narration: txt.col_clear },
                    { cmd: '/collision', delay: 1000, narration: txt.col_disable },

                    // Test Annotations
                    // Uses the currently selected object (the main model from the move command)
                    { cmd: '/annotate Main_Assy', delay: 2000, narration: txt.annot_add },
                    { cmd: '/hideannotations', delay: 1500, narration: txt.annot_hide },
                    { cmd: '/showannotations', delay: 1500, narration: txt.annot_show },
                    { cmd: '/annotate clear', delay: 1500, narration: txt.annot_clear },
                    
                    // Test Feature Tree, Properties, and Deletion
                    { cmd: '/tree', delay: 1500, narration: txt.tree_show },
                    { cmd: '/setprop MaterialRef 8844-B', delay: 2000, narration: txt.prop_add },
                    { cmd: '/delprop MaterialRef', delay: 2000, narration: txt.prop_del },
                    { cmd: '/delete', delay: 2000, narration: txt.obj_del },
                    { cmd: '/tree', delay: 1000, narration: txt.tree_hide },

                    // Test Session Save
                    // Placed at the end to generate the artifact without interrupting flow
                    { cmd: '/save', delay: 2000, narration: txt.save_session },

                    // Final View adjustment
                    { cmd: '/view iso', delay: 1500, narration: txt.final_iso },
                    { cmd: '/view fit', delay: 1000, narration: txt.complete }
                ];

                for (const step of steps) {
                    addMessageToChat('system', `> Auto-Executing: <b>${step.cmd}</b>`);
                    
                    // Execute the command immediately (visual action starts)
                    executor(step.cmd);

                    // Create waiting conditions:
                    // 1. Minimum visual delay (so user can see what happened)
                    // 2. Narration completion (so audio isn't cut off)
                    const waitPromises = [];

                    if (step.delay) {
                        waitPromises.push(new Promise(r => setTimeout(r, step.delay)));
                    }

                    if (step.narration) {
                        waitPromises.push(speak(step.narration, code));
                    }

                    // Wait for BOTH to finish before moving to next step
                    await Promise.all(waitPromises);
                }
                
                addMessageToChat('system', `✅ <b>${txt.complete}</b>`);
                await speak(txt.complete, code);
            }
        }
    };
}