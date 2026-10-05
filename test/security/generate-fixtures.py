"""Offline synthetic-only fixtures. Python stdlib HMAC is independent of TS signer.
PEM keys identify test servers only; NEVER trusted by a deployed environment.
"""
from pathlib import Path
import json, hmac, hashlib
from datetime import datetime, timedelta, timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
p = Path(__file__).parent / 'fixtures'
p.mkdir(exist_ok=True)
now = datetime(2026, 10, 5, tzinfo=timezone.utc)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'SYNTHETIC OFFLINE TEST CA')])
ca = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
      .serial_number(1001).not_valid_before(now-timedelta(days=2)).not_valid_after(now+timedelta(days=3650))
      .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True).sign(key, hashes.SHA256()))
(p/'ca.pem').write_bytes(ca.public_bytes(serialization.Encoding.PEM))
for label, host, expired in [('trusted','appliance.test',False),('wronghostname','wrong.test',False),('expired','appliance.test',True),('untrusted','appliance.test',False)]:
    leafkey=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    subject=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,host)])
    builder=(x509.CertificateBuilder().subject_name(subject).issuer_name(subject if label=='untrusted' else name)
             .public_key(leafkey.public_key()).serial_number({'trusted':2001,'wronghostname':2002,'expired':2003,'untrusted':2004}[label])
             .not_valid_before(now-timedelta(days=30)).not_valid_after(now-timedelta(days=1) if expired else now+timedelta(days=3650))
             .add_extension(x509.SubjectAlternativeName([x509.DNSName(host)]),critical=False)
             .add_extension(x509.BasicConstraints(ca=False,path_length=None),critical=True))
    cert=builder.sign(leafkey if label=='untrusted' else key,hashes.SHA256())
    (p/(label+'-cert.pem')).write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    (p/(label+'-key.pem')).write_bytes(leafkey.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
pub,priv='SYNTH_PUBLIC_CANARY_6ef9','SYNTH_PRIVATE_CANARY_8fa2'
cases=[]
for date in ['20261005T110000','2026-10-05 11:00:00']:
    for mode in [False,True]:
        for label,method,path,query,body,wire,component in [
            ('get-empty','GET','/status',[],None,'/status','/status'),
            ('get-special','GET','/devicesearch',[['q','a b"雪%+'],['empty',''],['q','two']],None,
             '/devicesearch?q=a%20b%22%E9%9B%AA%25%2B&empty=&q=two',
             '/devicesearch?q=a%20b%22%E9%9B%AA%25%2B&empty=&q=two' if mode else '/devicesearch?q=a b"雪%+&empty=&q=two'),
            ('post-json-ba','POST','/synthetic',[],{'kind':'json','text':'{"b":2,"a":"雪"}'},'/synthetic','/synthetic?{"b":2,"a":"雪"}'),
            ('post-json-ab','POST','/synthetic',[],{'kind':'json','text':'{"a":"雪","b":2}'},'/synthetic','/synthetic?{"a":"雪","b":2}'),
            ('post-form','POST','/synthetic',[],{'kind':'form','pairs':[['q','a b'],['q','+%']]},'/synthetic','/synthetic?q=a+b&q=%2B%25'),
            ('delete-primitive','DELETE','/synthetic',[['id','1']],None,'/synthetic?id=1','/synthetic?id=1'),
        ]:
            canonical=component+'\n'+pub+'\n'+date
            cases.append(dict(id=label+'-'+('encoded' if mode else 'unencoded')+'-'+date,method=method,path=path,query=query,body=body,date=date,mode=mode,wire=wire,canonical=canonical,digest=hmac.new(priv.encode(),canonical.encode(),hashlib.sha1).hexdigest()))
(p/'hmac-vectors.json').write_text(json.dumps({'provenance':'Python stdlib hmac/hashlib, manually specified canonical/wire strings; not appliance acceptance; DELETE primitive is tested only algorithmically and blocked in client','vectors':cases},ensure_ascii=False,indent=2)+'\n')
