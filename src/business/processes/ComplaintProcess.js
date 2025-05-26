const KhieuNai = require('../models/KhieuNai');
const NguoiDung = require('../models/NguoiDung');
const ThongBao = require('../models/ThongBao');

/**
 * KhieuNaiService - Lớp dịch vụ xử lý các thao tác liên quan đến KhieuNai
 */
class KhieuNaiService {
    /**
     * Tạo khiếu nại mới
     * @param {Object} khieuNaiData - Dữ liệu khiếu nại
     * @returns {Promise<Object>} Khiếu nại đã tạo
     */
    async taoKhieuNai(khieuNaiData) {
        try {
            const khieuNai = new KhieuNai(khieuNaiData);
            const ketQua = await khieuNai.save();
            
            // Tìm các quản trị viên để gửi thông báo
            const quanTriVien = await NguoiDung.find({ vaiTro: 'QuanTriVien' });
            const danhSachQTV = quanTriVien.map(qtv => qtv._id);
            
            // Tạo thông báo cho quản trị viên
            if (danhSachQTV.length > 0) {
                const thongBao = new ThongBao({
                    nguoiTao: khieuNaiData.nguoiGui,
                    noiDung: `Có một khiếu nại mới cần được xử lý`,
                    nguoiNhan: danhSachQTV
                });
                
                await thongBao.save();
            }
            
            return ketQua;
        } catch (error) {
            throw new Error(`Lỗi khi tạo khiếu nại: ${error.message}`);
        }
    }

    /**
     * Tìm khiếu nại theo ID
     * @param {string} id - ID của khiếu nại
     * @returns {Promise<Object>} Khiếu nại tìm thấy
     */
    async layTheoId(id) {
        try {
            return await KhieuNai.findById(id)
                .populate('nguoiGui', 'hoTen email sdt')
                .populate('nguoiXuLy', 'hoTen chucVu');
        } catch (error) {
            throw new Error(`Lỗi khi tìm khiếu nại theo ID: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách khiếu nại theo người gửi
     * @param {string} nguoiGuiId - ID của người gửi
     * @returns {Promise<Array>} Danh sách khiếu nại
     */
    async layTheoNguoiGui(nguoiGuiId) {
        try {
            return await KhieuNai.find({ nguoiGui: nguoiGuiId })
                .sort({ ngayTao: -1 })
                .populate('nguoiXuLy', 'hoTen chucVu');
        } catch (error) {
            throw new Error(`Lỗi khi lấy khiếu nại theo người gửi: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách tất cả khiếu nại
     * @param {Object} filter - Bộ lọc
     * @param {Object} options - Tùy chọn tìm kiếm
     * @returns {Promise<Object>} Danh sách khiếu nại và thông tin phân trang
     */
    async layTatCa(filter = {}, options = {}) {
        try {
            const { sort = { ngayTao: -1 }, page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;
            
            // Thêm bộ lọc theo trạng thái
            if (filter.trangThai && ['Chờ xử lý', 'Đã xử lý'].includes(filter.trangThai)) {
                filter.trangThai = filter.trangThai;
            }
            
            // Tìm khiếu nại theo bộ lọc
            const khieuNai = await KhieuNai.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('nguoiGui', 'hoTen email')
                .populate('nguoiXuLy', 'hoTen');
                
            const total = await KhieuNai.countDocuments(filter);
            
            return {
                data: khieuNai,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Lỗi khi lấy tất cả khiếu nại: ${error.message}`);
        }
    }

    /**
     * Xử lý khiếu nại
     * @param {string} id - ID của khiếu nại
     * @param {string} nguoiXuLyId - ID của người xử lý
     * @param {string} phanHoi - Phản hồi cho khiếu nại
     * @returns {Promise<Object>} Khiếu nại đã cập nhật
     */
    async xuLyKhieuNai(id, nguoiXuLyId, phanHoi) {
        try {
            // Tìm và cập nhật khiếu nại
            const khieuNai = await KhieuNai.findByIdAndUpdate(
                id,
                {
                    trangThai: 'Đã xử lý',
                    phanHoi,
                    nguoiXuLy: nguoiXuLyId,
                    ngayXuLy: Date.now()
                },
                { new: true }
            ).populate('nguoiGui', 'hoTen _id');
            
            if (!khieuNai) {
                throw new Error('Không tìm thấy khiếu nại để xử lý');
            }
            
            // Tạo thông báo cho người gửi khiếu nại
            const thongBao = new ThongBao({
                nguoiTao: nguoiXuLyId,
                noiDung: `Khiếu nại của bạn đã được xử lý. Vui lòng kiểm tra phản hồi.`,
                nguoiNhan: [khieuNai.nguoiGui._id]
            });
            
            await thongBao.save();
            
            return khieuNai;
        } catch (error) {
            throw new Error(`Lỗi khi xử lý khiếu nại: ${error.message}`);
        }
    }

    /**
     * Cập nhật nội dung khiếu nại
     * @param {string} id - ID của khiếu nại
     * @param {string} nguoiGuiId - ID của người gửi (để kiểm tra quyền)
     * @param {string} noiDung - Nội dung cập nhật
     * @returns {Promise<Object>} Khiếu nại đã cập nhật
     */
    async capNhatNoiDung(id, nguoiGuiId, noiDung) {
        try {
            // Tìm khiếu nại
            const khieuNai = await KhieuNai.findById(id);
            
            if (!khieuNai) {
                throw new Error('Không tìm thấy khiếu nại');
            }
            
            // Kiểm tra quyền sửa
            if (khieuNai.nguoiGui.toString() !== nguoiGuiId) {
                throw new Error('Bạn không có quyền sửa khiếu nại này');
            }
            
            // Chỉ cho phép sửa khi khiếu nại đang ở trạng thái "Chờ xử lý"
            if (khieuNai.trangThai !== 'Chờ xử lý') {
                throw new Error('Khiếu nại đã được xử lý, không thể sửa');
            }
            
            // Cập nhật nội dung
            khieuNai.noiDung = noiDung;
            return await khieuNai.save();
        } catch (error) {
            throw new Error(`Lỗi khi cập nhật nội dung khiếu nại: ${error.message}`);
        }
    }

    /**
     * Xóa khiếu nại
     * @param {string} id - ID của khiếu nại
     * @param {string} nguoiDungId - ID của người dùng (để kiểm tra quyền)
     * @param {string} vaiTro - Vai trò của người dùng
     * @returns {Promise<boolean>} Kết quả xóa
     */
    async xoaKhieuNai(id, nguoiDungId, vaiTro) {
        try {
            const khieuNai = await KhieuNai.findById(id);
            
            if (!khieuNai) {
                throw new Error('Không tìm thấy khiếu nại');
            }
            
            // Kiểm tra quyền xóa: người gửi hoặc quản trị viên
            const laQuanTriVien = vaiTro === 'QuanTriVien';
            const laNguoiGui = khieuNai.nguoiGui.toString() === nguoiDungId;
            
            if (!laQuanTriVien && !laNguoiGui) {
                throw new Error('Bạn không có quyền xóa khiếu nại này');
            }
            
            // Nếu không phải quản trị viên, chỉ cho phép xóa khi chưa xử lý
            if (!laQuanTriVien && khieuNai.trangThai !== 'Chờ xử lý') {
                throw new Error('Khiếu nại đã được xử lý, bạn không thể xóa');
            }
            
            // Xóa tham chiếu trong NguoiDung
            await NguoiDung.findByIdAndUpdate(
                khieuNai.nguoiGui,
                { $pull: { khieuNai: id } }
            );
            
            // Xóa khiếu nại
            await KhieuNai.findByIdAndDelete(id);
            
            return true;
        } catch (error) {
            throw new Error(`Lỗi khi xóa khiếu nại: ${error.message}`);
        }
    }
}

module.exports = new KhieuNaiService(); 