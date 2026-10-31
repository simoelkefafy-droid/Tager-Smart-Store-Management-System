"""Keep export artwork, replace inaccurate native text geometry, add native fades.

Uses only presentation files and browser geometry. No application/database access.
"""
import json
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"p": P, "a": A, "r": R}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)

def el(parent, ns, name, attrs=None):
    return ET.SubElement(parent, f"{{{ns}}}{name}", {k: str(v) for k, v in (attrs or {}).items()})

def emu(value):
    return str(round(value * 9144000 / 1920))

def color(css):
    rgb = [int(float(v)) for v in re.findall(r"[\d.]+", css)[:3]]
    return "".join(f"{v:02X}" for v in rgb)

def text_shape(parent, ident, model):
    shape = el(parent, P, "sp")
    nv = el(shape, P, "nvSpPr")
    el(nv, P, "cNvPr", {"id": ident, "name": f"Editable text {ident}"})
    el(nv, P, "cNvSpPr", {"txBox": "1"})
    el(nv, P, "nvPr")
    prop = el(shape, P, "spPr")
    xf = el(prop, A, "xfrm")
    el(xf, A, "off", {"x": emu(model["x"]), "y": emu(model["y"])})
    el(xf, A, "ext", {"cx": emu(model["w"]), "cy": emu(model["h"])})
    geometry = el(prop, A, "prstGeom", {"prst": "rect"})
    el(geometry, A, "avLst")
    el(prop, A, "noFill")
    el(el(prop, A, "ln"), A, "noFill")
    body = el(shape, P, "txBody")
    bodyprop = el(body, A, "bodyPr", {"wrap": "square", "lIns": 0, "rIns": 0, "tIns": 0, "bIns": 0, "anchor": "t"})
    # Keep editable text within its original bounds if a viewer substitutes fonts.
    el(bodyprop, A, "normAutofit")
    el(body, A, "lstStyle")
    for line in model["lines"]:
        para = el(body, A, "p")
        rtl = model["direction"] == "rtl"
        align = model["align"]
        align = {"center": "ctr", "left": "l", "right": "r"}.get(align, "r" if rtl else "l")
        pp = el(para, A, "pPr", {"algn": align, "rtl": "1" if rtl else "0", "marL": 0, "marR": 0, "indent": 0})
        el(el(pp, A, "lnSpc"), A, "spcPts", {"val": round(model["lineHeight"] * 37.5)})
        el(el(pp, A, "spcBef"), A, "spcPts", {"val": 0})
        el(el(pp, A, "spcAft"), A, "spcPts", {"val": 0})
        for run in line:
            rr = el(para, A, "r")
            rp = el(rr, A, "rPr", {"lang": "ar-EG" if re.search(r"[\u0600-\u06ff]", run["text"]) else "en-US", "sz": round(run["size"] * 37.5), "b": "1" if run["bold"] else "0", "dirty": 0})
            el(el(rp, A, "solidFill"), A, "srgbClr", {"val": color(run["color"])})
            for kind in ("latin", "ea", "cs"):
                el(rp, A, kind, {"typeface": run["font"]})
            text = el(rr, A, "t")
            text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            text.text = run["text"]
        el(para, A, "endParaRPr", {"lang": "ar-EG" if rtl else "en-US"})
    return shape

def animation(slide, ids):
    text_ids = ids[:-1] if len(ids) > 1 else ids
    timing = el(slide, P, "timing")
    root = el(el(timing, P, "tnLst"), P, "par")
    rootct = el(root, P, "cTn", {"id": 1, "dur": "indefinite", "restart": "never", "nodeType": "tmRoot"})
    main = el(el(rootct, P, "childTnLst"), P, "seq", {"concurrent": "1", "nextAc": "seek"})
    ct = el(main, P, "cTn", {"id": 2, "dur": "indefinite", "nodeType": "mainSeq"})
    children = el(ct, P, "childTnLst")
    item = el(children, P, "par")
    itemct = el(item, P, "cTn", {"id": 3, "fill": "hold"})
    el(el(itemct, P, "stCondLst"), P, "cond", {"delay": 0})
    effects = el(itemct, P, "childTnLst")
    counter = 4
    for index, spid in enumerate(ids):
        par = el(effects, P, "par")
        effectct = el(par, P, "cTn", {"id": counter, "presetID": 10, "presetClass": "entr", "presetSubtype": 0, "fill": "hold", "grpId": 0, "nodeType": "withEffect"})
        counter += 1
        el(el(effectct, P, "stCondLst"), P, "cond", {"delay": min(index, 2) * 120})
        actions = el(effectct, P, "childTnLst")
        setting = el(actions, P, "set")
        behavior = el(setting, P, "cBhvr")
        el(behavior, P, "cTn", {"id": counter, "dur": 1, "fill": "hold"})
        counter += 1
        el(el(behavior, P, "tgtEl"), P, "spTgt", {"spid": spid})
        el(el(behavior, P, "attrNameLst"), P, "attrName").text = "style.visibility"
        el(el(setting, P, "to"), P, "strVal", {"val": "visible"})
        fade = el(actions, P, "animEffect", {"transition": "in", "filter": "fade"})
        behavior = el(fade, P, "cBhvr")
        el(behavior, P, "cTn", {"id": counter, "dur": 450})
        counter += 1
        el(el(behavior, P, "tgtEl"), P, "spTgt", {"spid": spid})
    builds = el(timing, P, "bldLst")
    for spid in text_ids:
        el(builds, P, "bldP", {"spid": spid, "grpId": 0, "build": "allAtOnce"})

path = Path(sys.argv[1])
layout = json.loads(Path(sys.argv[2]).read_text())
with zipfile.ZipFile(path) as source:
    contents = {name: source.read(name) for name in source.namelist()}
selected_layout = layout[:1] if "--cover-only" in sys.argv[3:] else layout
for index, models in enumerate(selected_layout, 1):
    name = f"ppt/slides/slide{index}.xml"
    root = ET.fromstring(contents[name])
    tree = root.find("p:cSld/p:spTree", NS)
    for shape in list(tree):
        if shape.tag == f"{{{P}}}sp" and shape.find("p:txBody", NS) is not None:
            tree.remove(shape)
    ident = max(int(n.attrib["id"]) for n in root.findall(".//p:cNvPr", NS)) + 1
    animate_ids = []
    for model in models:
        text_shape(tree, ident, model)
        if model["title"]:
            animate_ids.append(ident)
        ident += 1
    # Animate one substantive photo/screenshot, never the full-slide background.
    for pic in tree.findall("p:pic", NS):
        ext = pic.find("p:spPr/a:xfrm/a:ext", NS)
        off = pic.find("p:spPr/a:xfrm/a:off", NS)
        if ext is not None and off is not None and int(off.get("x", 0)) >= 0 and int(off.get("y", 0)) > 300000 and 800000 < int(ext.get("cx", 0)) < 7000000 and int(ext.get("cy", 0)) > 1000000:
            animate_ids.append(int(pic.find("p:nvPicPr/p:cNvPr", NS).get("id")))
            break
    for old in list(root):
        if old.tag in (f"{{{P}}}transition", f"{{{P}}}timing"):
            root.remove(old)
    # Schema order: cSld, clrMapOvr, transition, timing, extLst.
    extlist = root.find("p:extLst", NS)
    if extlist is not None:
        root.remove(extlist)
    el(el(root, P, "transition", {"spd": "med", "advClick": 1}), P, "fade")
    animation(root, animate_ids)
    if extlist is not None:
        root.append(extlist)
    contents[name] = ET.tostring(root, encoding="UTF-8", xml_declaration=True)
temporary = path.with_suffix(".tmp.pptx")
with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as target:
    for name, value in contents.items():
        target.writestr(name, value)
temporary.replace(path)
print(f"Finalized {len(selected_layout)} editable RTL slide(s) with native fade transitions and entrance animations.")
