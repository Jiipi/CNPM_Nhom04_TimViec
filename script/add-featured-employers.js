require('dotenv').config();
const mongoose = require('mongoose');

// Dữ liệu nhà tuyển dụng nổi bật mới - theo hình
const featuredEmployers = [
  {
    tenCongTy: 'PRIME TECH SOLUTION',
    moTaCty: 'Công ty cung cấp giải pháp công nghệ hàng đầu với nhiều dịch vụ đa dạng cho doanh nghiệp.',
    linhVuc: 'Công nghệ thông tin',
    soDienThoai: '0912345678',
    email: 'contact@primetech.vn',
    diaChi: 'Tầng 5, Tòa nhà TNR, 54A Nguyễn Chí Thanh, Đống Đa, Hà Nội',
    website: 'https://primetech.vn',
    logo: 'https://cdn-new.topcv.vn/unsafe/https://static.topcv.vn/company_logos/DmD8xyM7GOAhF4DCn4sLz5YBo8aGu1pi_1722565998____f52e49d76c05115255aa61d4509309e0.jpg',
    anh: 'https://salt.topdev.vn/s0cNLhyDFQZOqThkKW_CP28g6EbFFQsxmR8S1VwLeOI/auto/500/357/ce/1/aHR0cHM6Ly90b3BkZXYudm4vYXNzZXRzL2Rlc2t0b3AvaW1hZ2VzL2NvbXBhbnktc2NlbmUtMy5wbmc/company-scene-3.jpg',
    soNV: 200,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'MOTOROLA SOLUTIONS',
    moTaCty: 'Motorola Solutions là công ty công nghệ hàng đầu thế giới chuyên cung cấp giải pháp truyền thông và an ninh.',
    linhVuc: 'Công nghệ - Viễn thông',
    soDienThoai: '1900 1234',
    email: 'contact@motorolasolutions.com',
    diaChi: 'Keangnam Landmark 72, Phạm Hùng, Cầu Giấy, Hà Nội',
    website: 'https://motorolasolutions.com',
    logo: 'https://itviec.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBMWlXRWc9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--5ee905cb9cd9df820bbd5fdcd0eb82579e8c95df/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdCem9MWm05eWJXRjBTU0lJY0c1bkJqb0dSVlE2RkhKbGMybDZaVjkwYjE5c2FXMXBkRnNIYVFJc0FXa0NMQUU9IiwiZXhwIjpudWxsLCJwdXIiOiJ2YXJpYXRpb24ifX0=--15c3f2f3e11927673ae52b71712c1f66a7a1b7bd/12208270_999388660119178_5375044832360351749_n.png',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWeOC3-94WMMH7xNaeHOwK5krTGQXCweQETw&s',
    soNV: 500,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'ROADMAP AI',
    moTaCty: 'Công ty chuyên về các giải pháp trí tuệ nhân tạo và học máy cho các doanh nghiệp.',
    linhVuc: 'Trí tuệ nhân tạo - AI',
    soDienThoai: '0987654321',
    email: 'info@roadmap.ai',
    diaChi: 'Tầng 15, Tòa nhà Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội',
    website: 'https://roadmap.ai',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuRNNqK7SjNWH09fcBYY44ASvYiEo-mS9cMw&s',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUudtt_1M-0CR7KM9swuc4BB17cPf_6eFdXA&s',
    soNV: 150,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'Sacombank',
    moTaCty: 'Sacombank là một trong những ngân hàng thương mại cổ phần hàng đầu Việt Nam với mạng lưới rộng khắp.',
    linhVuc: 'Ngân hàng - Tài chính',
    soDienThoai: '1900 5555 88',
    email: 'info@sacombank.com',
    diaChi: '266-268 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP.HCM',
    website: 'https://sacombank.com.vn',
    logo: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Sacombank.png',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoCfI-5MEAoIVlIKEGZiYBJNmZ0x0KOika6w&s',
    soNV: 10000,
    diaChiCty: 'TP.HCM',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'GEM',
    moTaCty: 'GEM là công ty truyền thông đa phương tiện hàng đầu, chuyên cung cấp các giải pháp marketing và thiết kế sáng tạo.',
    linhVuc: 'Truyền thông - Marketing',
    soDienThoai: '0909 789 123',
    email: 'contact@gem.vn',
    diaChi: 'Tầng 8, Tòa nhà Bitexco, 2 Hải Triều, Quận 1, TP.HCM',
    website: 'https://gem.vn',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/GEM-logo-standard.png',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTO6iWSDfDdbrwipX50MLsLRq9YNhYF7XefUg&s',
    soNV: 300,
    diaChiCty: 'TP.HCM',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'ACB',
    moTaCty: 'ACB là ngân hàng thương mại cổ phần có uy tín với các giải pháp tài chính hiện đại và chuyên nghiệp.',
    linhVuc: 'Ngân hàng',
    soDienThoai: '1900 545 486',
    email: 'contact@acb.com.vn',
    diaChi: '442 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
    website: 'https://acb.com.vn',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQW7j478Y5CAP5aulWNTxu8M46IjdgH5tVfww&s',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyEYXgpzLmLIwTXvnO9VaKkGdSp_EWfeJ2mw&s',
    soNV: 12000,
    diaChiCty: 'TP.HCM',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedFeaturedEmployers() {
  let connection;
  try {
    // Kết nối MongoDB
    connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Đã kết nối MongoDB thành công...');
    
    // Truy cập trực tiếp đến MongoDB collection
    const db = mongoose.connection.db;
    
    // Xóa dữ liệu nhà tuyển dụng nổi bật cũ
    console.log('Đang xóa dữ liệu nhà tuyển dụng nổi bật cũ...');
    await db.collection('NhaTuyenDung').deleteMany({ 
      isFeaturedEmployer: true
    });
    
    // Thêm nhà tuyển dụng nổi bật mới
    console.log('Đang thêm nhà tuyển dụng nổi bật mới...');
    const result = await db.collection('NhaTuyenDung').insertMany(
      featuredEmployers,
      { bypassDocumentValidation: true }
    );
    console.log(`Đã thêm ${Object.keys(result.insertedIds).length} nhà tuyển dụng nổi bật thành công!`);
    
    console.log('Hoàn thành việc thêm dữ liệu!');
    
  } catch (error) {
    console.error('Lỗi khi thêm dữ liệu:', error);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('Đã đóng kết nối MongoDB');
    }
  }
}

// Chạy hàm thêm dữ liệu
seedFeaturedEmployers(); 