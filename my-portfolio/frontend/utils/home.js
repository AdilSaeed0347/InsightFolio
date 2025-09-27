// Complete Home page functionality - Smooth and optimized
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully');
    initializeAllAnimations();
});

// Navigation fixes
window.addEventListener('pageshow', function(event) {
    setTimeout(initializeAllAnimations, 150);
});

window.addEventListener('focus', function() {
    if (document.visibilityState === 'visible') {
        setTimeout(initializeAllAnimations, 100);
    }
});

// Global variables to track intervals
let roleTypingTimeout = null;
let articlesAnimationInterval = null;
let certificateSliderInterval = null;

// Master initialization function
function initializeAllAnimations() {
    clearAllAnimations();
    setTimeout(() => {
        initializeRoleTyping();
        initializeArticlesAnimation();
        initializeCertificateSlider();
        initializeScrollAnimations();
    }, 100);
}

// Clear all existing animations
function clearAllAnimations() {
    if (roleTypingTimeout) clearTimeout(roleTypingTimeout);
    if (articlesAnimationInterval) clearInterval(articlesAnimationInterval);
    if (certificateSliderInterval) clearInterval(certificateSliderInterval);
    
    roleTypingTimeout = null;
    articlesAnimationInterval = null;
    certificateSliderInterval = null;
}

// Ultra-smooth role typing animation - no blinking or stuttering
function initializeRoleTyping() {
    const roles = [
        "Junior Machine Learning Engineer",
        "Deep Learning Specialist", 
        "Computer Vision Engineer",
        "Applied LLM Engineer",
        "Assistant RAG Developer"
    ];
    
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const dynamicRole = document.getElementById('dynamic-role');
    
    if (!dynamicRole) return;

    // Ensure element is properly set up
    dynamicRole.textContent = '';
    dynamicRole.style.opacity = '1';
    dynamicRole.style.visibility = 'visible';
    dynamicRole.style.display = 'inline-block';

    function typeRole() {
        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            // Smoothly delete characters
            charIndex--;
            dynamicRole.textContent = currentRole.substring(0, Math.max(0, charIndex));
            
            if (charIndex <= 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                charIndex = 0;
                roleTypingTimeout = setTimeout(typeRole, 1000); // Pause before typing next
                return;
            }
            
            roleTypingTimeout = setTimeout(typeRole, 30); // Fast deletion
        } else {
            // Smoothly type characters
            charIndex++;
            dynamicRole.textContent = currentRole.substring(0, charIndex);
            
            if (charIndex >= currentRole.length) {
                isDeleting = true;
                roleTypingTimeout = setTimeout(typeRole, 2500); // Display complete text
                return;
            }
            
            roleTypingTimeout = setTimeout(typeRole, 120); // Smooth typing speed
        }
    }

    // Start typing after initial delay
    roleTypingTimeout = setTimeout(typeRole, 1500);
}

// Articles animation - stable and smooth
function initializeArticlesAnimation() {
    const captions = [
        "How Deepseek introduces Mixture of Experts system",
        "Why Claude and Grok rapidly took high position in LLMs", 
        "The Evolution of Retrieval-Augmented Generation (RAG)",
        "Computer Vision: From CNNs to Vision Transformers",
        "Natural Language Processing: The Future of AI Communication",
        "Deep Learning Architectures: Innovations and Applications"
    ];
    
    let captionIndex = 0;
    let isAnimating = false;
    let isPaused = false;
    const dynamicCaption = document.getElementById('dynamic-caption');
    const articlesCard = document.querySelector('.articles-card');
    
    if (!dynamicCaption) return;
    
    // Initialize with first caption
    dynamicCaption.textContent = captions[0];
    dynamicCaption.classList.remove('fade-out', 'fade-in');
    captionIndex = 1;
    
    function updateCaption() {
        if (isAnimating || isPaused) return;
        isAnimating = true;
        
        // Fade out
        dynamicCaption.classList.remove('fade-in');
        dynamicCaption.classList.add('fade-out');
        
        setTimeout(() => {
            if (!isPaused) {
                // Update text
                dynamicCaption.textContent = captions[captionIndex];
                captionIndex = (captionIndex + 1) % captions.length;
                
                // Fade in
                dynamicCaption.classList.remove('fade-out');
                dynamicCaption.classList.add('fade-in');
                
                setTimeout(() => {
                    dynamicCaption.classList.remove('fade-in');
                    isAnimating = false;
                }, 1400); // Keep the beautiful slow fade-in
            } else {
                isAnimating = false;
            }
        }, 1000); // Keep the beautiful slow fade-out
    }
    
    function startAnimation() {
        if (articlesAnimationInterval) return;
        articlesAnimationInterval = setInterval(updateCaption, 4000);
    }
    
    function stopAnimation() {
        isPaused = true;
        if (articlesAnimationInterval) {
            clearInterval(articlesAnimationInterval);
            articlesAnimationInterval = null;
        }
    }
    
    function resumeAnimation() {
        isPaused = false;
        if (!articlesAnimationInterval) {
            startAnimation();
        }
    }
    
    // Start animation
    startAnimation();
    
    // Hover controls
    if (articlesCard) {
        articlesCard.addEventListener('mouseenter', stopAnimation);
        articlesCard.addEventListener('mouseleave', resumeAnimation);
    }
}

// Certificate slider - faster intervals but beautiful slow transitions
function initializeCertificateSlider() {
    const certificates = [
        {
            img: "../documents/ML_cer.png",
            title: "Machine Learning Specialization",
            desc: "Advanced coursework in ML algorithms, including supervised and unsupervised learning.",
            issuer: "DeepLearning.ai - [7sep/2025]",
            link: "https://coursera.org/verify/4G51KHQUXCN0"
        },
        {
            img: "../documents/UNsup_cer.png",
            title: "Deep Learning Certification", 
            desc: "Mastered neural networks, CNNs, and RNNs through hands-on projects.",
            issuer: "deepLearning.ai - [12sep/2025]",
            link: "https://coursera.org/verify/PIY6AYK094M2"
        },
        {
            img: "../documents/Advan_cer.png",
            title: "Advanced Learning Algorithms",
            desc: "Get exposed to RNN, LSTM, GRU with practical transfer Learning projects",
            issuer: "Coursera - [20Aug/2025]",
            link: "https://coursera.org/verify/3T2RBSQIGXW2"
        },
        {
            img: "../documents/AI_simple.png",
            title: "AI Introduction",
            desc: "Just discovered some basic and advanced concepts of AI with examples",
            issuer: "SimpleLearn [25Aug/2025]",
            link: "#"
        },
        {
            img: "../documents/Cs50.png",
            title: "CS50",
            desc: "Introduction to python and data science programming concepts",
            issuer: "Udemy - [20Sep/2025]",
            link: "#"
        }
    ];

    let currentIndex = 0;
    let isDropdownOpen = false;
    let isUserControlled = false;
    let isUpdating = false;
    let isPaused = false;
    
    // Get all elements
    const elements = {
        card: document.getElementById('certificate-card'),
        img: document.getElementById('certificate-img'),
        title: document.getElementById('certificate-title'),
        desc: document.getElementById('certificate-desc'),
        issuer: document.getElementById('certificate-issuer'),
        dropdownToggle: document.getElementById('certificate-dropdown-toggle'),
        dropdownMenu: document.getElementById('certificate-dropdown'),
        section: document.querySelector('.certificate-card-wrapper')
    };

    // Validate elements exist
    const requiredElements = ['card', 'img', 'title', 'desc', 'issuer', 'dropdownToggle', 'dropdownMenu'];
    for (let key of requiredElements) {
        if (!elements[key]) {
            console.warn(`Certificate element not found: ${key}`);
            return;
        }
    }

    function updateCertificate(index, skipAnimation = false) {
        if (isUpdating || index < 0 || index >= certificates.length) return;
        isUpdating = true;
        
        const cert = certificates[index];
        
        if (skipAnimation) {
            elements.img.src = cert.img;
            elements.title.textContent = cert.title;
            elements.desc.textContent = cert.desc;
            elements.issuer.textContent = cert.issuer;
            elements.card.href = cert.link;
            isUpdating = false;
            return;
        }
        
        // Clear existing classes
        const animatedElements = [elements.title, elements.img, elements.desc, elements.issuer];
        animatedElements.forEach(el => el.classList.remove('fade-in', 'fade-out'));
        
        // Add fade-out - beautiful slow transition
        animatedElements.forEach(el => el.classList.add('fade-out'));
        
        setTimeout(() => {
            // Update content
            elements.img.src = cert.img;
            elements.title.textContent = cert.title;
            elements.desc.textContent = cert.desc;
            elements.issuer.textContent = cert.issuer;
            elements.card.href = cert.link;
            
            // Add fade-in - beautiful slow transition
            animatedElements.forEach(el => {
                el.classList.remove('fade-out');
                el.classList.add('fade-in');
            });
            
            setTimeout(() => {
                animatedElements.forEach(el => el.classList.remove('fade-in'));
                isUpdating = false;
            }, 1400); // Keep the beautiful slow fade-in duration
        }, 1000); // Keep the beautiful slow fade-out duration
    }

    function startSlider() {
        if (certificateSliderInterval || isDropdownOpen || isUserControlled || isPaused) return;
        certificateSliderInterval = setInterval(() => {
            if (!isDropdownOpen && !isUserControlled && !isUpdating && !isPaused) {
                currentIndex = (currentIndex + 1) % certificates.length;
                updateCertificate(currentIndex);
            }
        }, 3500); // Shorter interval as requested - 3.5 seconds
    }

    function stopSlider() {
        isPaused = true;
        if (certificateSliderInterval) {
            clearInterval(certificateSliderInterval);
            certificateSliderInterval = null;
        }
    }

    function resumeSlider() {
        isPaused = false;
        if (!isDropdownOpen && !isUserControlled) {
            setTimeout(startSlider, 500);
        }
    }

    // Initialize
    updateCertificate(currentIndex, true);
    setTimeout(startSlider, 2000);

    // Hover controls
    if (elements.section) {
        elements.section.addEventListener('mouseenter', stopSlider);
        elements.section.addEventListener('mouseleave', resumeSlider);
    }

    // Enhanced Dropdown functionality - Fixed and Working
    elements.dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Dropdown clicked'); // Debug log
        
        isDropdownOpen = !isDropdownOpen;
        
        if (isDropdownOpen) {
            elements.dropdownMenu.classList.add('active');
            elements.dropdownToggle.style.transform = 'rotate(180deg)';
            stopSlider();
            console.log('Dropdown opened'); // Debug log
        } else {
            elements.dropdownMenu.classList.remove('active');
            elements.dropdownToggle.style.transform = 'rotate(0deg)';
            if (!isUserControlled) {
                setTimeout(startSlider, 500);
            }
            console.log('Dropdown closed'); // Debug log
        }
    });

    // Fixed Dropdown items with proper event handling
    const dropdownItems = elements.dropdownMenu.querySelectorAll('li[data-index]');
    console.log(`Found ${dropdownItems.length} dropdown items`); // Debug log
    
    dropdownItems.forEach((item, index) => {
        // Ensure data-index is set correctly
        if (!item.hasAttribute('data-index')) {
            item.setAttribute('data-index', index);
        }
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Dropdown item ${index} clicked`); // Debug log
            
            // Stop slider and set user control
            stopSlider();
            isUserControlled = true;
            isDropdownOpen = false;
            
            // Get index and validate
            const newIndex = parseInt(this.getAttribute('data-index'));
            console.log(`Switching to certificate index: ${newIndex}`); // Debug log
            
            if (!isNaN(newIndex) && newIndex >= 0 && newIndex < certificates.length) {
                currentIndex = newIndex;
                updateCertificate(currentIndex);
            }
            
            // Close dropdown
            elements.dropdownMenu.classList.remove('active');
            elements.dropdownToggle.style.transform = 'rotate(0deg)';
            
            // Visual feedback
            this.style.background = 'rgba(139, 92, 246, 0.2)';
            this.style.transform = 'translateX(4px)';
            
            setTimeout(() => {
                this.style.background = '';
                this.style.transform = 'translateX(0)';
            }, 300);
        });
        
        // Enhanced hover effects
        item.addEventListener('mouseenter', function() {
            if (!this.style.background.includes('rgba(139, 92, 246, 0.2)')) {
                this.style.background = 'rgba(139, 92, 246, 0.05)';
                this.style.transform = 'translateX(2px)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.style.background.includes('rgba(139, 92, 246, 0.2)')) {
                this.style.background = '';
                this.style.transform = 'translateX(0)';
            }
        });
    });

    // Improved Global click handler
    function handleGlobalClick(e) {
        // Check if click is outside the entire certificate section
        if (elements.section && !elements.section.contains(e.target)) {
            if (isDropdownOpen) {
                console.log('Closing dropdown due to outside click'); // Debug log
                isDropdownOpen = false;
                elements.dropdownMenu.classList.remove('active');
                elements.dropdownToggle.style.transform = 'rotate(0deg)';
            }
            
            // Reset user control and resume slider
            if (isUserControlled) {
                console.log('Resuming auto-slider due to outside click'); // Debug log
                isUserControlled = false;
                setTimeout(() => {
                    isPaused = false;
                    startSlider();
                }, 1000);
            }
        }
    }

    // Remove any existing global click handlers first
    document.removeEventListener('click', handleGlobalClick);
    document.addEventListener('click', handleGlobalClick);
}

// Scroll animations
function initializeScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -30px 0px'
    });

    const cards = document.querySelectorAll('.articles-card, .certificate-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px) scale(0.98)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(card);
    });
}

// Cleanup
function cleanup() {
    clearAllAnimations();
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);
