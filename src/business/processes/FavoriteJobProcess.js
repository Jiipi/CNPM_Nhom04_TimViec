const ViecYeuThich = require('../models/ViecYeuThich');
const UngVien = require('../models/UngVien');
const CongViec = require('../models/CongViec');

/**
 * ViecYeuThichService - Lớp dịch vụ xử lý các thao tác liên quan đến ViecYeuThich
 */
class ViecYeuThichService {
    /**
     * Đánh dấu công việc yêu thích
     * @param {string} maCV - ID của công việc
     * @param {string} maND - ID của người dùng (ứng viên)
     * @returns {Promise<Object>} Kết quả đánh dấu
     */
    async danhDauYeuThich(maCV, maND) {
        try {
            // Kiểm tra xem công việc có tồn tại không
            const congViec = await CongViec.findById(maCV).populate('nhaTuyenDung');
            
            if (!congViec) {
                throw new Error('Công việc không tồn tại');
            }
            
            // Kiểm tra xem ứng viên đã đánh dấu công việc này chưa
            const yeuThichTonTai = await ViecYeuThich.findOne({ maCV, maND });
            
            if (yeuThichTonTai) {
                throw new Error('Công việc này đã được đánh dấu yêu thích');
            }
            
            // Lấy tên công ty từ nhà tuyển dụng nếu có
            let tenCongTy = 'Không xác định';
            if (congViec.tenCongTy) {
                tenCongTy = congViec.tenCongTy;
            } else if (congViec.nhaTuyenDung && congViec.nhaTuyenDung.thongTin && congViec.nhaTuyenDung.thongTin.tenCongTy) {
                tenCongTy = congViec.nhaTuyenDung.thongTin.tenCongTy;
            }
            
            // Tạo bản ghi mới với đầy đủ thông tin
            const viecYeuThich = new ViecYeuThich({
                maCV,
                maND,
                tenCV: congViec.tenCV || 'Không có tên',
                moTa: congViec.moTa || '',
                diaDiem: congViec.diaDiem || '',
                luong: congViec.luong || 0,
                kinhNghiem: congViec.kinhNghiem || '',
                hocVan: congViec.hocVan || '',
                kyNang: congViec.kyNang || [],
                loiIch: congViec.loiIch || '',
                trangThai: congViec.trangThai || 'Đang tuyển',
                tenCongTy: tenCongTy
            });
            
            return await viecYeuThich.save();
        } catch (error) {
            throw new Error(`Lỗi khi đánh dấu công việc yêu thích: ${error.message}`);
        }
    }

    /**
     * Bỏ đánh dấu công việc yêu thích
     * @param {string} maCV - ID của công việc
     * @param {string} maND - ID của người dùng (ứng viên)
     * @returns {Promise<boolean>} Kết quả bỏ đánh dấu
     */
    async boDanhDauYeuThich(maCV, maND) {
        try {
            // Xóa bản ghi nếu tồn tại
            const ketQua = await ViecYeuThich.findOneAndDelete({ maCV, maND });
            
            if (!ketQua) {
                throw new Error('Công việc chưa được đánh dấu yêu thích');
            }
            
            // Xóa tham chiếu trong UngVien
            await UngVien.findByIdAndUpdate(
                maND,
                { $pull: { cvYeuThich: maCV } }
            );
            
            return true;
        } catch (error) {
            throw new Error(`Lỗi khi bỏ đánh dấu công việc yêu thích: ${error.message}`);
        }
    }

    /**
     * Kiểm tra công việc có được yêu thích bởi người dùng không
     * @param {string} maCV - ID của công việc
     * @param {string} maND - ID của người dùng (ứng viên)
     * @returns {Promise<boolean>} Kết quả kiểm tra
     */
    async kiemTraYeuThich(maCV, maND) {
        try {
            const viecYeuThich = await ViecYeuThich.findOne({ maCV, maND });
            return viecYeuThich ? true : false;
        } catch (error) {
            throw new Error(`Lỗi khi kiểm tra công việc yêu thích: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách công việc yêu thích của người dùng
     * @param {string} maND - ID của người dùng (ứng viên)
     * @returns {Promise<Array>} Danh sách công việc yêu thích
     */
    async layDanhSachYeuThich(maND) {
        try {
            // Lấy danh sách việc làm yêu thích mà không cần populate vì đã lưu đầy đủ thông tin
            const danhSach = await ViecYeuThich.find({ maND })
                .sort({ ngayDanhDau: -1 });
            
            // Trả về danh sách đã được định dạng
            return danhSach.map(item => ({
                maYeuThich: item._id,
                maCV: item.maCV,
                ngayDanhDau: item.ngayDanhDau,
                tenCV: item.tenCV,
                moTa: item.moTa,
                diaDiem: item.diaDiem,
                luong: item.luong,
                kinhNghiem: item.kinhNghiem,
                hocVan: item.hocVan,
                kyNang: item.kyNang,
                loiIch: item.loiIch,
                trangThai: item.trangThai,
                tenCongTy: item.tenCongTy
            }));
        } catch (error) {
            throw new Error(`Lỗi khi lấy danh sách công việc yêu thích: ${error.message}`);
        }
    }

    /**
     * Lấy số lượng người dùng đã đánh dấu yêu thích một công việc
     * @param {string} maCV - ID của công việc
     * @returns {Promise<number>} Số lượng đánh dấu yêu thích
     */
    async demSoLuongYeuThich(maCV) {
        try {
            return await ViecYeuThich.countDocuments({ maCV });
        } catch (error) {
            throw new Error(`Lỗi khi đếm số lượng yêu thích: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách công việc được yêu thích nhiều nhất
     * @param {number} limit - Số lượng kết quả tối đa
     * @returns {Promise<Array>} Danh sách công việc được yêu thích nhiều
     */
    async layTop(limit = 10) {
        try {
            // Phương pháp: nhóm theo maCV và đếm số lần xuất hiện
            const topCongViec = await ViecYeuThich.aggregate([
                { $group: { _id: '$maCV', soLuong: { $sum: 1 } } },
                { $sort: { soLuong: -1 } },
                { $limit: limit }
            ]);
            
            // Lấy thông tin chi tiết công việc
            const danhSachID = topCongViec.map(item => item._id);
            
            const danhSachCongViec = await CongViec.find({
                _id: { $in: danhSachID }
            }).populate('maND', 'hoTen tenCongTy');
            
            // Kết hợp số lượng yêu thích vào kết quả trả về
            return danhSachCongViec.map(congViec => {
                const thongTinYeuThich = topCongViec.find(
                    item => item._id.toString() === congViec._id.toString()
                );
                
                return {
                    congViec: congViec,
                    soLuongYeuThich: thongTinYeuThich.soLuong
                };
            });
        } catch (error) {
            throw new Error(`Lỗi khi lấy danh sách công việc được yêu thích nhiều: ${error.message}`);
        }
    }
}

module.exports = new ViecYeuThichService(); 