const mongoose = require('mongoose');
require('dotenv').config();

// Dữ liệu công ty nổi bật
const featuredCompanies = [
  {
    tenCongTy: 'MB Bank',
    moTaCty: 'MB là ngân hàng thương mại hàng đầu Việt Nam với dịch vụ tài chính đa dạng...',
    linhVuc: 'Ngân hàng',
    soDienThoai: '1900 54 54 26',
    email: 'contact@mbbank.com.vn',
    diaChi: 'Số 21 Cát Linh, Đống Đa, Hà Nội',
    website: 'https://mbbank.com.vn',
    logo: 'https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/12/cach-xoa-tai-khoan-mb-bank-1.jpg',
    anh: 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2023/2/3/1143925/CBNV-MB.jpg',
    soNV: 15000,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedCompany: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'Sacombank',
    moTaCty: 'Sacombank là một trong những ngân hàng thương mại cổ phần hàng đầu Việt Nam với mạng lưới rộng khắp.',
    linhVuc: 'Ngân hàng',
    soDienThoai: '1900 5555 88',
    email: 'info@sacombank.com',
    diaChi: '266-268 Nam Kỳ Khởi Nghĩa, Quận 3, TP.HCM',
    website: 'https://sacombank.com.vn',
    logo: 'https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/03/e-sacombank.jpg',
    anh: 'https://rmkcdn.successfactors.com/769c99d3/607faac8-c8c2-4d22-90ef-6.jpg',
    soNV: 10000,
    diaChiCty: 'TP.HCM',
    congViecDang: [],
    isFeaturedCompany: true,
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
    logo: 'https://cdn.tgdd.vn/2020/04/GameApp/unnamed-200x200-18.png',
    anh: 'https://cdn1.nhatrangtoday.vn/images/photos/ngan-hang-acb-nha-trang-top-2.jpg',
    soNV: 12000,
    diaChiCty: 'TP.HCM',
    congViecDang: [],
    isFeaturedCompany: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Dữ liệu nhà tuyển dụng nổi bật
const featuredEmployers = [
  {
    tenCongTy: 'Pizza Hut',
    moTaCty: 'Pizza Hut là chuỗi nhà hàng pizza nổi tiếng toàn cầu với đa dạng sản phẩm và dịch vụ chất lượng cao.',
    linhVuc: 'Nhà hàng - Dịch vụ ăn uống',
    soDienThoai: '1900 1822',
    email: 'contact@pizzahut.vn',
    diaChi: 'Tầng 1, Tòa nhà TNR, 54A Nguyễn Chí Thanh, Đống Đa, Hà Nội',
    website: 'https://pizzahut.vn',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXi3PzqOfEl4op8rus9VBuwif9DUIt8Ig4tg&s',
    anh: 'https://divungtau.com/wp-content/uploads/2023/08/cua-hang-pizza-hut-1.jpg',
    soNV: 5000,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'Motorola',
    moTaCty: 'Motorola là công ty công nghệ toàn cầu chuyên sản xuất thiết bị di động và các giải pháp truyền thông.',
    linhVuc: 'Công nghệ - Viễn thông',
    soDienThoai: '024 3824 7520',
    email: 'info.vietnam@motorola.com',
    diaChi: 'Tòa nhà Keangnam, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    website: 'https://motorola.com',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Motorola_logo.svg/1200px-Motorola_logo.svg.png',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcS8vhge-IUpiAe6hGkRvdjcPCDX7HTZQ8yg&s',
    soNV: 3000,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenCongTy: 'AI Company',
    moTaCty: 'AI Company là doanh nghiệp tiên phong trong lĩnh vực trí tuệ nhân tạo, cung cấp các giải pháp AI tiên tiến.',
    linhVuc: 'Công nghệ - Trí tuệ nhân tạo',
    soDienThoai: '024 3754 9876',
    email: 'contact@ai-company.vn',
    diaChi: 'Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
    website: 'https://ai-company.vn',
    logo: 'https://www.shutterstock.com/image-vector/generate-ai-artificial-intelligence-logo-600nw-2513083117.jpg',
    anh: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqn6bZU4DQ2-UYMA3hDVwtmMwIsrM4Pcj0OA&s',
    soNV: 500,
    diaChiCty: 'Hà Nội',
    congViecDang: [],
    isFeaturedEmployer: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedCompanies() {
  let connection;
  try {
    // Kết nối MongoDB (chỉ kết nối một lần)
    connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Đã kết nối MongoDB thành công...');
    
    // Truy cập trực tiếp đến MongoDB collection
    const db = mongoose.connection.db;
    
    // Xóa dữ liệu cũ
    console.log('Đang xóa dữ liệu công ty nổi bật cũ...');
    await db.collection('NhaTuyenDung').deleteMany({ 
      $or: [
        { isFeaturedCompany: true },
        { isFeaturedEmployer: true }
      ]
    });
    
    // Thêm công ty nổi bật
    console.log('Đang thêm công ty nổi bật...');
    const companyResult = await db.collection('NhaTuyenDung').insertMany(
      featuredCompanies,
      { bypassDocumentValidation: true } 
    );
    console.log(`Đã thêm ${Object.keys(companyResult.insertedIds).length} công ty nổi bật thành công!`);
    
    // Thêm nhà tuyển dụng nổi bật
    console.log('Đang thêm nhà tuyển dụng nổi bật...');
    const employerResult = await db.collection('NhaTuyenDung').insertMany(
      featuredEmployers,
      { bypassDocumentValidation: true }
    );
    console.log(`Đã thêm ${Object.keys(employerResult.insertedIds).length} nhà tuyển dụng nổi bật thành công!`);
    
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

// Chạy hàm
seedCompanies().then(() => {
  console.log('Script đã hoàn thành');
  process.exit(0);
}).catch(err => {
  console.error('Lỗi không xử lý được:', err);
  process.exit(1);
});