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
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_specialties TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completion_rate NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS penalty_rate NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_license_plate TEXT;

-- Permite lectura pública de perfiles
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON users;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON users FOR SELECT 
TO authenticated 
USING (true);

-- Permite que cada usuario inserte su propio perfil (registro)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permite que cada usuario actualice su propio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- POLÍTICAS PARA ADMINISTRADOR (franciscoaguilar008@gmail.com)
DROP POLICY IF EXISTS "Admins can select all users" ON users;
CREATE POLICY "Admins can select all users"
ON users FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'franciscoaguilar008@gmail.com');

DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users"
ON users FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'franciscoaguilar008@gmail.com');

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
ON users FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'franciscoaguilar008@gmail.com');


-- 2. Tabla: shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Asegurar que las columnas existan
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS applicants UUID[] DEFAULT '{}';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_applicants UUID[] DEFAULT '{}';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS applicant_proposals JSONB DEFAULT '{}'::jsonb;

-- Permite que cualquier médico o clínica autenticada vea las guardias
DROP POLICY IF EXISTS "Shifts are viewable by authenticated users" ON shifts;
CREATE POLICY "Shifts are viewable by authenticated users" 
ON shifts FOR SELECT 
TO authenticated 
USING (true);

-- Permite que las clínicas creen sus propias guardias
DROP POLICY IF EXISTS "Clinics can create shifts" ON shifts;
CREATE POLICY "Clinics can create shifts" 
ON shifts FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = clinic_id AND 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'clinic')
);

-- POLÍTICA DE ACTUALIZACIÓN SEGURA
-- Permite que clínicas editen sus guardias y médicos apliquen/confirmen
DROP POLICY IF EXISTS "Shifts update policy" ON shifts;
CREATE POLICY "Shifts update policy"
ON shifts FOR UPDATE
TO authenticated
USING (
  auth.uid() = clinic_id 
  OR 
  (status = 'open' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'doctor'))
  OR
  auth.uid() = assigned_doctor_id
  OR
  auth.jwt() ->> 'email' = 'franciscoaguilar008@gmail.com'
);

DROP POLICY IF EXISTS "Admins can delete shifts" ON shifts;
CREATE POLICY "Admins can delete shifts"
ON shifts FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'franciscoaguilar008@gmail.com');


-- 3. Tabla: notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Permite que los usuarios vean solo sus propias notificaciones
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Permite que el sistema (vía cliente) inserte notificaciones
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
CREATE POLICY "Allow authenticated users to insert notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permite que los usuarios marquen sus notificaciones como leídas
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);


-- 4. Tabla: messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Permite que los participantes de un chat vean los mensajes
DROP POLICY IF EXISTS "Chat participants can view messages" ON messages;
CREATE POLICY "Chat participants can view messages" 
ON messages FOR SELECT 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Permite que un usuario envíe mensajes como sí mismo
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);
