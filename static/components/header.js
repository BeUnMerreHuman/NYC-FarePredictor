class CustomHeader extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                /* CSS Variables for easier theming */
                :host {
                    display: block;
                    --header-bg: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                    --header-text: white;
                    --nav-hover: rgba(255, 255, 255, 0.9);
                }

                /* Dark Mode Override - applied when the component has class 'dark' */
                :host(.dark) {
                    --header-bg: linear-gradient(135deg, #1f2937 0%, #0f172a 100%); /* Dark Blue/Grey */
                    --header-text: #e2e8f0;
                    --nav-hover: #ffffff;
                }

                .header-container {
                    background: var(--header-bg);
                    color: var(--header-text);
                    padding: 1rem 0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    transition: background 0.3s ease, color 0.3s ease;
                }
                
                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: bold;
                    font-size: 1.5rem;
                    text-decoration: none;
                    color: var(--header-text);
                }
                
                /* New Image Styling */
                .logo-img {
                    height: 40px;
                    width: auto;
                    border-radius: 8px;
                    object-fit: contain;
                    background: white; /* Optional: ensures transparent pngs pop on dark/blue bg */
                    padding: 2px;
                }
                
                .nav-links {
                    display: flex;
                    gap: 2rem;
                    align-items: center;
                }
                
                .nav-link {
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                /* Update text color to use variable so it works in both themes */
                .nav-link { color: var(--header-text); opacity: 0.85; }
                .nav-link:hover { opacity: 1; }
                
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--header-text);
                    cursor: pointer;
                }
                
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: block;
                    }
                    
                    .nav-links {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: var(--header-bg);
                        padding: 1rem;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .nav-links.open {
                        display: flex;
                    }
                }
            </style>
            
            <header class="header-container">
                <div class="header-content">
                    <a href="/" class="logo">
                        <img src="./logo.png" alt="TaxiFare Logo" class="logo-img">
                        <span>Smart Fare Estimator</span>
                    </a>
                    
                    <button class="mobile-menu-btn" id="mobileMenuBtn">
                        <i data-feather="menu"></i>
                    </button>
                    
                    <nav class="nav-links" id="navLinks">
                        <a href="/" class="nav-link">
                            <i data-feather="home"></i>
                            Home
                        </a>
                        <a href="#calculate" class="nav-link">
                            <i data-feather="calculator"></i>
                            Calculator
                        </a>
                        <a href="#about" class="nav-link">
                            <i data-feather="info"></i>
                            About
                        </a>
                        <a href="#contact" class="nav-link">
                            <i data-feather="mail"></i>
                            Contact
                        </a>
                        <button id="themeToggle" class="nav-link" style="background: none; border: none; cursor: pointer; font-size: 1rem;">
                            <i data-feather="moon"></i>
                            Theme
                        </button>
                    </nav>
                </div>
            </header>
        `;
        
        this.init();
    }

    init() {
        // Helper to handle Feather icons inside Shadow DOM
        const replaceIcons = () => {
            if (window.feather) {
                // We must query the shadowRoot specifically
                const icons = this.shadowRoot.querySelectorAll('i[data-feather]');
                icons.forEach(icon => {
                    const name = icon.getAttribute('data-feather');
                    if (window.feather.icons[name]) {
                        const svg = window.feather.icons[name].toSvg({ 
                            'stroke-width': 1.5,
                            'class': icon.getAttribute('class') || ''
                        });
                        // Create a wrapper to replace the <i>
                        const span = document.createElement('span');
                        span.innerHTML = svg;
                        // Replace the <i> with the SVG
                        icon.parentNode.replaceChild(span.firstElementChild, icon);
                    }
                });
            }
        };

        setTimeout(() => {
            // Initial Icon Load
            replaceIcons();
            
            const mobileMenuBtn = this.shadowRoot.getElementById('mobileMenuBtn');
            const navLinks = this.shadowRoot.getElementById('navLinks');
            const themeToggle = this.shadowRoot.getElementById('themeToggle');
            
            // --- FIX 2 & 3: Theme Logic ---
            
            const applyTheme = (isDark) => {
                // 1. Toggle class on document (global)
                document.documentElement.classList.toggle('dark', isDark);
                
                // 2. Toggle class on THIS component (internal styles)
                this.classList.toggle('dark', isDark);
                
                // 3. Update Icon manually since Feather replaced the tag
                if (themeToggle) {
                    const svgContainer = themeToggle.querySelector('svg');
                    // We need to re-render the SVG for the new icon
                    const iconName = isDark ? 'sun' : 'moon';
                    if (window.feather && window.feather.icons[iconName]) {
                         // If svg exists, replace it, otherwise append
                         const newSvgString = window.feather.icons[iconName].toSvg({ 'stroke-width': 1.5 });
                         if(svgContainer) {
                             svgContainer.outerHTML = newSvgString;
                         } else {
                             // Fallback if icon missing
                             themeToggle.insertAdjacentHTML('afterbegin', newSvgString);
                         }
                    }
                }
                
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            };

            // Mobile Menu
            if (mobileMenuBtn && navLinks) {
                mobileMenuBtn.addEventListener('click', () => {
                    navLinks.classList.toggle('open');
                    
                    // Toggle Menu/X icon
                    const isOpen = navLinks.classList.contains('open');
                    const iconName = isOpen ? 'x' : 'menu';
                    const currentSvg = mobileMenuBtn.querySelector('svg');
                    
                    if (window.feather && currentSvg) {
                         currentSvg.outerHTML = window.feather.icons[iconName].toSvg({ 'stroke-width': 1.5 });
                    }
                });
            }
            
            // Theme Click Event
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    const isCurrentlyDark = this.classList.contains('dark');
                    applyTheme(!isCurrentlyDark);
                });
                
                // Load Saved Theme
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'dark') {
                    applyTheme(true);
                }
            }
        }, 100);
    }
}

customElements.define('custom-header', CustomHeader);