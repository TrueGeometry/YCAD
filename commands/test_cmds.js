// commands/test_cmds.js
import { addMessageToChat } from '../ui.js';
import { TRANSLATIONS } from './test_lang.js';
import { runDemoSequence } from './demos/demo_runner.js';
import { DEMO_REGISTRY } from './demos/registry.js';

// Helper for Text-to-Speech
function speak(text, langCode) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        if (langCode) {
            utterance.lang = langCode;
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang === langCode) || 
                          voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
            if (voice) utterance.voice = voice;
        }
        utterance.rate = 1.0; 
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
        setTimeout(resolve, 10000);
    });
}

export function getTestCommands(executor) {
    return {
        '/tg_test_ui': {
            desc: 'Run UI tests or build demos. Usage: /tg_test_ui [lang] OR /tg_test_ui build [item]',
            execute: async (argRaw) => {
                const args = argRaw ? argRaw.trim().split(/\s+/) : [];
                const firstArg = args[0] ? args[0].toLowerCase() : '';

                // --- BUILD DEMO ROUTING ---
                if (firstArg === 'build') {
                    const item = args[1] ? args[1].toLowerCase() : '';
                    
                    if (item && DEMO_REGISTRY[item]) {
                        await runDemoSequence(executor, DEMO_REGISTRY[item]);
                    } else {
                        const keys = Object.keys(DEMO_REGISTRY).join(', ');
                        addMessageToChat('system', `Usage: /tg_test_ui build [item]<br>Available Demos: ${keys}`);
                    }
                    return;
                }

                // --- STANDARD UI TEST SUITE ---
                const langKey = (firstArg && firstArg !== 'build') ? firstArg : 'english';
                const langData = TRANSLATIONS[langKey] || TRANSLATIONS['english'];
                const { code, ...txt } = langData;

                addMessageToChat('system', `🧪 <b>${txt.start}</b> (${langKey})`);
                await speak(txt.start, code);
                
                const steps = [
                    // --- 1. View & Origin ---
                    { cmd: '/view iso', delay: 2000, narration: txt.iso },
                    { cmd: '/origin', delay: 1500, narration: txt.origin_hide },
                    { cmd: '/origin', delay: 1500, narration: txt.origin_show },
                    { cmd: '/workplane offset XY 15', delay: 1500, narration: txt.offset_plane }, 
                    { cmd: '/workaxis offset X Y 5', delay: 1500, narration: txt.offset_axis },
                    { cmd: '/workplane angle XY X 45', delay: 1500, narration: txt.rot_plane },
                    { cmd: '/workaxis angle Y Z 30', delay: 1500, narration: txt.rot_axis },
                    
                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 2. Boolean Operations (CSG) ---
                    { cmd: '/parametric cube 8', delay: 1000, narration: txt.bool_setup },
                    { cmd: '/parametric cylinder 3 3 10', delay: 1000 },
                    { cmd: '/subtract @Cube_8 @Cylinder_3x3x10', delay: 3000, narration: txt.bool_sub },
                    
                    // Boolean Intersection Test
                    { cmd: '/parametric box 6 6 6', delay: 1000, narration: txt.bool_int },
                    { cmd: '/tag_last BoxInt', delay: 500 },
                    { cmd: '/parametric sphere 4', delay: 1000 },
                    { cmd: '/tag_last SphInt', delay: 500 },
                    { cmd: '/intersect @BoxInt @SphInt', delay: 3000 },
                    { cmd: '/delete @intersect_BoxInt_SphInt', delay: 1000 },

                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 3. Sketch & Extrude ---
                    { cmd: '/sketch_on XY', delay: 2000, narration: txt.sketch_start },
                    { cmd: '/sketch_draw rect 10 6', delay: 1500, narration: txt.sketch_rect },
                    { cmd: '/sketch_draw circle 2.5', delay: 1500, narration: txt.sketch_circ },
                    { cmd: '/sketch_draw equation', delay: 1500, narration: txt.sketch_eq }, 
                    { cmd: '/sketch_off', delay: 2000, narration: txt.sketch_end },
                    { cmd: '/extrude @SketchRect 5', delay: 2500, narration: txt.extrude },
                    { cmd: '/setprop @Extrude_SketchRect height 12', delay: 2500, narration: txt.param_change },
                    
                    // Fillet & Rename Test
                    { cmd: '/parametric cube 5', delay: 1000, narration: txt.fillet_op },
                    { cmd: '/move 15 0 0', delay: 500 },
                    { cmd: '/fillet @Cube_5 1', delay: 2000 },
                    { cmd: '/rename @Cube_5 RoundedBox', delay: 1500, narration: txt.rename_op },

                    // --- 4. History (Undo/Redo) ---
                    { cmd: '/move 0 5 0', delay: 1000 },
                    { cmd: '/undo', delay: 1500, narration: txt.history_undo },
                    { cmd: '/redo', delay: 1500, narration: txt.history_redo },

                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 5. Docking & Primitives ---
                    { cmd: '/parametric cube 4', delay: 1000, narration: txt.dock_setup },
                    { cmd: '/parametric cylinder 4 4 2', delay: 1000 },
                    { cmd: '/move 10 0 0', delay: 500 }, 
                    { cmd: '/dock @Cylinder_4x4x2 @Cube_4', delay: 2500, narration: txt.dock_action },
                    
                    // Extra Primitives
                    { cmd: '/parametric torus 3 1', delay: 1000, narration: txt.prim_test },
                    { cmd: '/move 0 10 0', delay: 500 },
                    { cmd: '/parametric cone 2 4', delay: 1000 },
                    { cmd: '/move 5 10 0', delay: 500 },

                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 6. KBE Model ---
                    { cmd: '/kbe_model @HelicalGear', delay: 4000, narration: txt.kbe_load },
                    
                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 7. Loading & Assembly ---
                    { cmd: '/add https://s3-us-west-2.amazonaws.com/pion.truegeometry.com/geometryProgram//tmp/TGREC-da7882e70302eccc0b9e3537fb04a82c.glb', delay: 4000, narration: txt.load_model },
                    { cmd: '/view fit', delay: 1000, narration: txt.focus_model },
                    { cmd: '/move 15 5 0', delay: 1500, narration: txt.move },
                    { cmd: '/rotate 45 45 0', delay: 1500, narration: txt.rotate },
                    
                    { cmd: '/pattern rect 2 2 12 12', delay: 3000, narration: txt.pat_rect },
                    { cmd: '/view fit', delay: 1000, narration: txt.zoom_pat },
                    { cmd: '/pattern circ 4 360 z', delay: 3000, narration: txt.pat_circ_z },
                    { cmd: '/view fit', delay: 1000 },

                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 8. Analysis & Visuals ---
                    { cmd: '/bounds', delay: 1500, narration: txt.bounds },
                    { cmd: '/wireframe', delay: 1500, narration: txt.wireframe },
                    { cmd: '/wireframe', delay: 1000, narration: txt.solid }, 
                    { cmd: '/section y', delay: 2000, narration: txt.section_on },
                    { cmd: '/section off', delay: 1000, narration: txt.section_off },
                    { cmd: '/props', delay: 2500, narration: txt.props },
                    { cmd: '/measure dist 0 0 0 5 0 0', delay: 3000, narration: txt.measure_dist },
                    { cmd: '/measure angle 0 0 0 5 0 0 0 5 0', delay: 3000, narration: txt.measure_angle },
                    { cmd: '/measure off', delay: 1000, narration: txt.measure_off },

                    { cmd: '/collision', delay: 1500, narration: txt.col_enable },
                    { cmd: '/parametric cube 5', delay: 500 }, 
                    { cmd: '/move 15 5 0', delay: 3000, narration: txt.col_trigger }, 
                    { cmd: '/delete', delay: 1000, narration: txt.col_clear },
                    { cmd: '/collision', delay: 1000, narration: txt.col_disable },

                    { cmd: '/view iso', delay: 500 }, 
                    { cmd: '/view fit', delay: 1500, narration: txt.reset_view },

                    // --- 9. Annotations, Tree & Data ---
                    { cmd: '/annotate @Extrude_SketchRect Main_Part', delay: 2000, narration: txt.annot_add },
                    { cmd: '/hideannotations', delay: 1500, narration: txt.annot_hide },
                    { cmd: '/showannotations', delay: 1500, narration: txt.annot_show },
                    { cmd: '/annotate clear', delay: 1500, narration: txt.annot_clear },
                    { cmd: '/tree', delay: 1500, narration: txt.tree_show },
                    { cmd: '/setprop MaterialRef 8844-B', delay: 2000, narration: txt.prop_add },
                    { cmd: '/delprop MaterialRef', delay: 2000, narration: txt.prop_del },
                    { cmd: '/tree', delay: 1000, narration: txt.tree_hide },

                    // --- 10. Conclusion ---
                    { cmd: '/save', delay: 2000, narration: txt.save_session },
                    { cmd: '/export_glb', delay: 2000, narration: txt.export_op },
                    { cmd: '/view iso', delay: 1500, narration: txt.final_iso },
                    { cmd: '/view fit', delay: 1000, narration: txt.complete }
                ];

                for (const step of steps) {
                    addMessageToChat('system', `> Auto-Executing: <b>${step.cmd}</b>`);
                    executor(step.cmd);
                    const waitPromises = [];
                    if (step.delay) waitPromises.push(new Promise(r => setTimeout(r, step.delay)));
                    if (step.narration) waitPromises.push(speak(step.narration, code));
                    await Promise.all(waitPromises);
                }
                
                addMessageToChat('system', `✅ <b>${txt.complete}</b>`);
                await speak(txt.complete, code);
            }
        }
    };
}