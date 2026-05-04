// ============================================
//   Distrito Sneakers — Configuración Supabase
//   La publishable key es SEGURA en frontend (con RLS activo).
//   Nunca pegues la SECRET key aquí ni en ningún archivo del cliente.
// ============================================

const SUPABASE_URL = 'https://avxqwalugyjauwayxjvn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jOwE3q-Tk7r_NZKmoaUBNA_CKHwQ9xT';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
