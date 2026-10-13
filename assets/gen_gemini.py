#!/usr/bin/env python3
"""
Generate Dead Earth game art with the Gemini API.

Usage (in Terminal):
    cd ~/Documents/workspace/zombie-survival-game
    python3 assets/gen_gemini.py                 # generate everything that is missing
    python3 assets/gen_gemini.py --only char_jake,zombie_walker0   (also makes their pose sprites: walk, gun, pistol, melee, climb, dead / attack)
    python3 assets/gen_gemini.py --only walkframes  # pose-guided 6-frame walk cycles (assets/poses)
    python3 assets/gen_gemini.py --only walkarms    # fix arm swing on those frames (edits each _wf frame)
    python3 assets/gen_gemini.py --only pistolbare  # pistol pose with empty hands (any handgun is drawn in-game)
    python3 assets/gen_gemini.py --redo furn_bed  # regenerate specific files
    python3 assets/gen_gemini.py --list           # show all names

The API key is read from the GEMINI_API_KEY environment variable, or asked for (hidden input).
Images are saved to assets/gemini/<name>.png. Existing files are skipped, so you can stop and resume.
Only uses the Python standard library (no pip install needed).
"""
import argparse, base64, getpass, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "gemini")
PROMPTS = os.path.join(HERE, "gemini_prompts.json")
STYLE_REF = "char_jake"   # first image; attached to every later request to keep one style
PREFIX = "Same art style as the attached reference image (match its outline thickness, shading and color palette), but draw a different subject: "
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODELS = ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-2.0-flash-preview-image-generation"]


def call(model, key, parts):
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
    req = urllib.request.Request(API.format(model=model), data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    for c in data.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            inl = p.get("inlineData") or p.get("inline_data")
            if inl and inl.get("data"):
                return base64.b64decode(inl["data"]), inl.get("mimeType", "image/png")
    text = " ".join(p.get("text", "") for c in data.get("candidates", []) for p in (c.get("content") or {}).get("parts", []))
    raise RuntimeError("no image returned. " + (text[:300] or json.dumps(data)[:300]))


def generate(models, key, prompt, ref_bytes, raw=False, extra=None):
    parts = []
    if ref_bytes:
        parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(ref_bytes).decode()}})
        if not raw: prompt = PREFIX + prompt
    if extra:  # second image, e.g. a pose guide
        parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(extra).decode()}})
    parts.append({"text": prompt})
    last = None
    for model in models:
        for attempt in range(4):
            try:
                return call(model, key, parts)
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors="ignore")[:400]
                last = f"HTTP {e.code} ({model}): {msg}"
                if e.code in (429, 500, 502, 503, 504):
                    wait = 8 * (attempt + 1)
                    print(f"    busy/rate-limited, retrying in {wait}s ...")
                    time.sleep(wait); continue
                if e.code in (400, 404) and ("not found" in msg.lower() or "not supported" in msg.lower()):
                    print(f"    model {model} unavailable, trying next model")
                    break
                if e.code in (401, 403):
                    sys.exit("API key rejected (HTTP %d). Check the key / that the Gemini API is enabled.\n%s" % (e.code, msg))
                break
            except Exception as e:  # network / no image
                last = f"{model}: {e}"
                time.sleep(3)
    raise RuntimeError(last)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma separated names to generate")
    ap.add_argument("--redo", help="comma separated names to regenerate even if they exist")
    ap.add_argument("--model", help="Gemini image model name (default tries %s)" % ", ".join(DEFAULT_MODELS))
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    items = json.load(open(PROMPTS, encoding="utf-8"))
    if a.list:
        for it in items: print(it[0])
        return
    key = os.environ.get("GEMINI_API_KEY") or getpass.getpass("Gemini API key (hidden): ").strip()
    if not key: sys.exit("No API key.")
    models = [a.model] if a.model else DEFAULT_MODELS
    os.makedirs(OUT, exist_ok=True)
    only = set(filter(None, (a.only or "").split(",")))
    redo = set(filter(None, (a.redo or "").split(",")))
    def want(n):
        POSES = ("_walk", "_gun", "_pistol", "_melee", "_climb", "_dead", "_attack")
        base = n.rsplit("_", 1)[0] if n.endswith(POSES) else n
        if "_wf" in n: base = n.split("_wf")[0]
        if "_wa" in n: base = n.split("_wa")[0]
        if "walkframes" in only and "_wf" in n: base = "walkframes"
        if "walkarms" in only and "_wa" in n: base = "walkarms"
        if "pistolbare" in only and n.endswith("_pistol_bare"): base = "pistolbare"
        sel = not only or n in only or base in only or n in redo
        return sel and (n in redo or base in redo or not os.path.exists(os.path.join(OUT, n + ".png")))
    todo = [(it[0], it[1], it[2] if len(it) > 2 else None, it[3] if len(it) > 3 else None) for it in items if want(it[0])]
    # the style reference must exist first
    ref_path = os.path.join(OUT, STYLE_REF + ".png")
    # style reference first, full-body characters before their parts
    order = {it[0]: i for i, it in enumerate(items)}
    todo.sort(key=lambda x: (x[0] != STYLE_REF, x[2] is not None, order[x[0]]))
    print(f"{len(todo)} image(s) to generate -> {OUT}")
    ok = fail = 0
    for i, (name, prompt, parent, pose) in enumerate(todo, 1):
        ref, raw = None, False
        if parent:
            pp = os.path.join(OUT, parent + ".png")
            if not os.path.exists(pp):
                print(f"[{i}/{len(todo)}] {name}  (skipped: {parent}.png missing)"); continue
            ref, raw = open(pp, "rb").read(), True
        elif name != STYLE_REF and os.path.exists(ref_path):
            ref = open(ref_path, "rb").read()
        print(f"[{i}/{len(todo)}] {name}")
        try:
            extra = open(os.path.join(HERE, pose), "rb").read() if pose else None
            img, mime = generate(models, key, prompt, ref, raw, extra)
            ext = ".png" if "png" in mime else ".jpg"
            path = os.path.join(OUT, name + ".png")
            if ext != ".png":
                path_jpg = os.path.join(OUT, name + ".jpg")
                open(path_jpg, "wb").write(img)
                # also write .png name so the skip check works; Claude converts later
                open(path, "wb").write(img)
            else:
                open(path, "wb").write(img)
            print(f"    saved {os.path.basename(path)} ({len(img) // 1024} KB)")
            ok += 1
            time.sleep(1.5)
        except Exception as e:
            print(f"    FAILED: {e}")
            fail += 1
    print(f"\nDone. {ok} saved, {fail} failed. Tell Claude the images are ready.")


if __name__ == "__main__":
    main()
