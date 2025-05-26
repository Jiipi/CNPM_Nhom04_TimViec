const NguoiDung = require('../models/NguoiDung');
const jwt = require('jsonwebtoken');
const ThongBao = require('../models/ThongBao');
const mongoose = require('mongoose');

// Middleware kiểm tra và thêm thông tin user vào locals
exports.checkUser = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await NguoiDung.findById(decoded.id);
            if (user) {
                res.locals.user = user;
                
                // Đếm số thông báo chưa đọc cho ứng viên
                if (user.vaiTro === 'UngVien') {
                    try {
                        const userId = user._id.toString();
                        
                        // Tìm các thông báo mà người dùng là một trong các người nhận
                        // và chưa đọc (không có trong daDoc hoặc daDoc[userId] = false)
                        const soThongBaoChuaDoc = await ThongBao.countDocuments({
                            nguoiNhan: { $elemMatch: { $eq: mongoose.Types.ObjectId(userId) } },
                            $or: [
                                { [`daDoc.${userId}`]: { $exists: false } },
                                { [`daDoc.${userId}`]: false }
                            ]
                        });
                        
                        res.locals.soThongBaoChuaDoc = soThongBaoChuaDoc;
                        console.log(`Người dùng ${user.hoTen} có ${soThongBaoChuaDoc} thông báo chưa đọc`);
                    } catch (err) {
                        console.error('Lỗi khi đếm thông báo chưa đọc:', err);
                        res.locals.soThongBaoChuaDoc = 0;
                    }
                }
            } else {
                res.locals.user = null;
            }
        } else {
            res.locals.user = null;
        }
        next();
    } catch (error) {
        console.error(error);
        res.locals.user = null;
        next();
    }
};

// Middleware kiểm tra người dùng đã đăng nhập
exports.isAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        console.log(`[AUTH] Xác thực thành công cho ${req.session.user.hoTen} với vai trò ${req.session.user.vaiTro}`);
        // Gán thông tin user vào req để các middleware khác có thể sử dụng
        req.user = req.session.user;
        return next();
    }
    
    console.log('[AUTH] Không tìm thấy phiên đăng nhập hợp lệ');
    return res.redirect('/dang-nhap');
};

// Middleware kiểm tra người dùng có vai trò là ứng viên
exports.isUngVien = (req, res, next) => {
    // Kiểm tra vai trò
    if (req.session.user && req.session.user.vaiTro === 'UngVien') {
        return next();
    }
    
    // Người dùng đã đăng nhập nhưng không phải ứng viên
    if (req.session.user) {
        return res.status(403).render('pages/error', {
            title: 'Không có quyền truy cập',
            error: 'Chức năng này chỉ dành cho ứng viên.'
        });
    }
    
    // Người dùng chưa đăng nhập
    return res.redirect('/dang-nhap');
};

// Middleware kiểm tra người dùng có vai trò là nhà tuyển dụng
exports.isNhaTuyenDung = (req, res, next) => {
    // Kiểm tra vai trò
    if (req.session.user && req.session.user.vaiTro === 'NhaTuyenDung') {
        return next();
    }
    
    // Người dùng đã đăng nhập nhưng không phải nhà tuyển dụng
    if (req.session.user) {
        return res.status(403).render('pages/error', {
            title: 'Không có quyền truy cập',
            error: 'Chức năng này chỉ dành cho nhà tuyển dụng.'
        });
    }
    
    // Người dùng chưa đăng nhập
    return res.redirect('/dang-nhap');
}; 