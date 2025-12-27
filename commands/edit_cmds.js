// commands/edit_cmds.js
import * as THREE from 'three';
import { appState } from '../state.js';
import { addMessageToChat } from '../ui.js';
import { resolveTarget } from './utils.js';
import { deleteObject, highlightInTree, updateFeatureTree } from '../tree.js';
import { attachTransformControls, setTransformMode, getTaggableObjects } from '../viewer.js';

export const editCommands = {
    '/delete': {
        desc: 'Delete object (@Name)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (object) {
                deleteObject(object);
            } else {
                addMessageToChat('system', `⚠️ Object not found or none selected.`);
            }
        }
    },
    '/del': { alias: '/delete' },
    '/remove': { alias: '/delete' },

    '/move': {
        desc: 'Move object (x y z)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (!object) {
                addMessageToChat('system', '⚠️ No object selected to move.');
                return;
            }
            const numbers = argRaw.match(/-?\d+(\.\d+)?/g);
            if (!numbers || numbers.length === 0) {
                appState.currentDisplayObject = object;
                attachTransformControls(object);
                setTransformMode('translate');
                highlightInTree(object);
                addMessageToChat('system', `Activated Move Tool for ${name}`);
            } else {
                const x = numbers[0] ? parseFloat(numbers[0]) : object.position.x;
                const y = numbers[1] ? parseFloat(numbers[1]) : object.position.y;
                const z = numbers[2] ? parseFloat(numbers[2]) : object.position.z;
                object.position.set(x, y, z);
                attachTransformControls(object);
                addMessageToChat('system', `Moved ${name} to [${x}, ${y}, ${z}]`);
            }
        }
    },
    '/translate': { alias: '/move' },

    '/rotate': {
        desc: 'Rotate object (deg x y z)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (!object) {
                addMessageToChat('system', '⚠️ No object selected to rotate.');
                return;
            }
            const numbers = argRaw.match(/-?\d+(\.\d+)?/g);
            if (!numbers || numbers.length === 0) {
                appState.currentDisplayObject = object;
                attachTransformControls(object);
                setTransformMode('rotate');
                highlightInTree(object);
                addMessageToChat('system', `Activated Rotate Tool for ${name}`);
            } else {
                const x = numbers[0] ? THREE.MathUtils.degToRad(parseFloat(numbers[0])) : object.rotation.x;
                const y = numbers[1] ? THREE.MathUtils.degToRad(parseFloat(numbers[1])) : object.rotation.y;
                const z = numbers[2] ? THREE.MathUtils.degToRad(parseFloat(numbers[2])) : object.rotation.z;
                object.rotation.set(x, y, z);
                attachTransformControls(object);
                addMessageToChat('system', `Rotated ${name} to [${parseFloat(numbers[0]||0)}°, ${parseFloat(numbers[1]||0)}°, ${parseFloat(numbers[2]||0)}°]`);
            }
        }
    },
    '/rot': { alias: '/rotate' },

    '/dock': {
        desc: 'Snap object to another (@Src @Tgt)',
        execute: (argRaw) => {
            // Parse arguments for mentions
            const mentions = argRaw.match(/@([\w\d_-]+)/g);
            const objects = getTaggableObjects();
            
            let sourceObj = null;
            let targetObj = null;
            let sourceName = "";
            let targetName = "";

            if (!mentions || mentions.length === 0) {
                 // No mentions, try to dock selected to... nothing? invalid.
                 addMessageToChat('system', 'Usage: /dock @Target (if selected) or /dock @Source @Target');
                 return;
            }

            if (mentions.length === 1) {
                // Dock currently selected TO the mentioned object
                sourceObj = appState.currentDisplayObject;
                const match = objects.find(o => '@' + o.name.toLowerCase() === mentions[0].toLowerCase());
                if (match) targetObj = match.object;
            } else if (mentions.length >= 2) {
                // Dock first mention TO second mention
                const match1 = objects.find(o => '@' + o.name.toLowerCase() === mentions[0].toLowerCase());
                const match2 = objects.find(o => '@' + o.name.toLowerCase() === mentions[1].toLowerCase());
                if (match1) sourceObj = match1.object;
                if (match2) targetObj = match2.object;
            }

            if (!sourceObj || !targetObj) {
                addMessageToChat('system', '⚠️ Could not identify both objects.');
                return;
            }

            if (sourceObj === targetObj) {
                addMessageToChat('system', '⚠️ Cannot dock an object to itself.');
                return;
            }
            
            sourceName = sourceObj.userData.filename || sourceObj.name;
            targetName = targetObj.userData.filename || targetObj.name;

            // Calculate Bounding Boxes
            const boxS = new THREE.Box3().setFromObject(sourceObj);
            const boxT = new THREE.Box3().setFromObject(targetObj);

            if (boxS.isEmpty() || boxT.isEmpty()) {
                addMessageToChat('system', '⚠️ Objects have invalid bounds.');
                return;
            }

            const cS = new THREE.Vector3(); boxS.getCenter(cS);
            const sizeS = new THREE.Vector3(); boxS.getSize(sizeS);
            const cT = new THREE.Vector3(); boxT.getCenter(cT);
            const sizeT = new THREE.Vector3(); boxT.getSize(sizeT);

            // Determine relative direction
            const dir = new THREE.Vector3().subVectors(cT, cS);
            const absX = Math.abs(dir.x);
            const absY = Math.abs(dir.y);
            const absZ = Math.abs(dir.z);

            // Start with current position
            const newPos = sourceObj.position.clone();
            
            if (absX >= absY && absX >= absZ) {
                // Align on X axis
                const sign = Math.sign(dir.x) || 1;
                newPos.x = cT.x - sign * ((sizeT.x + sizeS.x) / 2 + 0.01); // 0.01 padding
                newPos.y = cT.y;
                newPos.z = cT.z;
            } else if (absY >= absX && absY >= absZ) {
                // Align on Y axis
                const sign = Math.sign(dir.y) || 1;
                newPos.y = cT.y - sign * ((sizeT.y + sizeS.y) / 2 + 0.01);
                newPos.x = cT.x;
                newPos.z = cT.z;
            } else {
                // Align on Z axis
                const sign = Math.sign(dir.z) || 1;
                newPos.z = cT.z - sign * ((sizeT.z + sizeS.z) / 2 + 0.01);
                newPos.x = cT.x;
                newPos.y = cT.y;
            }

            sourceObj.position.copy(newPos);
            sourceObj.updateMatrixWorld();
            
            if (appState.currentDisplayObject === sourceObj) {
                attachTransformControls(sourceObj);
            }

            addMessageToChat('system', `Docked <b>${sourceName}</b> adjacent to <b>${targetName}</b>.`);
        }
    },

    '/setprop': {
        desc: 'Set property (@Obj key val)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (!object) { addMessageToChat('system', '⚠️ No object selected.'); return; }
            
            const clean = argRaw.replace(/@[\w\d_-]+/g, '').trim();
            const args = clean.split(/\s+/);
            
            if (args.length < 2) { addMessageToChat('system', 'Usage: /setprop key value'); return; }
            
            const key = args[0];
            const val = args.slice(1).join(' ');
            
            if(!object.userData) object.userData = {};
            object.userData[key] = val;
            
            addMessageToChat('system', `Set ${name}.${key} = ${val}`);
            updateFeatureTree();
        }
    },

    '/delprop': {
        desc: 'Delete property (@Obj key)',
        execute: (argRaw) => {
            const { object, name } = resolveTarget(argRaw);
            if (!object) { addMessageToChat('system', '⚠️ No object selected.'); return; }
            
            const clean = argRaw.replace(/@[\w\d_-]+/g, '').trim();
            const key = clean.split(/\s+/)[0];
            
            if (!key) return;
            
            if(object.userData && object.userData[key]) {
                delete object.userData[key];
                addMessageToChat('system', `Removed ${name}.${key}`);
                updateFeatureTree();
            } else {
                addMessageToChat('system', `Property ${key} not found.`);
            }
        }
    }
};