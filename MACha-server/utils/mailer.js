import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendEmail = async (to, subject, text, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: `"MACha Admin" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: htmlContent,
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const sendCampaignApprovedEmail = async (to, data) => {
    const { username, campaignTitle, campaignId } = data;
    const campaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;

    const subject = `🎉 Chiến dịch "${campaignTitle}" đã được phê duyệt!`;

    const text = `
Xin chào ${username},

Tin vui! Chiến dịch "${campaignTitle}" của bạn đã được phê duyệt thành công.

Chiến dịch của bạn hiện đã hoạt động và mọi người có thể bắt đầu quyên góp.

Xem chiến dịch: ${campaignUrl}

Chúc bạn gây quỹ thành công!

Trân trọng,
Đội ngũ MACha
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Chiến dịch được duyệt!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Tin vui! Chiến dịch của bạn đã được phê duyệt thành công:
                            </p>
                            
                            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">${campaignTitle}</h2>
                                <p style="color: #047857; margin: 0; font-size: 14px;">Trạng thái: <strong>Đang hoạt động</strong></p>
                            </div>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
                                Chiến dịch của bạn hiện đã được công khai và mọi người có thể bắt đầu quyên góp. Hãy chia sẻ chiến dịch để thu hút nhiều người ủng hộ hơn!
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${campaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                    Xem chiến dịch của bạn
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                Chúc bạn gây quỹ thành công! 💚
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} MACha. Tất cả quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    return await sendEmail(to, subject, text, htmlContent);
};

export const sendCampaignRejectedEmail = async (to, data) => {
    const { username, campaignTitle, reason, campaignId } = data;
    const editCampaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;

    const subject = `Chiến dịch "${campaignTitle}" chưa được phê duyệt`;

    const text = `
Xin chào ${username},

Rất tiếc, chiến dịch "${campaignTitle}" của bạn chưa được phê duyệt.

Lý do: ${reason}

Bạn có thể chỉnh sửa chiến dịch và gửi lại để xét duyệt.

Xem chiến dịch: ${editCampaignUrl}

Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.

Trân trọng,
Đội ngũ MACha
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Chiến dịch chưa được duyệt</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Rất tiếc, chiến dịch của bạn chưa được phê duyệt:
                            </p>
                            
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">${campaignTitle}</h2>
                                <p style="color: #b91c1c; margin: 0; font-size: 14px;">Trạng thái: <strong>Bị từ chối</strong></p>
                            </div>
                            
                            <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">📝 Lý do từ chối:</p>
                                <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6;">${reason}</p>
                            </div>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
                                Bạn có thể chỉnh sửa chiến dịch theo góp ý trên và gửi lại để xét duyệt. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${editCampaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                    Chỉnh sửa chiến dịch
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                Cảm ơn bạn đã sử dụng MACha 💙
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} MACha. Tất cả quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    return await sendEmail(to, subject, text, htmlContent);
};

export const verifyConnection = async () => {
    try {
        await transporter.verify();
        return true;
    } catch (error) {
        return false;
    }
};

export const sendOtpEmail = async (to, data) => {
    const { username, otp, expiresIn } = data;
  
    const subject = "🔐 Mã OTP đặt lại mật khẩu MACha";
  
    const text = `
  Xin chào ${username},
  
  Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản MACha.
  
  Mã OTP của bạn là: ${otp}
  Mã này có hiệu lực trong ${expiresIn} giây.
  
  Vui lòng không chia sẻ mã này với bất kỳ ai.
  
  Trân trọng,
  Đội ngũ MACha
    `.trim();
  
    const htmlContent = `
    <div style="background-color:#f4f6f8;padding:24px;">
      <div style="
        max-width:520px;
        margin:0 auto;
        background:#ffffff;
        border-radius:12px;
        padding:32px;
        font-family:Arial, Helvetica, sans-serif;
        color:#333;
      ">
        <h2 style="margin-top:0;color:#222;">Xin chào ${username},</h2>
  
        <p>
          Bạn vừa yêu cầu <b>đặt lại mật khẩu</b> cho tài khoản <b>MACha</b>.
        </p>
  
        <div style="
          margin:24px 0;
          padding:16px;
          text-align:center;
          background:#f0f4ff;
          border-radius:8px;
        ">
          <p style="margin:0 0 8px 0;">Mã OTP của bạn</p>
          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:6px;
            color:#1a73e8;
          ">
            ${otp}
          </div>
        </div>
  
        <p>
          Mã OTP này sẽ hết hạn sau <b>${Math.floor(expiresIn / 60)} phút</b>.
          Vui lòng <b>không chia sẻ</b> mã này cho bất kỳ ai.
        </p>
  
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
  
        <p style="font-size:14px;color:#777;">
          Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email hoặc liên hệ hỗ trợ.
        </p>
  
        <p style="margin-top:24px;">
          Trân trọng,<br/>
          <b>Đội ngũ MACha</b>
        </p>
      </div>
  
      <p style="
        text-align:center;
        font-size:12px;
        color:#aaa;
        margin-top:16px;
      ">
        © ${new Date().getFullYear()} MACha. All rights reserved.
      </p>
    </div>
    `;
  
    return await sendEmail(to, subject, text, htmlContent);
};
  
export const sendForgotPasswordEmail = async (to, data) => {
    const { username, newPassword } = data;
  
    const subject = "🔐 Mật khẩu mới của bạn";
  
    const text = `
  Xin chào ${username},
  
  Mật khẩu mới của bạn là: ${newPassword}
  
  Vui lòng đổi mật khẩu ngay sau khi đăng nhập.
  Nếu bạn không yêu cầu đặt lại mật khẩu, hãy liên hệ bộ phận hỗ trợ ngay.
    `.trim();
  
    const htmlContent = `
    <div style="background-color:#f4f6f8;padding:32px 16px;">
      <div style="
        max-width:520px;
        margin:0 auto;
        background:#ffffff;
        border-radius:12px;
        padding:32px;
        font-family:Arial, Helvetica, sans-serif;
        color:#333333;
        box-shadow:0 4px 12px rgba(0,0,0,0.05);
      ">
  
        <h2 style="margin-top:0;color:#1f2937;">
          🔐 Đặt lại mật khẩu
        </h2>
  
        <p style="font-size:14px;line-height:1.6;">
          Xin chào <strong>${username}</strong>,
        </p>
  
        <p style="font-size:14px;line-height:1.6;">
          Chúng tôi đã tạo mật khẩu mới cho tài khoản của bạn:
        </p>
  
        <div style="
          margin:20px 0;
          padding:16px;
          background:#f9fafb;
          border-radius:8px;
          text-align:center;
          font-size:18px;
          font-weight:bold;
          letter-spacing:1px;
          color:#111827;
          border:1px dashed #d1d5db;
        ">
          ${newPassword}
        </div>
  
        <p style="font-size:14px;line-height:1.6;">
          👉 <strong>Vui lòng đăng nhập và đổi mật khẩu ngay</strong> để đảm bảo an toàn cho tài khoản của bạn.
        </p>
  
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  
        <p style="font-size:12px;color:#6b7280;line-height:1.6;">
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ bộ phận hỗ trợ ngay.
          <br/>
          Email này được gửi tự động, vui lòng không trả lời.
        </p>
  
        <p style="font-size:12px;color:#9ca3af;margin-bottom:0;">
          © ${new Date().getFullYear()} Your Company. All rights reserved.
        </p>
      </div>
    </div>
    `;
  
    return await sendEmail(to, subject, text, htmlContent);
};
  
export const sendOtpSignupEmail = async (to, data) => {
    const { username, otp, expiresIn } = data;
  
    const subject = "🔐 Mã OTP đăng ký tài khoản MACha";
  
    const text = `
  Xin chào ${username},
  
  Cảm ơn bạn đã đăng ký tài khoản MACha.
  
  Mã OTP của bạn là: ${otp}
  Mã này có hiệu lực trong ${expiresIn} giây.
  
  Vui lòng không chia sẻ mã này với bất kỳ ai.
  Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.
  
  Trân trọng,
  Đội ngũ MACha
    `.trim();
  
    const htmlContent = `
    <div style="background-color:#f4f6f8;padding:32px 16px;">
      <div style="
        max-width:520px;
        margin:0 auto;
        background:#ffffff;
        border-radius:12px;
        padding:32px;
        font-family:Arial, Helvetica, sans-serif;
        color:#333333;
        box-shadow:0 4px 12px rgba(0,0,0,0.05);
      ">
  
        <h2 style="margin-top:0;color:#1f2937;">
          🔐 Xác thực đăng ký tài khoản
        </h2>
  
        <p style="font-size:14px;line-height:1.6;">
          Xin chào <strong>${username}</strong>,
        </p>
  
        <p style="font-size:14px;line-height:1.6;">
          Cảm ơn bạn đã đăng ký tài khoản <strong>MACha</strong>.
          Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá trình đăng ký.
        </p>
  
        <div style="
          margin:24px 0;
          padding:20px;
          text-align:center;
          background:#f0f9ff;
          border-radius:10px;
          border:1px dashed #38bdf8;
        ">
          <p style="margin:0 0 8px 0;font-size:14px;color:#0369a1;">
            Mã OTP của bạn
          </p>
  
          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:6px;
            color:#0284c7;
          ">
            ${otp}
          </div>
        </div>
  
        <p style="font-size:14px;line-height:1.6;">
          ⏱️ Mã OTP này sẽ hết hạn sau
          <strong>${Math.ceil(expiresIn / 60)} phút</strong>.
        </p>
  
        <p style="font-size:14px;line-height:1.6;">
          🔒 Vì lý do bảo mật, vui lòng <strong>không chia sẻ</strong> mã này với bất kỳ ai.
        </p>
  
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  
        <p style="font-size:12px;color:#6b7280;line-height:1.6;">
          Nếu bạn không thực hiện đăng ký tài khoản MACha,
          vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ.
        </p>
  
        <p style="margin-top:24px;font-size:14px;">
          Trân trọng,<br/>
          <strong>Đội ngũ MACha</strong>
        </p>
  
        <p style="font-size:12px;color:#9ca3af;margin-bottom:0;">
          © ${new Date().getFullYear()} MACha. All rights reserved.
        </p>
      </div>
    </div>
    `;
  
    return await sendEmail(to, subject, text, htmlContent);
};

export const sendKycApprovedEmail = async (to, data) => {
    const { username } = data;
  
    const subject = "Thông báo phê duyệt KYC";
  
    const text = `
  Xin chào ${username},
  
  Chúng tôi xin thông báo rằng hồ sơ xác minh danh tính (KYC) của bạn đã được phê duyệt thành công.
  
  Từ thời điểm này, bạn có thể sử dụng đầy đủ các tính năng và dịch vụ của MACha theo quy định.
  
  Nếu bạn không thực hiện yêu cầu xác minh này hoặc cần thêm thông tin, vui lòng liên hệ bộ phận hỗ trợ.
  
  Trân trọng,
  Đội ngũ MACha
    `.trim();
  
    const htmlContent = `
    <div style="background-color:#f5f7fa;padding:32px 16px;">
      <div style="
        max-width:560px;
        margin:0 auto;
        background-color:#ffffff;
        padding:40px;
        font-family:Arial, Helvetica, sans-serif;
        color:#1f2937;
        border:1px solid #e5e7eb;
      ">
  
        <h2 style="
          margin:0 0 24px 0;
          font-size:20px;
          font-weight:600;
          color:#111827;
        ">
          Thông báo phê duyệt xác minh danh tính (KYC)
        </h2>
  
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
          Kính gửi <strong>${username}</strong>,
        </p>
  
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
          Chúng tôi xin thông báo rằng hồ sơ xác minh danh tính (KYC) của Quý khách
          đã được <strong>phê duyệt thành công</strong>.
        </p>
  
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
          Kể từ thời điểm này, Quý khách có thể sử dụng đầy đủ các tính năng
          và dịch vụ của nền tảng <strong>MACha</strong> theo quy định hiện hành.
        </p>
  
        <p style="font-size:14px;line-height:1.6;margin:0 0 24px 0;">
          Trong trường hợp Quý khách không thực hiện yêu cầu xác minh này
          hoặc cần thêm thông tin hỗ trợ, vui lòng liên hệ với chúng tôi
          thông qua các kênh hỗ trợ chính thức.
        </p>
  
        <p style="font-size:14px;line-height:1.6;margin:0;">
          Trân trọng,
          <br />
          <strong>Đội ngũ MACha</strong>
        </p>
  
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
  
        <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;">
          Đây là email được gửi tự động từ hệ thống MACha.
          Vui lòng không trả lời email này.
        </p>
  
        <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:8px 0 0 0;">
          © ${new Date().getFullYear()} MACha. All rights reserved.
        </p>
  
      </div>
    </div>
    `;
  
    return await sendEmail(to, subject, text, htmlContent);
  };

export const sendCampaignRemovedEmail = async (to, data) => {
    const { username, campaignTitle, campaignId, resolutionDetails } = data;
    const campaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;

    const subject = `Chiến dịch "${campaignTitle}" đã bị hủy`;

    const text = `
Xin chào ${username},

Chúng tôi rất tiếc phải thông báo rằng chiến dịch "${campaignTitle}" của bạn đã bị hủy.

Lý do: ${resolutionDetails}

Chiến dịch của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha và đã được xem xét bởi đội ngũ quản trị.

Nếu bạn có thắc mắc hoặc muốn khiếu nại, vui lòng liên hệ với chúng tôi.

Xem chiến dịch: ${campaignUrl}

Trân trọng,
Đội ngũ MACha
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Chiến dịch đã bị hủy</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Chúng tôi rất tiếc phải thông báo rằng chiến dịch của bạn đã bị hủy:
                            </p>
                            
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">${campaignTitle}</h2>
                                <p style="color: #b91c1c; margin: 0; font-size: 14px;">Trạng thái: <strong>Đã bị hủy</strong></p>
                            </div>
                            
                            <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">📝 Lý do:</p>
                                <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6;">${resolutionDetails}</p>
                            </div>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Chiến dịch của bạn đã bị người dùng khác đánh dấu là vi phạm Tiêu chuẩn của MACha và đã được xem xét bởi đội ngũ quản trị.
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
                                Nếu bạn có thắc mắc hoặc muốn khiếu nại, vui lòng liên hệ với chúng tôi.
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${campaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                    Xem chiến dịch
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                Cảm ơn bạn đã sử dụng MACha 💙
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} MACha. Tất cả quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    return await sendEmail(to, subject, text, htmlContent);
};

export const sendWithdrawalReleasedEmail = async (to, data) => {
    const { username, campaignTitle, campaignId, withdrawalAmount } = data;
    const campaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;

    const subject = `✅ Giải ngân thành công cho chiến dịch "${campaignTitle}"`;

    const text = `
Xin chào ${username},

Tin vui! Yêu cầu giải ngân của bạn đã được xử lý thành công.

Chiến dịch: ${campaignTitle}
Số tiền giải ngân: ${withdrawalAmount.toLocaleString('vi-VN')} VND

Số tiền đã được chuyển vào tài khoản của bạn. Vui lòng kiểm tra tài khoản ngân hàng.

Xem chiến dịch: ${campaignUrl}

Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.

Trân trọng,
Đội ngũ MACha
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Giải ngân thành công!</h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                                Tin vui! Yêu cầu giải ngân của bạn đã được xử lý thành công.
                            </p>
                            
                            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">${campaignTitle}</h2>
                                <p style="color: #047857; margin: 5px 0; font-size: 14px;">Số tiền giải ngân:</p>
                                <p style="color: #065f46; margin: 0; font-size: 24px; font-weight: bold;">
                                    ${withdrawalAmount.toLocaleString('vi-VN')} VND
                                </p>
                            </div>
                            
                            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
                                Số tiền đã được chuyển vào tài khoản của bạn. Vui lòng kiểm tra tài khoản ngân hàng để xác nhận.
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${campaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                    Xem chiến dịch
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                Cảm ơn bạn đã sử dụng MACha 💚
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} MACha. Tất cả quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    return await sendEmail(to, subject, text, htmlContent);
};

export const sendRefundEmail = async (to, data) => {
    const { username, campaignTitle, campaignId, originalAmount, refundedAmount, refundRatio, remainingRefund, reason } = data;
    const campaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;
    const subject = `Hoàn tiền cho chiến dịch "${campaignTitle}"`;
    const refundPercentage = (refundRatio * 100).toFixed(2);
    const remainingPercentage = remainingRefund > 0 ? ((remainingRefund / originalAmount) * 100).toFixed(2) : 0;
    const text = `
Xin chào ${username},

Chúng tôi xin thông báo về việc hoàn tiền cho khoản đóng góp của bạn cho chiến dịch "${campaignTitle}".

Thông tin hoàn tiền:
- Số tiền đã quyên góp: ${originalAmount.toLocaleString('vi-VN')} VND
- Đã được hoàn: ${refundedAmount.toLocaleString('vi-VN')} VND (${refundPercentage}%)
${remainingRefund > 0 ? `- Đang thu hồi để hoàn tiếp: ${remainingRefund.toLocaleString('vi-VN')} VND (${remainingPercentage}%)` : ''}

Lý do: ${reason}

${remainingRefund > 0 ? 'Chúng tôi đang nỗ lực thu hồi phần tiền còn lại từ creator và sẽ hoàn tiền cho bạn ngay khi có thể.' : ''}

Xem chi tiết chiến dịch: ${campaignUrl}

Trân trọng,
Đội ngũ MACha
    `.trim();
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Hoàn tiền</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            <p style="font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0;">
                                Chúng tôi xin thông báo về việc hoàn tiền cho khoản đóng góp của bạn cho chiến dịch <strong>"${campaignTitle}"</strong>.
                            </p>
                            <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Thông tin hoàn tiền:</h3>
                                <table width="100%" cellpadding="8">
                                    <tr>
                                        <td style="color: #6b7280; width: 50%;">Số tiền đã quyên góp:</td>
                                        <td style="color: #1f2937; font-weight: 600;">${originalAmount.toLocaleString('vi-VN')} VND</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280;">Đã được hoàn:</td>
                                        <td style="color: #10b981; font-weight: 600;">${refundedAmount.toLocaleString('vi-VN')} VND (${refundPercentage}%)</td>
                                    </tr>
                                    ${remainingRefund > 0 ? `
                                    <tr>
                                        <td style="color: #6b7280;">Đang thu hồi để hoàn tiếp:</td>
                                        <td style="color: #f59e0b; font-weight: 600;">${remainingRefund.toLocaleString('vi-VN')} VND (${remainingPercentage}%)</td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    <strong>Lý do:</strong> ${reason}
                                </p>
                            </div>
                            ${remainingRefund > 0 ? `
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 20px 0;">
                                Chúng tôi đang nỗ lực thu hồi phần tiền còn lại từ creator và sẽ hoàn tiền cho bạn ngay khi có thể.
                            </p>
                            ` : ''}
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${campaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600;">
                                    Xem chi tiết chiến dịch
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
                                Trân trọng,<br>
                                <strong>Đội ngũ MACha</strong>
                            </p>
                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                            <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;">
                                Đây là email được gửi tự động từ hệ thống MACha.<br>
                                Vui lòng không trả lời email này.
                            </p>
                            <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:8px 0 0 0;">
                                © ${new Date().getFullYear()} MACha. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
    return await sendEmail(to, subject, text, htmlContent);
};

export const sendRecoveryNotificationEmail = async (to, data) => {
    const { username, campaignTitle, campaignId, amount, deadline } = data;
    const campaignUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/campaigns/${campaignId}`;
    const deadlineFormatted = new Date(deadline).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const subject = `Yêu cầu hoàn trả số tiền đã nhận từ chiến dịch "${campaignTitle}"`;
    const text = `
Xin chào ${username},

Chiến dịch "${campaignTitle}" của bạn đã bị hủy do vi phạm tiêu chuẩn cộng đồng.

Chúng tôi yêu cầu bạn hoàn trả số tiền đã nhận từ chiến dịch này:

Số tiền cần hoàn trả: ${amount.toLocaleString('vi-VN')} VND
Hạn chót: ${deadlineFormatted}

Vui lòng liên hệ với chúng tôi để thực hiện hoàn trả trong thời hạn quy định. Nếu không hoàn trả đúng hạn, chúng tôi sẽ phải áp dụng các biện pháp pháp lý cần thiết.

Xem chi tiết chiến dịch: ${campaignUrl}

Trân trọng,
Đội ngũ MACha
    `.trim();
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Yêu cầu hoàn trả</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            <p style="font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0;">
                                Chiến dịch <strong>"${campaignTitle}"</strong> của bạn đã bị hủy do vi phạm tiêu chuẩn cộng đồng.
                            </p>
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">Yêu cầu hoàn trả</h3>
                                <table width="100%" cellpadding="8">
                                    <tr>
                                        <td style="color: #6b7280; width: 40%;">Số tiền cần hoàn trả:</td>
                                        <td style="color: #dc2626; font-weight: 600; font-size: 18px;">${amount.toLocaleString('vi-VN')} VND</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280;">Hạn chót:</td>
                                        <td style="color: #991b1b; font-weight: 600;">${deadlineFormatted}</td>
                                    </tr>
                                </table>
                            </div>
                            <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    <strong>Lưu ý:</strong> Vui lòng liên hệ với chúng tôi để thực hiện hoàn trả trong thời hạn quy định. Nếu không hoàn trả đúng hạn, chúng tôi sẽ phải áp dụng các biện pháp pháp lý cần thiết.
                                </p>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${campaignUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600;">
                                    Xem chi tiết chiến dịch
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
                                Trân trọng,<br>
                                <strong>Đội ngũ MACha</strong>
                            </p>
                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                            <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;">
                                Đây là email được gửi tự động từ hệ thống MACha.<br>
                                Vui lòng không trả lời email này.
                            </p>
                            <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:8px 0 0 0;">
                                © ${new Date().getFullYear()} MACha. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
    return await sendEmail(to, subject, text, htmlContent);
};
  