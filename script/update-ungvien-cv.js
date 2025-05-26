/**
 * Script thêm dữ liệu CV và thông tin ứng viên vào collection UngVien
 * Sử dụng cùng _id với collection NguoiDung để dễ tìm kiếm
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Kết nối tới MongoDB
async function connectToMongoDB() {
  try {
    console.log('Đang kết nối tới MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Kết nối MongoDB thành công!');
    return mongoose.connection.db;
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error);
    throw error;
  }
}

// Thêm dữ liệu CV cho ứng viên
async function updateUngVienData() {
  let db;
  
  try {
    // Kết nối tới MongoDB
    db = await connectToMongoDB();
    
    // Tìm tất cả người dùng có vai trò UngVien
    const ungViens = await db.collection('NguoiDung').find({ vaiTro: 'UngVien' }).toArray();
    console.log(`Tìm thấy ${ungViens.length} ứng viên trong hệ thống.`);
    
    // Lấy danh sách tất cả đơn ứng tuyển
    const donUngTuyens = await db.collection('DonUngTuyen').find({}).toArray();
    
    // Tạo bản đồ đơn ứng tuyển theo ID ứng viên
    const donByUngVien = {};
    donUngTuyens.forEach(don => {
      const ungVienId = don.ungVien.toString();
      if (!donByUngVien[ungVienId]) {
        donByUngVien[ungVienId] = [];
      }
      donByUngVien[ungVienId].push(don._id);
    });
    
    // Mảng chứa các thao tác thêm dữ liệu
    const operations = [];
    
    // Danh sách ví dụ về kỹ năng cho ứng viên
    const kyNangMau = [
      ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'MongoDB'],
      ['Java', 'Spring Boot', 'SQL', 'RESTful API', 'Microservices'],
      ['Python', 'Django', 'Flask', 'Data Analysis', 'Machine Learning'],
      ['PHP', 'Laravel', 'MySQL', 'WordPress', 'AJAX'],
      ['C#', '.NET', 'ASP.NET', 'SQL Server', 'Azure'],
      ['TypeScript', 'Angular', 'Vue.js', 'Express', 'Docker']
    ];
    
    // Danh sách ví dụ về CV
    const cvMau = [
      '/uploads/cv/example-cv-1.pdf',
      '/uploads/cv/example-cv-2.pdf',
      '/uploads/cv/example-cv-3.pdf',
      '/uploads/cv/example-cv-4.pdf',
      '/uploads/cv/example-cv-5.pdf'
    ];
    
    // Danh sách ví dụ về ảnh đại diện
    const anhMau = [
      'https://randomuser.me/api/portraits/men/1.jpg',
      'https://randomuser.me/api/portraits/women/1.jpg',
      'https://randomuser.me/api/portraits/men/2.jpg',
      'https://randomuser.me/api/portraits/women/2.jpg',
      'https://randomuser.me/api/portraits/men/3.jpg',
      'https://randomuser.me/api/portraits/women/3.jpg'
    ];
    
    // Danh sách ví dụ về địa chỉ
    const diaChiMau = [
      'Hà Nội, Việt Nam',
      'TP. Hồ Chí Minh, Việt Nam',
      'Đà Nẵng, Việt Nam',
      'Cần Thơ, Việt Nam',
      'Hải Phòng, Việt Nam',
      'Huế, Việt Nam'
    ];
    
    // Xử lý từng ứng viên
    for (const ungVien of ungViens) {
      const ungVienId = ungVien._id;
      
      // Kiểm tra xem ứng viên đã có dữ liệu trong collection UngVien chưa
      const existingUngVien = await db.collection('UngVien').findOne({ _id: ungVienId });
      
      // Nếu chưa có, thêm mới
      if (!existingUngVien) {
        // Tạo dữ liệu ngẫu nhiên cho ứng viên
        const randomIndex = Math.floor(Math.random() * kyNangMau.length);
        const randomCVIndex = Math.floor(Math.random() * cvMau.length);
        const randomAnhIndex = Math.floor(Math.random() * anhMau.length);
        const randomDiaChiIndex = Math.floor(Math.random() * diaChiMau.length);
        
        // Tạo ngày sinh ngẫu nhiên từ 22-35 tuổi
        const currentYear = new Date().getFullYear();
        const age = 22 + Math.floor(Math.random() * 14); // 22-35 tuổi
        const birthYear = currentYear - age;
        const birthMonth = 1 + Math.floor(Math.random() * 12); // 1-12
        const birthDay = 1 + Math.floor(Math.random() * 28); // 1-28 (để tránh vấn đề với tháng 2)
        const ngaySinh = new Date(birthYear, birthMonth - 1, birthDay);
        
        // Dữ liệu mới cho ứng viên
        const newUngVienData = {
          _id: ungVienId,
          diaChi: diaChiMau[randomDiaChiIndex],
          ngaySinh: ngaySinh,
          kyNang: kyNangMau[randomIndex],
          anhDaiDien: anhMau[randomAnhIndex],
          cv: cvMau[randomCVIndex],
          donUngTuyen: donByUngVien[ungVienId.toString()] || [],
          cvYeuThich: []
        };
        
        console.log(`Thêm dữ liệu mới cho ứng viên: ${ungVien.hoTen}`);
        operations.push({
          insertOne: {
            document: newUngVienData
          }
        });
      } else {
        console.log(`Ứng viên ${ungVien.hoTen} đã có dữ liệu, cập nhật donUngTuyen...`);
        // Cập nhật danh sách đơn ứng tuyển
        operations.push({
          updateOne: {
            filter: { _id: ungVienId },
            update: {
              $set: {
                donUngTuyen: donByUngVien[ungVienId.toString()] || []
              }
            }
          }
        });
      }
    }
    
    // Thực hiện các thao tác
    if (operations.length > 0) {
      const result = await db.collection('UngVien').bulkWrite(operations);
      console.log(`Kết quả thực hiện: ${JSON.stringify(result.result, null, 2)}`);
    } else {
      console.log('Không có thao tác nào để thực hiện.');
    }
    
    console.log('Hoàn thành cập nhật dữ liệu ứng viên.');
    
  } catch (error) {
    console.error('Lỗi khi cập nhật dữ liệu ứng viên:', error);
  } finally {
    // Đóng kết nối
    if (mongoose.connection) {
      console.log('Đóng kết nối MongoDB...');
      await mongoose.connection.close();
    }
  }
}

// Thực thi script
updateUngVienData()
  .then(() => {
    console.log('Script hoàn tất!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Lỗi khi thực thi script:', err);
    process.exit(1);
  });
