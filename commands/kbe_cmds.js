// commands/kbe_cmds.js
import { addMessageToChat } from '../ui.js';
import { loadAndDisplayGLB } from '../loader.js';
import { KBE_ASSETS } from '../kbe_data.js';
import { appState } from '../state.js';

// Base URL for KBE assets (assuming a standard hosted location)
const KBE_BASE_URL = "https://s3-us-west-2.amazonaws.com/pion.truegeometry.com/geometryProgram/kbe_assets/";

export const kbeCommands = {
    '/kbe_model': {
        desc: 'Load a KBE Design Model (@Name)',
        execute: (argRaw, cmdString) => {
            const cleanArg = argRaw.replace(/@/g, '').trim();
            if (!cleanArg) {
                addMessageToChat('system', 'Usage: /KBE_model @Name<br>Example: /KBE_model @HelicalGear');
                return;
            }

            // Case-insensitive search
            const match = KBE_ASSETS.find(asset => asset.name.toLowerCase() === cleanArg.toLowerCase());

            if (match) {
                // Update the global text context so the AI knows what we are working on
                appState.globalTxtValue = match.name;

                addMessageToChat('agent', `<b>Found Design: ${match.name}</b><br>${match.description}`);
                
                // Construct URL
                // We assume the file extension is .glb and the name matches the ID
                const modelUrl = `${KBE_BASE_URL}${match.name}.glb`;
                
                // Load the model
                loadAndDisplayGLB(modelUrl, 'replace', cmdString);
            } else {
                // Fuzzy search suggestion
                const suggestions = KBE_ASSETS
                    .filter(asset => asset.name.toLowerCase().includes(cleanArg.toLowerCase()))
                    .slice(0, 5)
                    .map(s => s.name);
                
                if (suggestions.length > 0) {
                    addMessageToChat('system', `⚠️ Model '${cleanArg}' not found. Did you mean:<br>${suggestions.join('<br>')}`);
                } else {
                    addMessageToChat('system', `⚠️ Design '${cleanArg}' not found in the catalog.`);
                }
            }
        }
    }
};