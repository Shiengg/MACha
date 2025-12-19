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

/**
 * Send generic email
 */
export const sendEmail = async (to, subject, text, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: `"MACha Admin" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: htmlContent,
        });
        console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send campaign approved email
 */
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

/**
 * Send campaign rejected email
 */
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

/**
 * Verify transporter connection
 */
export const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Mail transporter is ready to send emails');
        return true;
    } catch (error) {
        console.error('❌ Mail transporter verification failed:', error.message);
        return false;
    }
};
