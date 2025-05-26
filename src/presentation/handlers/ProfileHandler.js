const express = require('express');
const router = express.Router();
const NguoiDung = require('../models/NguoiDung');
const ThongBao = require('../models/ThongBao');
const { isAuth, isUngVien, isNhaTuyenDung } = require('../middleware/authMiddleware');

// Trang hồ sơ chính
router.get('/ho-so', isAuth, async (req, res) => {
    try {
        const user = req.user;
        
        // Nếu là ứng viên, lấy 5 thông báo mới nhất
        let thongBaoMoiNhat = [];
        if (user.vaiTro === 'UngVien') {
            thongBaoMoiNhat = await ThongBao.find({ nguoiNhan: user._id })
                .sort({ ngayGui: -1 })
                .limit(5)
                .populate({
                    path: 'nguoiGui',
                    select: 'hoTen email thongTin',
                    populate: {
                        path: 'thongTin',
                        select: 'tenCongTy logo'
                    }
                });
        }
        
        res.render('pages/ho-so', { 
            title: 'Hồ sơ cá nhân',
            user,
            thongBaoMoiNhat
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('pages/error', { 
            title: 'Lỗi hệ thống',
            message: 'Không thể tải trang hồ sơ. Vui lòng thử lại sau!'
        });
    }
});

// Trang CV của ứng viên
router.get('/ho-so/cv', isAuth, isUngVien, (req, res) => {
    res.render('pages/ho-so-cv', { title: 'CV của tôi' });
});

// Trang việc làm yêu thích
router.get('/ho-so/viec-yeu-thich', isAuth, isUngVien, async (req, res) => {
    try {
        const maND = req.session.user._id;
        const viecYeuThichService = require('../services/viecYeuThichService');
        
        // Lấy danh sách công việc yêu thích
        const danhSachYeuThich = await viecYeuThichService.layDanhSachYeuThich(maND);
        
        // Lấy số thông báo chưa đọc
        const soThongBaoChuaDoc = 0; // Sẽ cập nhật theo thực tế sau
        
        res.render('pages/viec-yeu-thich', { 
            title: 'Việc làm đã lưu',
            danhSachYeuThich,
            soThongBaoChuaDoc
        });
    } catch (error) {
        console.error('Lỗi khi hiển thị việc làm yêu thích:', error);
        res.status(500).render('pages/error', { 
            message: 'Đã xảy ra lỗi khi tải danh sách việc làm yêu thích', 
            error: { status: 500 } 
        });
    }
});

// Trang đơn ứng tuyển của ứng viên
router.get('/ho-so/don-ung-tuyen', isAuth, isUngVien, (req, res) => {
    res.render('pages/don-ung-tuyen', { title: 'Đơn ứng tuyển của tôi' });
});

// Trang thông tin công ty của nhà tuyển dụng
router.get('/ho-so/cong-ty', isAuth, isNhaTuyenDung, (req, res) => {
    res.render('pages/ho-so-cong-ty', { title: 'Thông tin công ty' });
});

// Trang việc làm đã đăng của nhà tuyển dụng
router.get('/ho-so/viec-lam-da-dang', isAuth, isNhaTuyenDung, (req, res) => {
    res.render('pages/viec-lam-da-dang', { title: 'Việc làm đã đăng' });
});

// Trang đơn ứng tuyển nhận được của nhà tuyển dụng
router.get('/ho-so/don-ung-tuyen-nhan-duoc', isAuth, isNhaTuyenDung, (req, res) => {
    res.render('pages/don-ung-tuyen-nhan-duoc', { title: 'Đơn ứng tuyển nhận được' });
});

module.exports = router; 