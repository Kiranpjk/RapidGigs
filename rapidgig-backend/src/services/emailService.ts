import pool from '../config/database';
import nodemailer from 'nodemailer';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  
  /**
   * Initialize email transporter
   */
  static async initialize() {
    try {
      // Configure based on environment
      if (process.env.NODE_ENV === 'production') {
        // Production email service (e.g., SendGrid, AWS SES, etc.)
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
      } else {
        // Development - use Ethereal Email for testing
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('📧 Email service initialized with test account:', testAccount.user);
      }
      
      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.transporter = null;
    }
  }
  
  /**
   * Send email using template
   */
  static async sendTemplateEmail(
    toEmail: string,
    toName: string,
    templateName: string,
    templateData: Record<string, any>
  ): Promise<void> {
    try {
      // Get email template
      const templateQuery = 'SELECT * FROM email_templates WHERE name = $1';
      const templateResult = await pool.query(templateQuery, [templateName]);
      
      if (templateResult.rows.length === 0) {
        throw new Error(`Email template '${templateName}' not found`);
      }
      
      const template = templateResult.rows[0];
      
      // Replace template variables
      let subject = template.subject;
      let htmlContent = template.html_content;
      let textContent = template.text_content;
      
      for (const [key, value] of Object.entries(templateData)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
      }
      
      // Queue email for sending
      await this.queueEmail({
        toEmail,
        toName,
        subject,
        htmlContent,
        textContent,
        templateName,
        templateData
      });
      
    } catch (error) {
      console.error('Error sending template email:', error);
      throw error;
    }
  }
  
  /**
   * Send plain email
   */
  static async sendEmail(
    toEmail: string,
    toName: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<void> {
    await this.queueEmail({
      toEmail,
      toName,
      subject,
      htmlContent,
      textContent
    });
  }
  
  /**
   * Queue email for reliable delivery
   */
  private static async queueEmail(emailData: {
    toEmail: string;
    toName?: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    templateName?: string;
    templateData?: Record<string, any>;
  }): Promise<void> {
    const query = `
      INSERT INTO email_queue (
        to_email, to_name, subject, html_content, text_content, 
        template_name, template_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await pool.query(query, [
      emailData.toEmail,
      emailData.toName,
      emailData.subject,
      emailData.htmlContent,
      emailData.textContent,
      emailData.templateName,
      emailData.templateData ? JSON.stringify(emailData.templateData) : null
    ]);
    
    // Process queue immediately in development
    if (process.env.NODE_ENV !== 'production') {
      setTimeout(() => this.processEmailQueue(), 1000);
    }
  }
  
  /**
   * Process email queue
   */
  static async processEmailQueue(): Promise<void> {
    if (!this.transporter) {
      console.log('Email transporter not initialized, skipping queue processing');
      return;
    }
    
    try {
      // Get pending emails
      const query = `
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
          AND scheduled_at <= NOW()
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 10
      `;
      
      const result = await pool.query(query);
      const emails = result.rows;
      
      for (const email of emails) {
        try {
          await this.sendQueuedEmail(email);
        } catch (error) {
          console.error(`Failed to send email ${email.id}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }
  
  /**
   * Send a queued email
   */
  private static async sendQueuedEmail(email: any): Promise<void> {
    try {
      // Update attempts
      await pool.query(
        'UPDATE email_queue SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1',
        [email.id]
      );
      
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'RapidGig',
          address: process.env.EMAIL_FROM_ADDRESS || 'noreply@rapidgig.com'
        },
        to: {
          name: email.to_name,
          address: email.to_email
        },
        subject: email.subject,
        html: email.html_content,
        text: email.text_content
      };
      
      const info = await this.transporter!.sendMail(mailOptions);
      
      // Mark as sent
      await pool.query(
        'UPDATE email_queue SET status = $1, sent_at = NOW(), updated_at = NOW() WHERE id = $2',
        ['sent', email.id]
      );
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email sent:', nodemailer.getTestMessageUrl(info));
      }
      
    } catch (error) {
      // Mark as failed or retry
      const status = email.attempts >= email.max_attempts ? 'failed' : 'retry';
      
      await pool.query(
        'UPDATE email_queue SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
        [status, error.message, email.id]
      );
      
      throw error;
    }
  }
  
  /**
   * Get email template
   */
  static async getEmailTemplate(name: string): Promise<any> {
    const query = 'SELECT * FROM email_templates WHERE name = $1';
    const result = await pool.query(query, [name]);
    return result.rows[0] || null;
  }
  
  /**
   * Create or update email template
   */
  static async upsertEmailTemplate(
    name: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    variables: string[] = []
  ): Promise<void> {
    const query = `
      INSERT INTO email_templates (name, subject, html_content, text_content, variables)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) 
      DO UPDATE SET 
        subject = $2,
        html_content = $3,
        text_content = $4,
        variables = $5,
        updated_at = NOW()
    `;
    
    await pool.query(query, [name, subject, htmlContent, textContent, variables]);
  }
  
  /**
   * Get email queue statistics
   */
  static async getEmailStats(): Promise<any> {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
      FROM email_queue
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
  
  /**
   * Clean up old email queue entries
   */
  static async cleanupEmailQueue(daysOld: number = 30): Promise<void> {
    const query = `
      DELETE FROM email_queue 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND status IN ('sent', 'failed')
    `;
    
    const result = await pool.query(query);
    console.log(`Cleaned up ${result.rowCount} old email queue entries`);
  }
  
  /**
   * Start email queue processor (for production)
   */
  static startEmailProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processEmailQueue();
    }, 30000);
    
    console.log('📧 Email queue processor started');
  }
}