const mongoose = require('mongoose');

// Định nghĩa schema cho ViecYeuThich
const viecYeuThichSchema = new mongoose.Schema({
    maCV: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CongViec',
        required: true
    },
    maND: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true
    },
    // Thêm các trường thông tin đầy đủ của công việc
    tenCV: {
        type: String,
        required: true
    },
    moTa: {
        type: String
    },
    diaDiem: {
        type: String
    },
    luong: {
        type: Number
    },
    kinhNghiem: {
        type: String
    },
    hocVan: {
        type: String
    },
    kyNang: [{
        type: String
    }],
    loiIch: {
        type: String
    },
    trangThai: {
        type: String
    },
    tenCongTy: {
        type: String
    },
    ngayDanhDau: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Đảm bảo một người dùng không thể đánh dấu yêu thích một công việc nhiều lần
viecYeuThichSchema.index({ maCV: 1, maND: 1 }, { unique: true });

// Middleware tự động cập nhật tham chiếu ngược lại UngVien
viecYeuThichSchema.post('save', async function() {
    try {
        const UngVien = mongoose.model('UngVien');
        await UngVien.findByIdAndUpdate(
            this.maND,
            { $addToSet: { cvYeuThich: this.maCV } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu ngược UngVien:', error);
    }
});

// Tạo model từ schema
const ViecYeuThich = mongoose.model('ViecYeuThich', viecYeuThichSchema, 'ViecYeuThich');

module.exports = ViecYeuThich; 