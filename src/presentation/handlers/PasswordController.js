const crypto = require('crypto');
const TaiKhoan = require('../models/TaiKhoan');
const { NguoiDungService } = require('../services');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const axios = require('axios').default;
const FormData = require('form-data'); // Cần cài đặt thư viện form-data

// Kiểm tra môi trường phát triển
const isDevelopment = process.env.NODE_ENV !== 'production';

// Cấu hình nodemailer để gửi mail đến Gmail thật
const transporter = nodemailer.createTransport({
    service: 'gmail',  // Sử dụng service thay vì cấu hình thủ công
    auth: {
        user: 'myjob.service.mail@gmail.com',
        pass: 'gdcx ovdy mngz nxws'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Cấu hình dự phòng nếu cấu hình trên không hoạt động
const backupTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'myjob.service.mail@gmail.com',
        pass: 'gdcx ovdy mngz nxws'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Phương án dự phòng 2: Gửi email qua API Mailgun
async function sendEmailViaMailgun(to, subject, htmlContent) {
    try {
        // Thông tin Mailgun (cần đăng ký tài khoản Mailgun để có API key và domain)
        const MAILGUN_API_KEY = 'key-xxxxxxxxxxxxxxxxxxxx'; // Thay bằng API key thật
        const MAILGUN_DOMAIN = 'sandbox-xxxxxxxxxx.mailgun.org'; // Thay bằng domain thật
        const MAILGUN_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

        // Tạo form data
        const formData = new FormData();
        formData.append('from', 'MyJob <mailgun@'+MAILGUN_DOMAIN+'>');
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('html', htmlContent);

        // Gửi request đến Mailgun API
        const response = await axios({
            method: 'post',
            url: MAILGUN_URL,
            data: formData,
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'multipart/form-data',
            },
            auth: {
                username: 'api',
                password: MAILGUN_API_KEY
            }
        });

        console.log('Email gửi thành công qua Mailgun:', response.data);
        return true;
    } catch (error) {
        console.error('Lỗi khi gửi email qua Mailgun:', error.message);
        return false;
    }
}

// Phương án dự phòng 3: Gửi email qua API EmailJS
async function sendEmailViaEmailJS(to, subject, content, resetUrl, userName) {
    try {
        // Thông tin tài khoản EmailJS
        const serviceId = 'service_default';
        const templateId = 'template_reset_password';
        const userId = 'user_XXXX'; // Cần thay bằng ID thật
        const accessToken = 'XXX'; // Cần thay bằng token thật nếu có

        // Dữ liệu email
        const data = {
            service_id: serviceId,
            template_id: templateId,
            user_id: userId,
            accessToken: accessToken,
            template_params: {
                to_email: to,
                to_name: userName,
                subject: subject,
                message: content,
                reset_link: resetUrl
            }
        };

        // Gửi request đến EmailJS API
        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
        console.log('Email gửi thành công qua EmailJS:', response.data);
        return true;
    } catch (error) {
        console.error('Lỗi khi gửi email qua EmailJS:', error.message);
        return false;
    }
}

// Lưu trữ token để đổi mật khẩu (trong một ứng dụng thực tế, đây nên được lưu trong DB)
const passwordResetTokens = {};

/**
 * MatKhauController - Điều khiển các hoạt động liên quan đến quên mật khẩu và đổi mật khẩu
 */
class MatKhauController {
    /**
     * Render trang quên mật khẩu
     */
    hienThiTrangQuenMatKhau(req, res) {
        res.render('pages/quen-mat-khau');
    }
    
    /**
     * Render trang đổi mật khẩu
     */
    hienThiTrangDoiMatKhau(req, res) {
        const { token, email } = req.query;
        
        // Kiểm tra token có hợp lệ không
        if (!token || !email || !passwordResetTokens[email] || passwordResetTokens[email].token !== token) {
            return res.render('pages/doi-mat-khau', {
                message: 'Liên kết đổi mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.',
                messageType: 'danger',
                token: '',
                email: ''
            });
        }
        
        // Kiểm tra xem token đã hết hạn chưa
        const now = new Date();
        const tokenExpiry = new Date(passwordResetTokens[email].expiry);
        
        if (now > tokenExpiry) {
            delete passwordResetTokens[email];
            return res.render('pages/doi-mat-khau', {
                message: 'Liên kết đổi mật khẩu đã hết hạn. Vui lòng yêu cầu lại.',
                messageType: 'danger',
                token: '',
                email: ''
            });
        }
        
        // Token hợp lệ, hiển thị trang đổi mật khẩu
        res.render('pages/doi-mat-khau', {
            token,
            email
        });
    }
    
    /**
     * Xử lý yêu cầu quên mật khẩu
     */
    async quenMatKhau(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.render('pages/quen-mat-khau', {
                    message: 'Vui lòng nhập địa chỉ email.',
                    messageType: 'danger'
                });
            }
            
            // Tìm người dùng theo email
            const db = mongoose.connection.db;
            const nguoiDung = await db.collection('NguoiDung').findOne({ email });
            
            if (!nguoiDung) {
                return res.render('pages/quen-mat-khau', {
                    message: 'Email này không tồn tại trong hệ thống.',
                    messageType: 'danger'
                });
            }
            
            // Tạo token để đặt lại mật khẩu
            const token = crypto.randomBytes(20).toString('hex');
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 1); // Token hết hạn sau 1 giờ
            
            // Lưu token (trong thực tế nên lưu vào DB)
            passwordResetTokens[email] = {
                token,
                expiry: expiry.toISOString()
            };
            
            // Tạo URL đặt lại mật khẩu
            const resetUrl = `${req.protocol}://${req.get('host')}/doi-mat-khau?token=${token}&email=${email}`;
            
            // Gửi email đặt lại mật khẩu
            const emailHtmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7e9d7; padding: 20px; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://i.ibb.co/hXrJvdX/my-job-logo.png" alt="MyJob Logo" style="max-width: 100px;">
                    </div>
                    <div style="background-color: white; padding: 20px; border-radius: 5px; color: #333;">
                        <h2 style="color: #7c5c2b; text-align: center;">Đặt Lại Mật Khẩu</h2>
                        <p>Xin chào ${nguoiDung.hoTen},</p>
                        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
                        <p style="text-align: center; margin: 25px 0;">
                            <a href="${resetUrl}" style="background-color: #3b6cb7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Đặt Lại Mật Khẩu</a>
                        </p>
                        <p>Hoặc bạn có thể sao chép và dán đường dẫn sau vào trình duyệt:</p>
                        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">${resetUrl}</p>
                        <p>Liên kết này sẽ hết hiệu lực sau 1 giờ.</p>
                        <p style="color: #d13438; font-weight: bold;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi ngay lập tức nếu bạn nghi ngờ có hoạt động đáng ngờ.</p>
                        <p>Trân trọng,<br>Đội ngũ MyJob</p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #777;">
                        <p>&copy; 2023 MyJob. Tất cả các quyền được bảo lưu.</p>
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                    </div>
                </div>
            `;
            
            const mailOptions = {
                from: 'MyJob <myjob.service.mail@gmail.com>',
                to: email,
                subject: 'Đặt Lại Mật Khẩu MyJob',
                html: emailHtmlContent
            };
            
            let emailSent = false;
            let emailErrorInfo = '';
            
            try {
                console.log("Đang thử gửi email với cấu hình nodemailer...");
                // Phương án 1: Gửi email với Nodemailer
                await transporter.sendMail(mailOptions);
                emailSent = true;
                console.log(`Email đặt lại mật khẩu đã được gửi đến: ${email} qua Nodemailer`);
            } catch (mainError) {
                console.error('Lỗi khi gửi email qua Nodemailer:', mainError.message);
                emailErrorInfo = `Nodemailer: ${mainError.message}`;
                
                try {
                    console.log("Đang thử gửi email với cấu hình nodemailer backup...");
                    // Phương án 2: Gửi với cấu hình backup
                    await backupTransporter.sendMail(mailOptions);
                    emailSent = true;
                    console.log(`Email đặt lại mật khẩu đã được gửi đến: ${email} qua Nodemailer backup`);
                } catch (backupError) {
                    console.error('Lỗi khi gửi email qua Nodemailer backup:', backupError.message);
                    emailErrorInfo += `, Backup: ${backupError.message}`;
                    
                    try {
                        console.log("Đang thử gửi email qua Mailgun...");
                        // Phương án 3: Gửi qua Mailgun
                        emailSent = await sendEmailViaMailgun(email, 'Đặt Lại Mật Khẩu MyJob', emailHtmlContent);
                        
                        if (emailSent) {
                            console.log(`Email đặt lại mật khẩu đã được gửi đến: ${email} qua Mailgun`);
                        } else {
                            try {
                                console.log("Đang thử gửi email qua EmailJS...");
                                // Phương án 4: Gửi qua EmailJS
                                const emailJsContent = `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấp vào liên kết để đặt lại mật khẩu.`;
                                emailSent = await sendEmailViaEmailJS(email, 'Đặt Lại Mật Khẩu MyJob', emailJsContent, resetUrl, nguoiDung.hoTen);
                                
                                if (emailSent) {
                                    console.log(`Email đặt lại mật khẩu đã được gửi đến: ${email} qua EmailJS`);
                                }
                            } catch (emailJsError) {
                                console.error('Lỗi khi gửi email qua EmailJS:', emailJsError.message);
                                emailErrorInfo += `, EmailJS: ${emailJsError.message}`;
                            }
                        }
                    } catch (mailgunError) {
                        console.error('Lỗi khi gửi email qua Mailgun:', mailgunError.message);
                        emailErrorInfo += `, Mailgun: ${mailgunError.message}`;
                        
                        try {
                            console.log("Đang thử gửi email qua EmailJS...");
                            // Phương án 4: Gửi qua EmailJS
                            const emailJsContent = `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấp vào liên kết để đặt lại mật khẩu.`;
                            emailSent = await sendEmailViaEmailJS(email, 'Đặt Lại Mật Khẩu MyJob', emailJsContent, resetUrl, nguoiDung.hoTen);
                            
                            if (emailSent) {
                                console.log(`Email đặt lại mật khẩu đã được gửi đến: ${email} qua EmailJS`);
                            }
                        } catch (emailJsError) {
                            console.error('Lỗi khi gửi email qua EmailJS:', emailJsError.message);
                            emailErrorInfo += `, EmailJS: ${emailJsError.message}`;
                        }
                    }
                }
            }
            
            // Hiển thị URL trong console để tiện kiểm thử trong môi trường phát triển
            console.log('----------------------------------------------------------');
            console.log('| THÔNG TIN ĐỔI MẬT KHẨU (CHỈ HIỂN THỊ TRONG MÔI TRƯỜNG DEV) |');
            console.log('----------------------------------------------------------');
            console.log(`Email người dùng: ${email}`);
            console.log(`Token đổi mật khẩu: ${token}`);
            console.log(`URL đổi mật khẩu: ${resetUrl}`);
            console.log('----------------------------------------------------------');
            
            if (emailSent) {
                return res.render('pages/quen-mat-khau', {
                    message: 'Email hướng dẫn đặt lại mật khẩu đã được gửi đến địa chỉ email của bạn.',
                    messageType: 'success'
                });
            } else {
                // Email không gửi được, hiển thị URL trực tiếp trong môi trường phát triển
                if (isDevelopment) {
                    return res.render('pages/quen-mat-khau', {
                        message: `Không thể gửi email do lỗi máy chủ: ${emailErrorInfo}. Bạn có thể sử dụng liên kết sau để đổi mật khẩu (chỉ hiển thị trong môi trường dev):`,
                        messageType: 'warning',
                        resetUrl: resetUrl
                    });
                } else {
                    return res.render('pages/quen-mat-khau', {
                        message: 'Đã xảy ra lỗi khi gửi email. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
                        messageType: 'danger'
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi khi xử lý yêu cầu quên mật khẩu:', error);
            return res.render('pages/quen-mat-khau', {
                message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
                messageType: 'danger'
            });
        }
    }
    
    /**
     * Xử lý đổi mật khẩu
     */
    async doiMatKhau(req, res) {
        try {
            const { token, email, password, confirmPassword } = req.body;
            
            // Kiểm tra các trường dữ liệu
            if (!token || !email || !password || !confirmPassword) {
                return res.render('pages/doi-mat-khau', {
                    message: 'Vui lòng điền đầy đủ thông tin.',
                    messageType: 'danger',
                    token,
                    email
                });
            }
            
            // Kiểm tra mật khẩu và xác nhận mật khẩu có khớp không
            if (password !== confirmPassword) {
                return res.render('pages/doi-mat-khau', {
                    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.',
                    messageType: 'danger',
                    token,
                    email
                });
            }
            
            // Kiểm tra token có hợp lệ không
            if (!passwordResetTokens[email] || passwordResetTokens[email].token !== token) {
                return res.render('pages/doi-mat-khau', {
                    message: 'Liên kết đổi mật khẩu không hợp lệ hoặc đã hết hạn.',
                    messageType: 'danger',
                    token: '',
                    email: ''
                });
            }
            
            // Kiểm tra xem token đã hết hạn chưa
            const now = new Date();
            const tokenExpiry = new Date(passwordResetTokens[email].expiry);
            
            if (now > tokenExpiry) {
                delete passwordResetTokens[email];
                return res.render('pages/doi-mat-khau', {
                    message: 'Liên kết đổi mật khẩu đã hết hạn. Vui lòng yêu cầu lại.',
                    messageType: 'danger',
                    token: '',
                    email: ''
                });
            }
            
            // Tìm người dùng theo email
            const db = mongoose.connection.db;
            const nguoiDung = await db.collection('NguoiDung').findOne({ email });
            
            if (!nguoiDung) {
                return res.render('pages/doi-mat-khau', {
                    message: 'Không tìm thấy tài khoản với email này.',
                    messageType: 'danger',
                    token,
                    email
                });
            }
            
            // Tìm tài khoản liên kết với người dùng
            const taiKhoan = await db.collection('TaiKhoan').findOne({ _id: nguoiDung.taiKhoan });
            
            if (!taiKhoan) {
                return res.render('pages/doi-mat-khau', {
                    message: 'Không tìm thấy thông tin tài khoản.',
                    messageType: 'danger',
                    token,
                    email
                });
            }
            
            // Cập nhật mật khẩu mới
            await db.collection('TaiKhoan').updateOne(
                { _id: taiKhoan._id },
                { $set: { matKhau: password } }
            );
            
            // Xóa token sau khi sử dụng
            delete passwordResetTokens[email];
            
            // Hiển thị thông báo thành công
            return res.render('pages/doi-mat-khau', {
                message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
                messageType: 'success',
                token: '',
                email: ''
            });
        } catch (error) {
            console.error('Lỗi khi đổi mật khẩu:', error);
            return res.render('pages/doi-mat-khau', {
                message: 'Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng thử lại sau.',
                messageType: 'danger',
                token: req.body.token,
                email: req.body.email
            });
        }
    }
}

module.exports = new MatKhauController(); 