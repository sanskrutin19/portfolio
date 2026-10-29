-- Email alerts: a message to your inbox whenever someone writes you a private
-- note, or pins something on the wall that is waiting for your approval.
-- Sent by the database itself through Resend (resend.com); see README step 5.
--
-- Before running: store your Resend key in the Vault (one time), e.g.
--   select vault.create_secret('re_your_key_here', 'resend_api_key', 'Portfolio note alerts');
-- Safe to re-run.

create extension if not exists pg_net with schema extensions;

create or replace function public.museum_alert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  api_key  text;
  to_addr  constant text := 'naiksanskruti03@gmail.com';   -- must be the email you signed up to Resend with
  subject  text;
  body     text;
  payload  jsonb;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then return new; end if;               -- no key yet: alerts are simply off

  if tg_table_name = 'private_notes' then
    subject := 'New private note from ' || new.name;
    body := new.name || ' wrote to you from your portfolio museum:' || E'\n\n' || new.message || E'\n\n'
         || 'How to reach them: ' || coalesce(new.contact, '(not given)') || E'\n\n'
         || 'All notes: Supabase → Table Editor → inbox';
  else
    subject := 'Waiting for approval: ' || case when tg_table_name = 'guestbook' then 'a note on your visitor wall' else 'a new suggestion' end;
    body := new.name || ' wrote:' || E'\n\n' || new.message || E'\n\n'
         || 'It stays hidden until you approve it: Supabase → Table Editor → moderation_queue,'
         || ' then set status to approved in the ' || tg_table_name || ' table (id ' || new.id || ').';
  end if;

  -- plain text only, so nothing a visitor writes can turn into HTML in your email
  payload := jsonb_build_object('from', 'Portfolio museum <onboarding@resend.dev>', 'to', jsonb_build_array(to_addr),
                                'subject', left(subject, 120), 'text', body);
  if tg_table_name = 'private_notes' then   -- (only private notes have a contact field)
    if new.contact ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      payload := payload || jsonb_build_object('reply_to', new.contact);   -- hit Reply to answer them
    end if;
  end if;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    body    := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key)
  );
  return new;
exception when others then
  return new;   -- an email problem must never stop a note from being saved
end $$;

revoke all on function public.museum_alert() from public, anon, authenticated;

drop trigger if exists private_notes_alert on public.private_notes;
create trigger private_notes_alert after insert on public.private_notes for each row execute function public.museum_alert();
drop trigger if exists guestbook_alert on public.guestbook;
create trigger guestbook_alert after insert on public.guestbook for each row execute function public.museum_alert();
drop trigger if exists suggestions_alert on public.suggestions;
create trigger suggestions_alert after insert on public.suggestions for each row execute function public.museum_alert();
