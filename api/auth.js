const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

/**
 * API đăng ký tài khoản mới
 * 
 * Hỗ trợ 2 loại vai trò:
 * 1. UngVien - Đối tượng tìm kiếm việc
 * 2. NhaTuyenDung - Đối tượng đăng tin tuyển dụng
 */
router.post('/register', async (req, res) => {
  try {
    console.log('Đang xử lý đăng ký:', req.body);
    const { hoTen, email, sdt, password, confirmPassword, vaiTro } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!hoTen || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
      });
    }
    
    // Kiểm tra xác nhận mật khẩu
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu xác nhận không khớp'
      });
    }
    
    // Kiểm tra vai trò hợp lệ
    if (!['UngVien', 'NhaTuyenDung'].includes(vaiTro)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }
    
    // Lấy tên công ty nếu là nhà tuyển dụng
    const tenCongTy = req.body.tenCongTy || req.body.tenCty || '';
    if (vaiTro === 'NhaTuyenDung' && !tenCongTy) {
      return res.status(400).json({
        success: false, 
        message: 'Vui lòng nhập tên công ty'
      });
    }
    
    // Kiểm tra email đã tồn tại chưa
    const db = mongoose.connection.db;
    const existingUser = await db.collection('NguoiDung').findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký'
      });
    }
    
    // Tạo ID cho các tài liệu
    const taiKhoanId = new ObjectId();
    const nguoiDungId = new ObjectId();
    
    // Tùy chọn bỏ qua validation chỉ trong quá trình đăng ký
    const options = { bypassDocumentValidation: true };
    
    try {
      // Mã tài khoản và Mã người dùng dễ đọc
      const maTK = 'TK' + Date.now();
      const maND = 'ND' + Date.now();
      
      // Tạo tài khoản mới
      await db.collection('TaiKhoan').insertOne({
        _id: taiKhoanId,
        maTK: maTK,
        tenDN: email,
        matKhau: password,
        ngayTao: new Date(),
        lanCuoiDN: new Date()
      }, options);
      
      console.log('Đã tạo tài khoản ID:', taiKhoanId);
      
      // Tạo đối tượng người dùng
      let nguoiDung = {
        _id: nguoiDungId,
        maND: maND,
        hoTen: hoTen,
        email: email,
        sdt: sdt || "Chưa cập nhật",
        vaiTro: vaiTro,
        taiKhoan: taiKhoanId,
        thongBao: [],
        khieuNai: []
      };
      
      // Tạo tài liệu bổ sung dựa trên vai trò
      if (vaiTro === 'UngVien') {
        // Thêm thông tin cho người dùng ứng viên
        nguoiDung.thongTin = {
          diaChi: "Chưa cập nhật",
          ngaySinh: new Date(),
          kyNang: [],
          anhDaiDien: "default-avatar.jpg",
          donUngTuyen: [],
          cvYeuThich: []
        };
        
        // Tạo thông tin ứng viên - Collection riêng
        await db.collection('UngVien').insertOne({
          _id: nguoiDungId,
          kyNang: [],
          donUngTuyen: [],
          cvYeuThich: [],
          diaChi: "Chưa cập nhật",
          ngaySinh: new Date(),
          anhDaiDien: "default-avatar.jpg", 
          cv: "default-cv.pdf"
        }, options);
      } else if (vaiTro === 'NhaTuyenDung') {
        // Thêm thông tin công ty vào người dùng
        nguoiDung.tenCty = tenCongTy;
        nguoiDung.thongTin = {
          tenCongTy: tenCongTy,
          moTaCty: "Chưa cập nhật", 
          soNV: 0,
          diaChiCty: "Chưa cập nhật",
          anh: "default-company-logo.jpg"
        };
        
        // Tạo thông tin nhà tuyển dụng - Collection riêng
        await db.collection('NhaTuyenDung').insertOne({
          _id: nguoiDungId,
          tenCongTy: tenCongTy,
          moTaCty: "Chưa cập nhật",
          soNV: 0,
          diaChiCty: "Chưa cập nhật",
          anh: "default-company-logo.jpg",
          congViecDang: []
        }, options);
      }
      
      // Lưu thông tin người dùng
      await db.collection('NguoiDung').insertOne(nguoiDung, options);
      console.log('Đã tạo người dùng ID:', nguoiDungId);
      
      // Gửi phản hồi thành công
      return res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          id: nguoiDungId,
          email: email,
          vaiTro: vaiTro
        }
      });
    } catch (error) {
      console.error('Lỗi khi lưu thông tin:', error);
      
      if (error.code === 121) {
        // Lỗi validation schema
        const errorDetail = error.errInfo ? JSON.stringify(error.errInfo.details) : '';
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không đáp ứng yêu cầu schema: ' + error.message,
          details: errorDetail
        });
      }
      
      throw error; // Ném lỗi để xử lý ở catch bên ngoài
    }
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng ký',
      error: error.message
    });
  }
});

/**
 * API đăng nhập
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }
    
    // Tìm người dùng theo email
    const db = mongoose.connection.db;
    console.log('Đang kiểm tra đăng nhập với username:', email, 'password:', password);
    
    // Log thông tin collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Các collection hiện có:', collectionNames);
    
    const nguoiDung = await db.collection('NguoiDung').findOne({ email });
    
    if (!nguoiDung) {
      return res.status(401).json({
        success: false,
        message: 'Email không tồn tại trong hệ thống'
      });
    }
    
    // Tìm tài khoản
    const taiKhoan = await db.collection('TaiKhoan').findOne({
      _id: nguoiDung.taiKhoan
    });
    
    console.log('Tìm thấy tài khoản:', taiKhoan);
    
    if (!taiKhoan) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống: Không tìm thấy thông tin tài khoản'
      });
    }
    
    // Kiểm tra mật khẩu
    const passwordMatch = taiKhoan.matKhau === password;
    console.log('Mật khẩu trong DB:', taiKhoan.matKhau, 'Mật khẩu nhập:', password, 'Khớp:', passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }
    
    // Cập nhật lần cuối đăng nhập
    await db.collection('TaiKhoan').updateOne(
      { _id: taiKhoan._id },
      { $set: { lanCuoiDN: new Date() } }
    );
    
    // Tạo session đăng nhập
    req.session.user = {
      id: nguoiDung._id,
      email: nguoiDung.email,
      hoTen: nguoiDung.hoTen,
      vaiTro: nguoiDung.vaiTro
    };
    
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: nguoiDung._id,
        email: nguoiDung.email,
        hoTen: nguoiDung.hoTen,
        vaiTro: nguoiDung.vaiTro
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập',
      error: error.message
    });
  }
});

/**
 * API đăng xuất
 */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi đăng xuất',
        error: err.message
      });
    }
    
    res.clearCookie('connect.sid');
    
    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  });
});

module.exports = router;
