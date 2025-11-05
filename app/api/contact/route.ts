import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, phone, service, budget, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Send email to you (business email)
    const businessEmailResult = await resend.emails.send({
      from: 'Hbee Digital <onboarding@resend.dev>',
      to: [process.env.CONTACT_EMAIL!],
      subject: `New Project Inquiry: ${name}`,
      reply_to: email,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007BFF, #00BFFF); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #007BFF; }
            .message { background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #007BFF; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 New Project Inquiry</h1>
              <p>Hbee Digital Enterprise</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Name:</span> ${name}
              </div>
              <div class="field">
                <span class="label">Email:</span> <a href="mailto:${email}">${email}</a>
              </div>
              <div class="field">
                <span class="label">Phone:</span> ${phone || 'Not provided'}
              </div>
              <div class="field">
                <span class="label">Service Needed:</span> ${service}
              </div>
              <div class="field">
                <span class="label">Budget Range:</span> ${budget}
              </div>
              <div class="field">
                <span class="label">Project Details:</span>
                <div class="message">${message.replace(/\n/g, '<br>')}</div>
              </div>
              <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 5px;">
                <strong>💡 Quick Action:</strong> 
                <a href="mailto:${email}?subject=Re: Your Project Inquiry&body=Hi ${name.split(' ')[0]}," style="color: #007BFF;">Reply to ${name}</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (businessEmailResult.error) {
      console.error('Business email error:', businessEmailResult.error);
      // Don't return error yet, try to send confirmation email first
    }

    // Send confirmation email to the user (this should work independently)
    const confirmationEmailResult = await resend.emails.send({
      from: 'Hbee Digital <onboarding@resend.dev>',
      to: [email],
      subject: 'We Received Your Project Inquiry!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007BFF, #00BFFF); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You, ${name}!</h1>
              <p>We've received your project inquiry</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Thank you for reaching out to Hbee Digital Enterprise! We've received your project details and will review them carefully.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>We'll review your project requirements</li>
                <li>Our team will contact you within 24 hours</li>
                <li>We'll schedule a free consultation call</li>
                <li>Provide you with a detailed proposal</li>
              </ul>
              <p>If you have any immediate questions, feel free to reply to this email.</p>
              <p>Best regards,<br><strong>The Hbee Digital Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (confirmationEmailResult.error) {
      console.error('Confirmation email error:', confirmationEmailResult.error);
      // Even if confirmation fails, we still consider it a success since the main email was sent
    }

    // Return success even if confirmation email fails
    return NextResponse.json({ 
      success: true, 
      businessEmailSent: !businessEmailResult.error,
      confirmationEmailSent: !confirmationEmailResult.error
    });

  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}