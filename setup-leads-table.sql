-- SQL per creare tabella leads in Supabase Dashboard
-- Vai su: https://supabase.com/dashboard/project/esgjushznmidzdhqsyyx/sql/new
-- Copia questo codice ed esegui (tasto ▶️)

-- Crea tabella leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram_username TEXT,
  city TEXT,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('cliente', 'collaboratore')),
  score NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  answers JSONB DEFAULT '{}',
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
);

-- Indici per query veloci
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Abilita RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può inserire (landing pages pubbliche)
DROP POLICY IF EXISTS "Allow anonymous insert" ON leads;
CREATE POLICY "Allow anonymous insert" ON leads
  FOR INSERT WITH CHECK (true);

-- Policy: chiunque può leggere (per debug/verifica)
DROP POLICY IF EXISTS "Allow anon select" ON leads;
CREATE POLICY "Allow anon select" ON leads
  FOR SELECT USING (true);

-- Commento documentazione
COMMENT ON TABLE leads IS 'Lead captured from Qualifier A (clienti) and Qualifier B (collaboratori). Inserisce anche su Telegram parallelo.';

-- Verifica creazione
SELECT 'Tabella leads creata con successo!' as result;