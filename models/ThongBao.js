const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Định nghĩa schema cho ThongBao theo cấu trúc MongoDB hiện có
const thongBaoSchema = new Schema({
    maTB: {
        type: String,
        unique: true,
        default: () => Math.random().toString(36).substring(2, 10).toUpperCase()
    },
    nguoiTao: {
        type: Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true,
        description: 'Người tạo'
    },
    noiDung: {
        type: String,
        required: true,
        description: 'Nội dung thông báo'
    },
    ngayTao: {
        type: Date,
        default: Date.now,
        description: 'Ngày tạo'
    },
    nguoiNhan: [{
        type: Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true,
        description: 'Danh sách người nhận'
    }],
    // Thêm các trường bổ sung để hỗ trợ ứng dụng
    tieuDe: {
        type: String,
        required: true,
        description: 'Tiêu đề thông báo'
    },
    daDoc: {
        type: Map,
        of: Boolean,
        default: {}
    },
    congViecLienQuan: {
        type: Schema.Types.ObjectId,
        ref: 'CongViec',
        default: null,
        description: 'Công việc liên quan'
    }
}, { 
    timestamps: true,
    collection: 'ThongBao' // Đảm bảo đúng tên collection
});

// Middleware để cập nhật danh sách thông báo cho người nhận
thongBaoSchema.post('save', async function() {
    const NguoiDung = mongoose.model('NguoiDung');
    try {
        // Cập nhật tham chiếu thông báo cho tất cả người nhận
        await NguoiDung.updateMany(
            { _id: { $in: this.nguoiNhan } },
            { $addToSet: { thongBao: this._id } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu thông báo:', error);
    }
});

module.exports = mongoose.model('ThongBao', thongBaoSchema); 