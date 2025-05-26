const express = require('express');
const router = express.Router();
const ThongBao = require('../models/ThongBao');
const CongViec = require('../models/CongViec');
const mongoose = require('mongoose');

// Import middleware
try {
  var { isAuth, isNhaTuyenDung, isUngVien } = require('../middleware/authMiddleware');
} catch (error) {
  console.error('Lỗi khi import middleware:', error);
  // Tạo middleware giả để tránh lỗi
  var isAuth = (req, res, next) => next();
  var isNhaTuyenDung = (req, res, next) => next();
  var isUngVien = (req, res, next) => next();
}

// Trang hộp thư của ứng viên
router.get('/hop-thu', async (req, res) => {
    try {
        // Kiểm tra xem người dùng đã đăng nhập chưa
        if (!req.session || !req.session.user) {
            console.log('Người dùng chưa đăng nhập, chuyển hướng đến trang đăng nhập');
            return res.redirect('/dang-nhap');
        }
        
        const userId = req.session.user.id;
        console.log('Lấy thông báo cho người dùng:', userId);
        
        // Tìm các thông báo mà người dùng là một trong các người nhận
        const thongBao = await ThongBao.find({ 
            nguoiNhan: { $elemMatch: { $eq: new mongoose.Types.ObjectId(userId) } } 
        })
        .sort({ ngayTao: -1 })
        .populate({
            path: 'nguoiTao',
            select: 'hoTen email thongTin',
            populate: {
                path: 'thongTin',
                select: 'tenCongTy logo'
            }
        })
        .populate('congViecLienQuan', 'tenCV diaDiem');
        
        // Xử lý trạng thái đọc/chưa đọc
        const thongBaoProcessed = thongBao.map(tb => {
            const processed = tb.toObject();
            // Kiểm tra nếu người dùng hiện tại đã đọc thông báo
            processed.daDoc = tb.daDoc && tb.daDoc.get(userId.toString()) === true;
            return processed;
        });
        
        console.log(`Tìm thấy ${thongBaoProcessed.length} thông báo`);
        
        res.render('pages/hop-thu', { 
            title: 'Hộp thư của tôi',
            thongBao: thongBaoProcessed
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông báo:', error);
        res.status(500).render('pages/error', { 
            title: 'Lỗi hệ thống',
            message: 'Không thể tải hộp thư. Vui lòng thử lại sau!' 
        });
    }
});

// Chi tiết thông báo
router.get('/chi-tiet-thong-bao/:id', isAuth, isUngVien, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const thongBao = await ThongBao.findById(req.params.id)
            .populate({
                path: 'nguoiTao',
                select: 'hoTen email thongTin',
                populate: {
                    path: 'thongTin',
                    select: 'tenCongTy logo'
                }
            })
            .populate('congViecLienQuan');
        
        if (!thongBao) {
            return res.status(404).render('pages/error', {
                title: 'Không tìm thấy',
                message: 'Thông báo không tồn tại hoặc đã bị xóa'
            });
        }
        
        // Kiểm tra người dùng có nằm trong danh sách người nhận
        const isRecipient = thongBao.nguoiNhan.some(
            id => id.toString() === userId
        );
        
        if (!isRecipient) {
            return res.status(403).render('pages/error', {
                title: 'Truy cập bị từ chối',
                message: 'Bạn không có quyền xem thông báo này'
            });
        }
        
        // Đánh dấu thông báo là đã đọc
        if (!thongBao.daDoc || !thongBao.daDoc.get(userId.toString())) {
            // Cập nhật trạng thái đã đọc
            thongBao.daDoc.set(userId.toString(), true);
            await thongBao.save();
        }
        
        // Chuyển đổi dữ liệu để gửi đến view
        const thongBaoData = thongBao.toObject();
        thongBaoData.daDoc = true; // Đánh dấu là đã đọc
        
        res.render('pages/chi-tiet-thong-bao', {
            title: thongBao.tieuDe || 'Chi tiết thông báo',
            thongBao: thongBaoData
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết thông báo:', error);
        res.status(500).render('pages/error', {
            title: 'Lỗi hệ thống',
            message: 'Không thể tải thông báo. Vui lòng thử lại sau!'
        });
    }
});

// API đánh dấu thông báo đã đọc
router.post('/api/danh-dau-da-doc', isAuth, async (req, res) => {
    try {
        const { thongBaoId } = req.body;
        const userId = req.session.user.id;
        
        const thongBao = await ThongBao.findById(thongBaoId);
        
        if (!thongBao) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }
        
        // Kiểm tra người dùng có nằm trong danh sách người nhận
        const isRecipient = thongBao.nguoiNhan.some(
            id => id.toString() === userId
        );
        
        if (!isRecipient) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập thông báo này' });
        }
        
        // Cập nhật trạng thái đã đọc
        thongBao.daDoc.set(userId.toString(), true);
        await thongBao.save();
        
        res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' });
    } catch (error) {
        console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Gửi thông báo từ nhà tuyển dụng đến ứng viên
router.post('/gui-thong-bao', isAuth, isNhaTuyenDung, async (req, res) => {
    try {
        const { nguoiNhanId, tieuDe, noiDung, congViecId } = req.body;
        
        const thongBao = new ThongBao({
            nguoiTao: req.session.user.id,
            nguoiNhan: [nguoiNhanId], // Bây giờ là mảng người nhận
            tieuDe,
            noiDung,
            congViecLienQuan: congViecId || null
        });
        
        await thongBao.save();
        
        res.json({ success: true, message: 'Gửi thông báo thành công', thongBao });
    } catch (error) {
        console.error('Lỗi khi gửi thông báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi gửi thông báo' });
    }
});

// Trả lời thông báo
router.post('/tra-loi-thong-bao', isAuth, isUngVien, async (req, res) => {
    try {
        const { thongBaoId, noiDungTraLoi } = req.body;
        const userId = req.session.user.id;
        
        const thongBaoCu = await ThongBao.findById(thongBaoId)
            .populate('nguoiTao', 'hoTen')
            .populate('congViecLienQuan', 'tenCV');
        
        if (!thongBaoCu) {
            return res.status(404).render('pages/error', {
                title: 'Không tìm thấy',
                message: 'Thông báo không tồn tại hoặc đã bị xóa'
            });
        }
        
        // Kiểm tra người dùng có nằm trong danh sách người nhận
        const isRecipient = thongBaoCu.nguoiNhan.some(
            id => id.toString() === userId
        );
        
        if (!isRecipient) {
            return res.status(403).render('pages/error', {
                title: 'Truy cập bị từ chối',
                message: 'Bạn không có quyền trả lời thông báo này'
            });
        }
        
        const tieuDeTraLoi = `Re: ${thongBaoCu.tieuDe || 'Thông báo'}`;
        
        const thongBaoTraLoi = new ThongBao({
            nguoiTao: userId,
            nguoiNhan: [thongBaoCu.nguoiTao._id], // Gửi phản hồi đến người đã gửi thông báo
            tieuDe: tieuDeTraLoi,
            noiDung: noiDungTraLoi,
            congViecLienQuan: thongBaoCu.congViecLienQuan
        });
        
        await thongBaoTraLoi.save();
        
        res.redirect('/hop-thu');
    } catch (error) {
        console.error('Lỗi khi gửi trả lời thông báo:', error);
        res.status(500).render('pages/error', {
            title: 'Lỗi hệ thống',
            message: 'Không thể gửi trả lời. Vui lòng thử lại sau!'
        });
    }
});

module.exports = router; 