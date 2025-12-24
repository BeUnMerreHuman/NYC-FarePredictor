class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .footer-container {
                    background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                    color: white;
                    padding: 3rem 0 1.5rem;
                    margin-top: 3rem;
                }
                
                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                }
                
                .footer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 2rem;
                    margin-bottom: 2rem;
                }
                
                .footer-section h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: #60a5fa;
                }
                
                .footer-section p {
                    color: #d1d5db;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }
                
                .footer-links {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .footer-link {
                    color: #d1d5db;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: color 0.2s;
                }
                
                .footer-link:hover {
                    color: #60a5fa;
                }
                
                .social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .social-link {
                    color: #d1d5db;
                    transition: color 0.2s, transform 0.2s;
                }
                
                .social-link:hover {
                    color: #60a5fa;
                    transform: translateY(-2px);
                }
                
                .copyright {
                    text-align: center;
                    padding-top: 1.5rem;
                    border-top: 1px solid #4b5563;
                    color: #9ca3af;
                    font-size: 0.875rem;
                }
                
                @media (max-width: 768px) {
                    .footer-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            
            <footer class="footer-container">
                <div class="footer-content">
                    <div class="footer-grid">
                        <div class="footer-section">
                            <h3>Disclaimer</h3>
                            <p>
                                Estimates are based on historical 2023 NYC Yellow Taxi data. 
                                Actual fares may vary due to real-time traffic, 
                                weather conditions, or updated surcharges.
                            </p>
                            <div class="social-links">
                                <a href="#" class="social-link">
                                    <i data-feather="twitter"></i>
                                </a>
                                <a href="#" class="social-link">
                                    <i data-feather="github"></i>
                                </a>
                                <a href="#" class="social-link">
                                    <i data-feather="linkedin"></i>
                                </a>
                                <a href="#" class="social-link">
                                    <i data-feather="mail"></i>
                                </a>
                            </div>
                        </div>
                        
                        <div class="footer-section">
                            <h3>Quick Links</h3>
                            <div class="footer-links">
                                <a href="/" class="footer-link">
                                    <i data-feather="home"></i>
                                    Home
                                </a>
                                <a href="#calculate" class="footer-link">
                                    <i data-feather="calculator"></i>
                                    Fare Calculator
                                </a>
                                <a href="#about" class="footer-link">
                                    <i data-feather="info"></i>
                                    About Us
                                </a>
                                <a href="#contact" class="footer-link">
                                    <i data-feather="mail"></i>
                                    Contact
                                </a>
                            </div>
                        </div>
                        
                        <div class="footer-section">
                            <h3>Resources</h3>
                            <div class="footer-links">
                                <a href="#api" class="footer-link">
                                    <i data-feather="code"></i>
                                    API Documentation
                                </a>
                                <a href="#data" class="footer-link">
                                    <i data-feather="database"></i>
                                    Data Sources
                                </a>
                                <a href="#privacy" class="footer-link">
                                    <i data-feather="shield"></i>
                                    Privacy Policy
                                </a>
                                <a href="#terms" class="footer-link">
                                    <i data-feather="file-text"></i>
                                    Terms of Service
                                </a>
                            </div>
                        </div>
                        
                        <div class="footer-section">
                            <h3>Contact Info</h3>
                            <div class="footer-links">
                                <a href="mailto:hello@taxifareoracle.com" class="footer-link">
                                    <i data-feather="mail"></i>
                                    hello@taxifareoracle.com
                                </a>
                                <a href="tel:+15551234567" class="footer-link">
                                    <i data-feather="phone"></i>
                                    +1 (555) 123-4567
                                </a>
                                <span class="footer-link">
                                    <i data-feather="map-pin"></i>
                                    123 Taxi Street, NYC 10001
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="copyright">
                        <p>© 2024 TaxiFare Oracle. All rights reserved. Made with <i data-feather="heart" style="width: 14px; height: 14px; color: #ef4444;"></i> for urban mobility.</p>
                        <p>Data sources: NYC TLC Open Data, Historical Taxi Trip Records</p>
                    </div>
                </div>
            </footer>
        `;
        
        // Initialize Feather icons after a short delay
        setTimeout(() => {
            if (window.feather) {
                window.feather.replace({ 'stroke-width': 1.5 });
            }
        }, 100);
    }
}

customElements.define('custom-footer', CustomFooter);