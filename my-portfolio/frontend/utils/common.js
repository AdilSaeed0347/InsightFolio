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
