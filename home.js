// home.js
import { DEMO_METADATA } from './commands/demos/registry.js';

// Global Event Handler for Trends
window.handleTrendClick = (text) => {
    const APP_URL = "index.html";
    window.location.href = `${APP_URL}?txt=${encodeURIComponent(text)}`;
};

document.addEventListener('DOMContentLoaded', () => {
    const trendingContainer = document.getElementById('trending-list');
    const trendingSection = document.getElementById('trending-section');
    const grid = document.getElementById('designs-grid');
    
    // Point to the main application
    const APP_URL = "index.html"; 

    // 1. Trending Logic
    if (trendingContainer) {
        fetch('https://www.truegeometry.com/api/getTrends')
            .then(response => response.json())
            .then(data => {
                if (data && data.WEB && Array.isArray(data.WEB) && data.WEB.length > 0) {
                    const trendsHtml = data.WEB.map(item => `
                        <button class="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-full text-xs transition-colors mb-2 border border-blue-100 shadow-sm flex items-center gap-1"
                                onclick="gtag('event', 'click', {'event_category': 'Trending', 'event_label': '${item.name}'}); window.handleTrendClick('${item.name.replace(/'/g, "\\'")}')">
                            ${item.name}
                        </button>
                    `).join(' ');
                    trendingContainer.innerHTML = trendsHtml;
                    trendingSection.classList.remove('hidden');
                }
            })
            .catch(err => console.error('Failed to load trends:', err));
    }

    // 2. Dynamic Demo Grid
    if (grid) {
        const demoKeys = Object.keys(DEMO_METADATA);
        
        grid.innerHTML = demoKeys.map(key => {
            const meta = DEMO_METADATA[key];
            return `
            <a href="${APP_URL}?demo=${key}" class="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 card-enter">
                <div class="aspect-[4/3] bg-gray-50 relative flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <i data-lucide="${meta.icon || 'box'}" class="w-12 h-12 text-gray-300 group-hover:text-blue-500 transition-colors"></i>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">${meta.name}</h3>
                    <p class="text-xs text-gray-500">Interactive 3D Build</p>
                </div>
            </a>
            `;
        }).join('');
    }

    // Initialize Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});