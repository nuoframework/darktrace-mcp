#!/usr/bin/env python3
"""Compara dos ficheros OpenAPI operación a operación (rutas, query, path, body, tipos, content-types).

Uso: python3 tools/diff_openapi.py <web.yaml> <sdk.yaml>
"""
import re
import sys

import yaml

norm = lambda p: re.sub(r"\{[^}]+\}", "{}", p)


def ops(spec):
    out = {}
    for p, methods in spec["paths"].items():
        for m, op in methods.items():
            rb = op.get("requestBody", {}).get("content", {})
            body, req = {}, set()
            for c in rb.values():
                body.update(c["schema"].get("properties") or {})
                req |= set(c["schema"].get("required", []))
            out[(norm(p), m)] = {
                "raw": p,
                "q": {x["name"]: x for x in op.get("parameters", []) if x["in"] == "query"},
                "path": [x["name"] for x in op.get("parameters", []) if x["in"] == "path"],
                "ct": set(rb), "body": body, "req": req,
            }
    return out


def typ(s):
    s = s.get("schema", s)
    t = s.get("type") or ("oneOf" if "oneOf" in s else "any")
    return "number" if t == "integer" else t


def main(fa, fb):
    a, b = ops(yaml.safe_load(open(fa))), ops(yaml.safe_load(open(fb)))
    print("Solo en web:", sorted(f"{m.upper()} {a[(p, m)]['raw']}" for p, m in set(a) - set(b)))
    print("Solo en SDK:", sorted(f"{m.upper()} {b[(p, m)]['raw']}" for p, m in set(b) - set(a)))
    for k in sorted(set(a) & set(b)):
        x, y, out = a[k], b[k], []
        if x["path"] != y["path"]:
            out.append(f"nombres de path param: web={x['path']} sdk={y['path']}")
        qa, qb = set(x["q"]), set(y["q"])
        if qa - qb:
            out.append(f"query solo web: {sorted(qa - qb)}")
        if qb - qa:
            out.append(f"query solo SDK: {sorted(qb - qa)}")
        for p in sorted(qa & qb):
            if typ(x["q"][p]) != typ(y["q"][p]):
                out.append(f"tipo query {p}: web={typ(x['q'][p])} sdk={typ(y['q'][p])}")
            if bool(x["q"][p].get("required")) != bool(y["q"][p].get("required")):
                out.append(f"required query {p}: web={x['q'][p].get('required')} sdk={y['q'][p].get('required')}")
        if x["ct"] != y["ct"]:
            out.append(f"content-type: web={sorted(x['ct'])} sdk={sorted(y['ct'])}")
        ba, bb = set(x["body"]), set(y["body"])
        if ba - bb:
            out.append(f"body solo web: {sorted(ba - bb)}")
        if bb - ba:
            out.append(f"body solo SDK: {sorted(bb - ba)}")
        for p in sorted(ba & bb):
            if typ(x["body"][p]) != typ(y["body"][p]):
                out.append(f"tipo body {p}: web={typ(x['body'][p])} sdk={typ(y['body'][p])}")
        if x["ct"] and y["ct"] and x["req"] != y["req"]:
            out.append(f"body required: web={sorted(x['req'])} sdk={sorted(y['req'])}")
        if out:
            print(f"\n{k[1].upper()} {x['raw']}")
            for o in out:
                print("  -", o)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
