const ThongBao = require('../models/ThongBao');
const NguoiDung = require('../models/NguoiDung');

/**
 * ThongBaoService - Lớp dịch vụ xử lý các thao tác liên quan đến ThongBao
 */
class ThongBaoService {
    /**
     * Tạo thông báo mới
     * @param {Object} thongBaoData - Dữ liệu thông báo
     * @returns {Promise<Object>} Thông báo đã tạo
     */
    async taoThongBao(thongBaoData) {
        try {
            const thongBao = new ThongBao(thongBaoData);
            return await thongBao.save();
        } catch (error) {
            throw new Error(`Lỗi khi tạo thông báo: ${error.message}`);
        }
    }

    /**
     * Gửi thông báo cho nhiều người dùng
     * @param {string} nguoiTao - ID của người tạo thông báo
     * @param {string} noiDung - Nội dung thông báo
     * @param {Array} danhSachNguoiNhan - Danh sách ID người nhận
     * @returns {Promise<Object>} Thông báo đã tạo
     */
    async guiThongBao(nguoiTao, noiDung, danhSachNguoiNhan) {
        try {
            const thongBao = new ThongBao({
                nguoiTao,
                noiDung,
                nguoiNhan: danhSachNguoiNhan
            });
            
            return await thongBao.save();
        } catch (error) {
            throw new Error(`Lỗi khi gửi thông báo: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách thông báo của người dùng
     * @param {string} nguoiDungId - ID của người dùng
     * @param {boolean} daDoc - Lọc theo trạng thái đã đọc
     * @returns {Promise<Array>} Danh sách thông báo
     */
    async layThongBaoCuaNguoiDung(nguoiDungId, daDoc = null) {
        try {
            let filter = { nguoiNhan: nguoiDungId };
            
            // Nếu có truyền trạng thái đã đọc, thêm vào bộ lọc
            if (daDoc !== null) {
                filter.daDoc = daDoc;
            }
            
            return await ThongBao.find(filter)
                .sort({ ngayTao: -1 })
                .populate('nguoiTao', 'hoTen');
        } catch (error) {
            throw new Error(`Lỗi khi lấy thông báo của người dùng: ${error.message}`);
        }
    }

    /**
     * Đánh dấu thông báo đã đọc
     * @param {string} id - ID của thông báo
     * @param {string} nguoiDungId - ID của người dùng đọc thông báo
     * @returns {Promise<Object>} Thông báo đã cập nhật
     */
    async danhDauDaDoc(id, nguoiDungId) {
        try {
            const thongBao = await ThongBao.findById(id);
            
            if (!thongBao) {
                throw new Error('Không tìm thấy thông báo');
            }
            
            // Kiểm tra xem người dùng có phải là người nhận không
            if (!thongBao.nguoiNhan.includes(nguoiDungId)) {
                throw new Error('Người dùng không có quyền đọc thông báo này');
            }
            
            thongBao.daDoc = true;
            return await thongBao.save();
        } catch (error) {
            throw new Error(`Lỗi khi đánh dấu thông báo đã đọc: ${error.message}`);
        }
    }

    /**
     * Đánh dấu nhiều thông báo đã đọc
     * @param {Array} thongBaoIds - Danh sách ID thông báo
     * @param {string} nguoiDungId - ID của người dùng đọc thông báo
     * @returns {Promise<boolean>} Kết quả cập nhật
     */
    async danhDauNhieuDaDoc(thongBaoIds, nguoiDungId) {
        try {
            // Cập nhật tất cả thông báo có ID trong danh sách và người nhận là người dùng
            const ketQua = await ThongBao.updateMany(
                { 
                    _id: { $in: thongBaoIds },
                    nguoiNhan: nguoiDungId
                },
                { daDoc: true }
            );
            
            return ketQua.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Lỗi khi đánh dấu nhiều thông báo đã đọc: ${error.message}`);
        }
    }

    /**
     * Đánh dấu tất cả thông báo của người dùng đã đọc
     * @param {string} nguoiDungId - ID của người dùng
     * @returns {Promise<boolean>} Kết quả cập nhật
     */
    async danhDauTatCaDaDoc(nguoiDungId) {
        try {
            const ketQua = await ThongBao.updateMany(
                { nguoiNhan: nguoiDungId, daDoc: false },
                { daDoc: true }
            );
            
            return ketQua.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Lỗi khi đánh dấu tất cả thông báo đã đọc: ${error.message}`);
        }
    }

    /**
     * Đếm số thông báo chưa đọc của người dùng
     * @param {string} nguoiDungId - ID của người dùng
     * @returns {Promise<number>} Số lượng thông báo chưa đọc
     */
    async demThongBaoChuaDoc(nguoiDungId) {
        try {
            return await ThongBao.countDocuments({
                nguoiNhan: nguoiDungId,
                daDoc: false
            });
        } catch (error) {
            throw new Error(`Lỗi khi đếm thông báo chưa đọc: ${error.message}`);
        }
    }

    /**
     * Xóa thông báo
     * @param {string} id - ID của thông báo
     * @param {string} nguoiDungId - ID của người dùng (để kiểm tra quyền)
     * @returns {Promise<boolean>} Kết quả xóa
     */
    async xoaThongBao(id, nguoiDungId) {
        try {
            const thongBao = await ThongBao.findById(id);
            
            if (!thongBao) {
                throw new Error('Không tìm thấy thông báo');
            }
            
            // Kiểm tra xem người dùng có quyền xóa không
            // (là người tạo hoặc là người nhận)
            if (thongBao.nguoiTao.toString() !== nguoiDungId &&
                !thongBao.nguoiNhan.includes(nguoiDungId)) {
                throw new Error('Người dùng không có quyền xóa thông báo này');
            }
            
            // Xóa tham chiếu trong NguoiDung
            for (const nguoiNhanId of thongBao.nguoiNhan) {
                await NguoiDung.findByIdAndUpdate(
                    nguoiNhanId,
                    { $pull: { thongBao: id } }
                );
            }
            
            // Xóa thông báo
            await ThongBao.findByIdAndDelete(id);
            
            return true;
        } catch (error) {
            throw new Error(`Lỗi khi xóa thông báo: ${error.message}`);
        }
    }
}

module.exports = new ThongBaoService(); 