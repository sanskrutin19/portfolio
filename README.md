# Sanskruti Naik — 3D Portfolio

**Live:** https://portfolio-green-nine-58.vercel.app

A portfolio that shows the work instead of listing it. A motion-captured 3D version of me drags my name onto the page, walks along with you as you scroll, and reacts when you click, drag or drop her. A full-screen 3D camera develops a polaroid for each project, and each polaroid opens into its own art-directed 3D world with a live demo.

## Highlights

- **Real 3D avatar.** An Avaturn model of me, compressed from 15 MB to about 3 MB (meshopt geometry, WebP textures). Motion-captured clips (bow, dance, "oops") blend with procedural walking, waving and dragging, and facial blendshapes add blinks, a smile and talking.
- **Opening scene.** The avatar drags the name in like a curtain.
- **Project worlds.** Six case studies, each with its own typography, palette and Three.js scene, and an interactive demo: RAG pipeline walkthrough, encrypted-chat mock-up, satellite map layers, Grad-CAM slider, SHAP chart and offline-sync demo.
- **Responsive.** The hero measures the real layout at every size, from 360 px phones and phone landscape to 2560 px screens.
- **Considerate.** Reduced-motion support, keyboard focus handling in dialogs, smooth scrolling (Lenis), and the content still works without WebGL.

## Stack

Vanilla JavaScript (ES modules) · Three.js 0.160 · GLTFLoader + MeshoptDecoder · Lenis · HTML/CSS · Vercel. No build step.

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
assets/js/camera3d.js 3D camera + polaroids
assets/js/worlds.js   per-project 3D worlds
assets/avatar/        compressed avatar body + animation clips
```

## Contact

[naiksanskruti03@gmail.com](mailto:naiksanskruti03@gmail.com) · [LinkedIn](https://www.linkedin.com/in/sanskruti-naik-475322341) · [GitHub](https://github.com/sanskrutin19)
