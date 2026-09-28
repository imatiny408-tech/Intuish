# Builds landing/index.html from index.src.html by inlining the icon and shared SVGs.
import base64, pathlib
here = pathlib.Path(__file__).parent
s = (here / "index.src.html").read_text()
icon = "data:image/png;base64," + base64.b64encode((here.parent / "img" / "logo.png").read_bytes()).decode()
flame = '<svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0C68DA"/><stop offset=".55" stop-color="#3BBDFE"/><stop offset="1" stop-color="#DDF4FF"/></linearGradient></defs><path d="M12 2.5c.6 3-1.2 4.6-2.6 6.2C8 10.3 7 11.8 7 14a5 5 0 0 0 10 0c0-2.1-.9-3.4-1.8-4.4-.2 1.3-.9 2.2-1.8 2.6.3-3.3-.3-6.9-1.4-9.7z" fill="url(#fg)"/><path d="M12 12.6c-.8.9-1.4 1.5-1.4 2.4a1.4 1.4 0 0 0 2.8 0c0-.9-.6-1.5-1.4-2.4z" fill="#fff"/></svg>'
arrow = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'
for n in ("learn", "understand", "remember"):
    s = s.replace(f"__IMG_{n}__", "data:image/jpeg;base64," + base64.b64encode((here / "img" / f"{n}.jpg").read_bytes()).decode())
import json, subprocess
art = json.loads(subprocess.check_output(["node", "-e", "global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.ART))", str(here.parent / "js" / "art.js")]))
for k, v in art.items():
    s = s.replace(f"__ART_{k}__", v)
s = s.replace("__ICON__", icon).replace("__FLAME__", flame).replace("__ARROW__", arrow)
(here / "index.html").write_text(s)
print(len(s))
