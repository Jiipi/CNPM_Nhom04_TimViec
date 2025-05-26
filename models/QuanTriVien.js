const mongoose = require('mongoose');
const NguoiDung = require('./NguoiDung');

// Định nghĩa schema cho QuanTriVien kế thừa từ NguoiDung
const quanTriVienSchema = new mongoose.Schema({
    chucVu: {
        type: String,
        enum: ['Quản trị hệ thống', 'Quản lý tài khoản'],
        required: [true, 'Vui lòng chọn chức vụ']
    },
    phanQuyen: {
        type: String,
        enum: ['admin', 'mod', 'support'],
        required: [true, 'Vui lòng chọn quyền hạn']
    },
    ngayNhanChuc: {
        type: Date,
        default: Date.now
    }
});

// Tạo model QuanTriVien kế thừa từ NguoiDung với tên collection cụ thể
const QuanTriVien = NguoiDung.discriminator('QuanTriVien', quanTriVienSchema);

module.exports = QuanTriVien; 