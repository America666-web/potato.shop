import urllib.request, json
url='http://localhost:3000/api/register'
data=json.dumps({'email':'tmp_reg_user','password':'pwd12345'}).encode('utf-8')
req=urllib.request.Request(url, data=data, headers={'Content-Type':'application/json'})
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        print('STATUS', r.status)
        print(r.read().decode())
except Exception as e:
    print('ERROR', e)
