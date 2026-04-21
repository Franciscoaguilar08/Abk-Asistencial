-- SUPABASE RLS SETUP
-- Ejecutar estas sentencias en el SQL Editor de tu Dashboard de Supabase para securizar la base de datos.

-- 1. Tabla: users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Asegurar que las columnas existan en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affidavit_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cuit TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS needed_specialties TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_hours TEXT;

-- Permite lectura pública de perfiles
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON users FOR SELECT 
TO authenticated 
USING (true);

-- Permite que cada usuario inserte su propio perfil (registro)
CREATE POLICY "Users can insert their own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permite que cada usuario actualice su propio perfil
CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);


-- 2. Tabla: shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Asegurar que las columnas existan
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS applicants UUID[] DEFAULT '{}';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_applicants UUID[] DEFAULT '{}';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS applicant_proposals JSONB DEFAULT '{}'::jsonb;

-- Permite que cualquier médico o clínica autenticada vea las guardias
CREATE POLICY "Shifts are viewable by authenticated users" 
ON shifts FOR SELECT 
TO authenticated 
USING (true);

-- Permite que las clínicas creen sus propias guardias
CREATE POLICY "Clinics can create shifts" 
ON shifts FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = clinic_id AND 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'clinic')
);

-- POLÍTICA DE ACTUALIZACIÓN SEGURA
-- Permite que clínicas editen sus guardias y médicos apliquen/confirmen
CREATE POLICY "Shifts update policy"
ON shifts FOR UPDATE
TO authenticated
USING (
  auth.uid() = clinic_id 
  OR 
  (status = 'open' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'doctor'))
  OR
  auth.uid() = assigned_doctor_id
);


-- 3. Tabla: notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Permite que los usuarios vean solo sus propias notificaciones
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Permite que el sistema (vía cliente) inserte notificaciones
CREATE POLICY "Allow authenticated users to insert notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permite que los usuarios marquen sus notificaciones como leídas
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);


-- 4. Tabla: messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Permite que los participantes de un chat vean los mensajes
CREATE POLICY "Chat participants can view messages" 
ON messages FOR SELECT 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Permite que un usuario envíe mensajes como sí mismo
CREATE POLICY "Users can insert their own messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);
