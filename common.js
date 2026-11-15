/* Build a Bit: shared helpers for the console (index.html) and the audience screen (screen.html). */
var BAB = (function () {
  var CHANNEL = "build-a-bit";
  var BUILD = "2026-11-15.19";   // bump on every change so an open audience window knows it is out of date

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function isSection(l) {
    return /^##\s*/.test(l) || /^for (one|two|three|four|five|\d+|all|everyone)\b.*performers?:?$/i.test(l) || /^mini-?game\s*[:\-–—]/i.test(l);
  }
  function sectionName(l) { return l.replace(/^##\s*/, "").replace(/:$/, "").trim(); }
  // Title art for minigames and sections, matched on the name. Add a row per new piece of art.
  var MINIGAME_ART = [
    { match: /d[’'`]?\s*improv/i, src: "art/its-dimprov.png", alt: "It's D'improv" },
    { match: /would you look at that/i, src: "art/would-you-look-at-that.png", alt: "Would You Look at That!" },
    { match: /produce a ruckus/i, src: "art/produce-a-ruckus.png", alt: "Produce a Ruckus!" },
    { match: /^for (one|1) performer/i, src: "art/one-performer.png", alt: "One Performer" },
    { match: /^for (two|2) performers?/i, src: "art/two-performers.png", alt: "Two Performers" },
    { match: /^for (three|3) performers?/i, src: "art/three-performers.png", alt: "Three Performers" }
  ];
  // Cut-out name art for performers, matched on the name in the performer list.
  var PERFORMER_ART = [
    { match: /aaron|ketzenberger/i, src: "art/perf-aaron.png" },
    { match: /alisa|patten/i, src: "art/perf-alisa.png" },
    { match: /rick|toledo/i, src: "art/perf-rick.png" }
  ];
  function performerArt(name) {
    for (var i = 0; i < PERFORMER_ART.length; i++) if (PERFORMER_ART[i].match.test(name)) return PERFORMER_ART[i].src;
    return "";
  }
  function artFor(name) {
    for (var i = 0; i < MINIGAME_ART.length; i++) if (MINIGAME_ART[i].match.test(name)) return MINIGAME_ART[i];
    return null;
  }

  // "Minigame: Big Title (Subtitle)" -> { name: "Big Title", sub: "Subtitle", kind: "minigame" }
  function sectionInfo(l) {
    var name = sectionName(l), kind = "", sub = "";
    var m = name.match(/^mini-?game\s*[:\-–—]\s*(.+)$/i);
    if (m) { kind = "minigame"; name = m[1].trim(); }
    var ps = name.match(/^(.+?)\s*\(([^()]+)\)$/);
    if (ps) { name = ps[1].trim(); sub = ps[2].trim(); }
    var art = artFor(name);
    return { name: name, sub: sub, kind: kind, art: art ? art.src : "", alt: art ? art.alt : "" };
  }

  // "90", "1:30", "1:02:03", "1m30s", "90s" -> seconds
  function parseTime(s) {
    if (s == null || s === "") return null;
    s = String(s).trim();
    var m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
    if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
    if (/^\d+(:\d{1,2}){1,2}$/.test(s)) return s.split(":").reduce(function (a, b) { return a * 60 + +b; }, 0);
    return null;
  }
  function fmtTime(sec) {
    if (sec == null || isNaN(sec)) return "";
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Accepts youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID or a bare 11-character ID.
  function ytParse(u) {
    if (/^[A-Za-z0-9_-]{11}$/.test(u)) return { id: u, start: null };
    var url;
    try { url = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); } catch (e) { return null; }
    var host = url.hostname.replace(/^www\.|^m\./, ""), id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      id = url.searchParams.get("v");
      var pm = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      if (!id && pm) id = pm[2];
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { id: id, start: parseTime(url.searchParams.get("t") || url.searchParams.get("start")) };
  }

  // "video: <url> [start-end] [caption]"  (the "| performers" part is split off before this runs)
  function parseVideo(rest) {
    var toks = rest.trim().split(/\s+/);
    var yt = ytParse(toks.shift() || "");
    if (!yt) return null;
    var v = { id: yt.id, start: yt.start, end: null };
    // Optional settings before the caption, in any order: a time range "0:30-1:45" and a volume "vol:60" (or "60%").
    for (var guard = 0; guard < 2 && toks.length; guard++) {
      var vm = toks[0].match(/^(?:vol(?:ume)?[:=]?(\d{1,3})%?|(\d{1,3})%)$/i);
      if (vm) { v.vol = Math.max(0, Math.min(100, +(vm[1] || vm[2]))) / 100; toks.shift(); continue; }
      var tr = toks[0].match(/^([\dhms:]+)?-([\dhms:]+)?$|^([\dhms:]+)$/i);
      if (tr) {
        var a = parseTime(tr[1] || tr[3]), b = parseTime(tr[2]);
        if (a != null || b != null) { toks.shift(); if (a != null) v.start = a; if (b != null) v.end = b; continue; }
      }
      break;
    }
    return { video: v, caption: toks.join(" ") };
  }

  var SFX_TAG = /\s*\[\s*(?:sfx|sound)\s*:\s*([^\]]+)\]/gi;
  var BULLET = /^([*\-•–◦▪·]|\d+[.)])\s+/;
  function parse(text) {
    var sec = { name: "", sub: "", kind: "" }, out = [], lastP = null;
    String(text || "").split(/\r?\n/).forEach(function (raw, ln) {
      // [sfx: Air horn] anywhere on a line plays that sound when its card comes up.
      var sfx = "";
      raw = raw.replace(SFX_TAG, function (m, name) { sfx = name.trim(); return ""; });
      var l = raw.trim();
      if (!l) return;
      if (isSection(l)) { sec = sectionInfo(l); sec.sfx = sfx; lastP = null; return; }
      if (l.charAt(0) === "#") return;
      // An indented bullet under a line is a direction for that line.
      var indented = /^(\s{2,}|\t)/.test(raw) && BULLET.test(l);
      l = l.replace(BULLET, "");
      if (indented && lastP && !lastP.video) {
        // "Bigger. | Alisa" -> direction "Bigger." for Alisa
        var bar = l.indexOf("|");
        lastP.dirs.push(bar === -1 ? l : l.slice(0, bar).trim());
        lastP.dirWho.push(bar === -1 ? "" : l.slice(bar + 1).trim());
        lastP.dirLine.push(ln);
        lastP.dirSfx.push(sfx);
        return;
      }
      var i = l.indexOf("|");
      var main = i === -1 ? l : l.slice(0, i).trim(), who = i === -1 ? "" : l.slice(i + 1).trim();
      main = main.replace(/^(["“”])["“”]+/, "$1");           // tidy a doubled opening quote
      var p = { text: main, who: who, sec: sec.name, secSub: sec.sub, secKind: sec.kind, secArt: sec.art, video: null, dirs: [], dirWho: [], dirLine: [], dirSfx: [], line: ln, sfx: sfx, secSfx: sec.sfx || "" };
      var vm = main.match(/^video\s*:\s*(.+)$/i);
      if (vm) {
        var pv = parseVideo(vm[1]);
        if (pv) { p.video = pv.video; p.text = pv.caption; }
        else { p.bad = "Couldn't read that YouTube link"; }
      }
      if (p.text || p.video) { out.push(p); lastP = p; }
    });
    // Number lines within their section ("Line 2 of 3").
    var counts = {};
    out.forEach(function (p) { counts[p.sec] = (counts[p.sec] || 0) + 1; p.n = counts[p.sec]; });
    out.forEach(function (p) { p.of = counts[p.sec]; });
    return out;
  }

  // opts: { numCard, showSec }
  function buildSlides(prompts, opts) {
    var slides = [{ t: "title" }], last = null;
    for (var m = 1; m <= (opts.meet || 0); m++) slides.push({ t: "meet", n: m });   // Meet the performers, one name per Next
    prompts.forEach(function (p, i) {
      if (p.sec && p.sec !== last && opts.showSec) slides.push({ t: "sec", sec: p.sec, sub: p.secSub, kind: p.secKind, art: p.secArt, sfx: p.secSfx });
      last = p.sec;
      if (opts.numCard) slides.push({ t: "num", i: i });
      slides.push({ t: "prompt", i: i, sfx: p.sfx });
      if (p.video) slides.push({ t: "video", i: i });
      p.dirs.forEach(function (_, d) { slides.push({ t: "dir", i: i, d: d, sfx: p.dirSfx[d] }); });
    });
    slides.push({ t: "end" });
    if (opts.credits) slides.push({ t: "credits" });
    return slides;
  }

  // Self-contained description of one slide, sent to the screen.
  function slideView(s, prompts) {
    if (!s) return null;
    var v = { t: s.t };
    if (s.n != null) v.n = s.n;
    if (s.sec) { v.sec = s.sec; v.sub = s.sub; v.kind = s.kind; v.art = s.art; }
    if (s.i != null) {
      var p = prompts[s.i];
      v.i = s.i; v.text = p.text; v.who = p.who; v.psec = p.sec; v.video = p.video;
      v.kind = p.secKind; v.n = p.n; v.of = p.of; v.ndirs = p.dirs.length;
      if (s.d != null) { v.d = s.d; v.dir = p.dirs[s.d]; v.dirWho = p.dirWho[s.d] || ""; }
    }
    return v;
  }

  // Credits: "## Heading", "Role | Name" rows, plain lines for names, blank line for a gap.
  function parseCredits(text) {
    var out = [], gap = false;
    out.music = "";
    String(text || "").split(/\r?\n/).forEach(function (raw) {
      raw = raw.replace(SFX_TAG, function (m, name) { out.music = name.trim(); return ""; });   // [sfx: Song] = credits music
      var l = raw.trim();
      if (!l) { if (out.length) gap = true; return; }
      if (/^#\s/.test(l) || (l.charAt(0) === "#" && l.charAt(1) !== "#")) return; // notes
      var item;
      if (/^\[\s*performers\s*\]$/i.test(l)) { item = { k: "perfs" }; out.hasPerfs = true; }
      else if (/^##\s*/.test(l)) item = { k: "h", text: l.replace(/^##\s*/, "") };
      else {
        l = l.replace(/^([*\-•–])\s+/, "");
        var i = l.indexOf("|");
        item = i === -1 ? { k: "name", text: l } : { k: "row", role: l.slice(0, i).trim(), name: l.slice(i + 1).trim() };
      }
      if (gap) { item.gap = true; gap = false; }
      out.push(item);
    });
    return out;
  }

  // "Dana, Luis & Sam" <-> ["Dana", "Luis", "Sam"]
  function splitNames(who) { return String(who || "").split(/\s*(?:,|&|\+|\band\b)\s*/i).map(function (x) { return x.trim(); }).filter(Boolean); }
  function joinNames(list) { return list.length < 2 ? (list[0] || "") : list.length === 2 ? list[0] + " & " + list[1] : list.slice(0, -1).join(", ") + " & " + list[list.length - 1]; }
  // Replace whatever follows "|" on one script line (keeps its indent and bullet).
  function setLineWho(text, ln, names) {
    var lines = String(text).split(/\r?\n/);
    if (ln < 0 || ln >= lines.length) return text;
    var tags = lines[ln].match(SFX_TAG) || [];            // keep any [sfx: ...] tags
    var raw = lines[ln].replace(SFX_TAG, ""), bar = raw.indexOf("|"), body = (bar === -1 ? raw : raw.slice(0, bar)).replace(/\s+$/, "");
    if (tags.length) body += " " + tags.map(function (t) { return t.trim(); }).join(" ");
    lines[ln] = names.length ? body + " | " + joinNames(names) : body;
    return lines.join("\n");
  }

  function vkey(v) { return v ? v.id + "|" + (v.start || 0) + "|" + (v.end || "") : ""; }

  return {
    CHANNEL: CHANNEL, BUILD: BUILD, esc: esc, parse: parse, parseTime: parseTime, fmtTime: fmtTime,
    performerArt: performerArt, splitNames: splitNames, joinNames: joinNames, setLineWho: setLineWho, ytParse: ytParse, parseCredits: parseCredits, buildSlides: buildSlides, slideView: slideView, vkey: vkey
  };
})();
