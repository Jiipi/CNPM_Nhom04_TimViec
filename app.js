const express = require('express');
const app = express();

// Import routes
// Chỉ import các routes có sẵn trong thư mục
const thongBaoRoutes = require('./routes/thongBaoRoutes');
const hoSoRoutes = require('./routes/hoSoRoutes');

// Sử dụng routes
app.use('/', thongBaoRoutes);
app.use('/', hoSoRoutes);

// Đảm bảo middleware xử lý 404 là middleware CUỐI CÙNG
app.use((req, res) => {
  console.log('⚠️ 404 Not Found:', req.originalUrl);
  res.status(404).render('pages/error', {
    title: 'Không tìm thấy - Hệ Thống Tuyển Dụng',
    error: 'Không tìm thấy trang bạn yêu cầu: ' + req.originalUrl,
    user: req.session.user || null
  });
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 