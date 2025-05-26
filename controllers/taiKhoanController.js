const { TaiKhoanService, NguoiDungService } = require('../services');
const mongoose = require('mongoose');

/**
 * TaiKhoanController - Điều khiển các hoạt động liên quan đến tài khoản
 */
class TaiKhoanController {
    /**
     * Xử lý đăng nhập hệ thống
     */
    async dangNhap(req, res) {
        try {
            console.log('Xử lý đăng nhập. Dữ liệu:');
            console.log(JSON.stringify(req.body, null, 2));
            
            const { tenDN, matKhau, vaiTro } = req.body;
            
            if (!tenDN || !matKhau) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
                });
            }
            
            // Kiểm tra thông tin đăng nhập với vai trò được chỉ định
            const ketQua = await TaiKhoanService.kiemTraDangNhap(tenDN, matKhau, vaiTro);
            
            if (!ketQua.success) {
                // Nếu sai vai trò và không hiển thị chi tiết
                if (ketQua.wrongRole && ketQua.hideRole) {
                    // Trả về lỗi 401 thông thường thay vì 403
                    return res.status(401).json({
                        success: false,
                        message: ketQua.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
                    });
                }
                // Xử lý trường hợp sai vai trò cũ (nếu có)
                else if (ketQua.wrongRole) {
                    return res.status(403).json({
                        success: false,
                        message: ketQua.message,
                        wrongRole: true,
                        actualRole: ketQua.actualRole
                    });
                }
                
                return res.status(401).json({
                    success: false,
                    message: ketQua.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
                });
            }
            
            // Đã có thông tin tài khoản và người dùng từ service
            const { taiKhoan, nguoiDung } = ketQua.data;
            
            console.log('Thông tin người dùng đăng nhập:');
            console.log(JSON.stringify(nguoiDung, null, 2));
            console.log('Vai trò người dùng:', nguoiDung.vaiTro);
            
            // Lưu thông tin đăng nhập vào session
            req.session.user = {
                id: nguoiDung._id,
                taiKhoanId: taiKhoan._id,
                hoTen: nguoiDung.hoTen,
                email: nguoiDung.email,
                sdt: nguoiDung.sdt,
                vaiTro: nguoiDung.vaiTro
            };
            
            console.log('Thông tin session:');
            console.log(JSON.stringify(req.session.user, null, 2));
            
            // Nếu request là API, trả về JSON
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Đăng nhập thành công',
                    user: {
                        id: nguoiDung._id,
                        hoTen: nguoiDung.hoTen,
                        email: nguoiDung.email,
                        vaiTro: nguoiDung.vaiTro
                    }
                });
            }
            
            // Chuyển hướng tùy theo vai trò
            if (nguoiDung.vaiTro === 'NhaTuyenDung') {
                return res.redirect('/quan-ly-cong-viec');
            } else {
                // Vai trò ứng viên hoặc vai trò khác
                return res.redirect('/');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng nhập'
            });
        }
    }
    
    /**
     * Xử lý đăng ký tài khoản mới
     */
    async dangKy(req, res) {
        try {
            console.log('Đang xử lý đăng ký. Dữ liệu:');
            console.log(JSON.stringify(req.body, null, 2));
            
            const { hoTen, email, sdt, password, confirmPassword, vaiTro, tenCongTy } = req.body;
            
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
            const userRole = vaiTro || 'UngVien'; // Mặc định là Ứng viên nếu không chỉ định
            console.log('Vai trò người dùng đăng ký:', userRole);
            
            if (!['UngVien', 'NhaTuyenDung'].includes(userRole)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vai trò không hợp lệ'
                });
            }
            
            // Kiểm tra thông tin bắt buộc cho nhà tuyển dụng
            if (userRole === 'NhaTuyenDung' && !tenCongTy) {
                return res.status(400).json({
                    success: false, 
                    message: 'Vui lòng nhập tên công ty'
                });
            }
            
            // Kiểm tra email đã tồn tại chưa
            const emailExists = await NguoiDungService.emailDaTonTai(email);
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email này đã được đăng ký'
                });
            }
            
            try {
            // Tạo tài khoản mới
                const taiKhoanData = {
                    maTK: new mongoose.Types.ObjectId(), // Tạo một ObjectId mới cho maTK
                tenDN: email,
                    matKhau: password, // Trong môi trường thực tế nên mã hóa mật khẩu
                ngayTao: new Date(),
                lanCuoiDN: new Date()
                };
                
                // Sử dụng truy vấn trực tiếp MongoDB để tránh lỗi validation
                const db = mongoose.connection.db;
                const taiKhoanResult = await db.collection('TaiKhoan').insertOne(taiKhoanData);
            
                console.log('Đã tạo tài khoản mới, ID:', taiKhoanResult.insertedId);
            
            // Tạo thông tin người dùng
            let thongTin = {};
            
            // Nếu là nhà tuyển dụng, thêm thông tin công ty
            if (userRole === 'NhaTuyenDung') {
                thongTin = { 
                    tenCongTy: tenCongTy,
                    maCongTy: 'CTY' + Date.now()
                };
                
                console.log('Đã tạo thông tin cho nhà tuyển dụng:', thongTin);
            }
            
            // Lưu thông tin người dùng
            const nguoiDungData = {
                    _id: new mongoose.Types.ObjectId(),
                hoTen: hoTen,
                email: email,
                sdt: sdt || "Chưa cập nhật",
                    vaiTro: userRole,
                    taiKhoan: taiKhoanResult.insertedId,
                thongTin: thongTin,
                thongBao: [],
                    khieuNai: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
            };
            
            // Lưu người dùng
                const nguoiDungResult = await db.collection('NguoiDung').insertOne(nguoiDungData);
            
                console.log('Đã tạo người dùng mới, ID:', nguoiDungResult.insertedId);
            
            // Nếu là nhà tuyển dụng, lưu thêm vào collection NhaTuyenDung
            if (userRole === 'NhaTuyenDung') {
                try {
                    const nhaTuyenDungData = {
                            _id: nguoiDungResult.insertedId,
                        hoTen: hoTen,
                        email: email,
                        sdt: sdt || "Chưa cập nhật",
                        vaiTro: 'NhaTuyenDung',
                            taiKhoan: taiKhoanResult.insertedId,
                            thongTin: {
                                tenCongTy: tenCongTy
                            },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    await db.collection('NhaTuyenDung').insertOne(nhaTuyenDungData);
                    console.log('Đã lưu thông tin vào collection NhaTuyenDung');
                } catch (error) {
                    console.error('Lỗi khi lưu thông tin vào collection NhaTuyenDung:', error);
                }
            }
            
            return res.status(201).json({
                success: true,
                message: 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.',
                data: {
                        nguoiDungId: nguoiDungResult.insertedId,
                        hoTen: hoTen,
                        email: email,
                        vaiTro: userRole
                }
            });
            } catch (error) {
                console.error('Lỗi khi lưu dữ liệu đăng ký:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi khi xử lý đăng ký: ' + error.message
                });
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng ký',
                error: error.message
            });
        }
    }
    
    /**
     * Xử lý đăng xuất hệ thống
     */
    async dangXuat(req, res) {
        try {
            // Hủy session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Lỗi khi hủy session:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Đã xảy ra lỗi khi đăng xuất'
                    });
                }
                
                // Nếu request là API, trả về JSON
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: 'Đăng xuất thành công'
                    });
                }
                
                // Nếu không, chuyển hướng về trang chủ
                res.redirect('/');
            });
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng xuất'
            });
        }
    }

    /**
     * Cập nhật vai trò người dùng
     * Dùng để điều chỉnh vai trò của người dùng nếu bị sai
     */
    async capNhatVaiTro(req, res) {
        try {
            const { email, vaiTro } = req.body;
            
            if (!email || !vaiTro) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp email và vai trò'
                });
            }
            
            if (!['UngVien', 'NhaTuyenDung'].includes(vaiTro)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vai trò không hợp lệ'
                });
            }
            
            // Tìm người dùng theo email
            const db = mongoose.connection.db;
            const nguoiDung = await db.collection('NguoiDung').findOne({ email });
            
            if (!nguoiDung) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng với email này'
                });
            }
            
            console.log('Thông tin người dùng trước khi cập nhật:');
            console.log(JSON.stringify(nguoiDung, null, 2));
            
            // Cập nhật vai trò người dùng
            await db.collection('NguoiDung').updateOne(
                { email },
                { $set: { vaiTro: vaiTro } }
            );
            
            // Nếu cập nhật thành NhaTuyenDung, cần thêm vào collection NhaTuyenDung
            if (vaiTro === 'NhaTuyenDung') {
                const nhaTuyenDungExists = await db.collection('NhaTuyenDung').findOne({ email });
                
                if (!nhaTuyenDungExists) {
                    const tenCongTy = req.body.tenCongTy || 'Công ty chưa cập nhật';
                    
                    await db.collection('NhaTuyenDung').insertOne({
                        _id: nguoiDung._id,
                        hoTen: nguoiDung.hoTen,
                        email: nguoiDung.email,
                        sdt: nguoiDung.sdt || 'Chưa cập nhật',
                        vaiTro: 'NhaTuyenDung',
                        taiKhoan: nguoiDung.taiKhoan,
                        tenCongTy: tenCongTy,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    console.log('Đã thêm hồ sơ vào collection NhaTuyenDung');
                } else {
                    console.log('Hồ sơ NhaTuyenDung đã tồn tại');
                }
            }
            
            // Nếu cập nhật thành UngVien, cần thêm vào collection UngVien
            if (vaiTro === 'UngVien') {
                const ungVienExists = await db.collection('UngVien').findOne({ email });
                
                if (!ungVienExists) {
                    await db.collection('UngVien').insertOne({
                        _id: nguoiDung._id,
                        hoTen: nguoiDung.hoTen,
                        email: nguoiDung.email,
                        sdt: nguoiDung.sdt || 'Chưa cập nhật',
                        vaiTro: 'UngVien',
                        taiKhoan: nguoiDung.taiKhoan,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    console.log('Đã thêm hồ sơ vào collection UngVien');
                } else {
                    console.log('Hồ sơ UngVien đã tồn tại');
                }
            }
            
            // Lấy thông tin người dùng sau khi cập nhật
            const nguoiDungUpdated = await db.collection('NguoiDung').findOne({ email });
            
            return res.status(200).json({
                success: true,
                message: 'Đã cập nhật vai trò người dùng thành công',
                data: {
                    nguoiDungId: nguoiDungUpdated._id,
                    hoTen: nguoiDungUpdated.hoTen,
                    email: nguoiDungUpdated.email,
                    vaiTro: nguoiDungUpdated.vaiTro
                }
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật vai trò người dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật vai trò người dùng',
                error: error.message
            });
        }
    }
}

module.exports = new TaiKhoanController(); 