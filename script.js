document.addEventListener('DOMContentLoaded', function() {
    // === PHẦN XỬ LÝ ĐĂNG NHẬP/ĐĂNG KÝ ===
    setupLoginModals();
    
    // === PHẦN SLIDER ===
    initializeSliders();
    
    // === PHẦN FILTER ===
    initializeFilterTags();
    
    // === PHẦN JOB ACTIONS ===
    initializeJobActions();
    
    // === PHẦN SEARCH ===
    initializeSearch();
    
    // === PHẦN COMPANY CARD EFFECTS ===
    initializeCompanyCardEffects();
    
    // === PHẦN CÔNG TY NỔI BẬT - CUỘN NGANG ===
    initializeFeaturedCompanySlider();
    
    // === PHẦN NHÀ TUYỂN DỤNG NỔI BẬT - CUỘN NGANG ===
    initializeEmployerSlider();
});

// Thiết lập các modal đăng nhập
function setupLoginModals() {
    // Nút đăng nhập - chuyển hướng đến trang login.html
    $(document).on('click', '#loginBtn', function(e) {
        e.preventDefault();
        window.location.href = 'login.html';
    });
    
    // Nút đăng ký - chuyển hướng đến trang register.html
    $(document).on('click', '#registerBtn', function(e) {
        e.preventDefault();
        window.location.href = 'register.html';
    });
    
    // Nút ứng tuyển - kiểm tra đăng nhập trước khi chuyển hướng
    $(document).on('click', '#applyBtn', function(e) {
        e.preventDefault();
        
        // Kiểm tra trạng thái đăng nhập
        const isLoggedIn = checkLoginStatus();
        
        if (!isLoggedIn) {
            // Chuyển hướng tới trang đăng nhập nếu chưa đăng nhập
            window.location.href = 'login.html?redirect=apply';
        } else {
            // Chuyển hướng đến trang ứng tuyển
            window.location.href = 'apply.html';
        }
    });
    
    // Xử lý hiển thị/ẩn mật khẩu
    $(document).on('click', '.password-toggle', function() {
        const passwordField = $(this).closest('.input-group').find('input');
        const eyeIcon = $(this).find('i');
        
        if (passwordField.attr('type') === 'password') {
            passwordField.attr('type', 'text');
            eyeIcon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordField.attr('type', 'password');
            eyeIcon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });
    
    // Xử lý submit form đăng nhập
    $(document).on('submit', '#loginFormModal form', function(e) {
        e.preventDefault();
        const isCandidate = $(this).closest('.tab-pane').attr('id') === 'candidate';
        const emailField = $(this).find('input[type="text"], input[type="email"]');
        const passwordField = $(this).find('input[type="password"]');
        
        if (!emailField.val() || !passwordField.val()) {
            alert('Vui lòng nhập đầy đủ thông tin đăng nhập!');
            return;
        }
        
        // Mô phỏng đăng nhập thành công
        alert(`Đăng nhập ${isCandidate ? 'Ứng viên' : 'Nhà tuyển dụng'} thành công!`);
        
        // Lưu trạng thái đăng nhập
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userType', isCandidate ? 'candidate' : 'employer');
        
        // Đóng modal
        $('#loginFormModal').modal('hide');
    });
    
    // Xử lý submit form đăng ký
    $(document).on('submit', '#registerFormModal form', function(e) {
        e.preventDefault();
        alert('Đăng ký thành công!');
        $('#registerFormModal').modal('hide');
    });
    
    // Xử lý nút quên mật khẩu
    $(document).on('click', '#forgotPasswordLink', function(e) {
        e.preventDefault();
        $('#loginFormModal').modal('hide');
        setTimeout(function() {
            $('#forgotPasswordModal').modal('show');
        }, 400);
    });
    
    // Xử lý trở về trang chủ (hoặc về modal đăng nhập)
    $(document).on('click', '#backToLogin', function(e) {
        e.preventDefault();
        $('#forgotPasswordModal').modal('hide');
        setTimeout(function() {
            $('#loginFormModal').modal('show');
        }, 400);
    });
}

function initializeSliders() {
    // Find all sections with slider dots
    const sliderSections = document.querySelectorAll('section .slider-dots');
    
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
                // For demonstration, we'll just log the action
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
    
    // Auto-rotate sliders every 5 seconds
    setInterval(() => {
        sliderSections.forEach(section => {
            const dots = section.querySelectorAll('.dot:not([data-direction])');
            const activeDotIndex = Array.from(dots).findIndex(dot => dot.classList.contains('active'));
            const nextDotIndex = (activeDotIndex + 1) % dots.length;
            
            // Remove active class from current dot
            dots[activeDotIndex].classList.remove('active');
            
            // Add active class to next dot
            dots[nextDotIndex].classList.add('active');
        });
    }, 5000);
}

function initializeFilterTags() {
    const filterTags = document.querySelectorAll('.filter-tag');
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Toggle active class
            this.classList.toggle('active');
            
            // Here you would typically filter results based on the selected tags
            console.log(`Filter ${this.textContent} was clicked`);
        });
    });
}

function initializeJobActions() {
    const jobActions = document.querySelectorAll('.job-actions span');
    
    jobActions.forEach(action => {
        action.addEventListener('click', function() {
            const actionType = this.textContent.trim();
            const jobTitle = this.closest('.job-info').querySelector('h5').textContent;
            
            if (actionType === 'Apply') {
                // Kiểm tra trạng thái đăng nhập trước khi cho phép ứng tuyển
                const isLoggedIn = checkLoginStatus();
                
                if (!isLoggedIn) {
                    // Chuyển hướng đến trang đăng nhập kèm thông tin redirect
                    window.location.href = `login.html?redirect=apply&job=${encodeURIComponent(jobTitle)}`;
                } else {
                    // Simulate apply action
                    alert(`Bạn đã ứng tuyển thành công vào vị trí "${jobTitle}"`);
                }
            } else if (actionType === 'Save Job') {
                // Kiểm tra trạng thái đăng nhập trước khi lưu việc làm
                const isLoggedIn = checkLoginStatus();
                
                if (!isLoggedIn) {
                    // Chuyển hướng đến trang đăng nhập kèm thông tin redirect
                    window.location.href = `login.html?redirect=saveJob&job=${encodeURIComponent(jobTitle)}`;
                } else {
                    // Simulate save job action
                    this.textContent = 'Saved';
                    this.style.color = '#28a745';
                    alert(`Đã lưu vị trí "${jobTitle}" vào danh sách việc làm yêu thích`);
                }
            }
        });
    });
}

function initializeSearch() {
    const searchButton = document.querySelector('.search-form .btn-primary');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchInput = document.querySelector('.search-form input[type="text"]');
            const searchValue = searchInput.value.trim();
            
            if (searchValue) {
                // Simulate search action
                alert(`Đang tìm kiếm cho: "${searchValue}"`);
                // Here you would typically redirect to search results page or fetch results via AJAX
            } else {
                alert('Vui lòng nhập từ khóa tìm kiếm');
            }
        });
    }
}

function initializeCompanyCardEffects() {
    const companyCards = document.querySelectorAll('.company-card, .featured-company-card');
    companyCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        });
    });
}

// Hàm kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
    // Kiểm tra localStorage hoặc sessionStorage để xác định trạng thái đăng nhập
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Hàm mới để khởi tạo slider cho phần Công Ty Nổi Bật
function initializeFeaturedCompanySlider() {
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const container = document.getElementById('featuredCompaniesContainer');
    const indicators = document.querySelectorAll('.d-flex.justify-content-center.mt-3 button');
    
    // Xử lý các nút chỉ báo (indicators)
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            // Bỏ trạng thái active của tất cả các nút
            indicators.forEach(ind => {
                ind.classList.remove('btn-primary');
                ind.classList.remove('active');
                ind.classList.add('btn-outline-primary');
            });
            
            // Thêm trạng thái active cho nút được nhấp
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary');
            this.classList.add('active');
            
            // Cuộn đến vị trí tương ứng
            if (container) {
                const scrollWidth = container.scrollWidth;
                const itemWidth = scrollWidth / 3; // Giả sử có 3 trang
                container.scrollTo({
                    left: itemWidth * index,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Xử lý nút cuộn trái
    if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', function() {
            if (container) {
                const scrollAmount = container.clientWidth;
                container.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
                
                // Cập nhật trạng thái indicators
                setTimeout(updateIndicators, 500);
            }
        });
    }
    
    // Xử lý nút cuộn phải
    if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', function() {
            if (container) {
                const scrollAmount = container.clientWidth;
                container.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
                
                // Cập nhật trạng thái indicators
                setTimeout(updateIndicators, 500);
            }
        });
    }
    
    // Hàm cập nhật trạng thái indicators dựa trên vị trí cuộn
    function updateIndicators() {
        if (!container) return;
        
        const scrollLeft = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const scrollPercentage = (scrollLeft / maxScroll) * 100;
        
        // Xác định indicator nào nên active dựa trên phần trăm cuộn
        let activeIndex = 0;
        if (scrollPercentage > 66) {
            activeIndex = 2;
        } else if (scrollPercentage > 33) {
            activeIndex = 1;
        }
        
        // Cập nhật trạng thái indicators
        indicators.forEach((indicator, index) => {
            if (index === activeIndex) {
                indicator.classList.remove('btn-outline-primary');
                indicator.classList.add('btn-primary');
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('btn-primary');
                indicator.classList.remove('active');
                indicator.classList.add('btn-outline-primary');
            }
        });
    }
}

// Hàm khởi tạo slider cho phần Nhà Tuyển Dụng Nổi Bật
function initializeEmployerSlider() {
    const prevBtn = document.getElementById('prevEmployer');
    const nextBtn = document.getElementById('nextEmployer');
    const container = document.getElementById('employerLogosContainer');
    
    if (!container || !prevBtn || !nextBtn) return;
    
    // Xử lý nút cuộn trái
    prevBtn.addEventListener('click', function() {
        if (container) {
            const scrollAmount = 600; // Cuộn 3 logo một lần
            container.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        }
    });
    
    // Xử lý nút cuộn phải
    nextBtn.addEventListener('click', function() {
        if (container) {
            const scrollAmount = 600; // Cuộn 3 logo một lần
            container.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    });
    
    // Auto-scroll mỗi 5 giây
    let autoScrollInterval;
    
    function startAutoScroll() {
        autoScrollInterval = setInterval(() => {
            // Kiểm tra xem đã cuộn đến cuối chưa
            if (container.scrollLeft + container.clientWidth >= container.scrollWidth) {
                // Nếu đã đến cuối, cuộn về đầu
                container.scrollTo({
                    left: 0,
                    behavior: 'smooth'
                });
            } else {
                // Cuộn tiếp
                container.scrollBy({
                    left: 200,
                    behavior: 'smooth'
                });
            }
        }, 5000);
    }
    
    // Bắt đầu tự động cuộn
    startAutoScroll();
    
    // Dừng tự động cuộn khi di chuột vào container
    container.addEventListener('mouseenter', () => {
        clearInterval(autoScrollInterval);
    });
    
    // Tiếp tục tự động cuộn khi di chuột ra khỏi container
    container.addEventListener('mouseleave', () => {
        startAutoScroll();
    });
} 