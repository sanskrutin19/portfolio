/* The live museum's backend (Supabase). Both values are public by design:
   the anon key only allows what supabase/schema.sql permits. Leave them
   empty and the shared features (visitors, wall, archive) stay switched off.
   Setup: supabase/README.md */
window.MUSEUM_LIVE = {
  url: 'https://miejvolivayjamshlrtr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZWp2b2xpdmF5amFtc2hscnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzc1NzIsImV4cCI6MjEwODg1MzU3Mn0.eYAEkOme9B4Q3wf3OUdEVcCW8BiUrNlCsZTXxIHCojw'
};
