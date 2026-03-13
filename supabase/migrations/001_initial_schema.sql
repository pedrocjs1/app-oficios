-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- TIPOS ENUM
CREATE TYPE user_role AS ENUM ('client', 'professional', 'both');
CREATE TYPE professional_status AS ENUM ('pending_verification', 'verified', 'suspended');
CREATE TYPE request_status AS ENUM ('open', 'in_proposals', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'viewed', 'accepted', 'rejected', 'expired');
CREATE TYPE job_status AS ENUM ('pending_start', 'in_progress', 'completed_by_professional', 'confirmed', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE payment_method AS ENUM ('digital', 'cash');
CREATE TYPE urgency_level AS ENUM ('normal', 'urgent', 'emergency');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved');
CREATE TYPE dispute_resolution AS ENUM ('refund_full', 'refund_partial', 'released_to_professional', 'no_action');

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT,
  phone_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'client',
  location GEOGRAPHY(POINT, 4326),
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFESSIONALS (extiende users)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT,
  license_photo_url TEXT,
  dni_photo_url TEXT,
  selfie_url TEXT,
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE,
  status professional_status DEFAULT 'pending_verification',
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  jobs_completed INT DEFAULT 0,
  balance_due NUMERIC(12,2) DEFAULT 0,
  mp_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  common_problems JSONB DEFAULT '[]'::jsonb,
  is_licensed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0
);

-- SERVICE_ZONES
CREATE TABLE service_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT DEFAULT 'AR',
  boundary GEOGRAPHY(POLYGON, 4326)
);

-- PROFESSIONAL_CATEGORIES (many-to-many)
CREATE TABLE professional_categories (
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, category_id)
);

-- PROFESSIONAL_ZONES (many-to-many)
CREATE TABLE professional_zones (
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES service_zones(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, zone_id)
);

-- SERVICE_REQUESTS
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  problem_type TEXT NOT NULL,
  description TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  urgency urgency_level DEFAULT 'normal',
  location GEOGRAPHY(POINT, 4326),
  address_text TEXT,
  status request_status DEFAULT 'open',
  max_proposals INT DEFAULT 5,
  proposals_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- PROPOSALS
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  message TEXT,
  estimated_arrival TEXT,
  status proposal_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, professional_id)
);

-- JOBS
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES service_requests(id),
  proposal_id UUID REFERENCES proposals(id),
  client_id UUID REFERENCES users(id),
  professional_id UUID REFERENCES professionals(id),
  agreed_price NUMERIC(12,2) NOT NULL,
  payment_method payment_method,
  status job_status DEFAULT 'pending_start',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE REFERENCES jobs(id),
  amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  net_to_professional NUMERIC(12,2) NOT NULL,
  mp_payment_id TEXT,
  mp_transfer_id TEXT,
  status payment_status DEFAULT 'pending',
  method payment_method NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

-- MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  original_content TEXT,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  reviewer_id UUID REFERENCES users(id),
  reviewed_id UUID REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reviewer_id)
);

-- DISPUTES
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE REFERENCES jobs(id),
  opened_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  status dispute_status DEFAULT 'open',
  resolution dispute_resolution,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ÍNDICES
CREATE INDEX idx_requests_category ON service_requests(category_id) WHERE status = 'open';
CREATE INDEX idx_requests_location ON service_requests USING GIST(location);
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_proposals_request ON proposals(request_id);
CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_professional ON jobs(professional_id);
CREATE INDEX idx_messages_job ON messages(job_id);
CREATE INDEX idx_professional_zones ON professional_zones(zone_id);
CREATE INDEX idx_zones_boundary ON service_zones USING GIST(boundary);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Users
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS: Professionals
CREATE POLICY "Professionals can read own profile" ON professionals FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Professionals can update own profile" ON professionals FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can create professional profile" ON professionals FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Políticas RLS: Categories (lectura pública)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);

-- Políticas RLS: Service Zones (lectura pública)
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read zones" ON service_zones FOR SELECT USING (true);

-- Políticas RLS: Service Requests
CREATE POLICY "Clients see own requests" ON service_requests FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients create requests" ON service_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients update own requests" ON service_requests FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "Professionals see open requests in their zones" ON service_requests FOR SELECT
  USING (
    status = 'open' AND
    EXISTS (
      SELECT 1 FROM professional_zones pz
      JOIN professionals p ON p.id = pz.professional_id
      JOIN professional_categories pc ON pc.professional_id = p.id
      WHERE p.user_id = auth.uid()
        AND pc.category_id = service_requests.category_id
        AND p.verified = TRUE
        AND p.balance_due = 0
        AND ST_Contains(
          (SELECT boundary::geometry FROM service_zones WHERE id = pz.zone_id),
          service_requests.location::geometry
        )
    )
  );

-- Políticas RLS: Proposals
CREATE POLICY "Professionals can create proposals" ON proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p WHERE p.id = professional_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals see own proposals" ON proposals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Clients see proposals for their requests" ON proposals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND sr.client_id = auth.uid())
  );

-- Políticas RLS: Jobs
CREATE POLICY "Job participants can view jobs" ON jobs FOR SELECT
  USING (client_id = auth.uid() OR EXISTS (
    SELECT 1 FROM professionals p WHERE p.id = professional_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Job participants can update jobs" ON jobs FOR UPDATE
  USING (client_id = auth.uid() OR EXISTS (
    SELECT 1 FROM professionals p WHERE p.id = professional_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Jobs can be created by clients" ON jobs FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Políticas RLS: Messages
CREATE POLICY "Job participants can view messages" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_id
        AND (j.client_id = auth.uid() OR EXISTS (
          SELECT 1 FROM professionals p WHERE p.id = j.professional_id AND p.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Job participants can send messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_id
        AND (j.client_id = auth.uid() OR EXISTS (
          SELECT 1 FROM professionals p WHERE p.id = j.professional_id AND p.user_id = auth.uid()
        ))
    )
  );

-- Políticas RLS: Reviews
CREATE POLICY "Anyone can read reviews" ON reviews FOR SELECT USING (true);

CREATE POLICY "Job participants can create reviews" ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs j WHERE j.id = job_id
        AND (j.client_id = auth.uid() OR EXISTS (
          SELECT 1 FROM professionals p WHERE p.id = j.professional_id AND p.user_id = auth.uid()
        ))
    )
  );

-- TRIGGER: actualizar proposals_count
CREATE OR REPLACE FUNCTION update_proposals_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_requests
  SET proposals_count = (
    SELECT COUNT(*) FROM proposals WHERE request_id = NEW.request_id
  )
  WHERE id = NEW.request_id;

  -- Si se llegó al máximo, cambiar status a in_proposals
  UPDATE service_requests
  SET status = 'in_proposals'
  WHERE id = NEW.request_id
    AND proposals_count >= max_proposals
    AND status = 'open';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_proposal_insert
  AFTER INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_proposals_count();

-- TRIGGER: actualizar rating del profesional
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
DECLARE
  prof_id UUID;
BEGIN
  SELECT p.id INTO prof_id
  FROM professionals p
  WHERE p.user_id = NEW.reviewed_id;

  IF prof_id IS NOT NULL THEN
    UPDATE professionals
    SET
      rating_avg = (SELECT AVG(rating) FROM reviews WHERE reviewed_id = NEW.reviewed_id),
      rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = NEW.reviewed_id)
    WHERE id = prof_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- TRIGGER: completar job y actualizar jobs_completed
CREATE OR REPLACE FUNCTION on_job_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE professionals
    SET jobs_completed = jobs_completed + 1
    WHERE id = NEW.professional_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION on_job_confirmed();
