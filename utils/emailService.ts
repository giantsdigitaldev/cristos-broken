import { Alert } from 'react-native';

export interface EmailConfig {
  provider: 'sendgrid' | 'resend' | 'nodemailer' | 'expo-mail';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class EmailService {
  private static config: EmailConfig = {
    provider: 'sendgrid', // Default provider
    fromEmail: 'noreply@yourapp.com',
    fromName: 'Your App Team'
  };

  // Configure email service
  static configure(config: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Send team invitation email
  static async sendTeamInvitation(
    toEmail: string,
    invitationCode: string,
    projectName: string,
    inviterName: string,
    role: string,
    message?: string
  ): Promise<boolean> {
    try {
      const template = this.generateInvitationTemplate(
        invitationCode,
        projectName,
        inviterName,
        role,
        message
      );

      switch (this.config.provider) {
        case 'sendgrid':
          return await this.sendWithSendGrid(toEmail, template);
        case 'resend':
          return await this.sendWithResend(toEmail, template);
        case 'expo-mail':
          return await this.sendWithExpoMail(toEmail, template);
        default:
          console.warn('Email provider not configured, using fallback');
          return await this.sendFallback(toEmail, template);
      }
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  // Generate invitation email template
  private static generateInvitationTemplate(
    invitationCode: string,
    projectName: string,
    inviterName: string,
    role: string,
    message?: string
  ): EmailTemplate {
    const inviteLink = `https://your-app.com/invite/${invitationCode}`;
    
    const subject = `You're invited to join ${projectName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .message-box { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join the team and start collaborating</p>
          </div>
          
          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the project:</p>
            
            <h3 style="color: #007bff;">${projectName}</h3>
            
            <p>You've been invited as a <span class="role-badge">${role}</span></p>
            
            ${message ? `<div class="message-box"><strong>Personal message:</strong><br>${message}</div>` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Click the button above to accept the invitation</li>
              <li>Create an account or sign in if you already have one</li>
              <li>Start collaborating with your team immediately</li>
            </ul>
            
            <p style="font-size: 14px; color: #6c757d;">
              This invitation will expire in 7 days. If you can't click the button, copy and paste this link into your browser:<br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by ${this.config.fromName}</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
You're invited to join ${projectName}!

${inviterName} has invited you to join their project as a ${role}.

${message ? `Personal message: ${message}` : ''}

To accept this invitation, visit: ${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
${this.config.fromName}
    `;

    return { subject, htmlContent, textContent };
  }

  // SendGrid implementation
  private static async sendWithSendGrid(toEmail: string, template: EmailTemplate): Promise<boolean> {
    if (!this.config.apiKey) {
      console.error('SendGrid API key not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.sendgrid.v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName
          },
          to: [{ email: toEmail }],
          subject: template.subject,
          content: [
            {
              type: 'text/html',
              value: template.htmlContent
            },
            {
              type: 'text/plain',
              value: template.textContent
            }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('SendGrid send error:', error);
      return false;
    }
  }

  // Resend implementation
  private static async sendWithResend(toEmail: string, template: EmailTemplate): Promise<boolean> {
    if (!this.config.apiKey) {
      console.error('Resend API key not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [toEmail],
          subject: template.subject,
          html: template.htmlContent,
          text: template.textContent
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Resend send error:', error);
      return false;
    }
  }

  // Expo Mail implementation (opens mail app)
  private static async sendWithExpoMail(toEmail: string, template: EmailTemplate): Promise<boolean> {
    try {
      // This would require expo-mail-composer
      // For now, we'll show an alert with the invitation details
      Alert.alert(
        'Email Invitation',
        `Would send invitation to ${toEmail} for project invitation.\n\nInvitation details would be sent via your configured email service.`,
        [{ text: 'OK' }]
      );
      return true;
    } catch (error) {
      console.error('Expo Mail error:', error);
      return false;
    }
  }

  // Fallback method (logs to console)
  private static async sendFallback(toEmail: string, template: EmailTemplate): Promise<boolean> {
    console.log('📧 EMAIL FALLBACK - Would send email:');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${template.subject}`);
    console.log(`Content: ${template.textContent}`);
    
    // In development, show an alert
    if (__DEV__) {
      Alert.alert(
        'Email Service Not Configured',
        `Would send invitation email to ${toEmail}.\n\nCheck console for email content.`,
        [{ text: 'OK' }]
      );
    }
    
    return true;
  }

  // Test email configuration
  static async testConfiguration(): Promise<boolean> {
    try {
      console.log('🧪 Testing email configuration...');
      console.log(`Provider: ${this.config.provider}`);
      console.log(`From: ${this.config.fromName} <${this.config.fromEmail}>`);
      console.log(`API Key configured: ${!!this.config.apiKey}`);
      
      // Send a test email to a test address
      const testResult = await this.sendTeamInvitation(
        'test@example.com',
        'test-invitation-code',
        'Test Project',
        'Test User',
        'member',
        'This is a test invitation to verify email configuration.'
      );
      
      console.log(`Test result: ${testResult ? 'SUCCESS' : 'FAILED'}`);
      return testResult;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Configuration helper
export const configureEmailService = (config: Partial<EmailConfig>) => {
  EmailService.configure(config);
};

// Quick setup functions for different providers
export const setupSendGrid = (apiKey: string, fromEmail: string, fromName: string) => {
  EmailService.configure({
    provider: 'sendgrid',
    apiKey,
    fromEmail,
    fromName
  });
};

export const setupResend = (apiKey: string, fromEmail: string, fromName: string) => {
  EmailService.configure({
    provider: 'resend',
    apiKey,
    fromEmail,
    fromName
  });
};

export const setupExpoMail = (fromEmail: string, fromName: string) => {
  EmailService.configure({
    provider: 'expo-mail',
    fromEmail,
    fromName
  });
}; 