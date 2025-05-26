const express = require('express');
const router = express.Router();
const matKhauController = require('../controllers/matKhauController');

// Route hiển thị trang quên mật khẩu
router.get('/quen-mat-khau', matKhauController.hienThiTrangQuenMatKhau);

// Route xử lý yêu cầu quên mật khẩu
router.post('/quen-mat-khau', matKhauController.quenMatKhau);

// Route hiển thị trang đổi mật khẩu
router.get('/doi-mat-khau', matKhauController.hienThiTrangDoiMatKhau);

// Route xử lý đổi mật khẩu
router.post('/doi-mat-khau', matKhauController.doiMatKhau);

module.exports = router; 