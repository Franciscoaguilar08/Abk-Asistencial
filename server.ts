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
