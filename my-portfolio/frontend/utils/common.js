function loadComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    fetch(filePath)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
        })
        .then(data => { container.innerHTML = data; })
        .catch(err => console.error(`Error loading ${filePath}:`, err));
}

// Load Footer for all pages (filename must match case exactly: Vercel is case-sensitive)
loadComponent('footer-container', '../components/footer.html');

// Feedback widget: loads utils/feedback.js on every page that includes common.js.
// (feedback.js skips itself on the home page and after a visitor has submitted.)
(function loadFeedbackWidget() {
    if (document.getElementById('fw-widget-script')) return;
    var script = document.createElement('script');
    script.id = 'fw-widget-script';
    script.src = '../utils/feedback.js';
    script.defer = true;
    document.body.appendChild(script);
})();
