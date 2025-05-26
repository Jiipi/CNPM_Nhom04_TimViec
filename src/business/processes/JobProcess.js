const CongViec = require('../models/CongViec');
const NhaTuyenDung = require('../models/NhaTuyenDung');

/**
 * CongViecService - Lớp dịch vụ xử lý các thao tác liên quan đến CongViec
 */
class CongViecService {
    /**
     * Tạo công việc mới
     * @param {Object} congViecData - Dữ liệu công việc
     * @returns {Promise<Object>} Công việc đã tạo
     */
    async taoCongViec(congViecData) {
        try {
            const congViec = new CongViec(congViecData);
            return await congViec.save();
        } catch (error) {
            throw new Error(`Lỗi khi tạo công việc: ${error.message}`);
        }
    }

    /**
     * Tìm công việc theo ID
     * @param {string} id - ID của công việc
     * @returns {Promise<Object>} Công việc tìm thấy
     */
    async layTheoId(id) {
        try {
            return await CongViec.findById(id)
                .populate('maND', 'hoTen email tenCongTy')
                .populate('donUngTuyen', 'trangThai ngayUngTuyen');
        } catch (error) {
            throw new Error(`Lỗi khi tìm công việc theo ID: ${error.message}`);
        }
    }

    /**
     * Cập nhật thông tin công việc
     * @param {string} id - ID của công việc
     * @param {Object} data - Dữ liệu cập nhật
     * @returns {Promise<Object>} Công việc đã cập nhật
     */
    async capNhat(id, data) {
        try {
            const congViec = await CongViec.findByIdAndUpdate(id, data, {
                new: true,  // Trả về tài liệu đã cập nhật
                runValidators: true  // Chạy trình xác thực
            });
            
            if (!congViec) {
                throw new Error('Không tìm thấy công việc để cập nhật');
            }
            
            return congViec;
        } catch (error) {
            throw new Error(`Lỗi khi cập nhật thông tin công việc: ${error.message}`);
        }
    }

    /**
     * Xóa công việc
     * @param {string} id - ID của công việc
     * @returns {Promise<boolean>} Kết quả xóa
     */
    async xoa(id) {
        try {
            const congViec = await CongViec.findById(id);
            
            if (!congViec) {
                throw new Error('Không tìm thấy công việc để xóa');
            }
            
            // Xóa tham chiếu trong NhaTuyenDung
            await NhaTuyenDung.findByIdAndUpdate(
                congViec.maND,
                { $pull: { congViecDang: id } }
            );
            
            // Xóa công việc
            await CongViec.findByIdAndDelete(id);
            
            return true;
        } catch (error) {
            throw new Error(`Lỗi khi xóa công việc: ${error.message}`);
        }
    }

    /**
     * Tìm kiếm công việc theo tiêu chí
     * @param {Object} filter - Các tiêu chí tìm kiếm
     * @param {Object} options - Tùy chọn tìm kiếm (sắp xếp, phân trang)
     * @returns {Promise<Array>} Danh sách công việc tìm thấy
     */
    async timKiem(filter = {}, options = {}) {
        try {
            const { sort = { ngayDang: -1 }, page = 1, limit = 10 } = options;
            
            // Xử lý tìm kiếm theo từ khóa
            if (filter.tuKhoa) {
                const regex = new RegExp(filter.tuKhoa, 'i');
                filter.$or = [
                    { tenCV: regex },
                    { moTa: regex },
                    { kyNang: regex }
                ];
                delete filter.tuKhoa;
            }
            
            // Xử lý tìm kiếm theo khoảng lương
            if (filter.luongMin && filter.luongMax) {
                filter.luong = { $gte: filter.luongMin, $lte: filter.luongMax };
                delete filter.luongMin;
                delete filter.luongMax;
            } else if (filter.luongMin) {
                filter.luong = { $gte: filter.luongMin };
                delete filter.luongMin;
            } else if (filter.luongMax) {
                filter.luong = { $lte: filter.luongMax };
                delete filter.luongMax;
            }
            
            const skip = (page - 1) * limit;
            
            const congViec = await CongViec.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('maND', 'hoTen tenCongTy');
                
            const total = await CongViec.countDocuments(filter);
            
            return {
                data: congViec,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Lỗi khi tìm kiếm công việc: ${error.message}`);
        }
    }

    /**
     * Thay đổi trạng thái công việc
     * @param {string} id - ID của công việc
     * @param {string} trangThai - Trạng thái mới
     * @returns {Promise<Object>} Công việc đã cập nhật
     */
    async thayDoiTrangThai(id, trangThai) {
        try {
            if (!['Đang tuyển', 'Đã đóng', 'Đợi duyệt', 'Bị từ chối'].includes(trangThai)) {
                throw new Error('Trạng thái không hợp lệ');
            }
            
            const congViec = await CongViec.findByIdAndUpdate(
                id,
                { trangThai },
                { new: true }
            );
            
            if (!congViec) {
                throw new Error('Không tìm thấy công việc để cập nhật trạng thái');
            }
            
            return congViec;
        } catch (error) {
            throw new Error(`Lỗi khi thay đổi trạng thái công việc: ${error.message}`);
        }
    }

    /**
     * Lấy công việc theo nhà tuyển dụng
     * @param {string} maNTD - ID của nhà tuyển dụng
     * @returns {Promise<Array>} Danh sách công việc
     */
    async layTheoNhaTuyenDung(maNTD) {
        try {
            return await CongViec.find({ maND: maNTD })
                .sort({ ngayDang: -1 })
                .populate('donUngTuyen', 'trangThai');
        } catch (error) {
            throw new Error(`Lỗi khi lấy công việc theo nhà tuyển dụng: ${error.message}`);
        }
    }
}

module.exports = new CongViecService(); 