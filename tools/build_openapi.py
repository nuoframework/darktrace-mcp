#!/usr/bin/env python3
"""Genera openapi/darktrace-threat-visualizer.yaml a partir de la documentación
oficial de Darktrace (Customer Portal > Threat Visualizer API) volcada en
docs.json (lista de {path, display, key, html}).

Uso: python3 tools/build_openapi.py <docs.json> <salida.yaml>

Las rutas, métodos y cuerpos se definen a mano en ENDPOINTS (la documentación
no es estructurada); los parámetros query y los schemas de respuesta se extraen
automáticamente de las tablas de cada artículo.
"""
import json
import re
import sys
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup

DOC_BASE = "https://customerportal.darktrace.com/guides/"


# ---------------------------------------------------------------- parsing
def sections(html):
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find(id="knowledgebase-article-content") or soup
    secs, cur = [], {"h": None, "items": []}
    for el in root.find_all(["h2", "h3", "h4", "p", "table", "pre", "ul", "ol"]):
        if el.find_parent(["table", "pre", "ul", "ol"]):
            continue
        if el.name in ("h2", "h3", "h4"):
            secs.append(cur)
            cur = {"h": el.get_text(" ", strip=True), "items": []}
        elif el.name == "table":
            rows = [[c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
                    for tr in el.find_all("tr")]
            cur["items"].append({"table": rows})
        else:
            cur["items"].append({el.name: el.get_text(" ", strip=True)})
    secs.append(cur)
    return secs


def clean(t):
    return re.sub(r"\s+", " ", t).strip()


def param_rows(secs):
    """Filas de la(s) tabla(s) bajo la sección 'Parameters'."""
    rows = []
    for s in secs:
        if s["h"] == "Parameters":
            for it in s["items"]:
                if "table" in it:
                    for r in it["table"]:
                        if r and r[0] != "Parameter" and len(r) >= 3:
                            rows.append({"name": r[0], "type": r[1], "desc": clean(r[2])})
    seen, out = set(), []
    for r in rows:
        if r["name"] not in seen:
            seen.add(r["name"])
            out.append(r)
    return out


def schema_sections(secs):
    """[(titulo, filas)] de cada tabla 'Response Field | Type | Example | Description'."""
    out, parent = [], None
    for s in secs:
        h = s["h"] or ""
        if h.startswith("Response Schema"):
            parent = h
        for it in s["items"]:
            if "table" in it and it["table"] and it["table"][0][:2] == ["Response Field", "Type"]:
                title = h if h.startswith("Response Schema") or not parent else f"{parent} - {h}"
                out.append((title or "Response Schema", it["table"][1:]))
    return out


# ---------------------------------------------------------------- schemas
INT_HINT = re.compile(r"(^|\.)(did|pbid|pid|phid|cid|chid|sid|tid|teid|thid|mlid|codeid|"
                      r"count|offset|time|timems|.*[Tt]ime|.*ms|firstSeen|lastSeen|size|"
                      r"interval|threshold|throttle|priority|port|tmqid|end|start)$")


def json_type(doc_type, name, example):
    t = doc_type.lower().strip()
    if t in ("numeric", "number", "integer", "float"):
        if t == "float":
            return {"type": "number"}
        if re.fullmatch(r"-?\d+", example or "") and INT_HINT.search(name):
            return {"type": "integer", "format": "int64"}
        return {"type": "number"}
    if t == "boolean":
        return {"type": "boolean"}
    if t == "object":
        return {"type": "object"}
    if t == "array":
        return {"type": "array", "items": {}}
    if t == "string":
        return {"type": "string"}
    return {}  # tipo desconocido/mixto en la doc: sin restricción


def build_schema(rows):
    root = {"type": "object", "properties": OrderedDict()}

    def node_for(path_parts):
        node = root
        for p in path_parts:
            if node.get("type") == "array":
                items = node.setdefault("items", {})
                if not items.get("type"):
                    items.update({"type": "object"})
                node = items
            if node.get("type") != "object" and "properties" not in node:
                node.setdefault("type", "object")
            props = node.setdefault("properties", OrderedDict())
            node = props.setdefault(p, {"type": "object"})
        if node.get("type") == "array":
            items = node.setdefault("items", {})
            if not items.get("type"):
                items["type"] = "object"
            node = items
        return node

    for r in rows:
        if len(r) < 2 or not r[0]:
            continue
        name, typ = r[0], r[1]
        example = r[2] if len(r) > 2 else ""
        desc = clean(r[3]) if len(r) > 3 else ""
        parts = name.split(".")
        parent = node_for(parts[:-1])
        props = parent.setdefault("properties", OrderedDict())
        if parent.get("type") not in ("object", None):
            parent["type"] = "object"
        existing = props.get(parts[-1], {})
        new = json_type(typ, name, example)
        # conservar hijos ya creados (si el padre aparece después que un hijo)
        if "properties" in existing and new.get("type") == "object":
            new["properties"] = existing["properties"]
        if "items" in existing and new.get("type") == "array":
            new["items"] = existing["items"]
        if desc:
            new["description"] = desc
        if example and new.get("type") in ("string", "number", "integer", "boolean"):
            new["example"] = coerce_example(example, new["type"])
        props[parts[-1]] = new
    return root


def coerce_example(v, t):
    try:
        if t == "integer":
            return int(v)
        if t == "number":
            return float(v)
        if t == "boolean":
            return v.strip().lower() == "true"
    except ValueError:
        return v if t == "string" else None
    return v


def to_plain(o):
    if isinstance(o, dict):
        return {k: to_plain(v) for k, v in o.items() if v is not None}
    if isinstance(o, list):
        return [to_plain(x) for x in o]
    return o


def comp_name(*parts):
    s = " ".join(parts)
    s = re.sub(r"Response Schema", "", s)
    s = re.sub(r"[^A-Za-z0-9]+", " ", s)
    return "".join(w[:1].upper() + w[1:] for w in s.split())


# ---------------------------------------------------------------- params
def q_param(row, required=False):
    t = row["type"].lower()
    name = row["name"]
    if t == "boolean":
        sch = {"type": "boolean"}
    elif t == "numeric":
        if name in ("minscore", "maxscore", "latitude", "longitude", "minscore"):
            sch = {"type": "number"}
        else:
            sch = {"type": "integer", "format": "int64"}
    elif t == "array":
        sch = {"type": "array", "items": {"type": "string"}}
    else:
        sch = {"type": "string"}
    p = {"name": name, "in": "query", "required": required, "description": row["desc"], "schema": sch}
    if "Can be repeated multiple times" in row["desc"]:
        p["schema"] = {"type": "array", "items": {"type": "string"}}
        p["explode"] = True
    return p


POST_ONLY = re.compile(r"(POST requests? (in JSON format )?only|Valid (and recommended )?for POST|"
                       r"Available for POST|For POST requests only|For POST requests,)", re.I)


def body_schema(rows, names=None, extra=None, required=()):
    props = OrderedDict()
    for r in rows:
        if names is not None and r["name"] not in names:
            continue
        props[r["name"]] = q_param(r)["schema"] | {"description": r["desc"]}
    for k, v in (extra or {}).items():
        props[k] = v
    s = {"type": "object", "properties": props}
    if required:
        s["required"] = list(required)
    return s


# ---------------------------------------------------------------- endpoints
GENERIC_OK = {"type": "object", "properties": {"response": {"type": "string", "example": "SUCCESS"}}}

# Cada entrada: (ruta, método, doc_key, opciones)
#   query: "all" | "get" (excluye POST-only) | lista explícita | None
#   body:  dict de schema o callable(rows) | None
#   body_ct: content-types aceptados
#   resp:  ("ref", schema_doc_key, idx|None, "array"|"object") | dict
E = []


def add(path, method, key, **kw):
    E.append((path, method, key, kw))


ID = lambda n, d, t="integer": {"name": n, "in": "path", "required": True, "description": d,
                                 "schema": {"type": t} | ({"format": "int64"} if t == "integer" else {})}
B64 = {"name": "query", "in": "path", "required": True,
       "description": "Consulta de Advanced Search en JSON codificado en Base64, p. ej. "
                      "base64('{\"search\":\"@type:dns\",\"fields\":[],\"offset\":0,\"timeframe\":\"3600\",\"time\":{\"user_interval\":0}}').",
       "schema": {"type": "string", "format": "byte"}}

# --- advancedsearch
add("/advancedsearch/api/search/{query}", "get", "api-advancedsearch-search-request",
    path_params=[B64], query=None, resp=("api-advancedsearch-search-schema", 0, "object"))
add("/advancedsearch/api/search", "post", "api-advancedsearch-search-request",
    query=None, body_ct=["application/json"],
    body={"type": "object", "required": ["hash"], "properties": {"hash": {
        "type": "string", "format": "byte",
        "description": "Consulta Advanced Search (JSON) codificada en Base64. Método POST disponible desde 6.1 para consultas largas."}}},
    resp=("api-advancedsearch-search-schema", 0, "object"))
add("/advancedsearch/api/analyze/{field}/{analysis}/{query}", "get", "api-advancedsearch-analyze-request",
    path_params=[
        {"name": "field", "in": "path", "required": True, "description": "Campo a analizar, p. ej. @fields.dest_port", "schema": {"type": "string"}},
        {"name": "analysis", "in": "path", "required": True, "description": "Tipo de análisis", "schema": {"type": "string", "enum": ["mean", "terms", "trend", "score"]}},
        B64], query=None, resp=("api-advancedsearch-analyze-schema", None, "object"))
add("/advancedsearch/api/graph/{graphmode}/{interval}/{query}", "get", "api-advancedsearch-graph-request",
    path_params=[
        {"name": "graphmode", "in": "path", "required": True, "description": "Tipo de gráfico", "schema": {"type": "string", "enum": ["count", "mean"]}},
        {"name": "interval", "in": "path", "required": True, "description": "Intervalo de agrupación en milisegundos", "schema": {"type": "integer", "format": "int64"}},
        B64], query=None, resp=("api-advancedsearch-graph-schema", None, "object"))

# --- aianalyst
add("/aianalyst/groups", "get", "api-aianalyst-groups-request", query="all",
    resp=("api-aianalyst-groups-schema", 0, "array"))
add("/aianalyst/incidentevents", "get", "api-aianalyst-incidentevents-request", query="all",
    resp=("api-aianalyst-incidentevents-schema", 0, "array"))
for verb in ("acknowledge", "unacknowledge"):
    add(f"/aianalyst/{verb}", "post", "api-aianalyst-acknowledge-request", query=None,
        body_ct=["application/x-www-form-urlencoded"], body_from_rows=True, body_required=["uuid"],
        resp=GENERIC_OK, summary=f"{verb.capitalize()} Cyber AI Analyst incident events")
for verb in ("pin", "unpin"):
    add(f"/aianalyst/{verb}", "post", "api-aianalyst-pin-request", query=None,
        body_ct=["application/x-www-form-urlencoded"], body_from_rows=True, body_required=["uuid"],
        resp=GENERIC_OK, summary=f"{verb.capitalize()} Cyber AI Analyst incident events")
add("/aianalyst/incident/comments", "get", "api-aianalyst-incident-comments-request",
    query=["incident_id", "responsedata"], required_q=["incident_id"],
    resp=("api-aianalyst-incident-comments-schema", 0, "object"))
add("/aianalyst/incident/comments", "post", "api-aianalyst-incident-comments-request", query=None,
    body_ct=["application/json"], body_from_rows=["incident_id", "message"],
    body_required=["incident_id", "message"], resp=GENERIC_OK)
add("/aianalyst/stats", "get", "api-aianalyst-stats-request", query="all",
    resp=("api-aianalyst-stats-schema", 0, "object"))
add("/aianalyst/investigations", "get", "api-aianalyst-investigations-request",
    query=["starttime", "endtime", "investigationId", "responseData"],
    resp=("api-aianalyst-investigations-schema", 0, "array"))
add("/aianalyst/investigations", "post", "api-aianalyst-investigations-request", query=None,
    body_ct=["application/json"], body_from_rows=["investigateTime", "did"],
    body_required=["investigateTime", "did"],
    resp={"type": "object", "description": "Incluye investigationId de la investigación creada.",
          "properties": {"investigationId": {"type": "string"}}, "additionalProperties": True})
add("/aianalyst/incidents", "get", "api-aianalyst-incidents-request", query="all", deprecated=True,
    resp=("api-aianalyst-incidents-schema", 0, "array"))

# --- antigena
add("/antigena", "get", "api-antigena-request", query="get",
    resp=("api-antigena-schema", 0, "array"))
add("/antigena", "post", "api-antigena-request", query=None, body_ct=["application/json"],
    body_from_rows=["codeid", "activate", "clear", "reason", "duration"], body_required=["codeid"],
    resp=GENERIC_OK)
add("/antigena/manual", "post", "api-antigena-manual-request", query=None, body_ct=["application/json"],
    body={"type": "object", "required": ["did", "action", "duration"], "properties": {
        "did": {"type": "integer", "format": "int64", "description": "Identification number of a device modelled in the Darktrace system."},
        "action": {"type": "string", "enum": ["connection", "pol", "gpol", "quarantine", "quarantineOutgoing", "quarantineIncoming"],
                   "description": "connection=Block Matching Connections, pol=Enforce pattern of life, gpol=Enforce group pattern of life, quarantine=Quarantine device, quarantineOutgoing=Block all outgoing traffic, quarantineIncoming=Block all incoming traffic."},
        "duration": {"type": "integer", "description": "The duration of the action in seconds."},
        "reason": {"type": "string", "description": "free text field to specify the action purpose."},
        "connections": {"type": "array", "description": "Only valid for the connection action type.", "items": {
            "type": "object", "required": ["src", "dst"], "properties": {
                "src": {"type": "string"}, "dst": {"type": "string"}, "port": {"type": "integer"}}}}}},
    resp={"type": "object", "properties": {"codeid": {"type": "integer", "format": "int64"}}})
add("/antigena/summary", "get", "api-antigena-summary-request", query="all",
    resp=("api-antigena-summary-schema", 0, "object"))

# --- catálogo / modelos
add("/components", "get", "api-components-request", query="all",
    resp=("api-components-schema", 0, "array"))
add("/components/{cid}", "get", "api-components-request", query="all",
    path_params=[ID("cid", "Component ID")], resp=("api-components-schema", 0, "object"))
add("/cves", "get", "api-cves-request", query="all", resp=("api-cves-schema", 0, "object"))
add("/details", "get", "api-details-request", query="all", resp=("api-details-schema", 0, "array"))
add("/deviceinfo", "get", "api-deviceinfo-request", query="all", required_q=["did"],
    resp=("api-deviceinfo-schema", 0, "object"))
add("/devices", "get", "api-devices-request", query="get",
    resp=("api-devices-schema", 0, "oneOf"))
add("/devices", "post", "api-devices-request", query=None,
    body_ct=["application/json", "application/x-www-form-urlencoded"],
    body_from_rows=["did", "label", "priority", "type"], body_required=["did"],
    resp={"type": "object", "properties": {"response": {"type": "string"}, "device": {"type": "object"}}})
add("/devicesearch", "get", "api-devicesearch-request", query="all",
    resp=("api-devicesearch-schema", 0, "object"))
add("/devicesummary", "get", "api-devicesummary-request", query="all", required_q=["did"],
    resp=("api-devicesummary-schema", 0, "object"))
add("/endpointdetails", "get", "api-endpointdetails-request", query="all",
    resp=("api-endpointdetails-schema", None, "object"))
add("/enums", "get", "api-enums-request", query="all", resp=("api-enums-schema", 0, "object"))
add("/filtertypes", "get", "api-filtertypes-request", query="all", resp=("api-filtertypes-schema", 0, "array"))
add("/intelfeed", "get", "api-intelfeed-request", query=["source", "sources", "fulldetails"],
    resp={"oneOf": [{"type": "array", "items": {"type": "string"}, "description": "Lista simple de entradas"},
                    {"type": "array", "items": {"$ref": "#/components/schemas/IntelfeedFulldetailsTrue"}}]})
add("/intelfeed", "post", "api-intelfeed-request", query=None,
    body_ct=["application/json", "application/x-www-form-urlencoded"],
    body_from_rows=["addentry", "addlist", "description", "expiry", "hostname", "removeall",
                    "removeentry", "source", "iagn"], resp=GENERIC_OK)
add("/mbcomments", "get", "api-mbcomments-request", query="all", resp=("api-mbcomments-schema", 0, "array"))
add("/metricdata", "get", "api-metricdata-request", query="all", resp=("api-metricdata-schema", 0, "array"))
add("/metrics", "get", "api-metrics-request", query="all", resp=("api-metrics-schema", 0, "array"))
add("/metrics/{mlid}", "get", "api-metrics-request", query="all",
    path_params=[ID("mlid", "Metric ID")], resp=("api-metrics-schema", 0, "object"))
add("/models", "get", "api-models-request", query="all", resp=("api-models-schema", 0, "array"))
add("/models/{pid}", "get", "api-models-request", query=["responsedata"],
    path_params=[ID("pid", "Model policy ID")], resp=("api-models-schema", 0, "object"))

# --- modelbreaches
add("/modelbreaches", "get", "api-modelbreaches-request", query="all",
    resp=("api-modelbreaches-schema", 0, "array"))
add("/modelbreaches/{pbid}", "get", "api-modelbreaches-request", query="all",
    path_params=[ID("pbid", "Model alert (policy breach) ID")], resp=("api-modelbreaches-schema", 0, "object"))
add("/modelbreaches/{pbid}/comments", "get", "api-modelbreaches-comments-request", query="all",
    path_params=[ID("pbid", "Model alert ID")], resp=("api-modelbreaches-comments-schema", 0, "array"))
add("/modelbreaches/{pbid}/comments", "post", "api-modelbreaches-comments-request", query=None,
    path_params=[ID("pbid", "Model alert ID")], body_ct=["application/json"],
    body={"type": "object", "required": ["message"], "properties": {"message": {"type": "string"}}},
    resp=GENERIC_OK)
add("/modelbreaches/{pbid}/acknowledge", "post", "api-modelbreaches-acknowledge-unacknowledge-request",
    query=None, path_params=[ID("pbid", "Model alert ID")],
    body_ct=["application/json", "application/x-www-form-urlencoded"],
    body={"type": "object", "required": ["acknowledge"], "properties": {"acknowledge": {"type": "boolean", "enum": [True]}}},
    resp=GENERIC_OK)
add("/modelbreaches/{pbid}/unacknowledge", "post", "api-modelbreaches-acknowledge-unacknowledge-request",
    query=None, path_params=[ID("pbid", "Model alert ID")],
    body_ct=["application/json", "application/x-www-form-urlencoded"],
    body={"type": "object", "required": ["unacknowledge"], "properties": {"unacknowledge": {"type": "boolean", "enum": [True]}}},
    resp=GENERIC_OK)

# --- red / sistema
add("/network", "get", "api-network-request", query="all", resp=("api-network-schema", 0, "object"))
add("/pcaps", "get", "api-pcaps-request", query=None, resp=("api-pcaps-schema", 0, "array"))
add("/pcaps", "post", "api-pcaps-request", query=None, body_ct=["application/json"],
    body_from_rows=True, body_required=["ip1", "start", "end"],
    resp=("api-pcaps-schema", 0, "object"))
add("/pcaps/{filename}", "get", "api-pcaps-request", query=None,
    path_params=[ID("filename", "Nombre del fichero PCAP (sin prefijo /tm)", "string")],
    resp={"binary": True})
add("/similardevices", "get", "api-similardevices-request", query="all",
    extra_q=[{"name": "did", "in": "query", "required": True, "description": "Identification number of a device modelled in the Darktrace system.",
              "schema": {"type": "integer", "format": "int64"}}],
    resp=("api-similardevices-schema", 0, "array"))
add("/status", "get", "api-status-request", query="all", resp=("api-status-schema", 0, "object"))
add("/subnets", "get", "api-subnets-request", query="get", resp=("api-subnets-schema", 0, "array"))
add("/subnets", "post", "api-subnets-request", query=None,
    body_ct=["application/json", "application/x-www-form-urlencoded"],
    body_from_rows=["sid", "label", "network", "longitude", "latitude", "dhcp", "uniqueUsernames",
                    "uniqueHostnames", "excluded", "modelExcluded"], body_required=["sid"], resp=GENERIC_OK)
add("/summarystatistics", "get", "api-summarystatistics-request", query="all",
    resp=("api-summarystatistics-schema", 0, "object"))

# --- tags
add("/tags", "get", "api-tags-request", query=["tag", "responsedata"], resp=("api-tags-schema", 0, "array"))
add("/tags", "post", "api-tags-request", query=None, body_ct=["application/json"],
    body={"type": "object", "required": ["name", "data"], "properties": {
        "name": {"type": "string", "description": "A name for the created tag."},
        "data": {"type": "object", "properties": {
            "description": {"type": "string"}, "color": {"type": "integer", "description": "HSL hue"},
            "visibility": {"type": "string", "example": "Public"}, "auto": {"type": "boolean"}}}}},
    resp=("api-tags-schema", 0, "object"))
add("/tags/{tid}", "get", "api-tags-request", query=["responsedata"],
    path_params=[ID("tid", "Tag ID")], resp=("api-tags-schema", 0, "object"))
add("/tags/{tid}", "delete", "api-tags-request", query=None,
    path_params=[ID("tid", "Tag ID")], resp=GENERIC_OK)
add("/tags/entities", "get", "api-tags-entities-request", query=["did", "tag", "responsedata", "fulldevicedetails"],
    resp=("api-tags-entities-schema", None, "array"))
add("/tags/entities", "post", "api-tags-entities-request", query=None,
    body_ct=["application/x-www-form-urlencoded"], body_from_rows=["did", "tag", "duration"],
    body_required=["did", "tag"], resp=GENERIC_OK)
add("/tags/entities", "delete", "api-tags-entities-request", query=["did", "tag"], required_q=["did", "tag"],
    resp=GENERIC_OK)
add("/tags/{tid}/entities", "get", "api-tags-tid-entities-request", query=["responsedata", "fulldevicedetails"],
    path_params=[ID("tid", "Tag ID")], resp=("api-tags-entities-schema", None, "array"))
add("/tags/{tid}/entities", "post", "api-tags-tid-entities-request", query=None,
    path_params=[ID("tid", "Tag ID")], body_ct=["application/json"],
    body={"type": "object", "required": ["entityType", "entityValue"], "properties": {
        "entityType": {"type": "string", "enum": ["Device", "Credential"]},
        "entityValue": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"type": "string"}}],
                        "description": "did (como string) o credencial; acepta array."},
        "expiryDuration": {"type": "integer", "description": "Duración opcional en segundos."}}},
    resp={"type": "array", "items": {"$ref": "#/components/schemas/TagEntity"}})
add("/tags/{tid}/entities/{teid}", "delete", "api-tags-tid-entities-request", query=None,
    path_params=[ID("tid", "Tag ID"), ID("teid", "Tag entity (relación tag-entidad) ID")], resp=GENERIC_OK)

# --- Darktrace / EMAIL (solo listado; su OpenAPI propio está en /agemail/api/api-docs)
AGEMAIL = [("get", "/admin/decode_link"), ("get", "/dash/action_summary"), ("get", "/dash/dash_stats"),
           ("get", "/dash/data_loss"), ("get", "/dash/user_anomaly"), ("post", "/emails/{uuid}/action"),
           ("get", "/emails/{uuid}"), ("get", "/emails/{uuid}/download"), ("post", "/emails/search"),
           ("get", "/resources/tags"), ("get", "/resources/actions"), ("get", "/resources/filters"),
           ("get", "/system/audit/eventTypes"), ("get", "/system/audit/events")]
for m, p in AGEMAIL:
    add("/agemail/api/ep/api/v1.0" + p, m, "api-agemail", query=None, agemail=True,
        path_params=[ID("uuid", "Email UUID", "string")] if "{uuid}" in p else [],
        body_ct=["application/json"] if m == "post" else None,
        body={"type": "object", "additionalProperties": True} if m == "post" else None,
        resp={"type": "object", "additionalProperties": True})


# ---------------------------------------------------------------- build
def main(src, dst):
    docs = {d["key"]: d for d in json.load(open(src, encoding="utf-8"))}
    parsed = {k: sections(v["html"]) for k, v in docs.items()}
    perms = {}
    for r in next(it["table"] for s in parsed["api-permissions"] for it in s["items"] if "table" in it)[1:]:
        perms[r[0].split(" ")[0]] = {"GET": r[1], "POST / DELETE": r[2]}

    components = OrderedDict()
    schema_index = {}  # key -> [(compname, title)]
    for key, secs in parsed.items():
        if not key.endswith("-schema"):
            continue
        base = docs[key]["display"].replace(" Response Schema", "").replace("(deprecated)", "")
        lst = []
        for title, rows in schema_sections(secs):
            name = comp_name(base, title) or comp_name(base)
            while name in components:
                name += "X"
            sch = build_schema(rows)
            sch["title"] = f"{base.strip()} — {title}"
            sch["description"] = f"Fuente: {DOC_BASE}{key}"
            components[name] = sch
            lst.append((name, title))
        schema_index[key] = lst
    for alias, target in (("TagEntity", schema_index["api-tags-entities-schema"][-1][0]),
                          ("IntelfeedFulldetailsTrue", schema_index["api-intelfeed-schema"][0][0])):
        if alias != target:
            components[alias] = {"$ref": "#/components/schemas/" + target}
    components["ErrorResponse"] = {"type": "object", "properties": {
        "error": {"type": "string"}, "response": {"type": "string", "example": "INPUT ERROR"}},
        "additionalProperties": True}

    paths = OrderedDict()
    for path, method, key, kw in E:
        secs = parsed[key]
        rows = param_rows(secs)
        intro = next((list(it.values())[0] for s in secs if s["h"] is None for it in s["items"]
                      if "p" in it and "This API documentation" not in list(it.values())[0]
                      and "The following article applies" not in list(it.values())[0]), "")
        notes = " ".join(list(it.values())[0] for s in secs if s["h"] == "Notes" for it in s["items"])
        op = OrderedDict()
        op["tags"] = [path.split("/")[1]]
        op["summary"] = kw.get("summary") or f"{method.upper()} {docs[key]['display']}"
        op["operationId"] = (method + "_" + re.sub(r"[^A-Za-z0-9]+", "_", path).strip("_"))
        desc = intro
        if notes and not kw.get("agemail"):
            desc += "\n\n**Notas (doc oficial):** " + notes
        pp = path.split("/")[1]
        perm = perms.get("/" + "/".join(path.split("/")[1:3]).split("{")[0].rstrip("/")) or perms.get("/" + pp)
        if perm and not kw.get("agemail"):
            desc += f"\n\n**Permiso mínimo ({'GET' if method == 'get' else 'POST / DELETE'}):** " \
                    f"{perm['GET' if method == 'get' else 'POST / DELETE']}"
        desc += f"\n\nDocumentación: {DOC_BASE}{key}"
        op["description"] = desc.strip()
        if kw.get("deprecated"):
            op["deprecated"] = True

        params = list(kw.get("path_params", []))
        q = kw.get("query")
        req_q = set(kw.get("required_q", []))
        if q == "all":
            params += [q_param(r, r["name"] in req_q) for r in rows
                       if not (method == "get" and POST_ONLY.search(r["desc"]))]
        elif q == "get":
            params += [q_param(r, r["name"] in req_q) for r in rows if not POST_ONLY.search(r["desc"])]
        elif isinstance(q, list):
            params += [q_param(r, r["name"] in req_q) for r in rows if r["name"] in q]
        params += kw.get("extra_q", [])
        # quitar duplicados path/query y nombres no válidos
        seen = set()
        params = [p for p in params if not ((p["name"], p["in"]) in seen or seen.add((p["name"], p["in"])))]
        if params:
            op["parameters"] = params

        if kw.get("body") or kw.get("body_from_rows"):
            if kw.get("body"):
                bs = kw["body"]
            else:
                names = None if kw["body_from_rows"] is True else kw["body_from_rows"]
                bs = body_schema(rows, names, required=kw.get("body_required", ()))
            op["requestBody"] = {"required": True,
                                 "content": {ct: {"schema": bs} for ct in kw.get("body_ct") or ["application/json"]}}

        resp = kw.get("resp")
        if isinstance(resp, tuple):
            skey, idx, shape = resp
            entries = schema_index[skey]
            refs = [{"$ref": f"#/components/schemas/{n}"} for n, _ in entries]
            if idx is None:
                item = {"anyOf": refs} if len(refs) > 1 else refs[0]
            else:
                item = refs[idx]
            if shape == "array":
                sch = {"type": "array", "items": item}
            elif shape == "oneOf":
                sch = {"oneOf": [item, {"type": "array", "items": item}]}
            else:
                sch = item
            variants = ", ".join(f"`{n}` ({t})" for n, t in entries)
            content = {"application/json": {"schema": sch}}
            rdesc = f"OK. Variantes de respuesta documentadas según parámetros: {variants}"
        elif isinstance(resp, dict) and resp.get("binary"):
            content = {"application/vnd.tcpdump.pcap": {"schema": {"type": "string", "format": "binary"}}}
            rdesc = "Fichero PCAP binario"
        else:
            content = {"application/json": {"schema": resp}}
            rdesc = "OK"
        op["responses"] = {
            "200": {"description": rdesc, "content": content},
            "400": {"description": "Petición inválida (p. ej. INPUT ERROR)",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
            "401": {"description": "Firma, token o fecha (DTAPI-Date) inválidos"},
            "403": {"description": "El usuario del token no tiene el permiso requerido"},
        }
        paths.setdefault(path, OrderedDict())[method] = op

    spec = OrderedDict()
    spec["openapi"] = "3.0.3"
    spec["info"] = {
        "title": "Darktrace Threat Visualizer API",
        "version": "6.1",
        "description": (
            "Schema OpenAPI generado a partir de la documentación oficial del Darktrace Customer Portal "
            "(Threat Visualizer API, documentada para 6.1).\n\n"
            "## Autenticación\n"
            "Cada petición requiere tres cabeceras:\n"
            "- `DTAPI-Token`: token público.\n"
            "- `DTAPI-Date`: fecha/hora actual (±30 min respecto al servidor, UTC), p. ej. `20230101T120000` "
            "o `2023-01-01 12:00:00`.\n"
            "- `DTAPI-Signature`: `HMAC-SHA1(private_token, \"<path+query>\\n<public_token>\\n<date>\")` en hex.\n\n"
            "El `<path+query>` es la ruta con su query string exactamente como se envía (sin host). "
            "Para POST, los parámetros/JSON del cuerpo se añaden a la cadena firmada como query: "
            "`/endpoint?param1=v1&param2=v2` o `/endpoint?{\"param1\":\"v1\"}`.\n\n"
            "Las respuestas varían según parámetros (`minimal`, `fulldevicedetails`, `deviceattop`, "
            "`historicmodelonly`, `responsedata`...); los schemas reflejan las tablas de la documentación, "
            "que Darktrace describe como no exhaustivas."
        ),
        "x-source": DOC_BASE + "api-tokens",
    }
    spec["servers"] = [{"url": "https://{instance}", "variables": {
        "instance": {"default": "darktrace.example.com",
                     "description": "IP o FQDN del master/instancia, p. ej. euw1-1234-01.cloud.darktrace.com"}}}]
    spec["security"] = [{"DTAPIToken": [], "DTAPIDate": [], "DTAPISignature": []}]
    tags_seen = []
    for p in paths:
        t = p.split("/")[1]
        if t not in tags_seen:
            tags_seen.append(t)
    spec["tags"] = [{"name": t} for t in tags_seen]
    spec["paths"] = paths
    spec["components"] = {
        "securitySchemes": {
            "DTAPIToken": {"type": "apiKey", "in": "header", "name": "DTAPI-Token", "description": "Token público"},
            "DTAPIDate": {"type": "apiKey", "in": "header", "name": "DTAPI-Date",
                          "description": "Fecha usada en la firma (±30 min respecto al servidor)"},
            "DTAPISignature": {"type": "apiKey", "in": "header", "name": "DTAPI-Signature",
                               "description": "HMAC-SHA1(private, request\\npublic\\ndate) en hexadecimal"},
        },
        "schemas": components,
    }

    class D(yaml.SafeDumper):
        pass
    D.add_representer(OrderedDict, lambda d, o: d.represent_dict(o.items()))
    D.ignore_aliases = lambda *a: True
    with open(dst, "w", encoding="utf-8") as f:
        yaml.dump(to_plain(spec), f, Dumper=D, sort_keys=False, allow_unicode=True, width=120)
    print(f"{len(paths)} paths, {sum(len(v) for v in paths.values())} operaciones, {len(components)} schemas")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
