const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

/**
 * API đăng nhập dành riêng cho quản trị viên
 */
router.post('/login', async (req, res) => {
  try {
    const { tenDN, matKhau } = req.body;
    
    if (!tenDN || !matKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    console.log('Đang kiểm tra đăng nhập quản trị viên:', tenDN);
    
    // Tìm tài khoản theo tên đăng nhập trực tiếp
    const db = mongoose.connection.db;
    const taiKhoan = await db.collection('TaiKhoan').findOne({ 
      tenDN: tenDN
    });
    
    if (!taiKhoan) {
      console.log('Không tìm thấy tài khoản với tên đăng nhập:', tenDN);
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập không tồn tại'
      });
    }
    
    console.log('Tìm thấy tài khoản:', taiKhoan._id);
    
    // Kiểm tra mật khẩu
    const passwordMatch = taiKhoan.matKhau === matKhau;
    console.log('Mật khẩu trong DB:', taiKhoan.matKhau, 'Mật khẩu nhập:', matKhau, 'Khớp:', passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }
    
    // Khai báo biến nguoiDung ở phạm vi rộng hơn
    let nguoiDung;
    
    // Đặc biệt xử lý trường hợp tài khoản admin@system.com 
    if (tenDN === 'admin@system.com') {
      console.log('Phát hiện tài khoản admin hệ thống đặc biệt - Cho phép truy cập quản trị');
      
      // Tìm người dùng liên kết với tài khoản admin
      nguoiDung = await db.collection('NguoiDung').findOne({
        taiKhoan: taiKhoan._id
      });
      
      // Nếu không tìm thấy người dùng, tạo mới
      if (!nguoiDung) {
        console.log('Tạo mới người dùng quản trị viên cho tài khoản admin');
        const adminId = new ObjectId();
        nguoiDung = {
          _id: adminId,
          maND: 'ND' + Date.now(),
          hoTen: 'Quản trị hệ thống',
          email: 'admin@system.com',
          sdt: 'Chưa cập nhật',
          vaiTro: 'QuanTriVien',
          taiKhoan: taiKhoan._id,
          thongBao: [],
          khieuNai: [],
          thongTin: {
            anhDaiDien: 'admin-avatar.jpg'
          }
        };
        
        try {
          await db.collection('NguoiDung').insertOne(nguoiDung);
          console.log('Tạo người dùng admin thành công:', nguoiDung._id);
        } catch (err) {
          console.log('Lỗi khi tạo người dùng admin:', err.message);
          // Tiếp tục với thông tin hiện có của admin
        }
      } 
      // Nếu tìm thấy nhưng không phải quản trị viên, cập nhật vai trò
      else if (nguoiDung.vaiTro !== 'QuanTriVien') {
        console.log('Cập nhật vai trò quản trị viên cho tài khoản admin hiện có');
        try {
          await db.collection('NguoiDung').updateOne(
            { _id: nguoiDung._id },
            { $set: { vaiTro: 'QuanTriVien' } }
          );
          nguoiDung.vaiTro = 'QuanTriVien';
          console.log('Cập nhật vai trò thành công cho:', nguoiDung._id);
        } catch (err) {
          console.log('Lỗi khi cập nhật vai trò admin:', err.message);
        }
      }
      
      console.log('Sử dụng quyền quản trị viên cho tài khoản admin hệ thống');
    } 
    // Xử lý bình thường cho các tài khoản khác
    else {
      // Tìm người dùng liên kết với tài khoản này
      nguoiDung = await db.collection('NguoiDung').findOne({
        taiKhoan: taiKhoan._id
      });
      
      if (!nguoiDung) {
        console.log('Không tìm thấy người dùng liên kết với tài khoản:', taiKhoan._id);
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống: Không tìm thấy thông tin người dùng'
        });
      }
      
      console.log('Tìm thấy người dùng:', nguoiDung._id, 'với vai trò:', nguoiDung.vaiTro);
      
      // Kiểm tra vai trò - chỉ cho phép QuanTriVien đăng nhập vào khu vực admin
      if (nguoiDung.vaiTro !== 'QuanTriVien') {
        console.log('Người dùng không có vai trò Quản trị viên:', nguoiDung.vaiTro);
        return res.status(403).json({
          success: false,
          message: 'Tài khoản không có quyền quản trị viên'
        });
      }
    }
    
    // Ghi log đăng nhập thành công
    console.log(`Quản trị viên ${nguoiDung.hoTen || tenDN} đã đăng nhập thành công`);
    
    // Cập nhật lần cuối đăng nhập
    await db.collection('TaiKhoan').updateOne(
      { _id: taiKhoan._id },
      { $set: { lanCuoiDN: new Date() } }
    );
    
    // Tạo session đăng nhập
    req.session.user = {
      id: nguoiDung._id,
      email: nguoiDung.email || tenDN,
      hoTen: nguoiDung.hoTen || 'Quản trị viên',
      vaiTro: 'QuanTriVien'
    };
    
    console.log('Phiên đăng nhập được tạo với vai trò:', req.session.user.vaiTro);
    
    // Nếu là tài khoản admin@system.com đặc biệt
    if (tenDN === 'admin@system.com') {
      console.log('Đăng nhập bằng tài khoản admin đặc biệt');
      req.session.user.isSystemAdmin = true;
    }
    
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập quản trị viên thành công',
      redirectUrl: '/phe-duyet-viec-lam', // Thêm URL chuyển hướng đến trang phê duyệt việc làm
      user: {
        id: nguoiDung._id,
        email: nguoiDung.email || tenDN,
        hoTen: nguoiDung.hoTen || 'Quản trị viên',
        vaiTro: 'QuanTriVien'
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập quản trị viên:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập',
      error: error.message
    });
  }
});

/**
 * API đăng nhập và chuyển hướng trực tiếp
 */
router.post('/login-redirect', async (req, res) => {
  try {
    const { tenDN, matKhau } = req.body;
    
    if (!tenDN || !matKhau) {
      return res.status(400).render('pages/admin/login', {
        title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
        layout: 'layouts/main',
        errorMessage: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    console.log('Đang kiểm tra đăng nhập quản trị viên (chuyển hướng trực tiếp):', tenDN);
    
    // Tìm tài khoản theo tên đăng nhập trực tiếp
    const db = mongoose.connection.db;
    const taiKhoan = await db.collection('TaiKhoan').findOne({ 
      tenDN: tenDN
    });
    
    if (!taiKhoan) {
      console.log('Không tìm thấy tài khoản với tên đăng nhập:', tenDN);
      return res.status(401).render('pages/admin/login', {
        title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
        layout: 'layouts/main',
        errorMessage: 'Tên đăng nhập không tồn tại'
      });
    }
    
    // Kiểm tra mật khẩu
    const passwordMatch = taiKhoan.matKhau === matKhau;
    
    if (!passwordMatch) {
      return res.status(401).render('pages/admin/login', {
        title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
        layout: 'layouts/main',
        errorMessage: 'Mật khẩu không chính xác'
      });
    }
    
    // Khai báo biến nguoiDung ở phạm vi rộng hơn
    let nguoiDung;
    
    // Đặc biệt xử lý trường hợp tài khoản admin@system.com 
    if (tenDN === 'admin@system.com') {
      console.log('Phát hiện tài khoản admin hệ thống đặc biệt - Cho phép truy cập quản trị');
      
      // Tìm người dùng liên kết với tài khoản admin
      nguoiDung = await db.collection('NguoiDung').findOne({
        taiKhoan: taiKhoan._id
      });
      
      // Nếu không tìm thấy người dùng, tạo mới
      if (!nguoiDung) {
        console.log('Tạo mới người dùng quản trị viên cho tài khoản admin');
        const adminId = new ObjectId();
        nguoiDung = {
          _id: adminId,
          maND: 'ND' + Date.now(),
          hoTen: 'Quản trị hệ thống',
          email: 'admin@system.com',
          sdt: 'Chưa cập nhật',
          vaiTro: 'QuanTriVien',
          taiKhoan: taiKhoan._id,
          thongBao: [],
          khieuNai: [],
          thongTin: {
            anhDaiDien: 'admin-avatar.jpg'
          }
        };
        
        try {
          await db.collection('NguoiDung').insertOne(nguoiDung);
          console.log('Tạo người dùng admin thành công:', nguoiDung._id);
        } catch (err) {
          console.log('Lỗi khi tạo người dùng admin:', err.message);
          // Tiếp tục với thông tin hiện có của admin
        }
      } 
      // Nếu tìm thấy nhưng không phải quản trị viên, cập nhật vai trò
      else if (nguoiDung.vaiTro !== 'QuanTriVien') {
        console.log('Cập nhật vai trò quản trị viên cho tài khoản admin hiện có');
        try {
          await db.collection('NguoiDung').updateOne(
            { _id: nguoiDung._id },
            { $set: { vaiTro: 'QuanTriVien' } }
          );
          nguoiDung.vaiTro = 'QuanTriVien';
          console.log('Cập nhật vai trò thành công cho:', nguoiDung._id);
        } catch (err) {
          console.log('Lỗi khi cập nhật vai trò admin:', err.message);
        }
      }
      
      console.log('Sử dụng quyền quản trị viên cho tài khoản admin hệ thống');
    } 
    // Xử lý bình thường cho các tài khoản khác
    else {
      // Tìm người dùng liên kết với tài khoản này
      nguoiDung = await db.collection('NguoiDung').findOne({
        taiKhoan: taiKhoan._id
      });
      
      if (!nguoiDung) {
        console.log('Không tìm thấy người dùng liên kết với tài khoản:', taiKhoan._id);
        return res.status(500).render('pages/admin/login', {
          title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
          layout: 'layouts/main',
          errorMessage: 'Lỗi hệ thống: Không tìm thấy thông tin người dùng'
        });
      }
      
      console.log('Tìm thấy người dùng:', nguoiDung._id, 'với vai trò:', nguoiDung.vaiTro);
      
      // Kiểm tra vai trò - chỉ cho phép QuanTriVien đăng nhập vào khu vực admin
      if (nguoiDung.vaiTro !== 'QuanTriVien') {
        console.log('Người dùng không có vai trò Quản trị viên:', nguoiDung.vaiTro);
        return res.status(403).render('pages/admin/login', {
          title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
          layout: 'layouts/main',
          errorMessage: 'Tài khoản không có quyền quản trị viên'
        });
      }
    }
    
    // Ghi log đăng nhập thành công
    console.log(`Quản trị viên ${nguoiDung.hoTen || tenDN} đã đăng nhập thành công`);
    
    // Cập nhật lần cuối đăng nhập
    await db.collection('TaiKhoan').updateOne(
      { _id: taiKhoan._id },
      { $set: { lanCuoiDN: new Date() } }
    );
    
    // Khởi tạo phiên nếu chưa có
    if (!req.session) {
      console.log('Khởi tạo phiên mới');
      req.session = {};
    }
    
    // Tạo session đăng nhập
    req.session.user = {
      id: nguoiDung._id,
      email: nguoiDung.email || tenDN,
      hoTen: nguoiDung.hoTen || 'Quản trị viên',
      vaiTro: 'QuanTriVien' // Gán trực tiếp vai trò QuanTriVien
    };
    
    console.log('Chi tiết phiên đăng nhập mới:', req.session.user);
    
    // Nếu là tài khoản admin@system.com đặc biệt
    if (tenDN === 'admin@system.com') {
      console.log('Đăng nhập bằng tài khoản admin đặc biệt');
      req.session.user.isSystemAdmin = true;
    }
    
    // Lưu phiên trước khi chuyển hướng
    req.session.save(function(err) {
      if (err) {
        console.error('Lỗi khi lưu phiên:', err);
      }
      
      // Chuyển hướng trực tiếp đến trang phê duyệt việc làm
      console.log('Chuyển hướng trực tiếp đến /phe-duyet-viec-lam');
      return res.redirect('/phe-duyet-viec-lam');
    });
    
  } catch (error) {
    console.error('Lỗi đăng nhập quản trị viên:', error);
    
    return res.status(500).render('pages/admin/login', {
      title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
      layout: 'layouts/main',
      errorMessage: 'Đã xảy ra lỗi khi đăng nhập: ' + error.message
    });
  }
});

module.exports = router;
