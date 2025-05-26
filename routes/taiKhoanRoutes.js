const express = require('express');
const router = express.Router();
const taiKhoanController = require('../controllers/taiKhoanController');

// Route đăng nhập
router.post('/dang-nhap', taiKhoanController.dangNhap);

// Route đăng xuất
router.get('/dang-xuat', taiKhoanController.dangXuat);

// Route đăng ký
router.post('/dang-ky', taiKhoanController.dangKy);

// Route cập nhật vai trò
router.post('/cap-nhat-vai-tro', taiKhoanController.capNhatVaiTro);

// Chuyển các route quên mật khẩu từ matKhauRoutes sang đây để đồng bộ
const matKhauController = require('../controllers/matKhauController');

// Route xử lý yêu cầu quên mật khẩu
router.post('/quen-mat-khau', matKhauController.quenMatKhau);

// Route xử lý đổi mật khẩu
router.post('/doi-mat-khau', matKhauController.doiMatKhau);

module.exports = router; 