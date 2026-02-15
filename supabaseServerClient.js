import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('Supabase admin client not fully configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
