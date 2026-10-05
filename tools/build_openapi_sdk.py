#!/usr/bin/env python3
"""Genera openapi/darktrace-sdk.yaml a partir del inventario extraído del código
de https://github.com/LegendEvent/darktrace-sdk (sdk_inventory.json).

Uso: python3 tools/build_openapi_sdk.py <sdk_inventory.json> <salida.yaml>

Refleja la API *tal como la implementa el SDK*: rutas, métodos, parámetros
(con los nombres reales enviados por la red) y cuerpos. El SDK no define
schemas de respuesta (devuelve el JSON tal cual), así que las respuestas son
genéricas.
"""
import json
import re
import sys
from collections import OrderedDict

import yaml

REPO = "https://github.com/LegendEvent/darktrace-sdk/blob/main/"

PATH_PARAM_NAMES = {"base64(json(query))": "query", "analysis_type": "analysis", "graph_type": "graphmode"}


def norm_path(p):
    return re.sub(r"\{([^}]+)\}", lambda m: "{" + PATH_PARAM_NAMES.get(m.group(1), m.group(1)) + "}", p)


def schema_for(t, name=""):
    t = (t or "").lower()
    enum = None
    m = re.match(r"str ([\w|]+)$", t)
    if m and "|" in m.group(1) and m.group(1) not in ("str|int", "str|list"):
        enum = m.group(1).split("|")
    if t.startswith("str|list"):
        s = {"oneOf": [{"type": "string"}, {"type": "array", "items": {"type": "string"}}]}
    elif "list" in t and not t.startswith("str ("):
        s = {"type": "array", "items": {"type": "string"}}
    elif t.startswith("object") or t.startswith("dict"):
        s = {"type": "object"}
    elif t.startswith("bool"):
        s = {"type": "boolean"}
    elif t.startswith("float"):
        s = {"type": "number"}
    elif t.startswith("int") and "str" not in t:
        s = {"type": "integer", "format": "int64"}
    elif t in ("str|int", "int|str"):
        s = {"oneOf": [{"type": "string"}, {"type": "integer"}]}
    else:
        s = {"type": "string"}
    if enum:
        s["enum"] = enum
    if "base64" in t:
        s["format"] = "byte"
    return s


def param(p, where="query"):
    s = schema_for(p.get("type"), p["name"])
    if p.get("default") is not None and "oneOf" not in s:
        s["default"] = p["default"]
    out = {"name": p["name"], "in": where, "required": bool(p.get("required")) or where == "path", "schema": s}
    desc = " ".join(x for x in (f"Tipo en el SDK: `{p.get('type')}`." if p.get("type") else "", p.get("note") or "") if x)
    if desc:
        out["description"] = desc
    if s.get("type") == "array":
        out["explode"] = True
    return out


def body(b):
    props, req, free = OrderedDict(), [], False
    for f in b.get("fields") or []:
        n = f["name"]
        if n.startswith("<") or n.startswith("**"):
            free = True
            continue
        s = schema_for(f.get("type"), n)
        d = " ".join(x for x in (f"Tipo en el SDK: `{f.get('type')}`." if f.get("type") else "", f.get("note") or "") if x)
        if d:
            s["description"] = d
        props[n] = s
        if f.get("required"):
            req.append(n)
    s = {"type": "object", "properties": props}
    if req:
        s["required"] = req
    if free:
        s["additionalProperties"] = True
    return s


def main(src, dst):
    inv = json.load(open(src, encoding="utf-8"))
    ops = OrderedDict()
    for e in inv["endpoints"]:
        path, method = norm_path(e["path"]), e["method"].lower()
        ops.setdefault((path, method), []).append(e)

    paths = OrderedDict()
    for (path, method), entries in ops.items():
        fns = [f"`{x['sdk_function']}` ({x['source']})" for x in entries]
        notes = [x["notes"] for x in entries if x.get("notes")]
        op = OrderedDict()
        op["tags"] = [path.split("/")[1]]
        op["summary"] = entries[0]["sdk_function"]
        op["operationId"] = method + "_" + re.sub(r"[^A-Za-z0-9]+", "_", path).strip("_")
        src_file = entries[0]["source"].split(":")[0]
        op["description"] = ("**Implementado en el SDK por:** " + "; ".join(fns) +
                             ("\n\n**Notas:** " + " ".join(dict.fromkeys(notes)) if notes else "") +
                             f"\n\nCódigo: {REPO}{src_file}")
        params, seen = [], set()
        for name in re.findall(r"\{([^}]+)\}", path):
            params.append(param({"name": name, "type": "int" if name in ("pbid", "cid", "mlid", "tid", "teid", "interval") else "str",
                                 "required": True}, "path"))
            seen.add((name, "path"))
        for x in entries:
            for p in x.get("query_params") or []:
                if (p["name"], "query") not in seen and not p["name"].startswith("*"):
                    seen.add((p["name"], "query"))
                    params.append(param(p))
        if params:
            op["parameters"] = params
        bodies = [x["body"] for x in entries if x.get("body")]
        b = None
        if bodies:
            # Varias funciones del SDK pueden compartir ruta (p. ej. POST /antigena):
            # unir sus campos; un campo solo es obligatorio si lo es en todas.
            fields = OrderedDict()
            for bb in bodies:
                for f in bb.get("fields") or []:
                    fields.setdefault(f["name"], dict(f))
            for name, f in fields.items():
                f["required"] = all(any(g["name"] == name and g.get("required") for g in bb.get("fields") or [])
                                    for bb in bodies)
            b = {"content_type": bodies[0].get("content_type"), "fields": list(fields.values())}
        if b:
            op["requestBody"] = {"required": True, "content": {b.get("content_type") or "application/json": {"schema": body(b)}}}
        if path.startswith("/pcaps/{"):
            content = {"application/vnd.tcpdump.pcap": {"schema": {"type": "string", "format": "binary"}}}
        elif path.endswith("/download"):
            content = {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}
        else:
            content = {"application/json": {"schema": {"description": "El SDK devuelve el JSON de la respuesta sin modelar."}}}
        op["responses"] = {"200": {"description": "OK", "content": content},
                           "default": {"description": "Error HTTP (el SDK lanza requests.HTTPError)"}}
        paths.setdefault(path, OrderedDict())[method] = op

    auth = inv["auth"]
    spec = OrderedDict()
    spec["openapi"] = "3.0.3"
    spec["info"] = {
        "title": "Darktrace Threat Visualizer API (según darktrace-sdk)",
        "version": str(inv.get("sdk_version", "unknown")),
        "description": (
            f"Schema derivado del código de {inv.get('repo', 'LegendEvent/darktrace-sdk')} "
            f"(versión {inv.get('sdk_version')}). Describe lo que el SDK envía realmente, no la documentación "
            "oficial; ver darktrace-threat-visualizer.yaml y DIFF-sdk-vs-docs.md.\n\n"
            "## Firma\n" + auth.get("signature_algorithm", "") + "\n\n"
            "## Cabeceras\n" + "\n".join(f"- {h}" for h in auth.get("headers", []))),
    }
    spec["servers"] = [{"url": "https://{instance}", "variables": {"instance": {"default": "darktrace.example.com"}}}]
    spec["security"] = [{"DTAPIToken": [], "DTAPIDate": [], "DTAPISignature": []}]
    spec["tags"] = [{"name": t} for t in dict.fromkeys(p.split("/")[1] for p in paths)]
    spec["paths"] = paths
    spec["components"] = {"securitySchemes": {
        "DTAPIToken": {"type": "apiKey", "in": "header", "name": "DTAPI-Token"},
        "DTAPIDate": {"type": "apiKey", "in": "header", "name": "DTAPI-Date"},
        "DTAPISignature": {"type": "apiKey", "in": "header", "name": "DTAPI-Signature"}}}
    spec["x-sdk-suspected-bugs"] = inv.get("suspected_bugs_or_divergences")
    spec["x-sdk-noop-or-composite-methods"] = inv.get("sdk_noop_or_composite_methods")

    class D(yaml.SafeDumper):
        pass
    D.add_representer(OrderedDict, lambda d, o: d.represent_dict(o.items()))
    D.ignore_aliases = lambda *a: True
    with open(dst, "w", encoding="utf-8") as f:
        yaml.dump(spec, f, Dumper=D, sort_keys=False, allow_unicode=True, width=120)
    print(f"{len(paths)} paths, {sum(len(v) for v in paths.values())} operaciones")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
