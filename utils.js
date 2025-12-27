// utils.js
// General helper functions.

export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getFilenameFromUrl(url) {
    if (!url) return 'Unknown';
    try {
         const parsedUrl = new URL(url);
         const pathSegments = parsedUrl.pathname.split('/');
         return pathSegments[pathSegments.length - 1] || 'file';
    } catch (e) {
        const parts = url.split('/');
        return parts[parts.length - 1] || 'file';
    }
}

export function getBackendHost() {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8086";
    }
    if (hostname === "www.truegeometry.com" || hostname === "truegeometry.com") {
        return "https://www.truegeometry.com"; 
    }
    return window.location.origin;
}

export function getMessageUrl() {
    return `${getBackendHost()}/agi/message`;
}