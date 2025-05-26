const mongoose = require('mongoose');
const NguoiDung = require('./NguoiDung');

// Định nghĩa schema cho UngVien kế thừa từ NguoiDung
const ungVienSchema = new mongoose.Schema({
    diaChi: {
        type: String,
        required: [true, 'Vui lòng nhập địa chỉ'],
        trim: true
    },
    ngaySinh: {
        type: Date,
        required: [true, 'Vui lòng nhập ngày sinh']
    },
    kyNang: [{
        type: String,
        trim: true
    }],
    anhDaiDien: {
        type: String,
        default: 'default-avatar.jpg'
    },
    cv: {
        type: String
    },
    donUngTuyen: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonUngTuyen'
    }],
    cvYeuThich: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CongViec'
    }]
});

// Tạo model UngVien kế thừa từ NguoiDung với tên collection cụ thể
const UngVien = NguoiDung.discriminator('UngVien', ungVienSchema);

module.exports = UngVien; 