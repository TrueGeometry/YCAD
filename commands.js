// commands.js
// Main Registry that aggregates command modules.

import { addMessageToChat } from './ui.js';
import { originCommands } from './commands/origin_cmds.js';
import { patternCommands } from './commands/pattern_cmds.js';
import { ioCommands } from './commands/io_cmds.js';
import { analyticsCommands } from './commands/analytics_cmds.js';
import { editCommands } from './commands/edit_cmds.js';
import { viewCommands } from './commands/view_cmds.js';
import { getTestCommands } from './commands/test_cmds.js';

const COMMAND_REGISTRY = {
    ...originCommands,
    ...patternCommands,
    ...ioCommands,
    ...analyticsCommands,
    ...editCommands,
    ...viewCommands,
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

export function executeCommand(input) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const argRaw = input.substring(cmd.length).trim();

    if (COMMAND_REGISTRY[cmd]) {
        // Resolve alias
        let def = COMMAND_REGISTRY[cmd];
        if (def.alias) def = COMMAND_REGISTRY[def.alias];
        
        def.execute(argRaw);
        return true;
    } else {
        addMessageToChat('system', `⚠️ Unknown command: ${cmd}`);
        return false;
    }
}