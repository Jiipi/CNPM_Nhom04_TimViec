const DonUngTuyen = require('../models/DonUngTuyen');
const UngVien = require('../models/UngVien');
const CongViec = require('../models/CongViec');
const ThongBao = require('../models/ThongBao');

/**
 * DonUngTuyenService - Lớp dịch vụ xử lý các thao tác liên quan đến DonUngTuyen
 */
class DonUngTuyenService {
    /**
     * Tạo đơn ứng tuyển mới
     * @param {Object} donUngTuyenData - Dữ liệu đơn ứng tuyển
     * @returns {Promise<Object>} Đơn ứng tuyển đã tạo
     */
    async taoDonUngTuyen(donUngTuyenData) {
        try {
            // Kiểm tra xem ứng viên đã ứng tuyển công việc này chưa
            const donTonTai = await DonUngTuyen.findOne({
                ungVien: donUngTuyenData.ungVien,
                congViec: donUngTuyenData.congViec
            });
            
            if (donTonTai) {
                throw new Error('Bạn đã ứng tuyển công việc này rồi');
            }
            
            // Tạo đơn ứng tuyển mới
            const donUngTuyen = new DonUngTuyen(donUngTuyenData);
            const ketQua = await donUngTuyen.save();
            
            // Tìm thông tin công việc để tạo thông báo
            const congViec = await CongViec.findById(donUngTuyenData.congViec)
                .populate('maND', 'hoTen _id');
            
            // Tạo thông báo cho nhà tuyển dụng
            if (congViec && congViec.maND) {
                const thongBao = new ThongBao({
                    nguoiTao: donUngTuyenData.ungVien,
                    noiDung: `Có ứng viên mới đã ứng tuyển vào công việc "${congViec.tenCV}"`,
                    nguoiNhan: [congViec.maND._id]
                });
                
                await thongBao.save();
            }
            
            return ketQua;
        } catch (error) {
            throw new Error(`Lỗi khi tạo đơn ứng tuyển: ${error.message}`);
        }
    }

    /**
     * Tìm đơn ứng tuyển theo ID
     * @param {string} id - ID của đơn ứng tuyển
     * @returns {Promise<Object>} Đơn ứng tuyển tìm thấy
     */
    async layTheoId(id) {
        try {
            return await DonUngTuyen.findById(id)
                .populate('ungVien', 'hoTen email sdt')
                .populate('congViec', 'tenCV moTa luong');
        } catch (error) {
            throw new Error(`Lỗi khi tìm đơn ứng tuyển theo ID: ${error.message}`);
        }
    }

    /**
     * Cập nhật thông tin đơn ứng tuyển
     * @param {string} id - ID của đơn ứng tuyển
     * @param {Object} data - Dữ liệu cập nhật
     * @returns {Promise<Object>} Đơn ứng tuyển đã cập nhật
     */
    async capNhat(id, data) {
        try {
            const donUngTuyen = await DonUngTuyen.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });
            
            if (!donUngTuyen) {
                throw new Error('Không tìm thấy đơn ứng tuyển để cập nhật');
            }
            
            return donUngTuyen;
        } catch (error) {
            throw new Error(`Lỗi khi cập nhật đơn ứng tuyển: ${error.message}`);
        }
    }

    /**
     * Thay đổi trạng thái đơn ứng tuyển
     * @param {string} id - ID của đơn ứng tuyển
     * @param {string} trangThai - Trạng thái mới
     * @param {string} ghiChu - Ghi chú kèm theo thay đổi trạng thái
     * @returns {Promise<Object>} Đơn ứng tuyển đã cập nhật
     */
    async thayDoiTrangThai(id, trangThai, ghiChu) {
        try {
            if (!['Trúng tuyển', 'Từ chối', 'Chờ kết quả'].includes(trangThai)) {
                throw new Error('Trạng thái không hợp lệ');
            }
            
            const donUngTuyen = await DonUngTuyen.findByIdAndUpdate(
                id,
                { 
                    trangThai,
                    ghiChu: ghiChu || ''
                },
                { new: true }
            ).populate('ungVien', '_id hoTen')
             .populate('congViec', 'tenCV');
            
            if (!donUngTuyen) {
                throw new Error('Không tìm thấy đơn ứng tuyển để cập nhật trạng thái');
            }
            
            // Tạo thông báo cho ứng viên về kết quả
            const noiDungThongBao = trangThai === 'Trúng tuyển' 
                ? `Chúc mừng! Bạn đã trúng tuyển vào vị trí "${donUngTuyen.congViec.tenCV}"`
                : trangThai === 'Từ chối'
                ? `Rất tiếc! Đơn ứng tuyển vào vị trí "${donUngTuyen.congViec.tenCV}" của bạn đã bị từ chối`
                : `Đơn ứng tuyển vào vị trí "${donUngTuyen.congViec.tenCV}" của bạn đang được xem xét`;
            
            const thongBao = new ThongBao({
                nguoiTao: donUngTuyen.congViec.maND,
                noiDung: noiDungThongBao,
                nguoiNhan: [donUngTuyen.ungVien._id]
            });
            
            await thongBao.save();
            
            return donUngTuyen;
        } catch (error) {
            throw new Error(`Lỗi khi thay đổi trạng thái đơn ứng tuyển: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách đơn ứng tuyển theo ứng viên
     * @param {string} maUV - ID của ứng viên
     * @returns {Promise<Array>} Danh sách đơn ứng tuyển
     */
    async layTheoUngVien(maUV) {
        try {
            return await DonUngTuyen.find({ ungVien: maUV })
                .sort({ ngayUngTuyen: -1 })
                .populate('congViec', 'tenCV moTa luong maND')
                .populate({
                    path: 'congViec',
                    populate: {
                        path: 'maND',
                        select: 'hoTen tenCongTy'
                    }
                });
        } catch (error) {
            throw new Error(`Lỗi khi lấy đơn ứng tuyển theo ứng viên: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách đơn ứng tuyển theo công việc
     * @param {string} maCV - ID của công việc
     * @returns {Promise<Array>} Danh sách đơn ứng tuyển
     */
    async layTheoCongViec(maCV) {
        try {
            return await DonUngTuyen.find({ congViec: maCV })
                .sort({ ngayUngTuyen: -1 })
                .populate('ungVien', 'hoTen email sdt')
                .populate({
                    path: 'ungVien',
                    populate: {
                        path: 'cv',
                        select: 'fileCV'
                    }
                });
        } catch (error) {
            throw new Error(`Lỗi khi lấy đơn ứng tuyển theo công việc: ${error.message}`);
        }
    }

    /**
     * Xóa đơn ứng tuyển
     * @param {string} id - ID của đơn ứng tuyển
     * @returns {Promise<boolean>} Kết quả xóa
     */
    async xoa(id) {
        try {
            const donUngTuyen = await DonUngTuyen.findById(id);
            
            if (!donUngTuyen) {
                throw new Error('Không tìm thấy đơn ứng tuyển để xóa');
            }
            
            // Xóa tham chiếu trong UngVien
            await UngVien.findByIdAndUpdate(
                donUngTuyen.ungVien,
                { $pull: { donUngTuyen: id } }
            );
            
            // Xóa tham chiếu trong CongViec
            await CongViec.findByIdAndUpdate(
                donUngTuyen.congViec,
                { $pull: { donUngTuyen: id } }
            );
            
            // Xóa đơn ứng tuyển
            await DonUngTuyen.findByIdAndDelete(id);
            
            return true;
        } catch (error) {
            throw new Error(`Lỗi khi xóa đơn ứng tuyển: ${error.message}`);
        }
    }
}

module.exports = new DonUngTuyenService(); 