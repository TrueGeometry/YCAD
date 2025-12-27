// trends.js
// Handles fetching and displaying trending topics.

export function initTrends() {
    window.handleTrendClick = (text) => {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-button');
        if (input && sendBtn) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
            input.focus();
            sendBtn.click();
        }
    };

    fetchTrends();
}

async function fetchTrends() {
    try {
        const response = await fetch('/api/getTrends');
        if (!response.ok) return; 
        const data = await response.json();
        if (data && data.WEB && Array.isArray(data.WEB)) {
            const list = document.getElementById('trending-list');
            const wrapper = document.getElementById('trending-wrapper');
            if (list && wrapper) {
                list.innerHTML = data.WEB.map(item => `
                    <button onclick="window.handleTrendClick('${item.name.replace(/'/g, "\\'")}')"
                            class="text-[11px] font-medium bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full px-3 py-1.5 transition-all shadow-sm flex items-center gap-1 active:scale-95">
                        ${item.name}
                    </button>
                `).join('');
                wrapper.classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
            }
        }
    } catch (e) {
        console.warn("Could not load trending questions:", e);
    }
}