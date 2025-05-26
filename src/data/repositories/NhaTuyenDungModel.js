const mongoose = require('mongoose');
const NguoiDung = require('./NguoiDung');

// Định nghĩa schema cho NhaTuyenDung kế thừa từ NguoiDung
const nhaTuyenDungSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    tenCongTy: { type: String, required: true },
    moTaCty: { type: String, default: "Chưa cập nhật" },
    linhVuc: { type: String, default: "Công nghệ" },
    soDienThoai: { type: String },
    email: { type: String },
    diaChi: { type: String, default: "Chưa cập nhật" },
    website: { type: String },
    logo: { type: String, default: "default-company-logo.jpg" },
    soNV: { type: Number, default: 0 },
    diaChiCty: { type: String, default: "Chưa cập nhật" },
    congViecDang: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CongViec' }],
    isFeaturedCompany: { type: Boolean, default: false }, // Đánh dấu là công ty nổi bật
    isFeaturedEmployer: { type: Boolean, default: false }, // Đánh dấu là nhà tuyển dụng nổi bật
    nguoiDung: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Tạo model NhaTuyenDung kế thừa từ NguoiDung
const NhaTuyenDung = NguoiDung.discriminator('NhaTuyenDung', nhaTuyenDungSchema);

module.exports = NhaTuyenDung; 