const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Import routes
// Chỉ import các routes có sẵn trong thư mục
const thongBaoRoutes = require('./routes/thongBaoRoutes');
const hoSoRoutes = require('./routes/hoSoRoutes');

// Import models
const NguoiDung = require('./models/NguoiDung');
const CongViec = require('./models/CongViec');
const ThongBao = require('./models/ThongBao');

// Khai báo routes từ API
const adminRoutes = require('./api/admin');
const authRoutes = require('./api/auth');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Đã khai báo ở phần trên

// Middleware
// Cấu hình đúng đường dẫn tĩnh để file CSS và JS có thể hoạt động
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Cấu hình session store riêng cho từng loại
const sessionConfig = {
  resave: true,
  saveUninitialized: true,
  secret: 'jobportalsecret',
  cookie: {
    secure: false, // Đặt là true nếu sử dụng HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    httpOnly: true
  }
};

// Quay lại cấu hình session đơn giản nhưng thêm thông tin userType
app.use(session({
  name: 'tuyendung_sid',
  secret: 'jobportalsecret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // Đặt là true nếu sử dụng HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    httpOnly: true
  }
}));

// Middleware để thêm thông tin userType vào req
app.use((req, res, next) => {
  // Xác định loại người dùng dựa trên đường dẫn URL
  const url = req.originalUrl;
  
  if (url.startsWith('/ung-vien')) {
    req.userType = 'ungvien';
  } 
  else if (url.startsWith('/nha-tuyen-dung')) {
    req.userType = 'nhatuyendung';
  } 
  else if (url.startsWith('/admin')) {
    req.userType = 'admin';
  } 
  else {
    req.userType = 'common';
  }
  
  next();
});

// Middleware cho upload files
const multer = require('multer');
const fs = require('fs');

// Đảm bảo thư mục uploads tồn tại
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình multer để lưu trữ file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file độc đáo để tránh trùng lắp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + fileExt);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  },
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận file hình ảnh
    if (!file.mimetype.match(/^image\//)) {
      return cb(new Error('Chỉ chấp nhận file hình ảnh'), false);
    }
    cb(null, true);
  }
});

// Sử dụng route API
app.use('/api/admin', adminRoutes);
// Sử dụng thongBaoRoutes cho đường dẫn /
app.use('/', thongBaoRoutes);

// Make user information available to all routes
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  // Ghi log có cấu trúc hơn và chỉ ghi các request quan trọng
  if (!req.url.includes('/public/') && !req.url.includes('/favicon.ico')) {
    console.log(`\n[DEBUG] Request ${req.method}: ${req.url}`);
  }
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views/pages')]);

// Phục vụ tệp tĩnh từ thư mục public
console.log('Đường dẫn thư mục public:', path.join(__dirname, 'public'));

// Setup EJS layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Trang chủ - hiển thị dữ liệu mẫu từ các collections
app.get('/', async (req, res) => {
  try {
    console.log('Truy cập trang chủ');
    
    // Lấy danh sách công ty nổi bật (nhà tuyển dụng có isFeatured = true)
    const featuredCompanies = await NguoiDung.find({
      vaiTro: 'NhaTuyenDung',
      'thongTin.isFeatured': true
    }).limit(5).lean();
    
    // Kiểm tra và xử lý dữ liệu để đảm bảo các trường cần thiết tồn tại
    featuredCompanies.forEach(company => {
      if (!company.thongTin) {
        company.thongTin = {};
      }
      
      // Đảm bảo các trường cần thiết tồn tại
      company.thongTin.tenCongTy = company.thongTin.tenCongTy || company.hoTen || 'Công ty';
      company.thongTin.moTa = company.thongTin.moTa || company.thongTin.moTaCty || '';
      
      // Thêm placeholder cho logo nếu không có
      if (!company.thongTin.logo) {
        company.thongTin.logo = `https://placehold.co/80x80/EEE/31343C?text=${encodeURIComponent(company.thongTin.tenCongTy.substring(0, 2))}`;
      }
      
      // Thêm placeholder cho ảnh nền nếu không có
      if (!company.thongTin.anh) {
        company.thongTin.anh = `https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(company.thongTin.tenCongTy)}`;
      }
    });
    
    // Lấy tất cả nhà tuyển dụng để hiển thị logo
    const featuredEmployers = await NguoiDung.find({
      vaiTro: 'NhaTuyenDung'
    }).limit(10).lean();
    
    // Xử lý tương tự cho featuredEmployers
    featuredEmployers.forEach(employer => {
      if (!employer.thongTin) {
        employer.thongTin = {};
      }
      
      employer.thongTin.tenCongTy = employer.thongTin.tenCongTy || employer.hoTen || 'Nhà tuyển dụng';
      
      if (!employer.thongTin.logo) {
        employer.thongTin.logo = `https://placehold.co/150x60/EEE/31343C?text=${encodeURIComponent(employer.thongTin.tenCongTy.substring(0, 10))}`;
      }
    });
    
    // Lấy các công việc hot
    const hotJobs = await CongViec.find({
      isHot: true,
      trangThai: 'Đang tuyển'
    }).populate('nhaTuyenDung').limit(6).sort({ ngayDang: -1 }).lean();
    
    // Lấy các công việc mới nhất
    const latestJobs = await CongViec.find({
      trangThai: 'Đang tuyển'
    }).populate('nhaTuyenDung').limit(6).sort({ ngayDang: -1 }).lean();
    
    // Đảm bảo dữ liệu nhà tuyển dụng trong công việc
    [...hotJobs, ...latestJobs].forEach(job => {
      // Kiểm tra nếu nhaTuyenDung không tồn tại hoặc là null
      if (!job.nhaTuyenDung) {
        job.nhaTuyenDung = { thongTin: {} };
      }
      
      // Kiểm tra nếu thongTin không tồn tại
      if (!job.nhaTuyenDung.thongTin) {
        job.nhaTuyenDung.thongTin = {};
      }
      
      // Đặt giá trị mặc định cho các trường
      job.nhaTuyenDung.thongTin.tenCongTy = job.nhaTuyenDung.thongTin.tenCongTy || job.nhaTuyenDung.hoTen || 'Chưa cập nhật';
      
      // Thêm logo nếu không có
      if (!job.nhaTuyenDung.thongTin.logo) {
        const companyName = job.nhaTuyenDung.thongTin.tenCongTy.substring(0, 2);
        job.nhaTuyenDung.thongTin.logo = `https://placehold.co/40x40/EEE/31343C?text=${encodeURIComponent(companyName)}`;
      }
    });
    
    // Lấy các công ty phổ biến (không cần isFeatured)
    const popularCompanies = await NguoiDung.find({
      vaiTro: 'NhaTuyenDung'
    }).limit(8).lean();
    
    // Xử lý tương tự cho popularCompanies
    popularCompanies.forEach(company => {
      if (!company.thongTin) {
        company.thongTin = {};
      }
      
      company.thongTin.tenCongTy = company.thongTin.tenCongTy || company.hoTen || 'Công ty';
      company.thongTin.nganhNghe = company.thongTin.nganhNghe || company.thongTin.linhVuc || 'Chưa cập nhật';
      
      if (!company.thongTin.logo) {
        company.thongTin.logo = `https://placehold.co/40x40/EEE/31343C?text=${encodeURIComponent(company.thongTin.tenCongTy.substring(0, 2))}`;
      }
    });
    
    // Nếu người dùng đã đăng nhập, lấy thêm dữ liệu cá nhân
    let savedJobs = [];
    let suggestedJobs = [];
    
    if (req.session.user) {
      // Lấy việc làm đã lưu
      const savedJobsData = await ViecYeuThich.find({
        maND: req.session.user.id
      }).populate('maCV').limit(3).lean();
      
      savedJobs = savedJobsData.map(item => item.maCV);
      
      // Đảm bảo dữ liệu cho savedJobs
      savedJobs.forEach(job => {
        if (job && !job.nhaTuyenDung) {
          job.nhaTuyenDung = { thongTin: {} };
        }
        
        if (job && !job.nhaTuyenDung.thongTin) {
          job.nhaTuyenDung.thongTin = {};
        }
        
        if (job) {
          // Đặt logo mặc định nếu không có
          if (job.nhaTuyenDung && !job.nhaTuyenDung.thongTin.logo) {
            const companyName = (job.nhaTuyenDung.thongTin.tenCongTy || 'Logo').substring(0, 2);
            job.nhaTuyenDung.thongTin.logo = `https://placehold.co/150x60/EEE/31343C?text=${encodeURIComponent(companyName)}`;
          }
        }
      });
      
      // Việc làm gợi ý - có thể dựa trên kỹ năng, vị trí, v.v.
      // Đơn giản ở đây, lấy các công việc ngẫu nhiên
      suggestedJobs = await CongViec.find({
        trangThai: 'Đang tuyển'
      }).populate('nhaTuyenDung').limit(3).sort({ ngayDang: -1 }).lean();
      
      // Xử lý tương tự cho suggestedJobs
      suggestedJobs.forEach(job => {
        // Kiểm tra nếu nhaTuyenDung không tồn tại hoặc là null
        if (!job.nhaTuyenDung) {
          job.nhaTuyenDung = { thongTin: {} };
        }
        
        // Kiểm tra nếu thongTin không tồn tại
        if (!job.nhaTuyenDung.thongTin) {
          job.nhaTuyenDung.thongTin = {};
        }
        
        // Đặt giá trị mặc định cho các trường
        job.nhaTuyenDung.thongTin.tenCongTy = job.nhaTuyenDung.thongTin.tenCongTy || job.nhaTuyenDung.hoTen || 'Chưa cập nhật';
        
        // Thêm logo nếu không có
        if (!job.nhaTuyenDung.thongTin.logo) {
          const companyName = job.nhaTuyenDung.thongTin.tenCongTy.substring(0, 2);
          job.nhaTuyenDung.thongTin.logo = `https://placehold.co/40x40/EEE/31343C?text=${encodeURIComponent(companyName)}`;
        }
      });
    }
    
    res.render('trang-chu', {
      title: 'Trang Chủ - Hệ Thống Tuyển Dụng',
      featuredCompanies, // Công ty nổi bật
      featuredEmployers, // Nhà tuyển dụng nổi bật
      savedJobs, // Việc làm đã lưu
      hotJobs, // Công việc hot hôm nay
      popularCompanies, // Các công ty phổ biến
      latestJobs, // Công việc mới nhất
      suggestedJobs // Việc làm gợi ý
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(500).render('pages/error', { 
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải trang chủ: ' + error.message
    });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TuyenDungDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected...');
  
  try {
    // Kiểm tra xem nhà tuyển dụng với ID cụ thể có tồn tại không
    const testId = '682d5392a5e4a84fadd988c0';
    
    console.log(`Kiểm tra nhà tuyển dụng với ID: ${testId}`);
    try {
      const testNhaTuyenDung = await NguoiDung.findById(testId);
      console.log('Kết quả tìm kiếm:', testNhaTuyenDung ? 'Tìm thấy' : 'Không tìm thấy');
      
      if (!testNhaTuyenDung) {
        console.log('Kiểm tra cách khác với ID không phải ObjectId...');
        const testNhaTuyenDung2 = await NguoiDung.findOne({ 
          $or: [
            { _id: testId },
            { maND: testId }
          ]
        });
        console.log('Kết quả tìm kiếm theo chuỗi:', testNhaTuyenDung2 ? 'Tìm thấy' : 'Không tìm thấy');
      }
    } catch (err) {
      console.error('Lỗi khi tìm kiếm nhà tuyển dụng:', err.message);
    }
    
    // Tạo dữ liệu mẫu cho nhà tuyển dụng nếu không tồn tại
    try {
      const companyExists = await NguoiDung.findOne({ 
        "thongTin.tenCongTy": "K&G Technology Company Limited" 
      });
      
      if (!companyExists) {
        console.log('Tạo dữ liệu mẫu cho công ty K&G Technology...');
        
        // Tạo tài khoản mới
        const newTaiKhoan = new TaiKhoan({
          tenDN: 'kgtechnology@example.com',
          matKhau: 'password123',
          ngayTao: new Date(),
          lanCuoiDN: new Date()
        });
        
        const savedTaiKhoan = await newTaiKhoan.save();
        
        // Tạo thông tin nhà tuyển dụng
        const newNhaTuyenDung = new NguoiDung({
          _id: '682d5392a5e4a84fadd988c0',
          hoTen: 'K&G Technology Admin',
          email: 'kgtechnology@example.com',
          sdt: '0901234567',
          vaiTro: 'NhaTuyenDung',
          thongTin: {
            tenCongTy: 'K&G Technology Company Limited',
            diaChi: 'Quận 1, Hồ Chí Minh',
            quyMo: '25-99',
            nganhNghe: 'IT / Phần mềm',
            namThanhLap: 2003,
            website: 'https://kgstechnology.com/',
                      logo: '/images/kg_logo.jpg',
          anh: '/images/kg_banner.jpg',
            moTa: `K&G Technology Company Limited Founded in 2003, International Software Developer K&G Technology has emerged as one of Vietnam's Premiere IT Outsourcing Providers.`,
                          hinhAnh: [
                '/images/kg_banner.jpg',
                '/images/kg_logo.jpg'
              ]
          },
          taiKhoan: savedTaiKhoan._id,
          thongBao: [],
          khieuNai: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const savedNhaTuyenDung = await newNhaTuyenDung.save();
        console.log('Đã tạo nhà tuyển dụng mẫu:', savedNhaTuyenDung._id);
        
        // Tạo công việc mẫu
        const newCongViec = new CongViec({
          tenCV: 'Kỹ sư Cao học Tiếng Nhật (N2/N1) - Lương Cạnh Tranh',
          moTa: 'Mô tả công việc chi tiết...',
          diaDiem: 'Quận 1, Hồ Chí Minh',
          luong: 10000000,
          kinhNghiem: '1-3 năm',
          hocVan: 'Đại học',
          kyNang: ['Tiếng Nhật', 'Lập trình', 'Java', 'Spring Boot'],
          loiIch: 'Các phúc lợi hấp dẫn',
          ngayDang: new Date(),
          trangThai: 'Đợi duyệt', // Thay đổi trạng thái mặc định thành 'Đợi duyệt' để phù hợp với model
          nhaTuyenDung: savedNhaTuyenDung._id
        });
        
        await newCongViec.save();
        console.log('Đã tạo công việc mẫu cho công ty');
      } else {
        console.log('Công ty K&G Technology đã tồn tại');
      }
    } catch (err) {
      console.error('Lỗi khi tạo dữ liệu mẫu:', err);
    }
  } catch (err) {
    console.error('Lỗi kiểm tra dữ liệu:', err);
  }
})
.catch(err => console.log('MongoDB connection error:', err));

// Import models thay vì định nghĩa trực tiếp
const TaiKhoan = require('./models/TaiKhoan');
// NguoiDung, CongViec và ThongBao đã được import ở đầu file
const DonUngTuyen = require('./models/DonUngTuyen');
const ViecYeuThich = require('./models/ViecYeuThich');
const KhieuNai = require('./models/KhieuNai');

// Sử dụng routes
app.use('/api/tai-khoan', require('./routes/taiKhoanRoutes'));
app.use('/api/tai-khoan', require('./routes/matKhauRoutes'));

// Routes cho trang quên mật khẩu và đổi mật khẩu
app.get('/quen-mat-khau', (req, res) => {
  res.render('pages/quen-mat-khau', { title: 'Quên mật khẩu' });
});

app.get('/doi-mat-khau', (req, res) => {
  const { token, email } = req.query;
  res.render('pages/doi-mat-khau', { 
    title: 'Đổi mật khẩu', 
    token: token || '', 
    email: email || '' 
  });
});

// Routes for EJS pages
app.get('/', async (req, res) => {
  try {
    // Lấy thông tin 3 công ty nổi bật từ DB
    const nhaTuyenDungCollection = mongoose.connection.db.collection('NhaTuyenDung');
    
    // Lấy 3 công ty nổi bật
    const featuredCompanies = await nhaTuyenDungCollection.find({ isFeaturedCompany: true }).limit(3).toArray();
    
    // Đảm bảo các công ty có ảnh nền tòa nhà (building image) - Sử dụng trường anh từ dữ liệu
    const defaultLogo = '/images/kg_logo.jpg';
    const defaultBanner = '/images/kg_banner.jpg';
    
    const companyImages = {
      mbBank: {
        company: featuredCompanies[0] || null,
        buildingImage: featuredCompanies[0] && featuredCompanies[0].anh ? featuredCompanies[0].anh : defaultBanner
      },
      sacombank: {
        company: featuredCompanies[1] || null,
        buildingImage: featuredCompanies[1] && featuredCompanies[1].anh ? featuredCompanies[1].anh : defaultBanner
      },
      acb: {
        company: featuredCompanies[2] || null,
        buildingImage: featuredCompanies[2] && featuredCompanies[2].anh ? featuredCompanies[2].anh : defaultBanner
      }
    };
    
    // Lấy tất cả nhà tuyển dụng nổi bật
    const featuredEmployers = await nhaTuyenDungCollection.find({ isFeaturedEmployer: true }).toArray();
    
    // Logging để debug
    console.log('Featured Companies Data:');
    featuredCompanies.forEach((company, index) => {
      console.log(`Company ${index + 1}:`, company.tenCongTy);
      console.log('Logo URL:', company.logo);
      console.log('Anh URL:', company.anh);
    });
    
    // Render trang chủ với dữ liệu công ty nổi bật
    res.render('pages/trang-chu', {
      user: req.session.user || null,
      mbBank: companyImages.mbBank.company,
      sacombank: companyImages.sacombank.company,
      acb: companyImages.acb.company,
      companyImages: companyImages,
      featuredEmployers: featuredEmployers || [],
      defaultLogo: '/images/kg_logo.jpg',
      defaultBanner: '/images/kg_banner.jpg'
    });
  } catch (error) {
    console.error('Lỗi khi tải trang chủ:', error);
    res.render('pages/trang-chu', { 
      user: req.session.user || null,
      error: 'Có lỗi xảy ra khi tải dữ liệu'
    });
  }
});

// TRANG ĐĂNG NHẬP CHO TRANG CHUNG
app.get('/dang-nhap', (req, res) => {
  // Trang đăng nhập chung - hiển thị chọn lựa
  res.render('pages/dang-nhap-chon-loai', { 
    title: 'Đăng Nhập - Hệ Thống Tuyển Dụng',
    userType: 'common'
  });
});

// TRANG ĐĂNG NHẬP CHO ỨNG VIÊN
app.get('/ung-vien/dang-nhap', (req, res) => {
  res.render('pages/dang-nhap', { 
    title: 'Đăng Nhập Ứng Viên - Hệ Thống Tuyển Dụng',
    userType: 'ungVien'
  });
});

// TRANG ĐĂNG NHẬP CHO NHÀ TUYỂN DỤNG
app.get('/nha-tuyen-dung/dang-nhap', (req, res) => {
  res.render('pages/dang-nhap', { 
    title: 'Đăng Nhập Nhà Tuyển Dụng - Hệ Thống Tuyển Dụng',
    userType: 'nhaTuyenDung'
  });
});

// TRANG ĐĂNG NHẬP CHO ADMIN
app.get('/admin/dang-nhap', (req, res) => {
  console.log('Truy cập trang đăng nhập quản trị viên');
  res.render('admin/login', {
    title: 'Đăng nhập Quản trị viên - Hệ Thống Tuyển Dụng',
    layout: 'layouts/main',
    userType: 'admin'
  });
});

// ĐĂNG XUẤT CHO ỨNG VIÊN
app.get('/ung-vien/dang-xuat', (req, res) => {
  if (req.session && req.session.user) {
    console.log('[LOGOUT] Người dùng đăng xuất:', req.session.user.hoTen);
    req.session.destroy(err => {
      if (err) {
        console.error('Lỗi khi đăng xuất:', err);
      }
      // Xóa cookie của session
      res.clearCookie('tuyendung_sid');
      res.redirect('/ung-vien/dang-nhap');
    });
  } else {
    res.redirect('/ung-vien/dang-nhap');
  }
});

// ĐĂNG XUẤT CHO NHÀ TUYỂN DỤNG
app.get('/nha-tuyen-dung/dang-xuat', (req, res) => {
  if (req.session && req.session.user) {
    console.log('[LOGOUT] Người dùng đăng xuất:', req.session.user.hoTen);
    req.session.destroy(err => {
      if (err) {
        console.error('Lỗi khi đăng xuất:', err);
      }
      // Xóa cookie của session
      res.clearCookie('tuyendung_sid');
      res.redirect('/nha-tuyen-dung/dang-nhap');
    });
  } else {
    res.redirect('/nha-tuyen-dung/dang-nhap');
  }
});

// ĐĂNG XUẤT CHO ADMIN
app.get('/admin/dang-xuat', (req, res) => {
  if (req.session && req.session.user) {
    console.log('[LOGOUT] Người dùng đăng xuất:', req.session.user.hoTen);
    req.session.destroy(err => {
      if (err) {
        console.error('Lỗi khi đăng xuất:', err);
      }
      // Xóa cookie của session
      res.clearCookie('tuyendung_sid');
      res.redirect('/admin/dang-nhap');
    });
  } else {
    res.redirect('/admin/dang-nhap');
  }
});

// Trang đăng ký chung
app.get('/dang-ky', (req, res) => {
  res.render('pages/dang-ky', { title: 'Đăng Ký - Hệ Thống Tuyển Dụng' });
});

// Trang đăng ký ứng viên
app.get('/ung-vien/dang-ky', (req, res) => {
  res.render('pages/dang-ky', { 
    title: 'Đăng Ký Ứng Viên - Hệ Thống Tuyển Dụng',
    userType: 'ungVien'
  });
});

// Trang đăng ký nhà tuyển dụng
app.get('/nha-tuyen-dung/dang-ky', (req, res) => {
  res.render('pages/dang-ky', { 
    title: 'Đăng Ký Nhà Tuyển Dụng - Hệ Thống Tuyển Dụng',
    userType: 'nhaTuyenDung'
  });
});

app.get('/viec-lam', async (req, res) => {
  try {
    console.log('Truy cập trang việc làm');
    const keyword = req.query.keyword || '';
    const category = req.query.category || '';
    const position = req.query.position || '';
    const salary = req.query.salary || '';
    const experience = req.query.experience || '';
    const sort = req.query.sort || 'latest';
    
    // Build query - chỉ hiển thị việc làm đã được phê duyệt (trạng thái 'Đang tuyển')
    const query = { trangThai: 'Đang tuyển' }; // Không thay đổi - đã đúng
    
    // Hiển thị thông báo nếu người dùng là admin
    const isAdmin = req.session.user && (req.session.user.vaiTro === 'QuanTriVien' || req.session.user.vaiTro === 'Admin');
    const pendingJobsCount = isAdmin ? await CongViec.countDocuments({ trangThai: 'Đợi duyệt' }) : 0;
    
    // Tìm kiếm theo từ khóa
    if (keyword) {
      query.$or = [
        { tenCV: { $regex: keyword, $options: 'i' } },
        { moTa: { $regex: keyword, $options: 'i' } },
      ];
    }
    
    // Lọc theo ngành nghề (category)
    if (category && category !== '') {
      // Thêm logic lọc ngành nghề tại đây nếu cần
    }
    
    // Lọc theo vị trí (position)
    if (position && position !== '') {
      // Ví dụ: nếu có trường position trong model CongViec
      // query.position = position;
    }
    
    // Lọc theo mức lương
    if (salary && salary !== '') {
      if (salary === '0-10') {
        query.luong = { $lt: 10000000 };
      } else if (salary === '10-15') {
        query.luong = { $gte: 10000000, $lte: 15000000 };
      } else if (salary === '15-25') {
        query.luong = { $gt: 15000000, $lte: 25000000 };
      } else if (salary === '25+') {
        query.luong = { $gt: 25000000 };
      }
    }
    
    // Lọc theo kinh nghiệm
    if (experience && experience !== '') {
      // Tùy thuộc vào định dạng lưu kinh nghiệm
      if (experience === '0') {
        query.kinhNghiem = { $regex: 'Không yêu cầu|Chưa có kinh nghiệm', $options: 'i' };
      } else if (experience === '0-1') {
        query.kinhNghiem = { $regex: 'Dưới 1 năm', $options: 'i' };
      } else if (experience === '1-3') {
        query.kinhNghiem = { $regex: '1-3|1-2|2-3', $options: 'i' };
      } else if (experience === '3-5') {
        query.kinhNghiem = { $regex: '3-5', $options: 'i' };
      } else if (experience === '5+') {
        query.kinhNghiem = { $regex: '5 năm|trên 5|5\\+', $options: 'i' };
      }
    }
    
    // Sắp xếp kết quả
    let sortOption = { ngayDang: -1 }; // Mặc định: mới nhất
    if (sort === 'salary-desc') {
      sortOption = { luong: -1 };
    } else if (sort === 'relevance') {
      // Giữ nguyên mặc định hoặc thay đổi nếu có logic phù hợp khác
    }
    
    console.log('Query:', JSON.stringify(query));
    console.log('Sort:', JSON.stringify(sortOption));
    
    // Fetch jobs from database
    const jobs = await CongViec.find(query)
      .sort(sortOption)
      .populate({
        path: 'maND',
        select: 'hoTen email thongTin vaiTro' // Chỉ lấy các trường cần thiết
      })
      .populate('nhaTuyenDung', 'hoTen thongTin.tenCongTy');
    
    console.log(`Tìm thấy ${jobs.length} công việc`);
    
    // Loại bỏ các công việc trùng lặp (nếu có)  
    const uniqueJobMap = new Map();
    for (const job of jobs) {
      const jobKey = `${job.tenCV}-${job.luong}`;
      // Nếu job này chưa có trong Map hoặc là bản ghi mới hơn, thêm vào Map
      if (!uniqueJobMap.has(jobKey) || job.ngayDang > uniqueJobMap.get(jobKey).ngayDang) {
        uniqueJobMap.set(jobKey, job);
      }
    }
    const uniqueJobs = Array.from(uniqueJobMap.values());
    console.log(`Sau khi lọc: ${uniqueJobs.length} công việc duy nhất`);

    // Chuyển đổi dữ liệu để dễ dàng sử dụng trong template
    const formattedJobs = uniqueJobs.map(job => {
      // Lấy logo của công ty (nếu có)
      let logoUrl = 'https://via.placeholder.com/80';
      if (job.maND && job.maND.thongTin && job.maND.thongTin.logo) {
        logoUrl = job.maND.thongTin.logo;
      }
      
      // Format ngày đăng
      const ngayDang = new Date(job.ngayDang).toLocaleDateString('vi-VN');
      
      // Tên công ty - cải thiện logic để tránh hiển thị trùng lặp
      let tenCongTy = '';
      
      // Ưu tiên lấy từ maND nếu có
      if (job.maND && job.maND.thongTin && job.maND.thongTin.tenCongTy) {
        tenCongTy = job.maND.thongTin.tenCongTy;
      }
      // Nếu không có, thử lấy từ nhaTuyenDung
      else if (job.nhaTuyenDung && job.nhaTuyenDung.thongTin && job.nhaTuyenDung.thongTin.tenCongTy) {
        tenCongTy = job.nhaTuyenDung.thongTin.tenCongTy;
      }
      // Nếu vẫn không có, sử dụng tên người dùng
      else if (job.maND && job.maND.hoTen) {
        tenCongTy = `Công ty của ${job.maND.hoTen}`;
      }
      // Mặc định nếu không có thông tin nào
      else {
        tenCongTy = 'Công ty chưa xác định';
      }
      
      return {
        ...job.toObject(),
        logoUrl,
        ngayDangFormat: ngayDang,
        tenCongTy,
        maND: job.maND ? job.maND._id : (job.nhaTuyenDung || null)
      };
    });
    
    // Log các công việc để debug
    console.log('Danh sách công việc đã lọc:');
    formattedJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.tenCV} - ${job.tenCongTy} - ${job.luong} VNĐ`);
    });
    
    res.render('pages/viec-lam', { 
      title: 'Việc Làm - Hệ Thống Tuyển Dụng',
      jobs: formattedJobs,
      keyword,
      category,
      position,
      salary,
      experience,
      sort,
      totalJobs: formattedJobs.length,
      pendingJobsCount: pendingJobsCount || 0
    });
  } catch (error) {
    console.error('Error loading jobs:', error);
    res.status(500).render('pages/error', { 
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải dữ liệu việc làm'
    });
  }
});

// Authentication middleware tổng quát đơn giản
const isAuthenticated = (req, res, next) => {
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (req.session && req.session.user) {
    console.log(`[AUTH] Xác thực thành công cho ${req.session.user.hoTen} với vai trò ${req.session.user.vaiTro}`);
    return next();
  }
  
  console.log(`[AUTH] Không tìm thấy session phù hợp, chuyển hướng đến trang đăng nhập`);
  
  // Xác định loại người dùng từ URL
  const url = req.originalUrl;
  
  // Chuyển hướng đến trang đăng nhập tương ứng
  if (url.startsWith('/ung-vien')) {
    return res.redirect('/ung-vien/dang-nhap');
  } else if (url.startsWith('/nha-tuyen-dung')) {
    return res.redirect('/nha-tuyen-dung/dang-nhap');
  } else if (url.startsWith('/admin')) {
    return res.redirect('/admin/dang-nhap');
  }
  
  // Mặc định
  res.redirect('/dang-nhap');
};

// Middleware kiểm tra authentication cho ứng viên
const isUngVien = (req, res, next) => {
  // Kiểm tra vai trò
  if (req.session.user && req.session.user.vaiTro === 'UngVien') {
    return next();
  }
  
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session.user) {
    return res.redirect('/ung-vien/dang-nhap');
  }
  
  // Nếu đã đăng nhập nhưng không có quyền
  res.status(403).render('pages/error', {
    title: 'Không có quyền truy cập',
    error: 'Bạn không có quyền truy cập trang này. Chức năng này chỉ dành cho ứng viên.'
  });
};

// Middleware kiểm tra authentication cho nhà tuyển dụng
const isNhaTuyenDung = (req, res, next) => {
  // Kiểm tra vai trò
  if (req.session.user && req.session.user.vaiTro === 'NhaTuyenDung') {
    return next();
  }
  
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session.user) {
    return res.redirect('/nha-tuyen-dung/dang-nhap');
  }
  
  // Nếu đã đăng nhập nhưng không có quyền
  res.status(403).render('pages/error', {
    title: 'Không có quyền truy cập',
    error: 'Bạn không có quyền truy cập trang này. Chức năng này chỉ dành cho nhà tuyển dụng.'
  });
};

// Middleware kiểm tra authentication cho admin
const isAdmin = (req, res, next) => {
  console.log('Kiểm tra quyền quản trị viên - thông tin người dùng:', req.session.user);
  
  // Kiểm tra vai trò
  if (req.session.user && (req.session.user.vaiTro === 'QuanTriVien' || req.session.user.vaiTro === 'Admin')) {
    console.log('Xác thực thành công - Vai trò:', req.session.user.vaiTro);
    return next();
  }
  
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session.user) {
    return res.redirect('/admin/dang-nhap');
  }
  
  console.log('Từ chối quyền truy cập - Không có vai trò Admin/QuanTriVien');
  res.status(403).render('pages/error', {
    title: 'Không có quyền truy cập',
    error: 'Bạn không có quyền truy cập trang này. Chức năng này chỉ dành cho quản trị viên.'
  });
};

// Protected routes
app.get('/ho-so', isAuthenticated, async (req, res) => {
  try {
    // Fetch user profile data
    const user = await NguoiDung.findById(req.session.user.id);
    res.render('pages/ho-so', {
      title: 'Hồ Sơ - Hệ Thống Tuyển Dụng',
      profile: user
    });
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/');
  }
});

app.get('/quan-ly-cong-viec', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    console.log('Bắt đầu tìm kiếm việc làm cho nhà tuyển dụng:', req.session.user.id);
    
    // Đảm bảo req.session.user.id tồn tại
    if (!req.session.user.id) {
      return res.status(400).render('pages/error', {
        title: 'Lỗi - Hệ Thống Tuyển Dụng',
        error: 'Không tìm thấy thông tin người dùng'
      });
    }
      
    // Fetch jobs posted by this recruiter
    const jobs = await CongViec.find({ nhaTuyenDung: req.session.user.id })
      .sort({ ngayDang: -1 });
    
    console.log('Tìm thấy ' + jobs.length + ' việc làm cho nhà tuyển dụng ID:', req.session.user.id);

    // Lấy thông tin công ty
    let company = await NguoiDung.findById(req.session.user.id, 'thongTin');
    
    // Nếu logo không tồn tại, chỉ định logo K&G
    if (!company || !company.thongTin || !company.thongTin.logo) {
      if (!company) company = {};
      if (!company.thongTin) company.thongTin = {};
      company.thongTin.logo = '/images/kg_logo.jpg';
    }
    
    // Render trang với dữ liệu đã tìm được
    return res.render('pages/quan-ly-cong-viec', {
      title: 'Quản Lý Việc Làm - Hệ Thống Tuyển Dụng',
      jobs: jobs || [], // Đảm bảo jobs luôn là mảng
      company: company?.thongTin || null,
      defaultLogo: '/images/kg_logo.jpg' 
    });
  } catch (error) {
    console.error('Lỗi khi tải trang quản lý việc làm:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải trang quản lý việc làm'
    });
  }
});

// Route cho trang đăng tuyển dụng
app.get('/dang-tuyen-dung', isAuthenticated, isNhaTuyenDung, async (req, res) => {
    try {
    // Lấy thông tin công ty để hiển thị
    const company = await NguoiDung.findById(req.session.user.id, 'thongTin hoTen email');
    
    res.render('pages/dang-tuyen-dung', {
      title: 'Đăng tin tuyển dụng - Hệ Thống Tuyển Dụng',
      company: company?.thongTin || { 
        tenCongTy: company?.hoTen || 'Công ty của bạn',
        diaChi: 'Chưa cập nhật'
      }
    });
  } catch (error) {
    console.error('Lỗi khi tải trang đăng tin tuyển dụng:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải trang đăng tin tuyển dụng'
    });
  }
});

// API tạo công việc mới
app.post('/api/cong-viec', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.vaiTro !== 'NhaTuyenDung') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }
    
    const { tenCV, moTa, diaDiem, luong, kinhNghiem, hocVan, kyNang, loiIch } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!tenCV || !moTa || !diaDiem || !luong || !kinhNghiem || !hocVan || !kyNang || !loiIch) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }
    
    // Tạo ObjectId mới cho maCV
    const maCV = new mongoose.Types.ObjectId();
    
    // Tạo công việc mới với các trường đáp ứng schema
    const congViec = new CongViec({
      _id: maCV, // Thiết lập ID cho document
      maCV: maCV, // Trường bắt buộc theo schema
      tenCV,
      moTa,
      diaDiem,
      luong: Number(luong),
      kinhNghiem,
      hocVan,
      kyNang: Array.isArray(kyNang) ? kyNang : [kyNang],
      loiIch,
      maND: req.session.user.id, // Trường bắt buộc theo schema
      nhaTuyenDung: req.session.user.id, // Giữ lại cho tương thích với code cũ
      ngayDang: new Date(), // Trường bắt buộc theo schema
      trangThai: 'Đợi duyệt', // Thay đổi trạng thái mặc định thành 'Đợi duyệt' để phù hợp với model
      donUngTuyen: [] // Trường bắt buộc theo schema - khởi tạo mảng rỗng
    });
    
    // Lưu công việc vào database
    await congViec.save();
    
    console.log(`Nhà tuyển dụng ${req.session.user.id} đã đăng công việc mới: ${tenCV}`);
    
    // Tạo thông báo cho admin về việc có công việc mới cần duyệt
    try {
      // Tìm tài khoản quản trị viên
      const adminUsers = await NguoiDung.find({ vaiTro: 'QuanTriVien' });
      
      if (adminUsers && adminUsers.length > 0) {
        // Tạo thông báo cho tất cả quản trị viên
        const thongBaoList = adminUsers.map(admin => ({
          nguoiNhan: admin._id,
          nguoiGui: req.session.user.id,
          nguoiTao: req.session.user.id,
          tieuDe: 'Có công việc mới cần phê duyệt',
          noiDung: `Công việc "${tenCV}" vừa được đăng bởi ${req.session.user.hoTen || 'Nhà tuyển dụng'} và đang chờ phê duyệt.`,
          daDoc: false,
          ngayTao: new Date(),
          loaiThongBao: 'PheDuyetViecLam'
        }));
        
        // Lưu các thông báo vào cơ sở dữ liệu
        await mongoose.connection.db.collection('ThongBao').insertMany(thongBaoList);
        console.log('Đã gửi thông báo đến quản trị viên về công việc mới');
      }
    } catch (tbError) {
      console.error('Lỗi khi gửi thông báo đến quản trị viên:', tbError);
      // Không ngừng quy trình nếu có lỗi khi gửi thông báo
    }
    
    return res.status(201).json({ 
      message: 'Đăng tin tuyển dụng thành công! Bài đăng đang chờ quản trị viên phê duyệt.', 
      congViec: congViec
    });
  } catch (error) {
    console.error('Lỗi khi đăng tin tuyển dụng:', error);
    return res.status(500).json({ 
      message: 'Đã xảy ra lỗi khi đăng tin tuyển dụng',
      error: error.message
    });
  }
});

// API Routes
// User Registration API
app.post('/api/register', async (req, res) => {
  try {
    console.log('Đang xử lý đăng ký:', req.body);
    const { hoTen, email, sdt, password, confirmPassword, vaiTro, tenCongTy } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!hoTen || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }
    
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Định dạng email không hợp lệ' });
    }
    
    // Kiểm tra email đã tồn tại chưa (sử dụng native MongoDB để tránh validation)
    const db = mongoose.connection.db;
    const existingUser = await db.collection('NguoiDung').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    
    // Kiểm tra mật khẩu khớp nhau
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu không khớp' });
    }
    
    // Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    try {
      // Tạo tài khoản mới trực tiếp qua MongoDB (bỏ qua middleware)
      const maTK = 'TK' + Date.now();
      const taiKhoanResult = await db.collection('TaiKhoan').insertOne({
        maTK,
        tenDN: email,
        matKhau: password, // Lưu mật khẩu không mã hóa
        ngayTao: new Date(),
        lanCuoiDN: new Date()
      });
      
      const taiKhoanId = taiKhoanResult.insertedId;
      console.log('Đã tạo tài khoản ID:', taiKhoanId);
      
      // Tạo người dùng mới
      const maND = 'ND' + Date.now();
      let thongTin;
      
      // Chỉ kiểm tra và gán tên công ty khi là Nhà tuyển dụng
      if (vaiTro === 'NhaTuyenDung') {
        thongTin = { tenCongTy: req.body.tenCongTy };
      } else {
        thongTin = {}; // Default for UngVien
      }
      
      const nguoiDungResult = await db.collection('NguoiDung').insertOne({
        maND,
        hoTen: hoTen,
        email: email,
        sdt: sdt || '',
        vaiTro: vaiTro || 'UngVien',
        thongTin: thongTin,
        taiKhoan: taiKhoanId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Đã tạo người dùng ID:', nguoiDungResult.insertedId);
      return res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (saveError) {
      console.error('Lỗi khi lưu thông tin:', saveError);
      
      // Trong trường hợp lỗi, gửi thông báo chi tiết
      return res.status(400).json({ 
        message: 'Lỗi khi đăng ký: ' + (saveError.message || 'Vui lòng kiểm tra lại thông tin nhập')
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký: ' + error.message });
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, vaiTro } = req.body;
    
    // Sử dụng TaiKhoanService để kiểm tra đăng nhập
    const ketQua = await require('./services/taiKhoanService').kiemTraDangNhap(email, password);
    
    if (!ketQua.success) {
      return res.status(401).json({ message: ketQua.message });
    }
    
    const { taiKhoan, nguoiDung } = ketQua.data;
    
    // Kiểm tra vai trò nếu được cung cấp
    if (vaiTro && nguoiDung.vaiTro !== vaiTro) {
      return res.status(403).json({ 
        message: nguoiDung.vaiTro === 'UngVien' 
          ? 'Tài khoản này là tài khoản Ứng viên, vui lòng chọn tab Ứng viên để đăng nhập' 
          : 'Tài khoản này là tài khoản Nhà tuyển dụng, vui lòng chọn tab Nhà tuyển dụng để đăng nhập'
      });
    }
    
    // Set session
    req.session.user = {
      id: nguoiDung._id,
      hoTen: nguoiDung.hoTen,
      email: nguoiDung.email,
      vaiTro: nguoiDung.vaiTro,
      taiKhoanId: taiKhoan._id
    };
    
    res.json({
      message: 'Đăng nhập thành công',
      user: {
        id: nguoiDung._id,
        hoTen: nguoiDung.hoTen,
        email: nguoiDung.email,
        vaiTro: nguoiDung.vaiTro
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập' });
  }
});

// Logout API
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Đăng xuất thành công' });
});

// API for job listings
app.get('/api/cong-viec', async (req, res) => {
  try {
    const congViec = await CongViec.find()
      .populate('nhaTuyenDung', 'hoTen thongTin.tenCongTy')
      .sort({ ngayDang: -1 });
    res.json(congViec);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách công việc' });
  }
});

// API for job details
app.get('/api/cong-viec/:id', async (req, res) => {
  try {
    const congViec = await CongViec.findById(req.params.id)
      .populate('nhaTuyenDung', 'hoTen thongTin.tenCongTy');
    if (!congViec) {
      return res.status(404).json({ message: 'Không tìm thấy công việc' });
    }
    res.json(congViec);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin công việc' });
  }
});

// API for saving a job
app.post('/api/viec-yeu-thich', isAuthenticated, async (req, res) => {
  try {
    const { congViecId } = req.body;
    const ungVienId = req.session.user.id;
    
    // Check if job already saved
    const existing = await ViecYeuThich.findOne({ ungVien: ungVienId, congViec: congViecId });
    if (existing) {
      return res.status(400).json({ message: 'Công việc đã được lưu trước đó' });
    }
    
    // Create new saved job
    const viecYeuThich = new ViecYeuThich({
      maYT: 'YT' + Date.now(),
      ungVien: ungVienId,
      congViec: congViecId
    });
    
    await viecYeuThich.save();
    res.status(201).json({ message: 'Đã lưu công việc thành công' });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lưu công việc' });
  }
});

// Endpoint xử lý Ajax đăng nhập từ form
app.post('/dang-nhap', async (req, res) => {
  try {
    const taiKhoanController = require('./controllers/taiKhoanController');
    await taiKhoanController.dangNhap(req, res);
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
});

// Endpoint xử lý đăng xuất
app.get('/dang-xuat', async (req, res) => {
  try {
    const taiKhoanController = require('./controllers/taiKhoanController');
    await taiKhoanController.dangXuat(req, res);
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng xuất'
    });
  }
});

// API routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/tai-khoan', require('./routes/taiKhoanRoutes'));

// Route hiển thị trang chỉnh sửa công việc
app.get('/chinh-sua-cong-viec/:id', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const congViecId = req.params.id;
    
    // Kiểm tra xem công việc có tồn tại và thuộc về nhà tuyển dụng này không
    const congViec = await CongViec.findOne({
      _id: congViecId,
      nhaTuyenDung: req.session.user.id
    }).populate('nhaTuyenDung');
    
    if (!congViec) {
      return res.status(404).render('pages/error', {
        title: 'Lỗi - Không tìm thấy',
        error: 'Không tìm thấy công việc hoặc bạn không có quyền chỉnh sửa',
        user: req.session.user
      });
    }
    
    // Lấy thông tin công ty từ người dùng hiện tại
    const company = await NguoiDung.findById(req.session.user.id, 'thongTin.tenCongTy thongTin.logo thongTin.diaChi');
    
    res.render('pages/chinh-sua-viec-lam', {
      title: `Chỉnh sửa: ${congViec.tenCV}`,
      job: congViec,
      company: company?.thongTin
    });
  } catch (error) {
    console.error('Lỗi khi truy cập trang chỉnh sửa công việc:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải trang chỉnh sửa công việc: ' + error.message,
      user: req.session.user
    });
  }
});

// API cập nhật thông tin công việc
// Hàm xử lý cập nhật công việc chung cho cả PUT và POST
const handleJobUpdate = async (req, res) => {
  try {
    console.log('Xử lý cập nhật công việc, method:', req.method);
    console.log('Query params:', req.query);
    console.log('Body:', req.body);
    
    const congViecId = req.params.id;
    
    // Lấy dữ liệu từ form
    const {
      tenCV, soLuong, diaDiem, nganhNghe, hinhThuc, luong, hinhThucLamViec, 
      yeuCauKinhNghiem, moTa, yeucau, quyenLoi, trangThai, hanNopHoSo
    } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!tenCV || !diaDiem || !nganhNghe || !hinhThuc || !luong) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các trường bắt buộc'
      });
    }
    
    // Kiểm tra xem công việc có tồn tại và thuộc về nhà tuyển dụng này không
    const congViec = await CongViec.findOne({
      _id: congViecId,
      nhaTuyenDung: req.session.user.id
    });
    
    if (!congViec) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc hoặc bạn không có quyền chỉnh sửa'
      });
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      tenCV,
      soLuong: parseInt(soLuong) || 1,
      diaDiem,
      nganhNghe,
      hinhThuc,
      luong,
      hinhThucLamViec,
      yeuCauKinhNghiem,
      moTa,
      yeucau,
      quyenLoi,
      trangThai,
      hanNopHoSo: hanNopHoSo ? new Date(hanNopHoSo) : congViec.hanNopHoSo,
      ngayCapNhat: new Date()
    };
    
    console.log('Dữ liệu cập nhật công việc:', updateData);
    
    // Cập nhật thông tin công việc
    const updatedCongViec = await CongViec.findByIdAndUpdate(
      congViecId,
      updateData,
      { new: true }
    );
    
    // Trả về kết quả thành công
    return res.json({
      success: true,
      message: 'Cập nhật công việc thành công',
      data: updatedCongViec
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin công việc:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật công việc: ' + error.message
    });
  }
};

// Đăng ký route PUT
app.put('/api/cong-viec/:id', isAuthenticated, isNhaTuyenDung, handleJobUpdate);

// Đăng ký route POST (sử dụng với method-override)
app.post('/api/cong-viec/:id', isAuthenticated, isNhaTuyenDung, (req, res) => {
  // Kiểm tra xem có phải yêu cầu PUT không
  if (req.query._method === 'PUT' || req.body._method === 'PUT') {
    return handleJobUpdate(req, res);
  }
  
  // Nếu không phải PUT, trả về lỗi
  return res.status(400).json({
    success: false,
    message: 'Phương thức không được hỗ trợ'
  });
});

// Hàm xử lý xóa công việc chung cho cả route DELETE và POST
async function handleDeleteJob(req, res) {
  try {
    const congViecId = req.params.id;
    
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện hành động này'
      });
    }
    
    // Kiểm tra xem công việc có tồn tại và thuộc về nhà tuyển dụng này không
    const congViec = await CongViec.findOne({
      _id: congViecId
    });
    
    if (!congViec) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc'
      });
    }
    
    // Xóa các đơn ứng tuyển liên quan đến công việc này
    await DonUngTuyen.deleteMany({ congViec: congViecId });
    
    // Xóa các việc làm yêu thích liên quan đến công việc này
    await ViecYeuThich.deleteMany({ maCV: congViecId });
    
    // Xóa công việc
    await CongViec.findByIdAndDelete(congViecId);
    
    // Cập nhật danh sách công việc đã đăng của nhà tuyển dụng
    await NguoiDung.findByIdAndUpdate(
      req.session.user.id,
      { $pull: { congViecDang: congViecId } }
    );
    
    // Chuyển hướng về trang quản lý công việc
    if (req.query.redirect) {
      return res.redirect('/quan-ly-cong-viec');
    }
    
    // Nếu là API call, trả về JSON
    return res.json({
      success: true,
      message: 'Xóa công việc thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa công việc:', error);
    
    // Nếu có redirect query param, chuyển hướng về trang quản lý với thông báo lỗi
    if (req.query.redirect) {
      return res.redirect('/quan-ly-cong-viec?error=' + encodeURIComponent('Không thể xóa công việc: ' + error.message));
    }
    
    // Nếu là API call, trả về JSON
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xóa công việc: ' + error.message
    });
  }
}

// API xóa công việc (DELETE method)
app.delete('/api/cong-viec/:id', isAuthenticated, isNhaTuyenDung, handleDeleteJob);

// Route riêng biệt cho việc xóa công việc
app.get('/xoa-cong-viec/:id', async (req, res) => {
  try {
    const congViecId = req.params.id;
    
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.session.user || !req.session.user.id) {
      return res.redirect('/dang-nhap?redirect=' + encodeURIComponent('/quan-ly-cong-viec'));
    }
    
    // Kiểm tra xem công việc có tồn tại không
    const congViec = await CongViec.findById(congViecId);
    
    if (!congViec) {
      return res.redirect('/quan-ly-cong-viec?error=' + encodeURIComponent('Không tìm thấy công việc'));
    }
    
    // Xóa các đơn ứng tuyển liên quan đến công việc này
    await DonUngTuyen.deleteMany({ congViec: congViecId });
    
    // Xóa các việc làm yêu thích liên quan đến công việc này
    await ViecYeuThich.deleteMany({ maCV: congViecId });
    
    // Xóa công việc
    await CongViec.findByIdAndDelete(congViecId);
    
    // Cập nhật danh sách công việc đã đăng của nhà tuyển dụng
    await NguoiDung.findByIdAndUpdate(
      req.session.user.id,
      { $pull: { congViecDang: congViecId } }
    );
    
    // Chuyển hướng về trang quản lý công việc với thông báo thành công
    return res.redirect('/quan-ly-cong-viec?success=' + encodeURIComponent('Xóa công việc thành công'));
  } catch (error) {
    console.error('Lỗi khi xóa công việc:', error);
    return res.redirect('/quan-ly-cong-viec?error=' + encodeURIComponent('Không thể xóa công việc: ' + error.message));
  }
});

// API xóa công việc (POST method cho form submit) - giữ lại để tương thích ngược
app.post('/api/cong-viec/:id', async (req, res) => {
  // Kiểm tra xem có _method=DELETE không
  if (req.body && req.body._method === 'DELETE') {
    console.log('[DEBUG] POST request với _method=DELETE đã được nhận');
    return handleDeleteJob(req, res);
  }
  // Nếu không phải là _method=DELETE, trả về lỗi
  return res.status(405).json({
    success: false,
    message: 'Phương thức không được hỗ trợ'
  });
});

// =========== CÁC ROUTE CHO DANH SÁCH ỨNG VIÊN VÀ GỬI THÔNG BÁO ===========

// Route hiển thị trang gửi thông báo
app.get('/gui-thong-bao/:ungVienId', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const ungVienId = req.params.ungVienId;
    const congViecId = req.query.congViecId;
    
    // Kiểm tra thông tin ứng viên
    const ungVien = await NguoiDung.findById(ungVienId);
    
    if (!ungVien) {
      return res.status(404).render('pages/error', {
        message: 'Không tìm thấy ứng viên'
      });
    }
    
    // Nếu có ID công việc, kiểm tra công việc có thuộc nhà tuyển dụng đó không
    let congViec = null;
    let donUngTuyen = null;
    
    if (congViecId) {
      congViec = await CongViec.findOne({
        _id: congViecId,
        nhaTuyenDung: req.session.user.id
      });
      
      if (!congViec) {
        return res.status(403).render('pages/error', {
          message: 'Bạn không có quyền gửi thông báo cho công việc này'
        });
      }
      
      // Kiểm tra xem ứng viên có ứng tuyển cho công việc này không
      donUngTuyen = await DonUngTuyen.findOne({
        ungVien: ungVienId,
        congViec: congViecId
      });
      
      if (!donUngTuyen) {
        return res.status(404).render('pages/error', {
          message: 'Không tìm thấy đơn ứng tuyển của ứng viên này cho công việc này'
        });
      }
    }
    
    // Render trang gửi thông báo
    res.render('pages/gui-thong-bao', {
      ungVien,
      congViec,
      donUngTuyen
    });
    
  } catch (error) {
    console.error('Lỗi khi hiển thị trang gửi thông báo:', error);
    res.status(500).render('pages/error', {
      message: 'Đã xảy ra lỗi khi hiển thị trang gửi thông báo: ' + error.message
    });
  }
});

// API gửi thông báo cho ứng viên
app.post('/api/thong-bao', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debug log
    const { ungVienId, congViecId, donUngTuyenId, noiDung, guiEmail, guiHeThong } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!ungVienId || !noiDung) {
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.render('pages/gui-thong-bao', {
          errorMessage: 'Vui lòng điền đầy đủ thông tin cần thiết',
          ungVien: await NguoiDung.findById(ungVienId),
          congViec: congViecId ? await CongViec.findById(congViecId) : null,
          donUngTuyen: donUngTuyenId ? await DonUngTuyen.findById(donUngTuyenId) : null
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }
    
    // Kiểm tra ứng viên có tồn tại không
    const ungVien = await NguoiDung.findById(ungVienId);
    
    if (!ungVien) {
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.render('pages/gui-thong-bao', {
          errorMessage: 'Không tìm thấy ứng viên',
          congViec: congViecId ? await CongViec.findById(congViecId) : null,
          donUngTuyen: donUngTuyenId ? await DonUngTuyen.findById(donUngTuyenId) : null
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ứng viên'
      });
    }
    
    // Tạo thông báo mới theo schema MongoDB yêu cầu
    // Yêu cầu trường: maTB, nguoiTao, noiDung, ngayTao, nguoiNhan
    let insertedId;
    try {
      // Tạo một document phù hợp với schema
      const thongBaoDoc = {
        maTB: new mongoose.Types.ObjectId(),  // Tạo ID mới cho maTB
        nguoiTao: req.session.user.id,        // ID người tạo
        noiDung: noiDung,                    // Nội dung thông báo
        ngayTao: new Date(),                  // Ngày tạo hiện tại
        nguoiNhan: [ungVienId]                // Mảng người nhận 
      };
      
      // Log chi tiết document sẽ được tạo
      console.log('Thông báo sẽ được lưu:', JSON.stringify(thongBaoDoc, null, 2));
      
      // Chèn trực tiếp vào collection ThongBao
      const result = await mongoose.connection.db.collection('ThongBao').insertOne(thongBaoDoc);
      
      // Kiểm tra kết quả chèn
      if (!result.acknowledged) {
        throw new Error('Không nhận được xác nhận khi chèn thông báo');
      }
      
      console.log('Kết quả chèn thông báo:', result);
      insertedId = thongBaoDoc.maTB; // Lưu ID để sử dụng sau này
    } catch (dbError) {
      console.error('Lỗi khi lưu thông báo vào database:', dbError);
      throw new Error('Không thể lưu thông báo: ' + dbError.message);
    }
    
    // Gửi email nếu được yêu cầu
    if (guiEmail && ungVien.email) {
      try {
        // Gửi email trong thực tế - hiện tại chỉ log
        console.log(`Gửi email thông báo đến: ${ungVien.email} với nội dung: ${noiDung}`);
        // Code gửi email sẽ được thêm vào đây sau
      } catch (emailError) {
        console.error('Lỗi khi gửi email:', emailError);
      }
    }
    
    // Nếu request từ form, chuyển hướng về trang danh sách ứng viên
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      let redirectUrl = '/danh-sach-ung-vien';
      if (congViecId) {
        redirectUrl = `/danh-sach-ung-vien/${congViecId}`;
      }
      return res.redirect(`${redirectUrl}?success=Gửi thông báo thành công`);
    }
    
    // Nếu là API call, trả về JSON
    res.json({
      success: true,
      message: 'Gửi thông báo thành công',
      data: {
        id: insertedId
      }
    });
  } catch (error) {
    console.error('Lỗi khi gửi thông báo:', error);
    
    // Nếu request từ form, chuyển hướng về trang danh sách ứng viên với thông báo lỗi
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      let redirectUrl = '/danh-sach-ung-vien';
      if (req.body.congViecId) {
        redirectUrl = `/danh-sach-ung-vien/${req.body.congViecId}`;
      }
      return res.redirect(`${redirectUrl}?error=Đã xảy ra lỗi khi gửi thông báo: ${error.message}`);
    }
    
    // Nếu là API call, trả về JSON
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi gửi thông báo: ' + error.message
    });
  }
});

// Route hiển thị danh sách ứng viên theo công việc cụ thể
app.get('/danh-sach-ung-vien/:congViecId', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const congViecId = req.params.congViecId;
    
    console.log('Đang tải danh sách ứng viên cho công việc ID:', congViecId);
    
    // Kiểm tra công việc có tồn tại và thuộc về nhà tuyển dụng này không
    const congViec = await CongViec.findOne({
      _id: congViecId,
      maND: req.session.user.id
    });
    
    if (!congViec) {
      console.log('Không tìm thấy công việc hoặc không có quyền truy cập');
      return res.status(404).render('pages/error', {
        title: 'Không tìm thấy - Hệ Thống Tuyển Dụng',
        error: 'Không tìm thấy thông tin công việc hoặc bạn không có quyền truy cập',
        user: req.session.user || null
      });
    }
    
    // Lấy danh sách đơn ứng tuyển cho công việc này
    const db = mongoose.connection.db;
    const donUngTuyenCollection = db.collection('DonUngTuyen');
    
    const danhSachDon = await donUngTuyenCollection.find({
      congViec: new mongoose.Types.ObjectId(congViecId)
    }).toArray();
    
    console.log(`Tìm thấy ${danhSachDon.length} đơn ứng tuyển cho công việc ID ${congViecId}`);
    
    // Lấy ID của các ứng viên đã ứng tuyển
    const ungVienIds = danhSachDon.map(don => don.ungVien);
    
    // Lấy thông tin chi tiết của các ứng viên
    const nguoiDungCollection = db.collection('NguoiDung');
    const ungVienCollection = db.collection('UngVien');
    
    // Lấy thông tin từ bảng NguoiDung
    const nguoiDungList = await nguoiDungCollection.find({
      _id: { $in: ungVienIds }
    }).toArray();
    
    // Lấy thông tin từ bảng UngVien
    const ungVienList = await ungVienCollection.find({
      _id: { $in: ungVienIds }
    }).toArray();
    
    // Kết hợp thông tin từ cả hai bảng và đơn ứng tuyển
    const danhSachUngVien = nguoiDungList.map(nguoiDung => {
      // Tìm thông tin ứng viên tương ứng
      const ungVien = ungVienList.find(uv => 
        uv._id.toString() === nguoiDung._id.toString()
      ) || {};
      
      // Tìm thông tin đơn ứng tuyển
      const donUngTuyen = danhSachDon.find(don => 
        don.ungVien.toString() === nguoiDung._id.toString()
      ) || {};
      
      // Kết hợp thông tin
      return {
        _id: nguoiDung._id,
        hoTen: nguoiDung.hoTen || 'Chưa cập nhật',
        email: nguoiDung.email || 'Chưa cập nhật',
        sdt: nguoiDung.sdt || 'Chưa cập nhật',
        diaChi: ungVien.diaChi || 'Chưa cập nhật',
        ngaySinh: ungVien.ngaySinh,
        kyNang: ungVien.kyNang || [],
        anhDaiDien: ungVien.anhDaiDien,
        cv: ungVien.cv,
        trangThai: donUngTuyen.trangThai || 'Đang chờ',
        ngayUngTuyen: donUngTuyen.ngayUngTuyen,
        ketQua: donUngTuyen.ketQua || null,
        ghiChu: donUngTuyen.ghiChu || '',
        maDon: donUngTuyen.maDon || donUngTuyen._id
      };
    });
    
    // Render trang danh sách ứng viên theo công việc
    res.render('pages/danh-sach-ung-vien', {
      title: `Danh sách ứng viên - ${congViec.tenCV}`,
      congViec: congViec,
      danhSachUngVien: danhSachUngVien || [],
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Lỗi khi tải danh sách ứng viên theo công việc:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải danh sách ứng viên: ' + error.message,
      user: req.session.user || null
    });
  }
});

// Route xem hồ sơ ứng viên
app.get('/xem-ho-so-ung-vien/:congViecId', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const congViecId = req.params.congViecId;
    console.log('------ DEBUG HỒ SƠ ỨNG VIÊN ------');
    console.log('Đang xem hồ sơ ứng viên cho công việc:', congViecId);
    
    if (!mongoose.Types.ObjectId.isValid(congViecId)) {
      console.log('ID công việc không hợp lệ');
      return res.status(400).render('pages/error', { 
        message: 'ID công việc không hợp lệ',
        user: req.session.user || null
      });
    }
    
    // Tìm công việc và kiểm tra quyền truy cập
    const congViec = await CongViec.findOne({
      _id: congViecId,
      maND: req.session.user.id
    });
    
    if (!congViec) {
      console.log('Không tìm thấy công việc hoặc không có quyền truy cập');
      return res.status(404).render('pages/error', {
        message: 'Không tìm thấy công việc hoặc bạn không có quyền truy cập',
        user: req.session.user || null
      });
    }
    
    console.log('Tìm thấy công việc:', congViec.tenCV);
    
    // Tìm các đơn ứng tuyển cho công việc này
    const danhSachDon = await DonUngTuyen.find({
      congViec: congViecId
    });
    
    console.log('Số đơn ứng tuyển tìm được:', danhSachDon.length);
    
    // Tạo mảng chứa thông tin chi tiết của các ứng viên
    const danhSachUngVien = [];
    
    for (const don of danhSachDon) {
      try {
        console.log('Đang xử lý đơn ứng tuyển:', don._id.toString());
        console.log('ID ứng viên trong đơn:', don.ungVien.toString());
        
        // Tìm thông tin người dùng từ bảng NguoiDung
        const nguoiDung = await NguoiDung.findById(don.ungVien);
        if (!nguoiDung) {
          console.log('Không tìm thấy thông tin người dùng cho ứng viên:', don.ungVien);
          continue;
        }
        
        console.log('Tìm thấy người dùng:', nguoiDung.hoTen);
        
        // Tìm thông tin chi tiết từ bảng UngVien (nếu có)
        const ungVienInfo = await mongoose.connection.db.collection('UngVien').findOne({
          _id: new mongoose.Types.ObjectId(don.ungVien)
        });
        
        console.log('Tìm thấy thông tin UngVien:', ungVienInfo ? 'Có' : 'Không');
        
        // Thu thập thông tin ứng viên
        const ungVienData = {
          _id: nguoiDung._id,
          hoTen: nguoiDung.hoTen,
          email: nguoiDung.email,
          sdt: nguoiDung.sdt || 'Chưa cập nhật',
          ngayUngTuyen: don.ngayUngTuyen,
          ketQua: don.ketQua || 'Đang đánh giá',
          moTa: ungVienInfo?.moTa || 'Chưa có mô tả',
          kyNang: ungVienInfo?.kyNang || [],
          fileCV: don.fileCV || ungVienInfo?.cv || null
        };
        
        console.log('Đã tổng hợp thông tin ứng viên:', ungVienData.hoTen);
        console.log('ID của ứng viên trong danh sách:', ungVienData._id.toString());
        
        danhSachUngVien.push(ungVienData);
      } catch (err) {
        console.error('Lỗi khi xử lý đơn ứng tuyển:', err);
      }
    }
    
    console.log('Tổng số ứng viên sau khi xử lý:', danhSachUngVien.length);
    
    // Render trang hồ sơ ứng viên
    res.render('pages/ho-so-ung-vien', {
      congViec: congViec,
      danhSachUngVien: danhSachUngVien,
      totalUngVien: danhSachUngVien.length,
      user: req.session.user || null
    });
    
    console.log('------ KẾT THÚC DEBUG HỒ SƠ ỨNG VIÊN ------');
  } catch (error) {
    console.error('Lỗi khi lấy hồ sơ ứng viên:', error);
    res.status(500).render('pages/error', {
      message: 'Đã xảy ra lỗi khi lấy hồ sơ ứng viên: ' + error.message
    });
  }
});

// Route hiển thị tất cả ứng viên 
// Có hỗ trợ tìm kiếm, lọc và phân trang
app.get('/danh-sach-ung-vien', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    // Xử lý các tham số tìm kiếm và lọc
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Số ứng viên trên mỗi trang
    const skip = (page - 1) * limit;
    
    const searchValue = req.query.search;
    const filterValue = req.query.filter || 'all';
    
    // Khởi tạo điều kiện tìm kiếm
    let query = {};
    
    // Nếu có tìm kiếm theo tên
    if (searchValue) {
      query.hoTen = { $regex: searchValue, $options: 'i' };
    }
    
    // Xử lý bộ lọc
    if (filterValue === 'new') {
      // Lọc ứng viên mới (mới đăng ký trong 7 ngày gần nhất)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.createdAt = { $gte: sevenDaysAgo };
    } else if (filterValue === 'applied') {
      // Lọc những ứng viên đã ứng tuyển
      // Cần join với DonUngTuyen
      // Cách này phức tạp, chúng ta sẽ điều chỉnh sau khi lấy danh sách
    }
    
    // Lấy danh sách ứng viên là NguoiDung có vaiTro = 'UngVien'
    query.vaiTro = 'UngVien';
    
    // Đếm tổng số ứng viên thỏa mãn điều kiện
    const totalDocs = await NguoiDung.countDocuments(query);
    const totalPages = Math.ceil(totalDocs / limit);
    
    // Lấy danh sách ứng viên có phân trang
    let danhSachUngVien = await NguoiDung.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Nếu lọc theo đã ứng tuyển, chúng ta sẽ lọc sau khi lấy dữ liệu
    if (filterValue === 'applied') {
      // Lấy danh sách đơn ứng tuyển
      const donUngTuyenList = await DonUngTuyen.find({ nhaTuyenDung: req.session.user.id }).distinct('ungVien');
      // Chỉ giữ lại những ứng viên đã ứng tuyển
      danhSachUngVien = danhSachUngVien.filter(ungVien => 
        donUngTuyenList.some(id => id.toString() === ungVien._id.toString())
      );
    }
    
    // Lấy thông tin vị trí ứng tuyển cho mỗi ứng viên
    for (let ungVien of danhSachUngVien) {
      const donUngTuyen = await DonUngTuyen.findOne({ 
        ungVien: ungVien._id, 
        nhaTuyenDung: req.session.user.id 
      }).populate('congViec');
      
      if (donUngTuyen && donUngTuyen.congViec) {
        ungVien.viTriUngTuyen = donUngTuyen.congViec.tenCV;
        ungVien.trangThai = donUngTuyen.trangThai;
      }
    }
    
    res.render('pages/danh-sach-ung-vien', {
      danhSachUngVien,
      congViec: null, // Trường hợp xem tất cả ứng viên
      currentPage: page,
      totalPages,
      searchValue,
      filterValue
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ứng viên:', error);
    res.status(500).render('pages/error', {
      message: 'Đã xảy ra lỗi khi lấy danh sách ứng viên: ' + error.message
    });
  }
});

// API lấy thông tin chi tiết ứng viên
app.get('/api/ung-vien/:id', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const ungVienId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(ungVienId)) {
      return res.status(400).json({ message: 'ID ứng viên không hợp lệ' });
    }
    
    // Lấy thông tin từ bảng NguoiDung
    const nguoiDung = await mongoose.connection.db.collection('NguoiDung').findOne({
      _id: new mongoose.Types.ObjectId(ungVienId)
    });
    
    if (!nguoiDung) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin ứng viên' });
    }
    
    // Lấy thông tin từ bảng UngVien
    const ungVien = await mongoose.connection.db.collection('UngVien').findOne({
      _id: new mongoose.Types.ObjectId(ungVienId)
    });
    
    // Kết hợp thông tin
    const ketQuaUngVien = {
      _id: nguoiDung._id,
      hoTen: nguoiDung.hoTen || 'Chưa cập nhật',
      email: nguoiDung.email || 'Chưa cập nhật',
      sdt: nguoiDung.sdt || 'Chưa cập nhật',
      diaChi: ungVien?.diaChi || 'Chưa cập nhật',
      ngaySinh: ungVien?.ngaySinh || null,
      kyNang: ungVien?.kyNang || [],
      anhDaiDien: ungVien?.anhDaiDien || null,
      cv: ungVien?.cv || null
    };
    
    return res.json(ketQuaUngVien);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin ứng viên:', error);
    return res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin ứng viên: ' + error.message });
  }
});

// API gữi thông báo cho ứng viên
app.post('/api/thong-bao/ung-vien', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const { ungVienId, congViecId, tieuDe, noiDung, ketQua, donUngTuyenId } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!ungVienId || !congViecId || !tieuDe || !noiDung || !ketQua) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(ungVienId) || !mongoose.Types.ObjectId.isValid(congViecId)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    
    // Kiểm tra công việc thuộc về nhà tuyển dụng này
    const congViec = await CongViec.findOne({
      _id: congViecId,
      maND: req.session.user.id
    });
    
    if (!congViec) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }
    
    // Lấy thông tin đơn ứng tuyển
    const db = mongoose.connection.db;
    const donUngTuyenCollection = db.collection('DonUngTuyen');
    
    const donUngTuyen = await donUngTuyenCollection.findOne({
      ungVien: new mongoose.Types.ObjectId(ungVienId),
      congViec: new mongoose.Types.ObjectId(congViecId)
    });
    
    if (!donUngTuyen) {
      return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển' });
    }
    
    // Tạo thông báo mới
    const thongBaoCollection = db.collection('ThongBao');
    
    const thongBaoMoi = {
      nguoiNhan: [new mongoose.Types.ObjectId(ungVienId)], // Đảm bảo nguoiNhan là mảng
      nguoiGui: new mongoose.Types.ObjectId(req.session.user.id),
      nguoiTao: new mongoose.Types.ObjectId(req.session.user.id), // Thêm trường nguoiTao
      tieuDe: tieuDe,
      noiDung: noiDung,
      ngayTao: new Date(),
      daDoc: new Map(), // Sử dụng Map thay vì boolean
      loai: 'KetQuaUngTuyen',
      congViecLienQuan: new mongoose.Types.ObjectId(congViecId) // Đổi tên trường
    };
    
    const thongBaoResult = await thongBaoCollection.insertOne(thongBaoMoi);
    
    // Cập nhật kết quả đơn ứng tuyển
    const updateResult = await donUngTuyenCollection.updateOne(
      { _id: donUngTuyen._id },
      { $set: {
        ketQua: ketQua,
        trangThai: ketQua === 'Đạt' ? 'Trúng tuyển' : 'Từ chối', // Cập nhật trạng thái dựa vào kết quả
        ngayCapNhat: new Date()
      }}
    );

    // Thêm log để theo dõi quá trình cập nhật
    console.log(`Đã cập nhật đơn ứng tuyển ID ${donUngTuyen._id} với kết quả: ${ketQua}`);
    console.log(`Số lượng bản ghi được cập nhật: ${updateResult.modifiedCount}`);
    
    // Thêm thông báo vào danh sách thông báo của ứng viên
    const nguoiDungCollection = db.collection('NguoiDung');
    await nguoiDungCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(ungVienId) },
      { $push: { thongBao: thongBaoResult.insertedId } }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Đã gửi thông báo và cập nhật kết quả ứng tuyển thành công'
    });
  } catch (error) {
    console.error('Lỗi khi gửi thông báo cho ứng viên:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi gửi thông báo: ' + error.message
    });
  }
});


// Middleware xử lý lỗi cho JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ 
      error: 'Dữ liệu JSON không hợp lệ',
      details: err.message
    });
  }
  next(err);
});

// Middleware xử lý chuyển đổi undefined thành null trong JSON
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    const safeObj = JSON.parse(JSON.stringify(obj || null));
    return originalJson.call(this, safeObj);
  };
  next();
});

// Route hiển thị trang hồ sơ ứng viên
app.get('/xem-ho-so-ung-vien/:congViecId', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const congViecId = req.params.congViecId;
    
    // Kiểm tra công việc có tồn tại và thuộc nhà tuyển dụng đang đăng nhập
    const congViec = await CongViec.findOne({
      _id: congViecId,
      nhaTuyenDung: req.session.user.id
    });
    
    if (!congViec) {
      return res.status(404).render('pages/error', {
        message: 'Không tìm thấy công việc hoặc bạn không có quyền xem danh sách ứng viên này'
      });
    }
    
    // Tìm tất cả đơn ứng tuyển cho công việc này
    const donUngTuyen = await DonUngTuyen.find({ congViec: congViecId }).populate('ungVien');
    
    // Format dữ liệu ứng viên cho view
    const danhSachUngVien = donUngTuyen.map(don => {
      const ungVien = don.ungVien;
      return {
        _id: ungVien._id,
        hoTen: ungVien.hoTen,
        email: ungVien.email,
        sdt: ungVien.sdt,
        moTa: ungVien.moTa || "Chưa cập nhật",
        kyNang: ungVien.kyNang || [],
        ketQua: don.ketQua,
        trangThai: don.trangThai,
        ngayUngTuyen: don.ngayUngTuyen,
        fileCV: don.fileCV,
        donUngTuyenId: don._id
      };
    });
    
    res.render('pages/ho-so-ung-vien', {
      congViec,
      danhSachUngVien,
      totalUngVien: danhSachUngVien.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy hồ sơ ứng viên:', error);
    res.status(500).render('pages/error', {
      message: 'Đã xảy ra lỗi khi lấy hồ sơ ứng viên: ' + error.message
    });
  }
});

// Route xem chi tiết CV của ứng viên


// Tạo một route toàn năng có thể xử lý mọi trường hợp URL
app.get('/xem-cv/:ungVienId', async (req, res) => {
  try {
    console.log('============= DEBUG XEM-CV NEW HANDLER =============');
    let ungVienId = req.params.ungVienId || '';
    const congViecId = req.query.congViecId; // Thêm tham số congViecId từ query string
    
    // Log toàn bộ URL và params để debug
    console.log('URL đầy đủ:', req.originalUrl);
    console.log('ID từ params:', ungVienId);
    
    console.log('---------------------- DEBUG XEM CV ----------------------');
    console.log('Đang tải CV của ứng viên ID:', ungVienId);
    console.log('ID công việc (nếu có):', congViecId || 'Không có');
    
    // Xử lý các định dạng URL có thể có
    // Trích xuất ID từ URL nếu URL có cấu trúc phức tạp
    if (ungVienId.includes('/')) {
      // Có thể ID nằm trong một phần của path
      const parts = ungVienId.split('/');
      // Lấy phần tử cuối cùng sau khi tách
      ungVienId = parts[parts.length - 1];
      console.log('ID sau khi tách từ URL phức tạp:', ungVienId);
    }
    
    // Thử decode URL nếu có ký tự đặc biệt
    try {
      if (ungVienId.includes('%')) {
        const decodedId = decodeURIComponent(ungVienId);
        console.log('ID sau khi decode:', decodedId);
        ungVienId = decodedId;
      }
    } catch (decodeError) {
      console.error('Lỗi khi decode URI:', decodeError);
    }
    
    // Nếu ID vẫn chứa dấu ? hoặc &, có thể đó là một phần của query string
    const questionMarkIndex = ungVienId.indexOf('?');
    if (questionMarkIndex > -1) {
      ungVienId = ungVienId.substring(0, questionMarkIndex);
      console.log('ID sau khi loại bỏ query string:', ungVienId);
    }
    
    // Kiểm tra tính hợp lệ của ID
    console.log('ID cuối cùng sẽ sử dụng:', ungVienId);
    console.log('ID hợp lệ theo MongoDB:', mongoose.Types.ObjectId.isValid(ungVienId));
    
    // Nếu ID không hợp lệ, trả về lỗi
    if (!ungVienId || !mongoose.Types.ObjectId.isValid(ungVienId)) {
      console.log('ID ứng viên không hợp lệ:', ungVienId);
      return res.status(400).render('pages/error', {
        title: 'Lỗi ID - Hệ Thống Tuyển Dụng',
        error: `ID ứng viên không hợp lệ: ${ungVienId}`,
        user: req.session.user || null
      });
    }
    
    // Kiểm tra ID công việc nếu có
    if (congViecId && !mongoose.Types.ObjectId.isValid(congViecId)) {
      console.log('ID công việc không hợp lệ:', congViecId);
      return res.status(400).render('pages/error', {
        title: 'Lỗi ID - Hệ Thống Tuyển Dụng',
        error: `ID công việc không hợp lệ: ${congViecId}`,
        user: req.session.user || null
      });
    }
    
    // Thêm kiểm tra tính hợp lệ của IDs trong MongoDB
    console.log('Kiểm tra tính hợp lệ của ID:');
    console.log('- ID ứng viên hợp lệ:', mongoose.Types.ObjectId.isValid(ungVienId));
    if (congViecId) {
      console.log('- ID công việc hợp lệ:', mongoose.Types.ObjectId.isValid(congViecId));
    }
    
    // Kiểm tra sự tồn tại của ứng viên trong collection NguoiDung
    if (mongoose.Types.ObjectId.isValid(ungVienId)) {
      const countNguoiDung = await NguoiDung.countDocuments({ _id: ungVienId });
      console.log('- Số lượng NguoiDung với ID này:', countNguoiDung);
      
      // Kiểm tra trực tiếp trong MongoDB
      const directCheck = await mongoose.connection.db.collection('NguoiDung').countDocuments({ 
        _id: new mongoose.Types.ObjectId(ungVienId) 
      });
      console.log('- Kiểm tra trực tiếp MongoDB (NguoiDung):', directCheck);
      
      // Kiểm tra trong collection UngVien
      const countUngVien = await mongoose.connection.db.collection('UngVien').countDocuments({ 
        _id: new mongoose.Types.ObjectId(ungVienId) 
      });
      console.log('- Số lượng UngVien với ID này:', countUngVien);
    }
    
    // Kiểm tra sự tồn tại của công việc
    if (congViecId && mongoose.Types.ObjectId.isValid(congViecId)) {
      const countCongViec = await CongViec.countDocuments({ _id: congViecId });
      console.log('- Số lượng CongViec với ID này:', countCongViec);
      
      // Kiểm tra đơn ứng tuyển
      const countDon = await DonUngTuyen.countDocuments({ 
        ungVien: ungVienId,
        congViec: congViecId
      });
      console.log('- Số lượng DonUngTuyen khớp cả ứng viên và công việc:', countDon);
      
      // Kiểm tra đơn ứng tuyển chỉ với ungVienId
      const countDonUngVien = await DonUngTuyen.countDocuments({ ungVien: ungVienId });
      console.log('- Số lượng DonUngTuyen chỉ khớp ứng viên:', countDonUngVien);
    }
    
    // Tìm trong bảng NguoiDung
    const nguoiDung = await NguoiDung.findById(ungVienId);
    console.log('Kết quả tìm trong bảng NguoiDung:', nguoiDung ? 'Tìm thấy' : 'Không tìm thấy');
    
    if (!nguoiDung) {
      console.log('Không tìm thấy người dùng với ID:', ungVienId);
      
      // Kiểm tra chi tiết hơn
      console.log('Tìm kiếm người dùng với các cấu trúc ID khác nhau:');
      
      // Thử chuyển đổi ID sang dạng string
      const stringId = ungVienId.toString();
      console.log('- ID dạng string:', stringId);
      
      // Thử tìm kiếm trực tiếp trong collection
      const directFind = await mongoose.connection.db.collection('NguoiDung').findOne({
        _id: new mongoose.Types.ObjectId(ungVienId)
      });
      console.log('- Kết quả tìm trực tiếp:', directFind ? 'Tìm thấy' : 'Không tìm thấy');
      
      // Liệt kê một vài ID người dùng trong hệ thống
      const sampleUsers = await NguoiDung.find().limit(3).select('_id hoTen');
      console.log('- Một vài ID người dùng trong hệ thống:', sampleUsers.map(u => ({
        id: u._id.toString(),
        ten: u.hoTen
      })));
      
      return res.status(200).send(`
        <h1>Debug - ID không tồn tại trong hệ thống</h1>
        <p>ID ứng viên: ${ungVienId}</p>
        <p>ID công việc: ${congViecId || 'Không có'}</p>
        <p>Kết quả tìm kiếm trực tiếp: ${directFind ? 'Tìm thấy' : 'Không tìm thấy'}</p>
        <hr>
        <h2>Một số ID người dùng trong hệ thống:</h2>
        <ul>
          ${sampleUsers.map(u => `<li>${u._id.toString()} - ${u.hoTen}</li>`).join('')}
        </ul>
        <hr>
        <h2>Kiểm tra thủ công</h2>
        <p>Vui lòng kiểm tra xem ID ứng viên có trùng với bất kỳ ID nào được liệt kê không</p>
        <hr>
        <a href="/quan-ly-cong-viec" class="btn btn-primary">Quay lại</a>
      `);
    }
    
    if (nguoiDung.vaiTro !== 'UngVien') {
      console.log('Người dùng không phải ứng viên, vai trò:', nguoiDung.vaiTro);
      return res.status(400).render('pages/error', {
        title: 'Không hợp lệ - Hệ Thống Tuyển Dụng',
        error: 'Người dùng này không phải ứng viên',
        user: req.session.user || null
      });
    }
    
    // Tìm thông tin chi tiết trong bảng UngVien
    let ungVienInfo = await mongoose.connection.db.collection('UngVien').findOne({
      _id: new mongoose.Types.ObjectId(ungVienId)
    });
    console.log('Kết quả tìm trong bảng UngVien:', ungVienInfo ? 'Tìm thấy' : 'Không tìm thấy');
    
    // Nếu không tìm thấy, tạo một đối tượng thông tin mặc định
    if (!ungVienInfo) {
      console.log('Không tìm thấy thông tin trong UngVien, sử dụng thông tin mặc định');
      ungVienInfo = {
        kyNang: [],
        anhDaiDien: '/images/avatar-placeholder.jpg',
        cv: null,
        donUngTuyen: [],
        cvYeuThich: []
      };
    }
    
    // Tạo điều kiện tìm kiếm đơn ứng tuyển
    const donUngTuyenQuery = {
      ungVien: ungVienId
    };
    
    // Nếu có thông tin về người dùng hiện tại
    if (req.session.user && req.session.user.id) {
      // Tìm các công việc của nhà tuyển dụng hiện tại
      const congViecList = await CongViec.find({ maND: req.session.user.id }).select('_id');
      
      if (congViecList && congViecList.length > 0) {
        // Lấy danh sách ID các công việc
        const congViecIds = congViecList.map(cv => cv._id);
        console.log('Tìm đơn ứng tuyển cho các công việc:', congViecIds);
        
        // Thêm điều kiện tìm đơn ứng tuyển thuộc các công việc của nhà tuyển dụng
        donUngTuyenQuery.congViec = { $in: congViecIds };
      }
    }
    
    // Nếu có congViecId thì thêm vào điều kiện
    if (congViecId && mongoose.Types.ObjectId.isValid(congViecId)) {
      donUngTuyenQuery.congViec = congViecId;
    }
    
    console.log('Truy vấn tìm đơn ứng tuyển:', donUngTuyenQuery);
    
    // Lấy đơn ứng tuyển liên quan đến nhà tuyển dụng này
    const donUngTuyen = await DonUngTuyen.findOne(donUngTuyenQuery).populate('congViec');
    console.log('Kết quả tìm đơn ứng tuyển của nhà tuyển dụng:', donUngTuyen ? 'Tìm thấy' : 'Không tìm thấy');
    
    // Nếu không tìm thấy đơn ứng tuyển phù hợp
    if (!donUngTuyen) {
      console.log('Không tìm thấy đơn ứng tuyển phù hợp với điều kiện tìm kiếm');
      
      // Thử tìm bất kỳ đơn ứng tuyển nào của ứng viên này
      const batKyDon = await DonUngTuyen.findOne({ ungVien: ungVienId });
      console.log('Tìm bất kỳ đơn ứng tuyển nào của ứng viên này:', batKyDon ? 'Tìm thấy' : 'Không tìm thấy');
      
      // Nếu không tìm thấy đơn ứng tuyển nào, vẫn cho phép xem hồ sơ nhưng hiển thị thông báo
      if (!batKyDon) {
        console.log('Ứng viên chưa ứng tuyển vào bất kỳ công việc nào');
        
        // Render trang xem CV với thông tin cơ bản, không có thông tin công việc
        return res.render('pages/xem-cv', {
          title: `CV - ${nguoiDung.hoTen}`,
          ungVien: {
            ...nguoiDung.toObject(),
            diaChi: ungVienInfo?.diaChi || 'Chưa cập nhật',
            ngaySinh: ungVienInfo?.ngaySinh || null, 
            kyNang: ungVienInfo?.kyNang || [],
            hocVan: ungVienInfo?.hocVan || [],
            kinhNghiem: ungVienInfo?.kinhNghiem || [],
            cv: ungVienInfo?.cv || null,
            anhDaiDien: ungVienInfo?.anhDaiDien || '/images/avatar-placeholder.jpg'
          },
          congViec: null,
          donUngTuyen: null,
          chuaUngTuyen: true,
          khongCoQuyen: false,
          user: req.session.user || null
        });
      }
      
      // Nếu có đơn ứng tuyển nhưng không thuộc công việc của nhà tuyển dụng hiện tại
      console.log('Đơn ứng tuyển không thuộc công việc của nhà tuyển dụng hiện tại');
      
      // Tìm thông tin công việc
      const congViec = await CongViec.findById(batKyDon.congViec);
      const nhaTuyenDungInfo = await NguoiDung.findById(congViec?.maND);
      
      // Render trang xem CV nhưng với thông báo không có quyền truy cập
      return res.render('pages/xem-cv', {
        title: `CV - ${nguoiDung.hoTen}`,
        ungVien: {
          ...nguoiDung.toObject(),
          diaChi: ungVienInfo?.diaChi || 'Chưa cập nhật',
          ngaySinh: ungVienInfo?.ngaySinh || null, 
          kyNang: ungVienInfo?.kyNang || [],
          hocVan: ungVienInfo?.hocVan || [],
          kinhNghiem: ungVienInfo?.kinhNghiem || [],
          cv: ungVienInfo?.cv || null,
          anhDaiDien: ungVienInfo?.anhDaiDien || '/images/avatar-placeholder.jpg'
        },
        congViec: congViec,
        donUngTuyen: batKyDon,
        khongCoQuyen: true,
        nhaTuyenDungInfo: nhaTuyenDungInfo,
        user: req.session.user || null
      });
    }
    
    // Tìm công việc liên quan
    const congViec = await CongViec.findById(donUngTuyen.congViec);
    if (!congViec) {
      console.log('Không tìm thấy công việc liên quan, ID:', donUngTuyen.congViec);
      
      // Render trang xem CV nhưng không có thông tin công việc
      return res.render('pages/xem-cv', {
        title: `CV - ${nguoiDung.hoTen}`,
        ungVien: {
          ...nguoiDung.toObject(),
          diaChi: ungVienInfo?.diaChi || 'Chưa cập nhật',
          ngaySinh: ungVienInfo?.ngaySinh || null, 
          kyNang: ungVienInfo?.kyNang || [],
          hocVan: ungVienInfo?.hocVan || [],
          kinhNghiem: ungVienInfo?.kinhNghiem || [],
          cv: ungVienInfo?.cv || null,
          anhDaiDien: ungVienInfo?.anhDaiDien || '/images/avatar-placeholder.jpg'
        },
        congViec: null,
        donUngTuyen: donUngTuyen,
        congViecKhongTonTai: true,
        khongCoQuyen: false,
        chuaUngTuyen: false,
        user: req.session.user || null
      });
    }
    
    // Render trang xem CV
    console.log('Đã tìm thấy thông tin, render trang xem CV');
    console.log('Thông tin CV:', ungVienInfo ? (ungVienInfo.cv || 'Không có') : 'Không có');
    console.log('Thông tin file CV trong đơn:', donUngTuyen.fileCV || 'Không có');
    
    // Gộp thông tin từ NguoiDung, UngVien và DonUngTuyen
    const ungVienData = {
      ...nguoiDung.toObject(),
      diaChi: ungVienInfo?.diaChi || 'Chưa cập nhật',
      ngaySinh: ungVienInfo?.ngaySinh || null, 
      kyNang: ungVienInfo?.kyNang || [],
      hocVan: ungVienInfo?.hocVan || [],
      kinhNghiem: ungVienInfo?.kinhNghiem || [],
      cv: ungVienInfo?.cv || donUngTuyen.fileCV || null,
      anhDaiDien: ungVienInfo?.anhDaiDien || '/images/avatar-placeholder.jpg'
    };
    
    res.render('pages/xem-cv', {
      title: `CV - ${nguoiDung.hoTen}`,
      ungVien: ungVienData,
      congViec: congViec,
      donUngTuyen: donUngTuyen,
      user: req.session.user || null,
      success: true,
      khongCoQuyen: false,
      chuaUngTuyen: false
    });
    console.log('---------------------- HẾT DEBUG XEM CV ----------------------');
  } catch (error) {
    console.error('Lỗi khi tải thông tin CV:', error);
    return res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải thông tin CV: ' + error.message,
      user: req.session.user || null
    });
  }
});

// Route quản lý công việc của nhà tuyển dụng
app.get('/quan-ly-cong-viec', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    // ... phần code còn lại
  } catch (error) {
    // ... phần code còn lại
  }
});

// Route xem CV ứng viên từ quản lý công việc
app.get('/quan-ly-cong-viec/xem-cv/:ungVienId', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    // Chuyển hướng đến route xem CV chính
    const ungVienId = req.params.ungVienId;
    const congViecId = req.query.congViecId;
    let redirectUrl = `/xem-cv/${ungVienId}`;
    
    if (congViecId) {
      redirectUrl += `?congViecId=${congViecId}`;
    }
    
    console.log('Chuyển hướng từ /quan-ly-cong-viec/xem-cv đến:', redirectUrl);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Lỗi chuyển hướng xem CV:', error);
    return res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi chuyển hướng xem CV: ' + error.message,
      user: req.session.user || null
    });
  }
});

// API đăng nhập cho ứng viên
app.post('/ung-vien/api/dang-nhap', async (req, res) => {
  try {
    console.log('API đăng nhập ứng viên được gọi:', req.body);
    const { tenDN, matKhau } = req.body;
    
    if (!tenDN || !matKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    // Kiểm tra thông tin đăng nhập với vai trò UngVien
    const taiKhoanService = require('./services/taiKhoanService');
    const ketQua = await taiKhoanService.kiemTraDangNhap(tenDN, matKhau, 'UngVien');
    
    if (!ketQua.success) {
      return res.status(401).json({
        success: false,
        message: ketQua.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }
    
    // Đăng nhập thành công
    const { taiKhoan, nguoiDung } = ketQua.data;
    
    // Đặt userType để đảm bảo đúng session
    req.userType = 'ungvien';
    
    // Lưu thông tin đăng nhập vào session ứng viên
    req.session.user = {
      id: nguoiDung._id,
      taiKhoanId: taiKhoan._id,
      hoTen: nguoiDung.hoTen,
      email: nguoiDung.email,
      sdt: nguoiDung.sdt,
      vaiTro: nguoiDung.vaiTro
    };
    
    // Lưu session
    req.session.save(err => {
      if (err) {
        console.error('Lỗi lưu session ứng viên:', err);
      }
      
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
    });
    
  } catch (error) {
    console.error('Lỗi đăng nhập ứng viên:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
});

// API đăng nhập cho nhà tuyển dụng
app.post('/nha-tuyen-dung/api/dang-nhap', async (req, res) => {
  try {
    console.log('API đăng nhập nhà tuyển dụng được gọi:', req.body);
    const { tenDN, matKhau } = req.body;
    
    if (!tenDN || !matKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    // Kiểm tra thông tin đăng nhập với vai trò NhaTuyenDung
    const taiKhoanService = require('./services/taiKhoanService');
    const ketQua = await taiKhoanService.kiemTraDangNhap(tenDN, matKhau, 'NhaTuyenDung');
    
    if (!ketQua.success) {
      return res.status(401).json({
        success: false,
        message: ketQua.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }
    
    // Đăng nhập thành công
    const { taiKhoan, nguoiDung } = ketQua.data;
    
    // Đặt userType để đảm bảo đúng session
    req.userType = 'nhatuyendung';
    
    // Lưu thông tin đăng nhập vào session nhà tuyển dụng
    req.session.user = {
      id: nguoiDung._id,
      taiKhoanId: taiKhoan._id,
      hoTen: nguoiDung.hoTen,
      email: nguoiDung.email,
      sdt: nguoiDung.sdt,
      vaiTro: nguoiDung.vaiTro
    };
    
    // Lưu session
    req.session.save(err => {
      if (err) {
        console.error('Lỗi lưu session nhà tuyển dụng:', err);
      }
      
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
    });
  } catch (error) {
    console.error('Lỗi đăng nhập nhà tuyển dụng:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
});

// API đăng nhập cho admin
app.post('/admin/api/dang-nhap', async (req, res) => {
  try {
    console.log('API đăng nhập admin được gọi:', req.body);
    const { tenDN, matKhau } = req.body;
    
    if (!tenDN || !matKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }
    
    // Kiểm tra thông tin đăng nhập với vai trò QuanTriVien
    const taiKhoanService = require('./services/taiKhoanService');
    const ketQua = await taiKhoanService.kiemTraDangNhap(tenDN, matKhau, 'QuanTriVien');
    
    if (!ketQua.success) {
      return res.status(401).json({
        success: false,
        message: ketQua.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }
    
    // Đăng nhập thành công
    const { taiKhoan, nguoiDung } = ketQua.data;
    
    // Đặt userType để đảm bảo đúng session
    req.userType = 'admin';
    
    // Lưu thông tin đăng nhập vào session admin
    req.session.user = {
      id: nguoiDung._id,
      taiKhoanId: taiKhoan._id,
      hoTen: nguoiDung.hoTen,
      email: nguoiDung.email,
      sdt: nguoiDung.sdt,
      vaiTro: nguoiDung.vaiTro
    };
    
    // Lưu session
    req.session.save(err => {
      if (err) {
        console.error('Lỗi lưu session admin:', err);
      }
      
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
    });
  } catch (error) {
    console.error('Lỗi đăng nhập admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
});

// API cập nhật kết quả đơn ứng tuyển
app.put('/api/don-ung-tuyen/cap-nhat-ket-qua/:id', isAuthenticated, isNhaTuyenDung, async (req, res) => {
  try {
    const donUngTuyenId = req.params.id;
    const { ketQua, trangThai } = req.body;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(donUngTuyenId)) {
      return res.status(400).json({ success: false, message: 'ID đơn ứng tuyển không hợp lệ' });
    }
    
    // Kiểm tra đơn ứng tuyển tồn tại và thuộc về công việc của nhà tuyển dụng này
    const donUngTuyen = await DonUngTuyen.findById(donUngTuyenId);
    
    if (!donUngTuyen) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn ứng tuyển' });
    }
    
    // Kiểm tra công việc thuộc về nhà tuyển dụng này
    const congViec = await CongViec.findOne({
      _id: donUngTuyen.congViec,
      maND: req.session.user.id
    });
    
    if (!congViec) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật đơn ứng tuyển này' });
    }
    
    // Cập nhật thông tin đơn ứng tuyển
    donUngTuyen.ketQua = ketQua;
    donUngTuyen.trangThai = trangThai;
    donUngTuyen.ngayCapNhat = new Date();
    
    await donUngTuyen.save();
    
    console.log(`Đã cập nhật đơn ứng tuyển ID ${donUngTuyenId}: Kết quả=${ketQua}, Trạng thái=${trangThai}`);
    
    return res.status(200).json({
      success: true,
      message: 'Cập nhật đơn ứng tuyển thành công'
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật đơn ứng tuyển:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật đơn ứng tuyển: ' + error.message
    });
  }
});
// 404 handler được di chuyển xuống app.js để đảm bảo thứ tự đúng

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});

// Route phê duyệt việc làm cho admin
app.get('/phe-duyet-viec-lam', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Lấy danh sách công việc chờ duyệt
    const congViecList = await CongViec.find({ trangThai: 'Đợi duyệt' })
      .populate('nhaTuyenDung', 'hoTen thongTin.tenCongTy')
      .sort({ ngayDang: -1 })
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số công việc chờ duyệt
    const totalJobs = await CongViec.countDocuments({ trangThai: 'Đợi duyệt' });
    const totalPages = Math.ceil(totalJobs / limit);
    
    res.render('pages/phe-duyet-viec-lam', {
      title: 'Phê duyệt việc làm - Admin',
      congViecList,
      currentPage: page,
      totalPages,
      totalJobs
    });
  } catch (error) {
    console.error('Lỗi khi tải trang phê duyệt việc làm:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - Hệ Thống Tuyển Dụng',
      error: 'Đã xảy ra lỗi khi tải trang phê duyệt việc làm'
    });
  }
});

// API phê duyệt/từ chối công việc
app.post('/api/phe-duyet-viec-lam', isAdmin, async (req, res) => {
  try {
    const { congViecId, action } = req.body;
    
    if (!congViecId || !action) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
    }
    
    const congViec = await CongViec.findById(congViecId);
    if (!congViec) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }
    
    if (action === 'approve') {
      congViec.trangThai = 'Đang tuyển';
      await congViec.save();
      
      // Gửi thông báo cho nhà tuyển dụng
      // Code gửi thông báo sẽ được thêm vào đây sau
    } else if (action === 'reject') {
      congViec.trangThai = 'Từ chối';
      await congViec.save();
      
      // Gửi thông báo cho nhà tuyển dụng
      // Code gửi thông báo sẽ được thêm vào đây sau
    }
    
    return res.redirect('/phe-duyet-viec-lam');
  } catch (error) {
    console.error('Lỗi khi xử lý phê duyệt việc làm:', error);
    return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi xử lý' });
  }
});
