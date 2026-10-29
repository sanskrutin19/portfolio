# Sanskruti Naik — 3D Portfolio

**Live:** https://portfolio-green-nine-58.vercel.app

The home page plays like a game: **the Museum of Things That Think**.

1. **Title screen.** "Enter the museum", with a live count of who's inside.
2. **Character select.** Pick one of twelve realistic people (Microsoft Rocketbox, MIT licence) and type your name, which floats above your head.
3. **The intro.** My own 3D avatar greets you by name, introduces the museum and asks: guided tour, or roam freely?
4. **Play.** Walk with WASD, the arrow keys or a tap on the floor. Seven exhibits, each a system I built, stand lit on plinths under glass. Walk up to one and its placard appears; press E to enter its own art-directed 3D world with a live demo. The tour has back, pause, next and exit; a minimap shows where everyone is.

**Live visitors.** With the backend connected ([setup](supabase/README.md)), other people in the museum appear in real time with their names, and you can wave or cheer at each other. There's a moderated visitor wall and suggestion wall, and a museum archive that shows only real counts. Without the backend these features stay hidden; nothing is simulated. The Sound Room plays my About story as kinetic lyrics on a glass speaker.

The whole site is one building. Scroll down and the camera leaves the rotunda through a doorway into a long gallery wing: every section (the Sound Room, the Guidebook of skills, the Record, the Visitor Desk) hangs on its walls as a live 3D panel, and the avatar walks along beside you from wall to wall. The panels are real HTML (CSS3D), so text stays sharp, links and buttons work, and the nav jumps straight to each room.

## Highlights

- **Real 3D avatar.** An Avaturn model of me, compressed from 15 MB to about 3 MB (meshopt geometry, WebP textures). Motion-captured clips (bow, dance, "oops") blend with procedural walking, waving and dragging, and facial blendshapes add blinks, a smile and talking.
- **Opening scene.** The avatar drags the name in like a curtain.
- **Project worlds.** Six case studies, each with its own typography, palette and Three.js scene, and an interactive demo: RAG pipeline walkthrough, encrypted-chat mock-up, satellite map layers, Grad-CAM slider, SHAP chart and offline-sync demo.
- **Responsive.** The hero measures the real layout at every size, from 360 px phones and phone landscape to 2560 px screens.
- **Considerate.** Reduced-motion support, keyboard focus handling in dialogs, smooth scrolling (Lenis), and the content still works without WebGL.

## Stack

Vanilla JavaScript (ES modules) · Three.js 0.160 · CSS3DRenderer · GLTFLoader · Supabase (Realtime presence, Postgres + RLS) + MeshoptDecoder · Lenis · HTML/CSS · Vercel. No build step.

## Run locally

```bash
python -m http.server 4321
# open http://127.0.0.1:4321
```

## Structure

```
index.html            page
assets/css/site.css   design tokens, layout, themes
assets/js/site.js     navigation, reveals, demos, smooth scroll
assets/js/minime.js   the 3D avatar: rig, motion, clips, opening scene
assets/js/museum.js   the 3D museum: rotunda, exhibits, avatar controls, tour, minimap, gallery wing
assets/js/people.js   the realistic cast visitors choose from (assets/people/*.glb)
assets/js/humans.js   shared rigging: bone mapping, relaxed rest pose, walk / wave / look
assets/js/select.js   the character select screen with a live 3D preview
assets/js/visitors.js name tags and emote bubbles
assets/js/live.js     visitor identity, real-time presence (Supabase), wall + archive data
assets/js/wall.js     the visitor wall, suggestion wall and archive
assets/js/live-config.js  public Supabase URL + anon key (empty = live features off)
supabase/schema.sql   tables, row-level security, rate limits, moderation queue
assets/js/speaker.js  About: a glass speaker playing kinetic lyrics
assets/js/worlds.js   per-project 3D worlds
assets/avatar/        compressed avatar body + animation clips
```

## Contact

[naiksanskruti03@gmail.com](mailto:naiksanskruti03@gmail.com) · [LinkedIn](https://www.linkedin.com/in/sanskruti-naik/) · [GitHub](https://github.com/sanskrutin19)
