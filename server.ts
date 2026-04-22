import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  app.use(express.json());

  // API Routes
  app.post('/api/ai/generate', async (req, res) => {
    const { prompt, systemInstruction } = req.body;
    
    if (!ai) {
      return res.status(503).json({ error: 'Gemini AI not configured on server' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini error:', error);
      res.status(500).json({ error: error.message || 'Error generating AI response' });
    }
  });

// Notificar al médico que fue asignado a una guardia
  app.post('/api/notify-assignment', async (req, res) => {
    const { doctorEmail, doctorName, shiftData } = req.body;
    if (!resend) return res.json({ success: true });
    try {
      await resend.emails.send({
        from: 'ABK Asistencial <notifications@resend.dev>',
        to: [doctorEmail],
        subject: `¡Te asignaron a una guardia! — ABK Asistencial`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://ivkklkvhfmxdvyqzyqvw.supabase.co/storage/v1/object/public/assets/Logo_de_Abk.png" alt="ABK Asistencial" style="height: 64px; width: 64px; object-fit: contain;" />
              <p style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 12px;">ABK Asistencial</p>
            </div>
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 12px;">¡Felicitaciones, ${doctorName}!</h2>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Te asignaron a una guardia. Estos son los detalles:</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 6px 0;"><strong>Institución:</strong> ${shiftData.clinic_name}</p>
              <p style="margin: 6px 0;"><strong>Especialidad:</strong> ${shiftData.specialty}</p>
              <p style="margin: 6px 0;"><strong>Fecha:</strong> ${shiftData.date}</p>
              <p style="margin: 6px 0;"><strong>Horario:</strong> ${shiftData.start_time} - ${shiftData.end_time}</p>
              <p style="margin: 6px 0;"><strong>Ubicación:</strong> ${shiftData.location}</p>
              <p style="margin: 6px 0;"><strong>Honorarios:</strong> $${shiftData.price.toLocaleString('es-AR')}</p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://abk-asistencial.vercel.app" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                Ver mi guardia
              </a>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px;">
              Este es un correo automático de ABK Asistencial. No respondas a este mensaje.
            </p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Error sending assignment email:', err);
      res.status(500).json({ success: false });
    }
  });

  // Notificar a la clínica que un médico se postuló
  app.post('/api/notify-application', async (req, res) => {
    const { clinicEmail, clinicName, doctorName, shiftData } = req.body;
    if (!resend) return res.json({ success: true });
    try {
      await resend.emails.send({
        from: 'ABK Asistencial <notifications@resend.dev>',
        to: [clinicEmail],
        subject: `Nuevo postulante para tu guardia — ABK Asistencial`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://ivkklkvhfmxdvyqzyqvw.supabase.co/storage/v1/object/public/assets/Logo_de_Abk.png" alt="ABK Asistencial" style="height: 64px; width: 64px; object-fit: contain;" />
              <p style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 12px;">ABK Asistencial</p>
            </div>
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 12px;">Nuevo postulante</h2>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
              <strong>${doctorName}</strong> se postuló para una de tus guardias en ABK Asistencial.
            </p>
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 6px 0;"><strong>Especialidad:</strong> ${shiftData.specialty}</p>
              <p style="margin: 6px 0;"><strong>Fecha:</strong> ${shiftData.date}</p>
              <p style="margin: 6px 0;"><strong>Horario:</strong> ${shiftData.start_time} - ${shiftData.end_time}</p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://abk-asistencial.vercel.app" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                Ver postulantes
              </a>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px;">
              Este es un correo automático de ABK Asistencial. No respondas a este mensaje.
            </p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Error sending application email:', err);
      res.status(500).json({ success: false });
    }
  });

  app.post('/api/notify-new-shift', async (req, res) => {
    const { shiftData, recipients } = req.body;
    
    if (!resend) {
      console.log('Skipping email notification (RESEND_API_KEY missing)');
      return res.json({ success: true, message: 'Notification logged but not sent (no API key)' });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'ABK Asistencial <notifications@resend.dev>', // This should be a verified domain in production
        to: recipients || ['franciscoaguilar008@gmail.com'], // Fallback for testing
        subject: `Nueva Guardia Disponible: ${shiftData.specialty} en ${shiftData.clinic_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
            <h2 style="color: #2563eb;">¡Nueva guardia disponible!</h2>
            <p style="font-size: 16px; color: #374151;">Se ha publicado una nueva oportunidad en <strong>ABK Asistencial</strong>.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Especialidad:</strong> ${shiftData.specialty}</p>
              <p><strong>Institución:</strong> ${shiftData.clinic_name}</p>
              <p><strong>Fecha:</strong> ${shiftData.date}</p>
              <p><strong>Ubicación:</strong> ${shiftData.location || shiftData.zone}</p>
              <p><strong>Honorarios:</strong> $${shiftData.price}</p>
            </div>

            <a href="https://ais-dev-kiie4wvsevxwcifnzcssac-155752184775.us-east5.run.app" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Ver guardia y aplicar
            </a>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
              Este es un correo automático de ABK Asistencial. No respondas a este mensaje.
            </p>
          </div>
        `
      });

      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, error });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Notification error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
