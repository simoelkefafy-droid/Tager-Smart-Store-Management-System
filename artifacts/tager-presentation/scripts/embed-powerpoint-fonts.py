"""Embed the deck's editable Arabic/Latin font faces without changing its slides.

PowerPoint font parts use uncompressed Embedded OpenType (EOT), not a ZIP wrapper.
The original artwork, text geometry, transitions and animations remain untouched.
"""
import io
import struct
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from fontTools.ttLib import TTFont

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
ET.register_namespace("p", P)
ET.register_namespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
ET.register_namespace("r", R)


def eot(path, family, style):
    font = TTFont(path)
    os2 = font["OS/2"]
    if os2.fsType & 0x0002 or os2.fsType & 0x0200:
        raise ValueError(f"Font does not permit editable outline embedding: {path}")
    # A semibold face occupies the embedded bold slot; advertise it consistently.
    if style == "Bold":
        os2.fsSelection = (os2.fsSelection | 0x20) & ~0x40
        font["head"].macStyle |= 1
    out = io.BytesIO()
    font.save(out)
    raw = out.getvalue()
    panose = os2.panose
    fields = ("bFamilyType", "bSerifStyle", "bWeight", "bProportion",
              "bContrast", "bStrokeVariation", "bArmStyle", "bLetterForm",
              "bMidline", "bXHeight")
    header = bytearray(struct.pack("<4I", 0, len(raw), 0x00020002, 0))
    header += bytes(getattr(panose, k) for k in fields)
    header += struct.pack("<BBIHH", 0, 0, os2.usWeightClass, os2.fsType, 0x504C)
    header += struct.pack("<4I", *(getattr(os2, f"ulUnicodeRange{i}") for i in range(1, 5)))
    header += struct.pack("<2I", os2.ulCodePageRange1, os2.ulCodePageRange2)
    header += struct.pack("<5I", font["head"].checkSumAdjustment, 0, 0, 0, 0)
    version = font["name"].getDebugName(5) or "Version 1.0"
    for value, terminated in ((family, True), (style, True), (version, True),
                              (f"{family} {style}", False)):
        encoded = (value + ("\0" if terminated else "")).encode("utf-16-le")
        header += struct.pack("<HH", 0, len(encoded)) + encoded
    # EOT v2.2: empty root string, checksum, EUDC fields and signature.
    header += struct.pack("<HHIIHHII", 0, 0, 0, 0, 0, 0, 0, 0)
    struct.pack_into("<I", header, 0, len(header) + len(raw))
    return bytes(header) + raw


def embed(path):
    fonts = Path(__file__).resolve().parents[1] / "src/assets/fonts"
    with zipfile.ZipFile(path) as source:
        parts = {name: source.read(name) for name in source.namelist()}
    presentation = ET.fromstring(parts["ppt/presentation.xml"])
    relationships = ET.fromstring(parts["ppt/_rels/presentation.xml.rels"])
    types = ET.fromstring(parts["[Content_Types].xml"])
    # Idempotent replacement of our embedded font relationships and parts.
    for node in list(presentation):
        if node.tag == f"{{{P}}}embeddedFontLst":
            presentation.remove(node)
    for node in list(relationships):
        if node.get("Type") == f"{R}/font":
            relationships.remove(node)
    for node in list(types):
        if node.get("PartName", "").startswith("/ppt/fonts/"):
            types.remove(node)
    parts = {name: value for name, value in parts.items() if not name.startswith("ppt/fonts/")}
    font_list = ET.Element(f"{{{P}}}embeddedFontLst")
    used_ids = {node.get("Id") for node in relationships}
    number = 0
    for family, names in (
        ("Cairo", ("Cairo-Regular.ttf", "Cairo-Bold.ttf")),
        ("IBM Plex Sans Arabic", ("IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-SemiBold.ttf")),
    ):
        face = ET.SubElement(font_list, f"{{{P}}}embeddedFont")
        ET.SubElement(face, f"{{{P}}}font", {"typeface": family, "charset": "0"})
        for slot, name in zip(("regular", "bold"), names):
            number += 1
            rid = f"rIdTagerFont{number}"
            if rid in used_ids:
                raise ValueError(f"Duplicate relationship ID: {rid}")
            part = f"ppt/fonts/font{number}.fntdata"
            parts[part] = eot(fonts / name, family, slot.title())
            ET.SubElement(face, f"{{{P}}}{slot}", {f"{{{R}}}id": rid})
            ET.SubElement(relationships, f"{{{REL}}}Relationship",
                          {"Id": rid, "Type": f"{R}/font", "Target": part[4:]})
            ET.SubElement(types, f"{{{CT}}}Override",
                          {"PartName": f"/{part}", "ContentType": "application/x-fontdata"})
    # embeddedFontLst follows notesSz and precedes customShowLst/photoAlbum/defaultTextStyle.
    following = {"custShowLst", "photoAlbum", "custDataLst", "kinsoku",
                 "defaultTextStyle", "modifyVerifier", "extLst"}
    position = next((i for i, node in enumerate(presentation)
                     if node.tag.rsplit("}", 1)[-1] in following), len(presentation))
    presentation.insert(position, font_list)
    # A viewer may ignore embedded fonts; allow its fallback text to fit safely.
    drawing = "http://schemas.openxmlformats.org/drawingml/2006/main"
    for name in list(parts):
        if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
            slide = ET.fromstring(parts[name])
            for body in slide.findall(f".//{{{drawing}}}bodyPr"):
                for node in list(body):
                    if node.tag.rsplit("}", 1)[-1] in {"noAutofit", "normAutofit", "spAutoFit"}:
                        body.remove(node)
                body.set("wrap", "square")
                ET.SubElement(body, f"{{{drawing}}}normAutofit")
            parts[name] = ET.tostring(slide, encoding="utf-8", xml_declaration=True)
    presentation.set("embedTrueTypeFonts", "1")
    presentation.set("saveSubsetFonts", "0")
    parts["ppt/presentation.xml"] = ET.tostring(presentation, encoding="utf-8", xml_declaration=True)
    # Preserve the OPC manifests' default namespaces for strict Office readers.
    ET.register_namespace("", REL)
    parts["ppt/_rels/presentation.xml.rels"] = ET.tostring(relationships, encoding="utf-8", xml_declaration=True)
    ET.register_namespace("", CT)
    parts["[Content_Types].xml"] = ET.tostring(types, encoding="utf-8", xml_declaration=True)
    temporary = path.with_suffix(".font-tmp.pptx")
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as output:
        for name, content in parts.items():
            output.writestr(name, content)
    temporary.replace(path)
    print("Embedded all four editable font faces; slide content and animations preserved.")


if __name__ == "__main__":
    embed(Path(sys.argv[1]))
