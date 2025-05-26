const mongoose = require('mongoose');

// Định nghĩa schema cho CongViec
const congViecSchema = new mongoose.Schema({
    // _id là ObjectId tự động được tạo bởi MongoDB
    maCV: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Mã công việc là bắt buộc']
    },
    tenCV: {
        type: String,
        required: [true, 'Vui lòng nhập tên công việc'],
        trim: true,
        maxlength: [50, 'Tên công việc không được quá 50 ký tự']
    },
    moTa: {
        type: String,
        required: [true, 'Vui lòng nhập mô tả công việc'],
        maxlength: [3000, 'Mô tả không được quá 3000 ký tự']
    },
    diaDiem: {
        type: String,
        required: [true, 'Vui lòng nhập địa điểm làm việc']
    },
    luong: {
        type: String,
        required: [true, 'Vui lòng nhập mức lương'],
        trim: true
    },
    kinhNghiem: {
        type: String,
        required: [true, 'Vui lòng nhập yêu cầu kinh nghiệm']
    },
    hocVan: {
        type: String,
        required: [true, 'Vui lòng nhập yêu cầu học vấn']
    },
    kyNang: [{
        type: String,
        required: [true, 'Vui lòng nhập ít nhất một kỹ năng']
    }],
    loiIch: {
        type: String,
        required: [true, 'Vui lòng nhập quyền lợi/lợi ích của vị trí']
    },
    maND: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true
    },
    nhaTuyenDung: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NguoiDung',
        required: true
    },
    ngayDang: {
        type: Date,
        default: Date.now,
        required: true
    },
    trangThai: {
        type: String,
        enum: ['Đang tuyển', 'Đã đóng', 'Đợi duyệt', 'Bị từ chối'],
        default: 'Đợi duyệt',
        required: true
    },
    donUngTuyen: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DonUngTuyen'
        }],
        default: [],
        required: true
    }
}, {
    timestamps: true
});

// Middleware tự động cập nhật tham chiếu ngược lại NhaTuyenDung
congViecSchema.post('save', async function() {
    try {
        const NhaTuyenDung = mongoose.model('NhaTuyenDung');
        await NhaTuyenDung.findByIdAndUpdate(
            this.maND,
            { $addToSet: { congViecDang: this._id } }
        );
    } catch (error) {
        console.error('Lỗi khi cập nhật tham chiếu ngược:', error);
    }
});

// Tạo model từ schema
const CongViec = mongoose.model('CongViec', congViecSchema, 'CongViec');

module.exports = CongViec; 