// Script per creare la tabella blog_articles in Supabase
// Eseguire: node scripts/create-blog-table.js

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function createTable() {
    // Nota: la creazione tabelle va fatta tramite dashboard Supabase SQL Editor
    // Questo script verifica solo che la tabella esista
    
    const SQL = `
CREATE TABLE IF NOT EXISTS blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    category TEXT,
    target TEXT DEFAULT 'cliente',
    author TEXT DEFAULT 'Stefano Santaiti',
    meta_description TEXT,
    meta_keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_target ON blog_articles(target);
CREATE INDEX IF NOT EXISTS idx_blog_created ON blog_articles(created_at DESC);

ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON blog_articles
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select" ON blog_articles
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update" ON blog_articles
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete" ON blog_articles
    FOR DELETE TO anon USING (true);
`;

    console.log('Esegui questo SQL nel SQL Editor di Supabase Dashboard:\n');
    console.log(SQL);
}

createTable();