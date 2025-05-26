const mongoose = require('mongoose');

// Định nghĩa schema cho KhieuNai
const khieuNaiSchema = new mongoose.Schema({
    // maKN tự động được tạo bởi MongoDB làm _id
    nguoiGui: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true
    },
    noiDung: {
        type: String,
        required: [true, 'Vui lòng nhập nội dung khiếu nại'],
        maxlength: [3000, 'Nội dung khiếu nại không được quá 3000 ký tự']
    },
    ngayTao: {
        type: Date,
        default: Date.now
    },
    trangThai: {
        type: String,
        enum: ['Chờ xử lý', 'Đã xử lý'],
        default: 'Chờ xử lý'
    },
    phanHoi: {
        type: String
    },
    nguoiXuLy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung'
    },
    ngayXuLy: {
        type: Date
    }
}, {
    timestamps: true
});

// Middleware để cập nhật danh sách khiếu nại cho người gửi
khieuNaiSchema.post('save', async function() {
    try {
        const NguoiDung = mongoose.model('NguoiDung');
        await NguoiDung.findByIdAndUpdate(
            this.nguoiGui,
            { $addToSet: { khieuNai: this._id } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu khiếu nại:', error);
    }
});

// Tạo model từ schema
const KhieuNai = mongoose.model('KhieuNai', khieuNaiSchema, 'KhieuNai');

module.exports = KhieuNai; 