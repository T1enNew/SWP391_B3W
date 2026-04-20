/**
 * Supabase Client Configuration
 *
 * Su dung cho frontend (React / CRA)
 * Chi can du Anon Key - khong bao gio gui Service Role Key ra frontend
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing environment variables. Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default supabase;