// Xử lý điều hướng slider
document.addEventListener('DOMContentLoaded', function() {
    initializeSliders();
});

function initializeSliders() {
    // Xử lý điều hướng cho tất cả slider
    const sliderSections = document.querySelectorAll('.company-section, .top-recruiters-section');
    
    sliderSections.forEach(section => {
        const dots = section.querySelectorAll('.slider-navigation .dot');
        const prevArrow = section.querySelector('.slider-navigation .prev');
        const nextArrow = section.querySelector('.slider-navigation .next');
        let currentSlide = 0;
        
        // Xử lý sự kiện click cho các chấm
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                goToSlide(index);
            });
        });
        
        // Xử lý sự kiện click cho nút prev
        if (prevArrow) {
            prevArrow.addEventListener('click', (e) => {
                e.preventDefault();
                goToSlide(currentSlide - 1 < 0 ? dots.length - 1 : currentSlide - 1);
            });
        }
        
        // Xử lý sự kiện click cho nút next
        if (nextArrow) {
            nextArrow.addEventListener('click', (e) => {
                e.preventDefault();
                goToSlide((currentSlide + 1) % dots.length);
            });
        }
        
        // Hàm chuyển đến slide cụ thể
        function goToSlide(slideIndex) {
            // Cập nhật trạng thái active cho chấm
            dots.forEach(d => d.classList.remove('active'));
            dots[slideIndex].classList.add('active');
            
            // Cập nhật slide hiện tại
            currentSlide = slideIndex;
            
            // Xử lý logic hiển thị slide tương ứng
            const slides = section.querySelectorAll('.row');
            if (slides.length > 0) {
                console.log('Chuyển đến slide ' + slideIndex + ' trong section ' + section.className);
                // Thêm code xử lý hiệu ứng chuyển slide tại đây nếu cần
            }
        }
        
        // Tự động chuyển slide sau mỗi 5 giây
        setInterval(() => {
            goToSlide((currentSlide + 1) % dots.length);
        }, 5000);
    });
}
