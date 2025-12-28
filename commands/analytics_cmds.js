// commands/analytics_cmds.js
import * as THREE from 'three';
import { resolveTarget } from './utils.js';
import { addMessageToChat } from '../ui.js';
import { showPhysicalProperties, computePhysicalProperties } from '../properties.js';
import { toggleSectionMode, updateSectionAxis, resetSection, isSectionMode } from '../section.js';
import { toggleTool, deactivateTools, toggleWireframe, toggleBoundingBox, addMeasurementPoint } from '../tools.js';
import { toggleCollisions } from '../collisions.js';
import { generateReport } from '../report.js';

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

    '/report_gen': {
        desc: 'Generate PDF Report (@Component optional)',
        execute: (argRaw) => {
            // Only target specific object if argument provided
            if (argRaw && argRaw.trim().length > 0) {
                const { object, name } = resolveTarget(argRaw);
                
                if (object) {
                    addMessageToChat('system', `Generating report for component: ${name}...`);
                    generateReport(object);
                } else {
                    addMessageToChat('system', `⚠️ Could not find component '${argRaw}'. Generating full assembly report instead.`);
                    generateReport(null);
                }
            } else {
                addMessageToChat('system', `Generating full assembly report...`);
                generateReport(null);
            }
        }
    },

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
        desc: 'Measure (dist [pts], angle [pts], off)',
        execute: (argRaw) => {
            const args = argRaw.trim().split(/\s+/);
            const subCmd = args[0].toLowerCase();
            
            if (subCmd === 'off') {
                deactivateTools();
                addMessageToChat('system', 'Measurement tools disabled.');
            } else if (subCmd === 'distance' || subCmd === 'dist') {
                toggleTool('distance');
                // Support automatic coordinate entry: /measure dist x1 y1 z1 x2 y2 z2
                if (args.length >= 7) {
                    const p1 = new THREE.Vector3(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]));
                    const p2 = new THREE.Vector3(parseFloat(args[4]), parseFloat(args[5]), parseFloat(args[6]));
                    if (!isNaN(p1.x) && !isNaN(p2.x)) {
                         addMeasurementPoint(p1);
                         addMeasurementPoint(p2);
                    }
                }
            } else if (subCmd === 'angle') {
                toggleTool('angle');
                // Support automatic coordinate entry: /measure angle vx vy vz p1x p1y p1z p2x p2y p2z
                if (args.length >= 10) {
                     const v = new THREE.Vector3(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]));
                     const p1 = new THREE.Vector3(parseFloat(args[4]), parseFloat(args[5]), parseFloat(args[6]));
                     const p2 = new THREE.Vector3(parseFloat(args[7]), parseFloat(args[8]), parseFloat(args[9]));
                     if (!isNaN(v.x) && !isNaN(p1.x) && !isNaN(p2.x)) {
                         addMeasurementPoint(v);
                         addMeasurementPoint(p1);
                         addMeasurementPoint(p2);
                     }
                }
            } else {
                addMessageToChat('system', 'Usage: /measure [distance|angle|off] (optional coords)');
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
    },

    '/collision': {
        desc: 'Toggle collision detection',
        execute: () => {
            toggleCollisions();
        }
    }
};