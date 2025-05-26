const mongoose = require('mongoose');

// Định nghĩa schema cho DonUngTuyen
const donUngTuyenSchema = new mongoose.Schema({
    maDon: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Mã đơn ứng tuyển là bắt buộc']
    },
    ungVien: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: [true, 'Thông tin ứng viên là bắt buộc']
    },
    congViec: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CongViec',
        required: [true, 'Thông tin công việc là bắt buộc']
    },
    ngayUngTuyen: {
        type: Date,
        default: Date.now,
        required: [true, 'Ngày ứng tuyển là bắt buộc']
    },
    trangThai: {
        type: String,
        enum: ['Chờ duyệt', 'Đã duyệt', 'Đã từ chối', 'Chờ phỏng vấn', 'Trúng tuyển', 'Từ chối'],
        default: 'Chờ duyệt',
        required: [true, 'Trạng thái đơn là bắt buộc']
    },
    ghiChu: {
        type: String
    },
    fileCV: {
        type: String  // Đường dẫn đến file CV
    },
    ketQua: {
        type: String,
        enum: ['Đạt', 'Không đạt', null],
        default: null
    }
}, {
    timestamps: true
});

// Hook pre-save để tự động tạo maDon nếu chưa có
donUngTuyenSchema.pre('save', function(next) {
    // Nếu đơn ứng tuyển chưa có maDon, gán maDon = _id
    if (!this.maDon) {
        this.maDon = this._id;
    }
    next();
});

// Middleware tự động cập nhật tham chiếu ngược lại UngVien
donUngTuyenSchema.post('save', async function() {
    try {
        const UngVien = mongoose.model('UngVien');
        await UngVien.findByIdAndUpdate(
            this.ungVien,
            { $addToSet: { donUngTuyen: this._id } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu ngược UngVien:', error);
    }
});

// Middleware tự động cập nhật tham chiếu ngược lại CongViec
donUngTuyenSchema.post('save', async function() {
    try {
        const CongViec = mongoose.model('CongViec');
        await CongViec.findByIdAndUpdate(
            this.congViec,
            { $addToSet: { donUngTuyen: this._id } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu ngược CongViec:', error);
    }
});

// Tạo model từ schema
const DonUngTuyen = mongoose.model('DonUngTuyen', donUngTuyenSchema, 'DonUngTuyen');

module.exports = DonUngTuyen; 