-- Agregar rol admin al enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Política RLS: admins pueden ver todos los usuarios
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden actualizar cualquier usuario
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todos los profesionales
CREATE POLICY "Admins can view all professionals" ON professionals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden actualizar profesionales (aprobar/rechazar)
CREATE POLICY "Admins can update professionals" ON professionals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todos los pedidos
CREATE POLICY "Admins can view all requests" ON service_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todos los jobs
CREATE POLICY "Admins can view all jobs" ON jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todas las propuestas
CREATE POLICY "Admins can view all proposals" ON proposals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todos los pagos
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden ver todas las disputas
CREATE POLICY "Admins can view all disputes" ON disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política RLS: admins pueden actualizar disputas
CREATE POLICY "Admins can update disputes" ON disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
