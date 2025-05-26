const NguoiDung = require('../models/NguoiDung');
const UngVien = require('../models/UngVien');
const NhaTuyenDung = require('../models/NhaTuyenDung');
const QuanTriVien = require('../models/QuanTriVien');
const TaiKhoanService = require('./taiKhoanService');
const mongoose = require('mongoose');

/**
 * NguoiDungService - Lớp dịch vụ xử lý các thao tác liên quan đến NguoiDung
 */
class NguoiDungService {
    /**
     * Kiểm tra email đã tồn tại trong hệ thống chưa
     * @param {string} email - Email cần kiểm tra
     * @returns {Promise<boolean>} Kết quả kiểm tra
     */
    async emailDaTonTai(email) {
        try {
            // Sử dụng native MongoDB client để tránh validation
            const db = mongoose.connection.db;
            const existingUser = await db.collection('NguoiDung').findOne({ email });
            return !!existingUser;
        } catch (error) {
            console.error('Lỗi khi kiểm tra email:', error);
            throw new Error(`Lỗi khi kiểm tra email: ${error.message}`);
        }
    }
    
    /**
     * Tạo người dùng mới
     * @param {Object} nguoiDungData - Dữ liệu người dùng
     * @returns {Promise<Object>} Người dùng đã tạo
     */
    async taoNguoiDung(nguoiDungData) {
        try {
            // Tạo mã người dùng
            const maND = 'ND' + Date.now();
            
            // Thêm các trường cần thiết
            const nguoiDung = {
                ...nguoiDungData,
                maND: maND,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Sử dụng native MongoDB client để tránh validation
            const db = mongoose.connection.db;
            const result = await db.collection('NguoiDung').insertOne(nguoiDung);
            
            // Lấy thông tin người dùng vừa tạo
            return await db.collection('NguoiDung').findOne({ _id: result.insertedId });
        } catch (error) {
            console.error('Lỗi khi tạo người dùng:', error);
            throw new Error(`Lỗi khi tạo người dùng: ${error.message}`);
        }
    }

    /**
     * Đăng ký người dùng mới, tự động tạo tài khoản
     * @param {Object} userData - Dữ liệu người dùng
     * @returns {Promise<Object>} Người dùng đã tạo
     */
    async dangKy(userData) {
        try {
            // Tạo tài khoản trước
            const taiKhoanData = {
                tenDN: userData.email, // Sử dụng email làm tên đăng nhập
                matKhau: userData.matKhau
            };
            
            const taiKhoan = await TaiKhoanService.taoTaiKhoan(taiKhoanData);
            
            // Chuẩn bị dữ liệu người dùng
            const nguoiDungData = {
                hoTen: userData.hoTen,
                email: userData.email,
                sdt: userData.sdt,
                vaiTro: userData.vaiTro,
                taiKhoan: taiKhoan._id
            };
            
            let nguoiDung;
            
            // Tạo người dùng theo vai trò
            switch (userData.vaiTro) {
                case 'UngVien':
                    nguoiDung = new UngVien({
                        ...nguoiDungData,
                        diaChi: userData.diaChi || '',
                        ngaySinh: userData.ngaySinh || new Date(),
                        kyNang: userData.kyNang || []
                    });
                    break;
                case 'NhaTuyenDung':
                    nguoiDung = new NhaTuyenDung({
                        ...nguoiDungData,
                        tenCongTy: userData.tenCongTy,
                        moTaCty: userData.moTaCty || '',
                        soNV: userData.soNV || 0,
                        diaChiCty: userData.diaChiCty || ''
                    });
                    break;
                case 'QuanTriVien':
                    nguoiDung = new QuanTriVien({
                        ...nguoiDungData,
                        chucVu: userData.chucVu || 'Quản lý tài khoản',
                        phanQuyen: userData.phanQuyen || 'mod'
                    });
                    break;
                default:
                    throw new Error('Vai trò không hợp lệ');
            }
            
            await nguoiDung.save();
            return nguoiDung;
        } catch (error) {
            throw new Error(`Lỗi khi đăng ký người dùng: ${error.message}`);
        }
    }

    /**
     * Đăng nhập người dùng
     * @param {string} tenDN - Tên đăng nhập
     * @param {string} matKhau - Mật khẩu
     * @returns {Promise<Object>} Người dùng đã đăng nhập
     */
    async dangNhap(tenDN, matKhau) {
        try {
            // Xác thực tài khoản
            const taiKhoan = await TaiKhoanService.xacThucTaiKhoan(tenDN, matKhau);
            
            // Tìm người dùng liên kết với tài khoản
            const nguoiDung = await NguoiDung.findOne({ taiKhoan: taiKhoan._id });
            
            if (!nguoiDung) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }
            
            return nguoiDung;
        } catch (error) {
            throw new Error(`Lỗi khi đăng nhập: ${error.message}`);
        }
    }

    /**
     * Tìm người dùng theo ID
     * @param {string} id - ID của người dùng
     * @returns {Promise<Object>} Người dùng tìm thấy
     */
    async layTheoId(id) {
        try {
            return await NguoiDung.findById(id);
        } catch (error) {
            throw new Error(`Lỗi khi tìm người dùng theo ID: ${error.message}`);
        }
    }

    /**
     * Cập nhật thông tin người dùng
     * @param {string} id - ID của người dùng
     * @param {Object} data - Dữ liệu cập nhật
     * @returns {Promise<Object>} Người dùng đã cập nhật
     */
    async capNhatThongTin(id, data) {
        try {
            // Không cho phép cập nhật email và vai trò (trường quan trọng)
            if (data.email) delete data.email;
            if (data.vaiTro) delete data.vaiTro;
            if (data.taiKhoan) delete data.taiKhoan;
            
            const nguoiDung = await NguoiDung.findByIdAndUpdate(id, data, {
                new: true,  // Trả về tài liệu đã cập nhật
                runValidators: true  // Chạy trình xác thực
            });
            
            if (!nguoiDung) {
                throw new Error('Không tìm thấy người dùng để cập nhật');
            }
            
            return nguoiDung;
        } catch (error) {
            throw new Error(`Lỗi khi cập nhật thông tin người dùng: ${error.message}`);
        }
    }

    /**
     * Tìm kiếm người dùng theo tiêu chí
     * @param {Object} filter - Các tiêu chí tìm kiếm
     * @returns {Promise<Array>} Danh sách người dùng tìm thấy
     */
    async timKiem(filter = {}) {
        try {
            return await NguoiDung.find(filter);
        } catch (error) {
            throw new Error(`Lỗi khi tìm kiếm người dùng: ${error.message}`);
        }
    }

    /**
     * Vô hiệu hóa tài khoản người dùng (không xóa hoàn toàn)
     * @param {string} id - ID của người dùng
     * @returns {Promise<Object>} Kết quả vô hiệu hóa
     */
    async voHieuHoa(id) {
        try {
            const nguoiDung = await NguoiDung.findById(id);
            
            if (!nguoiDung) {
                throw new Error('Không tìm thấy người dùng');
            }
            
            // Cập nhật trạng thái người dùng
            nguoiDung.thongTin.daKhoa = true;
            await nguoiDung.save();
            
            return nguoiDung;
        } catch (error) {
            throw new Error(`Lỗi khi vô hiệu hóa tài khoản: ${error.message}`);
        }
    }
}

module.exports = new NguoiDungService(); 