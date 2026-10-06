"""Offline independent KAT generator; NEVER invoked by the security suite.

Trace: LegendEvent/darktrace-sdk v0.10.1 auth.py get_headers /
generate_signature, dt_utils.py _delete, dt_advanced_search.py search.
SDK params are sorted; repeated values retain order. The encoded mode is a
separate operator option, not a claim that the SDK uses encoded signatures.
Review fixture changes independently; do not record the production signer.
"""
import hashlib
import hmac
import json
from urllib.parse import quote

public = 'SYNTH_PUBLIC_CANARY_6ef9'
private = 'SYNTH_PRIVATE_CANARY_8fa2'
date = '2026-10-06 12:00:00'
query = [('empty', ''), ('q', 'space é "quote"'), ('q', 'second+/%')]
search = {'search': '???>???', 'fields': ['timestamp'], 'timeframe': '3600'}
import base64
hash_path = base64.b64encode(json.dumps(search, ensure_ascii=False, separators=(',', ':')).encode()).decode()
assert all(c in hash_path for c in '+/=')
vectors = []
for shape, method, path, pairs, body in [
    ('S4', 'POST', '/synthetic', query, '{"message":"\\u00e9 \\"quote\\"","empty":""}'),
    ('S5', 'DELETE', '/tags/entities', [('did', '7'), ('tag', 'space é/+%')], None),
    ('S6', 'GET', '/advancedsearch/api/search/' + hash_path, [], None),
]:
    for encoded in [False, True]:
        encode = lambda s: quote(s, safe='-._~')
        signed_query = '&'.join((encode(k) if encoded else k) + '=' + (encode(v) if encoded else v) for k, v in pairs)
        wire_query = '&'.join(encode(k) + '=' + encode(v) for k, v in pairs)
        first = path + ('?' + signed_query if signed_query else '')
        if body is not None:
            first += ('&' if signed_query else '?') + body
        message = first + '\n' + public + '\n' + date
        vectors.append(dict(shape=shape, method=method, path=path, query=pairs, jsonText=body, encoded=encoded,
                            date=date, firstComponent=first, hmacInput=message,
                            signature=hmac.new(private.encode('ascii'), message.encode(), hashlib.sha1).hexdigest(),
                            wirePath=path + ('?' + wire_query if wire_query else ''), httpBody=body))
print(json.dumps({'provenance': {
    'sdk': 'LegendEvent/darktrace-sdk v0.10.1',
    'source': 'https://github.com/LegendEvent/darktrace-sdk/tree/v0.10.1/darktrace',
    'algorithm': 'auth.py get_headers/generate_signature; dt_utils.py _delete; dt_advanced_search.py search',
    'generator': 'test/security/writes-vectors.py (Python stdlib, independent of production)',
    'review': 'new adversarial fixture; independent reviewer acceptance remains required',
}, 'vectors': vectors, 'searchDocument': search}, ensure_ascii=False, indent=2))
