-- SUPABASE RLS SETUP
-- Ejecutar estas sentencias en el SQL Editor de tu Dashboard de Supabase para securizar la base de datos.

-- 1. Tabla: users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Permite lectura pública de perfiles (necesaria para ver datos de clínicas y médicos)
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

-- Permite que las clínicas actualicen sus propias guardias
CREATE POLICY "Clinics can update their own shifts" 
ON shifts FOR UPDATE 
TO authenticated
USING (auth.uid() = clinic_id);

-- Permite que el médico asignado actualice la guardia (ej: confirmar asistencia)
CREATE POLICY "Assigned doctors can update their shifts" 
ON shifts FOR UPDATE 
TO authenticated
USING (auth.uid() = assigned_doctor_id);


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
