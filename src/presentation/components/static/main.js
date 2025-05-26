document.addEventListener('DOMContentLoaded', function() {
    // Setup form submissions
    setupForms();
    
    // Setup password toggle
    setupPasswordToggles();
    
    // Initialize tabs
    setupTabs();
    
    // Initialize all sliders
    initializeSliders();
});

function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordField = document.querySelector(this.getAttribute('data-target'));
            
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                this.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                passwordField.type = 'password';
                this.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
}

function setupTabs() {
    console.log('Tabs initialized');
}

function setupForms() {
    console.log('Forms initialized');
}

function initializeSliders() {
    console.log('Sliders initialized');
    
    // Find all sections with slider dots
    const sliderSections = document.querySelectorAll('section .slider-dots');
    
    if (sliderSections.length === 0) {
        console.log('No slider sections found');
        return;
    }
    
    sliderSections.forEach(section => {
        const dots = section.querySelectorAll('.dot:not([data-direction])');
        const prevBtn = section.querySelector('.dot-container.left .dot');
        const nextBtn = section.querySelector('.dot-container.right .dot');
        
        // Add event listeners to center dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                // Remove active class from all dots in this section
                dots.forEach(d => d.classList.remove('active'));
                
                // Add active class to clicked dot
                this.classList.add('active');
                
                // Here you would typically implement actual slider functionality
                console.log(`Slide changed to index ${index} in section ${section.closest('section').className}`);
            });
        });
        
        // Add event listeners to navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                const activeDot = Array.from(dots).find(dot => dot.classList.contains('active'));
                const currentIndex = Array.from(dots).indexOf(activeDot);
                const prevIndex = (currentIndex - 1 + dots.length) % dots.length;
                
                // Simulate click on the previous dot
                dots[prevIndex].click();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                const activeDot = Array.from(dots).find(dot => dot.classList.contains('active'));
                const currentIndex = Array.from(dots).indexOf(activeDot);
                const nextIndex = (currentIndex + 1) % dots.length;
                
                // Simulate click on the next dot
                dots[nextIndex].click();
            });
        }
    });
}
