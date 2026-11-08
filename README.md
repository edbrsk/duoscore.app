# DuoScore landing page

Static landing page for DuoScore, a music writing and practice app, for iPhone, iPad and iPhone Duo. Plain HTML, CSS and JavaScript, with no build step except fetching the 3D phone model.

## Run locally

The hero's 3D phone needs Apple's iPhone Duo model, which isn't committed. Prepare it once with Python 3.12:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-assets.txt
python scripts/prepare-assets.py
python scripts/serve.py . 8766
```

Open <http://127.0.0.1:8766/>. Serve over HTTP: opening `index.html` as a file can't load the model. Without the model, the hero falls back to a flat screenshot frame.

## Screenshots

Drop PNGs into `screens/` with these names, then run `./scripts/optimize-screens.sh` (macOS), which writes the resized JPEG copies the page loads into `screens/web/`. Until a slot's copies exist, it shows a labelled placeholder.

| File | Where | Suggested size |
| --- | --- | --- |
| `open.png` | Hero phone, inner screen (unfolded) | 2670 × 1878 |
| `closed.png` | Hero phone, cover screen (folded) | 1290 × 1878 |
| `library.png` | Library | unfolded screen |
| `notation.png` | Notation & tab (full width) | unfolded screen |
| `playback.png` | Playback | unfolded screen |
| `practice.png` | Practice tools | unfolded screen |
| `editing.png` | Editing | unfolded screen |
| `splitview.png` | Made for your device (iPhone Duo card) | unfolded screen in Split View |
| `ipad.png` | Made for your device (iPad card) | iPad screen |
| `iphone.png` | Made for your device (iPhone card) | iPhone held upright, 1206 × 2622 |

The page shows each screenshot whole; only the hero phone crops its two to fill the screens, so keep important content away from their edges.

## Deploy to GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`: it downloads and prepares the model, then publishes the folder.

1. Create a GitHub repository and push this folder to `main`.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.

All paths are relative, so the site works at `https://<user>.github.io/<repo>/` or on a custom domain.

## Layout

| Path | Purpose |
| --- | --- |
| `index.html` | The page |
| `css/styles.css` | All styles |
| `privacy/index.html`, `terms/index.html`, `support/index.html`, `videos/index.html` | Privacy policy, terms of use, support and videos pages, served at `/privacy/`, `/terms/`, `/support/` and `/videos/` |
| `js/main.js` | Hero tab strip, notation/tab switch and retuning demo |
| `fold/fold.js` | 3D fold animation in the hero |
| `scripts/prepare-assets.py` | Downloads and prepares the iPhone Duo model into `assets/` |
| `scripts/optimize-screens.sh` | Makes the web copies of the screenshots |
| `scripts/serve.py` | Local server that compresses like GitHub Pages |
| `vendor/three/` | Three.js runtime and add-ons, minified |
| `fonts/` | Inter, Montserrat and JetBrains Mono, served from the site |

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses and the source of the phone model.
