// commands/analytics_cmds.js
import { resolveTarget } from './utils.js';
import { addMessageToChat } from '../ui.js';
import { showPhysicalProperties, computePhysicalProperties } from '../properties.js';
import { toggleSectionMode, updateSectionAxis, resetSection, isSectionMode } from '../section.js';
import { toggleTool, deactivateTools, toggleWireframe, toggleBoundingBox } from '../tools.js';

export const analyticsCommands = {
    '/props': {
        desc: 'Calculate properties',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (object) {
                const props = computePhysicalProperties(object);
                if (props) {
                    addMessageToChat('system', `
                        <b>Properties for ${name}:</b><br>
                        Mass: ${props.mass.toFixed(2)} g<br>
                        Volume: ${props.volume.toFixed(2)} cm³<br>
                        Area: ${props.area.toFixed(2)} units²
                    `);
                }
            } else {
                showPhysicalProperties();
            }
        }
    },
    '/properties': { alias: '/props' },

    '/section': {
        desc: 'Section tool (x, y, z, off)',
        execute: (argRaw) => {
            const arg = argRaw.toLowerCase();
            if (arg === 'off') {
                resetSection();
            } else if (['x', 'y', 'z'].includes(arg)) {
                if (!isSectionMode) toggleSectionMode();
                updateSectionAxis(arg);
                addMessageToChat('system', `Section active on ${arg.toUpperCase()}-axis.`);
            } else {
                toggleSectionMode();
            }
        }
    },

    '/measure': {
        desc: 'Measure (dist, angle, off)',
        execute: (argRaw) => {
            const arg = argRaw.toLowerCase();
            if (arg === 'off') {
                deactivateTools();
                addMessageToChat('system', 'Measurement tools disabled.');
            } else if (arg === 'distance' || arg === 'dist') {
                toggleTool('distance');
            } else if (arg === 'angle') {
                toggleTool('angle');
            } else {
                addMessageToChat('system', 'Usage: /measure [distance|angle|off]');
            }
        }
    },

    '/wireframe': {
        desc: 'Toggle wireframe',
        execute: () => {
            toggleWireframe();
            addMessageToChat('system', 'Toggled wireframe mode.');
        }
    },

    '/bounds': {
        desc: 'Toggle bounding box',
        execute: () => {
            toggleBoundingBox();
        }
    }
};