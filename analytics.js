// analytics.js
// Google Analytics Initialization

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-66726287-5');

// Export if needed, though GA relies on global window object
export { gtag };