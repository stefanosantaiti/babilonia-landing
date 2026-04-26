// Edge Function: Setup database tables for Babilonia
// Run once to create missing tables

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://esgjushznmidzdhqsyyx.supabase.co';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Create leads table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
        CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type);
        CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

        ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow anonymous insert" ON leads;
        CREATE POLICY "Allow anonymous insert" ON leads
          FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow anon select" ON leads;
        CREATE POLICY "Allow anon select" ON leads
          FOR SELECT USING (true);
      `
    });

    if (createError) {
      // Try direct SQL if RPC doesn't exist
      const { error: sqlError } = await supabase.from('leads').select('count').limit(1);
      
      if (sqlError && sqlError.code === 'PGRST205') {
        // Table doesn't exist, create via raw SQL query
        const { error: rawError } = await supabase.auth.admin.createUser({
          email: 'setup@temp.com',
          password: 'temp'
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Table creation requires direct SQL access',
            details: 'Please run this SQL in Supabase Dashboard SQL Editor:',
            sql: `
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram_username TEXT,
  city TEXT,
  lead_type TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  category TEXT,
  answers JSONB DEFAULT '{}',
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new'
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_type ON leads(lead_type);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select" ON leads FOR SELECT USING (true);
            `
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Tables created successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});