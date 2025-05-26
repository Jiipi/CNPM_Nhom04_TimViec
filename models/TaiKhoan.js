const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Định nghĩa schema cho TaiKhoan
const taiKhoanSchema = new mongoose.Schema({
    // maTK tự động được tạo bởi MongoDB làm _id
    tenDN: {
        type: String,
        required: [true, 'Vui lòng nhập tên đăng nhập'],
        unique: true,
        trim: true
    },
    matKhau: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
        select: false // Không trả về mật khẩu khi query
    },
    ngayTao: {
        type: Date,
        default: Date.now
    },
    lanCuoiDN: {
        type: Date,
        default: Date.now
    }
});

// Middleware trước khi lưu: mã hóa mật khẩu
taiKhoanSchema.pre('save', async function(next) {
    // Chỉ hash mật khẩu nếu nó được sửa đổi hoặc là mới
    if (!this.isModified('matKhau')) {
        return next();
    }
    
    try {
        // Hash mật khẩu với salt factor là 10
        const salt = await bcrypt.genSalt(10);
        this.matKhau = await bcrypt.hash(this.matKhau, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method kiểm tra mật khẩu
taiKhoanSchema.methods.kiemTraMatKhau = async function(matKhauNhap) {
    return await bcrypt.compare(matKhauNhap, this.matKhau);
};

// Method cập nhật thời gian đăng nhập gần nhất
taiKhoanSchema.methods.capNhatDangNhap = async function() {
    this.lanCuoiDN = Date.now();
    return this.save();
};

// Tạo model từ schema
const TaiKhoan = mongoose.model('TaiKhoan', taiKhoanSchema, 'TaiKhoan');

module.exports = TaiKhoan; 