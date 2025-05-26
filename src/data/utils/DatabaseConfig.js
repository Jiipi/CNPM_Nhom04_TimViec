const mongoose = require('mongoose');

/**
 * Kết nối đến MongoDB
 * @returns {Promise} Promise đại diện cho kết nối
 */
const connectDB = async () => {
    try {
        // Chuỗi kết nối MongoDB - có thể thay đổi theo cấu hình của bạn
        const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/timViecDB';
        
        // Thiết lập các tùy chọn kết nối
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true
        };
        
        // Kết nối đến MongoDB
        const conn = await mongoose.connect(connectionString, options);
        
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Thoát ứng dụng nếu không thể kết nối
    }
};

module.exports = connectDB; 