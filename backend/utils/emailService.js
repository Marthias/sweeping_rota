const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Create transporter with Gmail
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Optional: Add timeout and connection settings
            pool: true,
            maxConnections: 1,
            rateDelta: 1000,
            rateLimit: 5
        });

        // Verify connection on startup
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service ready!');
        } catch (error) {
            console.error('❌ Email service error:', error.message);
            console.log('💡 Please check your EMAIL_USER and EMAIL_PASS in .env');
        }
    }

    // Send sweeping reminder email
    async sendSweepingReminder(sweeper, date) {
        try {
            const appUrl = process.env.APP_URL || 'https://sweepingrota-production.up.railway.app';
            
            const mailOptions = {
                from: `"Sweeping Rota" <${process.env.EMAIL_USER}>`,
                to: sweeper.email,
                subject: '🧹 Time to Sweep the Room!',
                html: this.getSweepingEmailTemplate(sweeper, date, appUrl),
                text: this.getSweepingEmailText(sweeper, date, appUrl)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${sweeper.email} (${info.messageId})`);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error('❌ Email sending failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Send welcome email when user registers
    async sendWelcomeEmail(user) {
        try {
            const appUrl = process.env.APP_URL || 'https://sweepingrota-production.up.railway.app';
            
            const mailOptions = {
                from: `"Sweeping Rota" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: '🎉 Welcome to Sweeping Rota!',
                html: this.getWelcomeEmailTemplate(user, appUrl),
                text: this.getWelcomeEmailText(user, appUrl)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Welcome email sent to ${user.email}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Welcome email failed:', error.message);
            return { success: false };
        }
    }

    // Send swap notification
    async sendSwapNotification(swapRequest) {
        try {
            const appUrl = process.env.APP_URL || 'https://sweepingrota-production.up.railway.app';
            
            const mailOptions = {
                from: `"Sweeping Rota" <${process.env.EMAIL_USER}>`,
                to: swapRequest.targetEmail,
                subject: '🔄 Sweeping Swap Request',
                html: this.getSwapEmailTemplate(swapRequest, appUrl),
                text: this.getSwapEmailText(swapRequest, appUrl)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Swap email sent to ${swapRequest.targetEmail}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Swap email failed:', error.message);
            return { success: false };
        }
    }

    // HTML Email Templates
    getSweepingEmailTemplate(sweeper, date, appUrl) {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sweeping Reminder</title>
            </head>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
                <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #667eea;">
                        <h1 style="color: #667eea; margin: 0;">🧹 Sweeping Rota</h1>
                        <p style="color: #888; margin: 5px 0 0;">Room Cleaning Reminder</p>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 20px 0;">
                        <h2 style="color: #333; margin-top: 0;">Good morning ${sweeper.name}! 👋</h2>
                        
                        <p style="font-size: 1.1rem;">
                            It's <strong style="color: #667eea;">your day</strong> to sweep the room!
                        </p>
                        
                        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin: 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                            <p style="margin: 5px 0 0;"><strong>👤 Assigned to:</strong> ${sweeper.name}</p>
                        </div>

                        <p style="color: #666;">
                            Please sweep the room and mark it as done using the button below:
                        </p>

                        <!-- Action Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);">
                                ✅ Mark as Swept
                            </a>
                        </div>

                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;">
                                <strong>💡 Tip:</strong> If you can't sweep today, you can swap with a roommate on the app.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 0.9rem;">
                        <p style="margin: 0;">
                            Need to change your email preferences? 
                            <a href="${appUrl}" style="color: #667eea;">Update settings</a>
                        </p>
                        <p style="margin: 5px 0 0;">
                            Made with ❤️ by OTrace
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getSweepingEmailText(sweeper, date, appUrl) {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        return `
            🧹 Sweeping Reminder

            Good morning ${sweeper.name}!

            It's your day to sweep the room.

            📅 Date: ${formattedDate}
            👤 Assigned to: ${sweeper.name}

            Please mark as swept when done:
            ${appUrl}

            If you can't sweep today, swap with a roommate on the app.

            🏠 Made with ❤️ by your roommates
        `;
    }

    // Welcome Email Templates
    getWelcomeEmailTemplate(user, appUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Sweeping Rota</title>
            </head>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
                <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #28a745;">
                        <h1 style="color: #28a745; margin: 0;">🎉 Welcome!</h1>
                        <p style="color: #888; margin: 5px 0 0;">Sweeping Rota</p>
                    </div>

                    <div style="padding: 20px 0;">
                        <h2>Hi ${user.name}! 👋</h2>
                        <p>Welcome to the room's sweeping rota system!</p>
                        
                        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <p style="margin: 0; color: #155724;">
                                <strong>✅ You're all set!</strong><br>
                                You'll receive a reminder email on your sweeping days.
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appUrl}" style="display: inline-block; background: #28a745; color: white; padding: 14px 35px; text-decoration: none; border-radius: 50px; font-weight: bold;">
                                🧹 Go to Dashboard
                            </a>
                        </div>
                    </div>

                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 0.9rem;">
                        <p style="margin: 0;">🏠 Made with ❤️ by your roommates</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getWelcomeEmailText(user, appUrl) {
        return `
            🎉 Welcome to Sweeping Rota!

            Hi ${user.name}!

            Welcome to the room's sweeping rota system!

            ✅ You're all set!
            You'll receive a reminder email on your sweeping days.

            Go to Dashboard: ${appUrl}

            🏠 Made with ❤️ by OTrace
        `;
    }

    // Swap Email Templates
    getSwapEmailTemplate(swapRequest, appUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Swap Request</title>
            </head>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
                <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ffc107;">
                        <h1 style="color: #ffc107; margin: 0;">🔄 Swap Request</h1>
                    </div>

                    <div style="padding: 20px 0;">
                        <p><strong>${swapRequest.fromName}</strong> wants to swap sweeping days with you!</p>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;">
                                📅 Their day: ${swapRequest.fromDate}<br>
                                📅 Your day: ${swapRequest.toDate}
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appUrl}" style="display: inline-block; background: #ffc107; color: #333; padding: 14px 35px; text-decoration: none; border-radius: 50px; font-weight: bold;">
                                🔄 Respond to Swap
                            </a>
                        </div>
                    </div>

                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 0.9rem;">
                        <p style="margin: 0;">Made with ❤️ by OTrace</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getSwapEmailText(swapRequest, appUrl) {
        return `
            🔄 Swap Request

            ${swapRequest.fromName} wants to swap sweeping days with you!

            📅 Their day: ${swapRequest.fromDate}
            📅 Your day: ${swapRequest.toDate}

            Respond to swap: ${appUrl}

            Made with ❤️ by Otrace
        `;
    }
}

module.exports = EmailService;