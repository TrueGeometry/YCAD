// tree.js
// Scene Graph / Feature Tree Logic

import * as THREE from 'three';
import { appState } from './state.js';
import { attachTransformControls } from './viewer.js';
import { addMessageToChat } from './ui.js';
import { computePhysicalProperties } from './properties.js'; // Import for immutable props

const treePanel = document.getElementById('feature-tree');
const treeContent = document.getElementById('tree-content');
const treeBtn = document.getElementById('tree-btn');

export function toggleFeatureTree() {
    treePanel.classList.toggle('visible');
    const isVisible = treePanel.classList.contains('visible');
    treeBtn.classList.toggle('active-mode', isVisible);
    
    if (isVisible) {
        updateFeatureTree();
    }
}

export function updateFeatureTree() {
    if (!treeContent) return;
    treeContent.innerHTML = '';
    
    const rootList = document.createElement('ul');
    rootList.className = 'tree-root';
    
    // Sort so "Origin" and "Work Features" come first
    const children = [...appState.scene.children].sort((a, b) => {
        const scoreA = (a.name === 'Origin' ? 0 : a.name === 'Work Features' ? 1 : 10);
        const scoreB = (b.name === 'Origin' ? 0 : b.name === 'Work Features' ? 1 : 10);
        return scoreA - scoreB;
    });

    children.forEach(child => {
        // Exclude internal tools to reduce noise
        if (child.type === 'TransformControls' || 
            child.type === 'GridHelper' || 
            child.type === 'Box3Helper' ||
            child.type === 'PlaneHelper' ||
            child.name === 'GridHelper') {
            return;
        }

        const node = createTreeNode(child);
        rootList.appendChild(node);
    });
    
    treeContent.appendChild(rootList);
    
    // Refresh icons
    if (window.lucide) window.lucide.createIcons();
    
    // Reselect active item if it exists
    if (appState.currentDisplayObject) {
        highlightInTree(appState.currentDisplayObject);
    }
}

export function deleteObject(obj) {
    if (!obj) return;
    
    // Prevent deleting Origin components
    if (obj.userData && (obj.userData.type === 'WorkPlane' || obj.userData.type === 'WorkAxis' || obj.userData.type === 'WorkPoint')) {
         if (obj.parent && obj.parent.name === 'Origin') {
             addMessageToChat('system', '⚠️ Cannot delete Default Origin geometry.');
             return;
         }
    }

    // Store name for message
    const name = obj.name || obj.userData.filename || 'Object';
    
    // Recursively dispose geometry and materials
    obj.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });
    
    // Remove from parent
    if (obj.parent) {
        obj.parent.remove(obj);
    }
    
    // Handle Global State Cleanup
    if (appState.currentDisplayObject === obj) {
        appState.currentDisplayObject = null;
        attachTransformControls(null);
    }
    if (appState.selectedObject === obj) {
        appState.selectedObject = null;
        attachTransformControls(null);
    }

    addMessageToChat('system', `Deleted: ${name}`);
    
    // Refresh Tree
    updateFeatureTree();
}

function createTreeNode(obj) {
    const li = document.createElement('li');
    li.className = 'tree-node';
    
    const content = document.createElement('div');
    content.className = 'tree-item-content';
    content.dataset.uuid = obj.uuid; 
    
    // Check for children
    let validChildren = [];
    if (obj.children) {
        validChildren = obj.children.filter(c => c.type !== 'Bone' && c.type !== 'LineSegments'); // Exclude edge helpers 
    }
    const hasChildren = validChildren.length > 0;

    // 1. Toggle Icon for Children
    const toggleIcon = document.createElement('i');
    toggleIcon.className = 'tree-icon toggle-icon';
    toggleIcon.setAttribute('data-lucide', hasChildren ? 'chevron-down' : 'circle-dashed'); 
    toggleIcon.style.visibility = hasChildren ? 'visible' : 'hidden'; 
    if (!hasChildren) toggleIcon.style.opacity = "0.3"; 
    content.appendChild(toggleIcon);

    // 2. Type Icon
    const typeIcon = document.createElement('i');
    typeIcon.className = 'tree-icon type-icon';
    typeIcon.setAttribute('data-lucide', getIconForType(obj));
    // Colorize origin elements
    if (obj.userData.type === 'WorkPlane') typeIcon.style.color = '#f59e0b';
    if (obj.userData.type === 'WorkAxis') typeIcon.style.color = '#3b82f6';
    if (obj.userData.type === 'WorkPoint') typeIcon.style.color = '#10b981';
    content.appendChild(typeIcon);
    
    // 3. Name
    const nameSpan = document.createElement('span');
    let displayName = obj.name || `[${obj.type}]`;
    if (obj.userData && obj.userData.filename) displayName = obj.userData.filename;
    nameSpan.textContent = displayName;
    nameSpan.style.flexGrow = 1;
    content.appendChild(nameSpan);

    // 4. Visibility Toggle
    const visBtn = document.createElement('div');
    visBtn.className = 'tree-vis-btn';
    visBtn.innerHTML = `<i data-lucide="${obj.visible ? 'eye' : 'eye-off'}"></i>`;
    visBtn.onclick = (e) => {
        e.stopPropagation();
        obj.visible = !obj.visible;
        visBtn.innerHTML = `<i data-lucide="${obj.visible ? 'eye' : 'eye-off'}"></i>`;
        if(window.lucide) window.lucide.createIcons({ root: visBtn });
    };
    content.appendChild(visBtn);
    
    // 5. Delete Button (Only for non-origin items)
    const canDelete = !(obj.name === 'Origin' || (obj.parent && obj.parent.name === 'Origin'));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tree-delete-btn';
    deleteBtn.title = "Delete";
    if (canDelete) {
        const delIcon = document.createElement('i');
        delIcon.setAttribute('data-lucide', 'trash-2');
        deleteBtn.appendChild(delIcon);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
                deleteObject(obj);
            }
        });
    } else {
        deleteBtn.style.visibility = 'hidden';
    }
    content.appendChild(deleteBtn);

    li.appendChild(content);

    // --- Properties Section ---
    if (obj.isMesh || obj.isGroup || obj.isObject3D) {
        // Skip properties for Origin components to keep tree clean
        if (obj.userData.type !== 'WorkPlane' && obj.userData.type !== 'WorkAxis' && obj.userData.type !== 'WorkPoint') {
            const propsUl = document.createElement('ul');
            propsUl.className = 'tree-props';
            
            const propToggleRow = document.createElement('div');
            propToggleRow.className = 'tree-item-content';
            propToggleRow.style.paddingLeft = '24px'; 
            propToggleRow.style.fontSize = '11px';
            propToggleRow.style.color = '#666';
            
            const propIcon = document.createElement('i');
            propIcon.className = 'tree-icon';
            propIcon.setAttribute('data-lucide', 'settings-2');
            propIcon.style.width = '12px'; propIcon.style.height='12px';
            
            const propText = document.createElement('span');
            propText.textContent = "Properties / Variables";
            
            propToggleRow.appendChild(propIcon);
            propToggleRow.appendChild(propText);
            
            propToggleRow.addEventListener('click', (e) => {
                 e.stopPropagation();
                 const isHidden = propsUl.style.display !== 'block';
                 propsUl.style.display = isHidden ? 'block' : 'none';
                 if (isHidden) {
                     propText.style.fontWeight = 'bold';
                     renderPropertiesList(propsUl, obj);
                 } else {
                     propText.style.fontWeight = 'normal';
                 }
            });
            
            li.appendChild(propToggleRow);
            li.appendChild(propsUl);
        }
    }

    // --- Event Handlers ---

    // Toggle Collapse/Expand Children
    let childrenUl = null;
    toggleIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (childrenUl) {
            const isHidden = childrenUl.style.display === 'none';
            childrenUl.style.display = isHidden ? 'block' : 'none';
            toggleIcon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-right');
            if (window.lucide) window.lucide.createIcons({ root: content });
        }
    });

    // Select Object
    content.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tree-item-content.selected').forEach(el => el.classList.remove('selected'));
        content.classList.add('selected');
        
        // Allow selecting meshes (models), and Work Features.
        const isInteractive = (
            (obj.name === 'loaded_glb' || obj.name === 'fallback_cube') ||
            (obj.userData && (obj.userData.type === 'WorkPlane' || obj.userData.type === 'WorkAxis' || obj.userData.type === 'WorkPoint'))
        );

        if (isInteractive) {
             appState.currentDisplayObject = obj;
             attachTransformControls(obj);
             
             // Auto-show if hidden (User Experience improvement for planes)
             if (!obj.visible) {
                obj.visible = true;
                visBtn.innerHTML = `<i data-lucide="eye"></i>`;
                if(window.lucide) window.lucide.createIcons({ root: visBtn });
             }
        } else {
             attachTransformControls(null);
        }
    });

    // --- Recursive Children ---
    if (hasChildren) {
        childrenUl = document.createElement('ul');
        childrenUl.className = 'tree-children';
        childrenUl.style.display = 'block'; 
        validChildren.forEach(child => {
            childrenUl.appendChild(createTreeNode(child));
        });
        li.appendChild(childrenUl);
    }
    
    return li;
}

// Renders the list of key-value pairs
function renderPropertiesList(container, obj) {
    container.innerHTML = '';
    
    // 1. Immutable System Properties
    const createImmutableRow = (key, value) => {
        const row = document.createElement('li');
        row.className = 'prop-row prop-immutable';
        row.innerHTML = `
            <span class="prop-key">${key}</span>
            <input type="text" class="prop-input prop-val" value="${value}" readonly title="System Property (Immutable)">
            <span class="tree-icon" style="width:12px;"><i data-lucide="lock" style="width:10px;"></i></span>
        `;
        container.appendChild(row);
    };

    createImmutableRow('Name', obj.name || obj.userData.filename || 'N/A');
    createImmutableRow('UUID', obj.uuid.slice(0, 8) + '...');
    
    const physics = computePhysicalProperties(obj);
    if (physics) {
        createImmutableRow('Mass', `${physics.mass.toFixed(2)} g`);
        createImmutableRow('Volume', `${physics.volume.toFixed(2)} cm³`);
    }

    // 2. Mutable User Data (JSON)
    if (!obj.userData) obj.userData = {};
    
    Object.keys(obj.userData).forEach(key => {
        if (key === 'filename' || key === 'sourceUrl' || key === 'type') return;
        
        const row = document.createElement('li');
        row.className = 'prop-row';
        
        const keyInput = document.createElement('span');
        keyInput.className = 'prop-key';
        keyInput.textContent = key;
        
        const valInput = document.createElement('input');
        valInput.className = 'prop-input prop-val';
        valInput.value = obj.userData[key];
        
        valInput.addEventListener('change', () => {
             obj.userData[key] = valInput.value;
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'prop-action-btn';
        delBtn.innerHTML = '<i data-lucide="x" style="width:12px;"></i>';
        delBtn.title = "Remove Variable";
        delBtn.addEventListener('click', () => {
            delete obj.userData[key];
            renderPropertiesList(container, obj); 
        });

        row.appendChild(keyInput);
        row.appendChild(valInput);
        row.appendChild(delBtn);
        container.appendChild(row);
    });

    // 3. Add New Property Row
    const addRow = document.createElement('li');
    addRow.className = 'prop-add-row';
    
    const newKeyInput = document.createElement('input');
    newKeyInput.className = 'prop-input';
    newKeyInput.placeholder = "New Key";
    newKeyInput.style.width = "40%";
    
    const newValInput = document.createElement('input');
    newValInput.className = 'prop-input';
    newValInput.placeholder = "Value";
    newValInput.style.width = "40%";
    
    const addBtn = document.createElement('button');
    addBtn.className = 'prop-add-btn';
    addBtn.innerHTML = '<i data-lucide="plus" style="width:12px;"></i>';
    addBtn.title = "Add Variable";
    
    const doAdd = () => {
        const k = newKeyInput.value.trim();
        const v = newValInput.value.trim();
        if (k) {
            obj.userData[k] = v;
            renderPropertiesList(container, obj);
        }
    };

    addBtn.addEventListener('click', doAdd);
    newValInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') doAdd(); });

    addRow.appendChild(newKeyInput);
    addRow.appendChild(newValInput);
    addRow.appendChild(addBtn);
    container.appendChild(addRow);
    
    if (window.lucide) window.lucide.createIcons({ root: container });
}

function getIconForType(obj) {
    if (obj.userData && obj.userData.type === 'WorkPlane') return 'square';
    if (obj.userData && obj.userData.type === 'WorkAxis') return 'move-diagonal';
    if (obj.userData && obj.userData.type === 'WorkPoint') return 'dot';
    
    const type = obj.type;
    if (type.includes('Light')) return 'lightbulb';
    if (type.includes('Camera')) return 'camera';
    if (type === 'Mesh') return 'box';
    if (type === 'Group' || type === 'Object3D' || type === 'Scene') return 'folder';
    if (type === 'LineSegments') return 'minus';
    return 'circle';
}

export function highlightInTree(object) {
    document.querySelectorAll('.tree-item-content.selected').forEach(el => el.classList.remove('selected'));
    
    const treePanel = document.getElementById('feature-tree');
    if (!treePanel.classList.contains('visible')) return;

    if (!object) return;

    const el = document.querySelector(`.tree-item-content[data-uuid="${object.uuid}"]`);
    if (el) {
        el.classList.add('selected');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}