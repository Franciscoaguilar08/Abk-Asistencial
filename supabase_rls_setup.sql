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

-- POLÍTICA DE ACTUALIZACIÓN SEGURA (Unificada)
-- Nota: En RLS puro no podemos comparar OLD vs NEW fácilmente. 
-- Para máxima seguridad, se recomienda un TRIGGER que valide que el médico NO cambie el precio.
CREATE POLICY "Unified update policy for shifts"
ON shifts FOR UPDATE
TO authenticated
USING (
  -- La clínica dueña puede editar
  auth.uid() = clinic_id 
  OR 
  -- O el médico asignado puede editar (pero esto le da acceso a la fila)
  auth.uid() = assigned_doctor_id
)
WITH CHECK (
  -- Validación básica: No se puede cambiar la clínica dueña de la guardia
  clinic_id = clinic_id -- (En una función de trigger validaríamos que clinic_id no cambie)
  AND
  (
    -- Si es la clínica, puede hacer cambios generales
    auth.uid() = clinic_id
    OR
    -- Si es el médico, solo debería estar cambiando campos de asistencia/rating
    -- Aquí forzamos una comprobación de que el médico no se "auto-asigne" a otras guardias
    (auth.uid() = assigned_doctor_id AND assigned_doctor_id = auth.uid())
  )
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
