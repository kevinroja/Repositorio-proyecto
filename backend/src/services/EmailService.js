const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kika Vargas <onboarding@resend.dev>';

class EmailService {

    static async enviarBienvenida({ nombre, email, password, rolNombre }) {
        const asunto = 'Bienvenido a Kika — Acceso al sistema de gestión de costos';

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1714;">
          <div style="background:#0e1b25; padding: 20px; text-align:center;">
            <h1 style="color:#EFECE4; font-size: 20px; margin:0;">KIKA VARGAS</h1>
            <p style="color:#D4CFC4; font-size: 12px; margin:4px 0 0;">Sistema de Gestión de Costos</p>
          </div>
          <div style="padding: 24px; background:#fff;">
            <p>Hola <b>${nombre}</b>,</p>
            <p>Se ha creado una cuenta para ti en el sistema interno de gestión de costos de Kika Vargas, con el rol <b>${rolNombre}</b>.</p>
            <div style="background:#EFECE4; border:1px solid #D4CFC4; border-radius:8px; padding:16px; margin:20px 0;">
              <p style="margin:0 0 8px;"><b>Correo de acceso:</b> ${email}</p>
              <p style="margin:0;"><b>Contraseña temporal:</b> <code style="background:#fff; padding:2px 6px; border-radius:4px; border:1px solid #D4CFC4;">${password}</code></p>
            </div>
            <p style="font-size:13px; color:#5C574F;">Por seguridad, te recomendamos cambiar esta contraseña la primera vez que ingreses al sistema.</p>
            <hr style="border:none; border-top:1px solid #D4CFC4; margin:24px 0;">
            <h3 style="font-size:14px; color:#0e1b25;">Condiciones de uso y confidencialidad</h3>
            <ul style="font-size:13px; color:#5C574F; line-height:1.6; padding-left:18px;">
              <li>Esta cuenta es de uso personal e intransferible. No compartas tu contraseña con ningún tercero.</li>
              <li>Toda la información de productos, costos, materiales y precios es confidencial y de uso exclusivamente interno de Kika Vargas.</li>
              <li>Queda prohibido divulgar, copiar o compartir dicha información con personas externas a la organización.</li>
              <li>El incumplimiento podrá derivar en el bloqueo inmediato de tu acceso y las acciones disciplinarias o legales que correspondan.</li>
              <li>Si sospechas que tu contraseña fue comprometida, notifica inmediatamente al administrador del sistema.</li>
            </ul>
            <p style="font-size:12px; color:#999; margin-top:24px;">Este es un correo automático del sistema Kika. Si no esperabas este correo, contacta al administrador.</p>
          </div>
        </div>`;

        try {
            const result = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: asunto,
                html,
            });
            return result;
        } catch (err) {
            console.error('[EmailService] Error enviando correo de bienvenida:', err);
            return null;
        }
    }
}

module.exports = EmailService;
