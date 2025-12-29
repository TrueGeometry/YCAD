// commands.js
// Main Registry that aggregates command modules.

import { addMessageToChat } from './ui.js';
import { originCommands } from './commands/origin_cmds.js';
import { patternCommands } from './commands/pattern_cmds.js';
import { ioCommands } from './commands/io_cmds.js';
import { exportCommands } from './commands/export_cmds.js'; // Import Export commands
import { analyticsCommands } from './commands/analytics_cmds.js';
import { editCommands } from './commands/edit_cmds.js';
import { viewCommands } from './commands/view_cmds.js';
import { kbeCommands } from './commands/kbe_cmds.js'; // Import KBE commands
import { primitiveCommands } from './commands/primitive_cmds.js'; // Import Primitive commands
import { sketchCommands } from './commands/sketch_cmds.js'; // Import Sketch commands
import { csgCommands } from './commands/csg_cmds.js'; // Import CSG commands
import { getTestCommands } from './commands/test_cmds.js';
import { recordAction } from './recorder.js'; 
import { pushUndoState } from './history.js'; // Import Undo logic

const COMMAND_REGISTRY = {
    ...originCommands,
    ...patternCommands,
    ...ioCommands,
    ...exportCommands, // Register Export commands
    ...analyticsCommands,
    ...editCommands,
    ...viewCommands,
    ...kbeCommands,
    ...primitiveCommands, // Register Primitives
    ...sketchCommands,    // Register Sketch Commands
    ...csgCommands,       // Register CSG Commands
    // Inject the executor so the test module can run commands without circular imports
    ...getTestCommands((cmd) => executeCommand(cmd)),

    '/help': {
        desc: 'List all commands',
        execute: () => {
            const list = getCommandList();
            let rows = list.map(c => 
                `<tr><td style="padding:4px 8px 4px 0; color:#2563eb; font-weight:bold; white-space:nowrap;">${c.cmd}</td><td style="color:#4b5563;">${c.desc}</td></tr>`
            ).join('');
            
            addMessageToChat('system', `
                <div style="background:rgba(255,255,255,0.9); border:1px solid #e5e7eb; border-radius:8px; padding:12px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="font-weight:bold; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:6px; color:#1f2937;">Available Commands</div>
                    <table style="font-size:0.9em; width:100%; border-collapse:collapse;">${rows}</table>
                </div>
            `);
        }
    },
    '/h': { alias: '/help' }
};

export function getCommandList() {
    return Object.entries(COMMAND_REGISTRY)
        .filter(([_, val]) => !val.alias) // Exclude aliases from listing
        .map(([key, val]) => ({ cmd: key, desc: val.desc }));
}

// List of commands that modify geometry and should trigger an undo snapshot
const MODIFICATION_COMMANDS = [
    '/move', '/translate', '/rotate', '/rot', '/scale', '/dock',
    '/delete', '/del', '/remove', '/setprop', '/delprop',
    '/add', '/open', '/parametric', '/parameteric', '/addshape',
    '/pattern', '/workplane', '/workaxis', '/kbe_model',
    '/extrude', '/subtract', '/union', '/intersect',
    '/sketch_on', '/sketch_draw', '/annotate', '/annotate clear'
];

function isDestructive(cmd) {
    if (MODIFICATION_COMMANDS.includes(cmd)) return true;
    // Also check wildcard logic for simple checks
    if (cmd.startsWith('/parametric') || cmd.startsWith('/sketch')) return true;
    return false;
}

export async function executeCommand(input) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const argRaw = input.substring(cmd.length).trim();

    if (COMMAND_REGISTRY[cmd]) {
        // Resolve alias
        let def = COMMAND_REGISTRY[cmd];
        if (def.alias) {
            // Check original name for destructive check if alias is used
            if (isDestructive(def.alias)) pushUndoState();
            def = COMMAND_REGISTRY[def.alias];
        } else {
             if (isDestructive(cmd)) pushUndoState();
        }
        
        // Execute (support async commands)
        await def.execute(argRaw);
        
        // Record the command if successful
        recordAction('cmd', input);
        
        return true;
    } else {
        addMessageToChat('system', `⚠️ Unknown command: ${cmd}`);
        return false;
    }
}