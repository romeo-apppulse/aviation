import nodemailer from 'nodemailer';
import type { User } from '@shared/schema';

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email', // Free test SMTP
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '', // Will use Ethereal test account if not provided
    pass: process.env.SMTP_PASS || '', // Will use Ethereal test account if not provided
  },
};

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface NotificationEmailData {
  user: User;
  title: string;
  message: string;
  actionUrl?: string;
  type: 'payment_due' | 'maintenance_reminder' | 'lease_expiry' | 'system_update' | 'general';
}

class EmailService {
  private transporter!: nodemailer.Transporter;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // If no SMTP credentials provided, create test account
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('No SMTP credentials found, creating test account...');
        const testAccount = await nodemailer.createTestAccount();
        EMAIL_CONFIG.auth.user = testAccount.user;
        EMAIL_CONFIG.auth.pass = testAccount.pass;
        console.log('Test email account created:', testAccount.user);
        console.log('Preview emails at: https://ethereal.email/login');
      }

      this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
      
      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private generateEmailTemplate(data: NotificationEmailData): EmailTemplate {
    const { user, title, message, actionUrl, type } = data;
    
    const logoUrl = 'https://via.placeholder.com/200x60/3498db/ffffff?text=Aviation+Ape';
    const companyName = 'Aviation Ape Manager';
    
    // Color scheme based on notification type
    const colors = {
      payment_due: '#e74c3c',
      maintenance_reminder: '#f39c12',
      lease_expiry: '#e67e22',
      system_update: '#3498db',
      general: '#2c3e50'
    };
    
    const primaryColor = colors[type] || colors.general;
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${primaryColor}; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .alert { padding: 15px; border-radius: 4px; margin: 20px 0; }
          .alert-${type} { background: ${primaryColor}20; border-left: 4px solid ${primaryColor}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${companyName}</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName || 'User'},</h2>
            
            <div class="alert alert-${type}">
              <strong>${title}</strong>
            </div>
            
            <p>${message}</p>
            
            ${actionUrl ? `<a href="${actionUrl}" class="button">View Details</a>` : ''}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p><strong>Need Help?</strong></p>
            <p>Contact our support team:</p>
            <ul>
              <li>Phone: <a href="tel:1-800-237-6532">1-800-AERO-LEASE (1-800-237-6532)</a></li>
              <li>Emergency: <a href="tel:1-800-237-6911">1-800-AERO-911</a></li>
              <li>Email: support@aerolease.com</li>
            </ul>
          </div>
          <div class="footer">
            <p>${companyName} - Aircraft Management System</p>
            <p>Miami Office: 1234 Aviation Way, Miami, FL 33101</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${companyName}
      
      Hello ${user.firstName || 'User'},
      
      ${title}
      
      ${message}
      
      ${actionUrl ? `View Details: ${actionUrl}` : ''}
      
      Need Help?
      Phone: 1-800-AERO-LEASE (1-800-237-6532)
      Emergency: 1-800-AERO-911
      Email: support@aerolease.com
      
      ${companyName} - Aircraft Management System
      Miami Office: 1234 Aviation Way, Miami, FL 33101
      
      This is an automated notification. Please do not reply to this email.
    `;
    
    return { subject: title, html, text };
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('Email service not configured');
      return false;
    }

    if (!data.user.email) {
      console.error('User email not provided');
      return false;
    }

    try {
      const template = this.generateEmailTemplate(data);
      
      const mailOptions = {
        from: `"AeroLease Manager" <${EMAIL_CONFIG.auth.user}>`,
        to: data.user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', info.messageId);
      
      // Log preview URL for test accounts
      if (nodemailer.getTestMessageUrl(info)) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendBulkNotifications(users: User[], notification: Omit<NotificationEmailData, 'user'>): Promise<number> {
    let successCount = 0;
    
    for (const user of users) {
      const success = await this.sendNotificationEmail({
        user,
        ...notification
      });
      
      if (success) {
        successCount++;
      }
      
      // Small delay to avoid overwhelming the SMTP server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Sent ${successCount}/${users.length} notification emails`);
    return successCount;
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types
export type { NotificationEmailData };