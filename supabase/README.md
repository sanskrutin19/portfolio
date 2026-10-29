# The live museum: setup

The museum works on its own. Three features need a small backend, and stay **switched off** (hidden, never faked) until one is connected:

- **Live presence.** See who else is in the museum right now: their avatars, names, movement and emotes.
- **The visitor wall and the suggestion wall.** Persistent, moderated notes and suggestions.
- **The museum archive.** Real counts: explorers today, explorers in all, notes on the wall, suggestions received.

The backend is [Supabase](https://supabase.com), on its free tier. It provides real-time presence over websockets and a Postgres database with row-level security. The site is static, so there is no server code to deploy.

## 1. Create the project (about 5 minutes)

1. Sign in at supabase.com and click **New project**. Choose any name and region, set a database password, and wait for it to start.
2. Open **SQL Editor → New query**, paste the whole of [`schema.sql`](schema.sql), and click **Run**. You can safely run it again.
3. Open **Project Settings → API** and copy these two values:
   - **Project URL**, which looks like `https://abcdefghijklm.supabase.co`.
   - **anon public** key.
4. Paste them into [`assets/js/live-config.js`](../assets/js/live-config.js), then commit and push. Vercel redeploys on its own.

Both values are meant to be public. The anon key can only do what `schema.sql` allows, which is the rules below. **Never put the `service_role` key in the site.**

## 2. What visitors can and can't do

| Action | Allowed? |
|---|---|
| Read notes and suggestions | Only approved ones, and only these columns: name, look, message, exhibit, time |
| Post a note or suggestion | Yes. It always arrives as `pending`, whatever the browser sends. |
| Approve, edit or delete anything | No (no update or delete rules exist) |
| See the browser IDs or IP hashes | No (those columns aren't granted) |
| Read the visits and reports tables | No. They're reachable only through `museum_stats()` and `report_item()`. |

Built-in abuse limits, enforced in the database:
- 3 entries per 10 minutes and 10 per day, per IP hash *or* browser ID.
- No identical text twice in a day.
- At most 60 new entries per 10 minutes across the whole wall.
- Names are 1–24 characters and messages 2–280. Control characters are stripped.

IP addresses are never stored. Only a salted SHA-256 hash is kept, used for rate limiting.

Everything visitors write is shown on the page as plain text, never as HTML.

## 3. Moderation

New entries wait in **Table Editor → `moderation_queue`**, which lists the pending notes and suggestions with their report counts.

- **Approve:** in the `guestbook` or `suggestions` table, set `status` to `approved`.
- **Hide:** set `status` to `hidden`. Or delete the row.
- **Reports:** a visitor can report any entry. When three different visitors report the same entry, it goes back to `pending` automatically.

Or in the SQL editor:

```sql
select * from moderation_queue;                                   -- what's waiting
update guestbook   set status = 'approved' where id = 12;         -- publish a note
update suggestions set status = 'approved' where id in (3, 4);    -- publish ideas
update guestbook   set status = 'hidden'   where id = 9;          -- take one down
```

## 4. Your private inbox

"Write to Sanskruti" sends a note that only you can read. Visitors can send notes but have no way to read any, not even their own. Notes are never shown on the wall.

- **Read them:** go to **Table Editor → `inbox`**, or run `select * from inbox;` in the SQL editor. Each note shows the visitor's name, the message, and how to reach them, if they gave it.
- **Mark one as read:** `update private_notes set is_read = true where id = 5;`
- **Email alerts:** run [`notify.sql`](notify.sql) once (setup steps are at the top of that file). It emails you through Resend for every private note and every wall post waiting for approval. Reply to a private-note email and your reply goes straight to the sender, if they left an email address.

Limits: 3 notes per 10 minutes and 6 per day per sender, with no duplicates.

Until the backend is connected, the same button opens the visitor's own email app with the note addressed to you, so it works today.

## 5. How the counts are defined

- **In the museum now:** live presence connections, de-duplicated by visitor, so two tabs of the same visitor count once.
- **Explorers today / in all:** browsers that entered with an avatar or signed the wall. Each is counted once per UTC day by its random ID.
- **Notes on the wall:** approved notes.
- **Suggestions received:** every submitted suggestion, including those waiting for review.

The archive shows "counting since" the first recorded day. It never shows history from before tracking was switched on.

## 6. Limits worth knowing

- The free tier allows 200 simultaneous real-time connections and 2 million real-time messages a month. Position updates go out about 6 times a second, and only while a visitor is moving.
- Display names aren't moderated before they appear above avatars. They're limited to 24 characters with markup stripped, and visitors can switch off "Let other visitors see me".
- To test presence locally without Supabase, open two tabs at `http://127.0.0.1:4321/?presence=local`. They share real presence over `BroadcastChannel`. This only works between tabs of one browser, and only with that flag.
