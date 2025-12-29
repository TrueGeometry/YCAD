// demos_ui.js
import { DEMO_REGISTRY } from './commands/demos/registry.js';

export function initDemos() {
    const list = document.getElementById('demo-list');
    if (!list) return;

    window.handleDemoClick = (demoKey) => {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-button');
        if (input && sendBtn) {
            input.value = `/tg_test_ui build ${demoKey}`;
            input.dispatchEvent(new Event('input'));
            input.focus();
            sendBtn.click();
        }
    };

    // Deduplicate aliases (values that point to the same demo data)
    const seen = new Set();
    const uniqueKeys = [];
    
    // Sort keys alphabetically for consistent display
    const sortedKeys = Object.keys(DEMO_REGISTRY).sort();

    sortedKeys.forEach(key => {
        const demoData = DEMO_REGISTRY[key];
        if (!seen.has(demoData)) {
            seen.add(demoData);
            uniqueKeys.push(key);
        }
    });

    list.innerHTML = uniqueKeys.map(key => `
        <button onclick="window.handleDemoClick('${key}')"
                class="text-[11px] font-medium bg-white text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-full px-3 py-1.5 transition-all shadow-sm flex items-center gap-1 active:scale-95">
            ${key.charAt(0).toUpperCase() + key.slice(1)}
        </button>
    `).join('');
    
    // Refresh icons for new elements
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}