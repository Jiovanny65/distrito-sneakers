// ============================================
//   Speed Style CL — Configuración Supabase
//   La publishable key es SEGURA en frontend (con RLS activo).
//   Nunca pegues la SECRET key aquí ni en ningún archivo del cliente.
// ============================================

const SUPABASE_URL = 'https://avxqwalugyjauwayxjvn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jOwE3q-Tk7r_NZKmoaUBNA_CKHwQ9xT';

let sb;
try {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('SDK de Supabase no cargo desde el CDN. Revisa tu conexion o ad-blocker.');
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  console.log('[Supabase] Cliente creado OK ✓');
} catch (err) {
  console.error('[Supabase] Error inicializando cliente:', err);
  sb = null;
}
