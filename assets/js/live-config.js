/* The live museum's backend (Supabase). Both values are public by design:
   the anon key only allows what supabase/schema.sql permits. Leave them
   empty and the shared features (visitors, wall, archive) stay switched off.
   Setup: supabase/README.md */
window.MUSEUM_LIVE = {
  url: '',      // e.g. https://abcdefghijklm.supabase.co
  anonKey: ''   // Project Settings → API → anon public key
};
