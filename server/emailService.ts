import { Resend } from 'resend';

// Email provider interface for flexibility
interface EmailProvider {
  sendEmail(params: EmailParams): Promise<boolean>;
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'ses';
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

// Resend provider implementation
class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (error) {
        console.error('Resend email error:', error);
        return false;
      }

      console.log('Email sent successfully:', data?.id);
      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      return false;
    }
  }
}

// SendGrid provider implementation (for future use)
class SendGridProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      // Implementation would use @sendgrid/mail here
      console.log('SendGrid provider not implemented yet');
      return false;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }
}

// Main email service
class EmailService {
  private provider: EmailProvider | null = null;
  private config: EmailConfig | null = null;

  async initialize(config: EmailConfig): Promise<void> {
    this.config = config;

    switch (config.provider) {
      case 'resend':
        this.provider = new ResendProvider(config.apiKey);
        break;
      case 'sendgrid':
        this.provider = new SendGridProvider(config.apiKey);
        break;
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async sendSubscriptionExpiryReminder(
    companyEmail: string,
    companyName: string,
    daysRemaining: number,
    planName: string,
    expirationDate: string
  ): Promise<boolean> {
    if (!this.provider || !this.config) {
      console.error('Email service not initialized');
      return false;
    }

    const subject = `Recordatorio: Tu suscripción VetGroom expira en ${daysRemaining} días`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio de Suscripción - VetGroom</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .expiry-info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 VetGroom</h1>
            <h2>Recordatorio de Suscripción</h2>
          </div>
          
          <div class="content">
            <h3>Hola ${companyName},</h3>
            
            <div class="warning">
              <strong>⚠️ Tu suscripción está por expirar</strong>
            </div>
            
            <p>Te escribimos para recordarte que tu suscripción al plan <strong>${planName}</strong> expirará pronto.</p>
            
            <div class="expiry-info">
              <h4>Detalles de tu suscripción:</h4>
              <ul>
                <li><strong>Plan actual:</strong> ${planName}</li>
                <li><strong>Días restantes:</strong> ${daysRemaining} días</li>
                <li><strong>Fecha de expiración:</strong> ${new Date(expirationDate).toLocaleDateString('es-MX', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</li>
              </ul>
            </div>
            
            <p><strong>¿Qué pasará si no renuevas?</strong></p>
            <ul>
              <li>Perderás acceso a todas tus clínicas veterinarias (VetSites)</li>
              <li>No podrás gestionar citas ni facturación</li>
              <li>Tus datos se mantendrán seguros, pero inaccesibles</li>
            </ul>
            
            <p><strong>Para renovar tu suscripción:</strong></p>
            <ol>
              <li>Contacta a nuestro equipo de soporte</li>
              <li>O responde a este correo para recibir asistencia personalizada</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="mailto:soporte@vetgroom.com?subject=Renovación de Suscripción - ${companyName}" class="button">
                Renovar Suscripción
              </a>
            </div>
            
            <p>¿Tienes preguntas? Nuestro equipo está aquí para ayudarte. Responde a este correo o contacta a nuestro soporte.</p>
            
            <p>Gracias por confiar en VetGroom para la gestión de tus clínicas veterinarias.</p>
            
            <p>Saludos cordiales,<br>
            <strong>El equipo de VetGroom</strong></p>
          </div>
          
          <div class="footer">
            <p>VetGroom - Sistema de Gestión Veterinaria</p>
            <p>Este es un correo automático. Si necesitas ayuda, contacta: soporte@vetgroom.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textVersion = `
VetGroom - Recordatorio de Suscripción

Hola ${companyName},

Tu suscripción al plan ${planName} expirará en ${daysRemaining} días.

Detalles:
- Plan: ${planName}
- Días restantes: ${daysRemaining}
- Fecha de expiración: ${new Date(expirationDate).toLocaleDateString('es-MX')}

Para renovar, contacta a: soporte@vetgroom.com

Gracias,
El equipo de VetGroom
    `;

    return this.provider.sendEmail({
      to: companyEmail,
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      subject,
      html,
      text: textVersion,
    });
  }

  async sendSubscriptionExpiredNotification(
    companyEmail: string,
    companyName: string,
    planName: string,
    expirationDate: string
  ): Promise<boolean> {
    if (!this.provider || !this.config) {
      console.error('Email service not initialized');
      return false;
    }

    const subject = `⚠️ Tu suscripción VetGroom ha expirado - Acción requerida`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suscripción Expirada - VetGroom</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .expired { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 VetGroom</h1>
            <h2>Suscripción Expirada</h2>
          </div>
          
          <div class="content">
            <h3>Hola ${companyName},</h3>
            
            <div class="expired">
              <strong>🚨 Tu suscripción ha expirado</strong>
            </div>
            
            <p>Tu suscripción al plan <strong>${planName}</strong> expiró el ${new Date(expirationDate).toLocaleDateString('es-MX')}.</p>
            
            <p><strong>Estado actual:</strong></p>
            <ul>
              <li>❌ Acceso a VetSites bloqueado</li>
              <li>❌ Gestión de citas suspendida</li>
              <li>❌ Sistema de facturación inactivo</li>
              <li>✅ Tus datos permanecen seguros</li>
            </ul>
            
            <p><strong>Para reactivar tu servicio inmediatamente:</strong></p>
            
            <div style="text-align: center;">
              <a href="mailto:soporte@vetgroom.com?subject=URGENTE - Reactivación de Suscripción - ${companyName}" class="button">
                Reactivar Ahora
              </a>
            </div>
            
            <p>Nuestro equipo procesará tu renovación en menos de 2 horas hábiles.</p>
            
            <p><strong>El equipo de VetGroom</strong></p>
          </div>
          
          <div class="footer">
            <p>VetGroom - Sistema de Gestión Veterinaria</p>
            <p>Soporte urgente: soporte@vetgroom.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.provider.sendEmail({
      to: companyEmail,
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      subject,
      html,
    });
  }

  async sendVanillaTenantCredentials(contactEmail: string, companyName: string, tenantId: string, adminCredentials: { email: string; password: string; loginUrl: string }) {
    const subject = `🎉 ¡Bienvenido a VetGroom! - Credenciales de Acceso para ${companyName}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .welcome-icon { font-size: 48px; margin-bottom: 15px; }
        .btn { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .credentials-box { background-color: #f0f9ff; border: 2px solid #0ea5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .credential-item { background-color: #fff; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #059669; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
        .security-note { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="welcome-icon">🎉</div>
          <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a VetGroom!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Su cuenta profesional está lista</p>
        </div>
        
        <div class="content">
          <h2>¡Estimado/a equipo de ${companyName}!</h2>
          
          <p>¡Excelentes noticias! Su solicitud de upgrade desde la cuenta demo ha sido procesada exitosamente. Su nueva cuenta profesional de VetGroom está lista para usar.</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #0ea5e9;">🔐 Credenciales de Acceso Administrativo</h3>
            
            <div class="credential-item">
              <strong>🌐 URL de Acceso:</strong><br>
              <a href="${adminCredentials.loginUrl}" style="color: #059669; font-weight: bold;">${adminCredentials.loginUrl}</a>
            </div>
            
            <div class="credential-item">
              <strong>📧 Email de Administrador:</strong><br>
              <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${adminCredentials.email}</code>
            </div>
            
            <div class="credential-item">
              <strong>🔑 Contraseña Temporal:</strong><br>
              <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${adminCredentials.password}</code>
            </div>
          </div>
          
          <div class="security-note">
            <p><strong>🛡️ Importante - Seguridad:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Cambie la contraseña temporal inmediatamente después del primer login</li>
              <li>No comparta estas credenciales por email o mensajes</li>
              <li>Configure usuarios adicionales desde el panel de administración</li>
            </ul>
          </div>
          
          <h3>🚀 Próximos Pasos:</h3>
          <ol>
            <li>Ingrese al sistema usando las credenciales proporcionadas</li>
            <li>Cambie la contraseña del administrador</li>
            <li>Configure los usuarios de su equipo</li>
            <li>Migre los datos desde su cuenta demo (si aplica)</li>
            <li>Personalice la configuración de su clínica</li>
          </ol>
          
          <div style="text-align: center;">
            <a href="${adminCredentials.loginUrl}" class="btn">🚀 Acceder al Sistema</a>
          </div>
          
          <h3>💎 Funciones de su Plan:</h3>
          <ul>
            <li>✅ Sistema completo de gestión veterinaria</li>
            <li>✅ Gestión de citas y calendario</li>
            <li>✅ Historiales médicos completos</li>
            <li>✅ Sistema de facturación</li>
            <li>✅ Reportes y análisis</li>
            <li>✅ Soporte técnico prioritario</li>
          </ul>
          
          <p><strong>🆘 ¿Necesita ayuda?</strong><br>
          Nuestro equipo de soporte está disponible para ayudarle con la configuración inicial y migración de datos.</p>
          
          <p>¡Gracias por confiar en VetGroom para la gestión de su clínica veterinaria!</p>
        </div>
        
        <div class="footer">
          <p>© 2024 VetGroom - Sistema de Gestión Veterinaria</p>
          <p>Tenant ID: ${tenantId} | Este correo contiene información confidencial</p>
        </div>
      </div>
    </body>
    </html>
    `;

    if (!this.provider || !this.config) {
      console.error('Email service not properly configured');
      return false;
    }

    return this.provider.sendEmail({
      to: contactEmail,
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      subject,
      html,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();