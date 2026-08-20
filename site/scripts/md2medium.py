"""
posts/*.md -> Medium-safe HTML.

Medium's editor accepts pasted HTML but silently destroys two things we rely on:
  - <table> is dropped entirely           -> re-render as an ASCII table inside <pre>
  - <pre> newlines collapse to one line   -> join code lines with <br>
Captions are not supported at all; we no longer emit them.
"""
import html, re, sys, pathlib

SITE = "https://onuroran.github.io"


def inline(t):
    """Escape, then re-apply the inline markup Medium understands."""
    keep = []
    # protect code spans before bold/italic touch them
    t = re.sub(r"`([^`]+)`", lambda m: keep.append(m.group(1)) or f"\x00{len(keep)-1}\x00", t)
    t = html.escape(t, quote=False)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
               lambda m: '<a href="%s">%s</a>' % (
                   SITE + m.group(2) if m.group(2).startswith("/") else m.group(2), m.group(1)),
               t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", t)
    return re.sub(r"\x00(\d+)\x00", lambda m: "<code>%s</code>" % html.escape(keep[int(m.group(1))]), t)


def table(rows):
    """Medium drops <table>. Render a padded ASCII grid inside <pre> instead."""
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    cells = [c for c in cells if not all(re.fullmatch(r":?-{2,}:?", x or "-") for x in c)]
    for r in cells:                                    # drop markdown emphasis, keep text
        for i, c in enumerate(r):
            r[i] = re.sub(r"[*`]", "", c)
    w = [max(len(r[i]) if i < len(r) else 0 for r in cells) for i in range(max(map(len, cells)))]
    out = []
    for n, r in enumerate(cells):
        out.append("  ".join((r[i] if i < len(r) else "").ljust(w[i]) for i in range(len(w))).rstrip())
        if n == 0:
            out.append("  ".join("-" * x for x in w))
    return "<pre>" + "<br>".join(html.escape(l) for l in out) + "</pre>"


def convert(md):
    lines = md.split("\n")
    title = dek = ""
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]

        if ln.startswith("# ") and not title:
            title = ln[2:].strip(); i += 1; continue
        if ln.startswith("### ") and not dek:
            dek = ln[4:].strip(); i += 1; continue

        if ln.startswith("```"):                        # code block
            i += 1; buf = []
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            out.append("<pre>" + "<br>".join(html.escape(b) or "&nbsp;" for b in buf) + "</pre>")
            continue

        if ln.startswith("|"):                          # table
            buf = []
            while i < len(lines) and lines[i].startswith("|"):
                buf.append(lines[i]); i += 1
            out.append(table(buf)); continue

        if ln.startswith(">"):                          # blockquote
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip(">").strip()); i += 1
            out.append("<blockquote>%s</blockquote>" % inline(" ".join(buf))); continue

        if ln.startswith("## "):
            out.append("<h2>%s</h2>" % inline(ln[3:].strip())); i += 1; continue
        if ln.strip() in ("---", ""):
            i += 1; continue

        buf = []                                        # paragraph
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#|>|\||```|---)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append("<p>%s</p>" % inline(" ".join(buf)))

    return title, dek, "\n".join(out)


if __name__ == "__main__":
    src = pathlib.Path(sys.argv[1])
    title, dek, body = convert(src.read_text(encoding="utf-8"))
    # the dek becomes Medium's subtitle: a plain paragraph right under the title
    doc = "<p><em>%s</em></p>\n%s" % (html.escape(dek), body)
    pathlib.Path(sys.argv[2]).write_text(doc, encoding="utf-8")
    print(f"title: {title}")
    print(f"dek:   {dek[:70]}...")
    print(f"cikti: {sys.argv[2]}  ({len(doc)} bayt, {doc.count('<pre>')} pre, {doc.count('<h2>')} h2)")
