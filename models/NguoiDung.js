const mongoose = require('mongoose');

// Định nghĩa schema cho NguoiDung
const nguoiDungSchema = new mongoose.Schema({
    // maND tự động được tạo bởi MongoDB làm _id
    hoTen: {
        type: String,
        required: [true, 'Vui lòng nhập họ tên'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    sdt: {
        type: String,
        trim: true
    },
    vaiTro: {
        type: String,
        enum: ['UngVien', 'NhaTuyenDung', 'QuanTriVien'],
        required: true
    },
    thongTin: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    taiKhoan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaiKhoan',
        required: true
    },
    thongBao: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ThongBao'
    }],
    khieuNai: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KhieuNai'
    }]
}, {
    timestamps: true,
    discriminatorKey: 'vaiTro'  // Sử dụng để phân biệt các loại người dùng
});

// Tạo model từ schema
const NguoiDung = mongoose.model('NguoiDung', nguoiDungSchema, 'NguoiDung');

module.exports = NguoiDung; 