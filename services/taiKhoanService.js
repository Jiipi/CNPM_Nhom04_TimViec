const TaiKhoan = require('../models/TaiKhoan');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

/**
 * TaiKhoanService - Lớp dịch vụ xử lý các thao tác liên quan đến TaiKhoan
 */
class TaiKhoanService {
    /**
     * Tạo tài khoản mới
     * @param {Object} taiKhoanData - Dữ liệu tài khoản
     * @returns {Promise<Object>} Tài khoản đã tạo
     */
    async taoTaiKhoan(taiKhoanData) {
        try {
            const taiKhoan = new TaiKhoan(taiKhoanData);
            return await taiKhoan.save();
        } catch (error) {
            throw new Error(`Lỗi khi tạo tài khoản: ${error.message}`);
        }
    }

    /**
     * Tìm tài khoản theo ID
     * @param {string} id - ID của tài khoản
     * @returns {Promise<Object>} Tài khoản tìm thấy
     */
    async layTheoId(id) {
        try {
            return await TaiKhoan.findById(id);
        } catch (error) {
            throw new Error(`Lỗi khi tìm tài khoản theo ID: ${error.message}`);
        }
    }

    /**
     * Kiểm tra đăng nhập
     * @param {string} tenDN - Tên đăng nhập
     * @param {string} matKhau - Mật khẩu
     * @param {string} vaiTro - Vai trò người dùng (UngVien, NhaTuyenDung)
     * @returns {Promise<Object>} Kết quả đăng nhập
     */
    async kiemTraDangNhap(tenDN, matKhau, vaiTro) {
        try {
            console.log(`Đang kiểm tra đăng nhập với username: ${tenDN}, password: ${matKhau}, vaiTro: ${vaiTro || 'không xác định'}`);
            
            // Tìm tài khoản trực tiếp bằng native MongoDB client
            const db = mongoose.connection.db;
            
            // Hiển thị thông tin về collections
            console.log('Các collection hiện có:', await db.listCollections().toArray().then(cols => cols.map(c => c.name)));
            
            // 1. Tìm kiếm trong collection TaiKhoan
            const taiKhoan = await db.collection('TaiKhoan').findOne({ tenDN });
            
            console.log('Tìm thấy tài khoản:', taiKhoan);
            
            if (!taiKhoan) {
                return {
                    success: false,
                    message: 'Tên đăng nhập không tồn tại'
                };
            }
            
            // 2. So sánh mật khẩu trực tiếp
            const matKhauDung = taiKhoan.matKhau === matKhau;
            console.log(`Mật khẩu trong DB: ${taiKhoan.matKhau}, Mật khẩu nhập: ${matKhau}, Khớp: ${matKhauDung}`);
            
            if (!matKhauDung) {
                return {
                    success: false,
                    message: 'Mật khẩu không đúng'
                };
            }
            
            // 3. Cập nhật thời gian đăng nhập
            await db.collection('TaiKhoan').updateOne(
                { _id: taiKhoan._id },
                { $set: { lanCuoiDN: new Date() } }
            );
            
            try {
                // 4. Tìm thông tin người dùng để xác định loại tài khoản
                const nguoiDung = await db.collection('NguoiDung').findOne({ taiKhoan: taiKhoan._id });
                
                if (!nguoiDung) {
                    console.log('Không tìm thấy người dùng với taiKhoan._id');
                    const allUsers = await db.collection('NguoiDung').find().toArray();
                    console.log('Tổng số người dùng trong DB:', allUsers.length);
                    
                    // Tìm bất kỳ người dùng nào có email trùng với tenDN (vì tenDN thường là email)
                    const userByEmail = await db.collection('NguoiDung').findOne({ email: tenDN });
                    if (userByEmail) {
                        console.log('Đã tìm thấy người dùng qua email:', userByEmail);
                        
                        // Cập nhật liên kết tài khoản cho người dùng này
                        await db.collection('NguoiDung').updateOne(
                            { _id: userByEmail._id },
                            { $set: { taiKhoan: taiKhoan._id } }
                        );
                        
                        // Log vai trò người dùng cho debug
                        console.log('Vai trò người dùng:', userByEmail.vaiTro);
                        
                        // Kiểm tra xem có đúng vaiTro đăng nhập không
                        if (vaiTro && userByEmail.vaiTro !== vaiTro) {
                            console.log(`Phát hiện đăng nhập sai vai trò: yêu cầu ${vaiTro}, thực tế ${userByEmail.vaiTro}`);
                            
                            // Không hiển thị thông tin về vai trò thực tế, chỉ báo không tìm thấy tài khoản
                            return {
                                success: false,
                                message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                                wrongRole: true,
                                hideRole: true // Thêm flag để biết là đang ẩn thông tin vai trò
                            };
                        }
                        
                        return {
                            success: true,
                            message: 'Đăng nhập thành công',
                            data: {
                                taiKhoan: {
                                    _id: taiKhoan._id,
                                    tenDN: taiKhoan.tenDN,
                                    ngayTao: taiKhoan.ngayTao,
                                    lanCuoiDN: taiKhoan.lanCuoiDN
                                },
                                nguoiDung: userByEmail
                            }
                        };
                    }
                    
                    return {
                        success: false,
                        message: 'Không tìm thấy thông tin người dùng'
                    };
                }
                
                // Kiểm tra xem có đúng vaiTro đăng nhập không
                if (vaiTro && nguoiDung.vaiTro !== vaiTro) {
                    console.log(`Phát hiện đăng nhập sai vai trò: yêu cầu ${vaiTro}, thực tế ${nguoiDung.vaiTro}`);
                    
                    // Không hiển thị thông tin về vai trò thực tế, chỉ báo không tìm thấy tài khoản
                    return {
                        success: false,
                        message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                        wrongRole: true,
                        hideRole: true // Thêm flag để biết là đang ẩn thông tin vai trò
                    };
                }
                
                // Người dùng tồn tại, trả về kết quả
                return {
                    success: true,
                    message: 'Đăng nhập thành công',
                    data: {
                        taiKhoan: {
                            _id: taiKhoan._id,
                            tenDN: taiKhoan.tenDN,
                            ngayTao: taiKhoan.ngayTao,
                            lanCuoiDN: taiKhoan.lanCuoiDN
                        },
                        nguoiDung: nguoiDung
                    }
                };
            } catch (err) {
                console.error('Lỗi khi tìm thông tin người dùng:', err);
                return {
                    success: false,
                    message: 'Lỗi khi tìm thông tin người dùng: ' + err.message
                };
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            return {
                success: false,
                message: `Lỗi đăng nhập: ${error.message}`
            };
        }
    }

    /**
     * Cập nhật lần cuối đăng nhập
     * @param {string} id - ID của tài khoản
     * @returns {Promise<boolean>} Kết quả cập nhật
     */
    async capNhatLanCuoiDangNhap(id) {
        try {
            await TaiKhoan.findByIdAndUpdate(id, { lanCuoiDN: Date.now() });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Xác thực tài khoản (đăng nhập)
     * @param {string} tenDN - Tên đăng nhập
     * @param {string} matKhau - Mật khẩu
     * @returns {Promise<Object>} Tài khoản nếu xác thực thành công
     */
    async xacThucTaiKhoan(tenDN, matKhau) {
        try {
            // Tìm tài khoản theo tên đăng nhập và bao gồm cả trường mật khẩu
            const taiKhoan = await TaiKhoan.findOne({ tenDN }).select('+matKhau');
            
            if (!taiKhoan) {
                throw new Error('Tên đăng nhập không tồn tại');
            }
            
            // Kiểm tra mật khẩu
            const khopMatKhau = await taiKhoan.kiemTraMatKhau(matKhau);
            
            if (!khopMatKhau) {
                throw new Error('Mật khẩu không đúng');
            }
            
            // Cập nhật thời gian đăng nhập gần nhất
            taiKhoan.lanCuoiDN = Date.now();
            await taiKhoan.save();
            
            // Không trả về mật khẩu
            taiKhoan.matKhau = undefined;
            
            return taiKhoan;
        } catch (error) {
            throw new Error(`Lỗi khi xác thực tài khoản: ${error.message}`);
        }
    }

    /**
     * Cập nhật mật khẩu
     * @param {string} id - ID của tài khoản
     * @param {string} matKhauCu - Mật khẩu cũ
     * @param {string} matKhauMoi - Mật khẩu mới
     * @returns {Promise<Object>} Tài khoản đã cập nhật
     */
    async capNhatMatKhau(id, matKhauCu, matKhauMoi) {
        try {
            const taiKhoan = await TaiKhoan.findById(id).select('+matKhau');
            
            if (!taiKhoan) {
                throw new Error('Tài khoản không tồn tại');
            }
            
            // Kiểm tra mật khẩu cũ
            const khopMatKhau = await taiKhoan.kiemTraMatKhau(matKhauCu);
            
            if (!khopMatKhau) {
                throw new Error('Mật khẩu cũ không đúng');
            }
            
            // Cập nhật mật khẩu mới
            taiKhoan.matKhau = matKhauMoi;
            await taiKhoan.save();
            
            // Không trả về mật khẩu
            taiKhoan.matKhau = undefined;
            
            return taiKhoan;
        } catch (error) {
            throw new Error(`Lỗi khi cập nhật mật khẩu: ${error.message}`);
        }
    }

    /**
     * Xóa tài khoản
     * @param {string} id - ID của tài khoản
     * @returns {Promise<boolean>} Kết quả xóa
     */
    async xoaTaiKhoan(id) {
        try {
            const ketQua = await TaiKhoan.findByIdAndDelete(id);
            return ketQua ? true : false;
        } catch (error) {
            throw new Error(`Lỗi khi xóa tài khoản: ${error.message}`);
        }
    }
}

module.exports = new TaiKhoanService(); 