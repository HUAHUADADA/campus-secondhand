import json
import os
import re
import subprocess
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
errors = []
warnings = []

def err(msg):
    errors.append(msg)

def warn(msg):
    warnings.append(msg)

def check_json(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        err('JSON 解析失败 %s: %s' % (path.name, e))
        return None

def check_js(path):
    r = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
    if r.returncode != 0:
        err('JS 语法错误 %s: %s' % (path.name, r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'unknown'))

app_json = check_json(ROOT / 'miniprogram' / 'app.json')

if app_json:
    for page in app_json.get('pages', []):
        for ext in ('js', 'wxml', 'wxss', 'json'):
            p = ROOT / 'miniprogram' / (page + '.' + ext)
            if not p.exists():
                err('缺少页面文件 %s' % p)
            else:
                if ext == 'json':
                    check_json(p)
                elif ext == 'js':
                    check_js(p)
                elif ext == 'wxml':
                    content = p.read_text(encoding='utf-8')
                    if not content.strip():
                        err('WXML 为空 %s' % p)
    for tab in app_json.get('tabBar', {}).get('list', []):
        for k in ('iconPath', 'selectedIconPath'):
            p = ROOT / 'miniprogram' / tab[k]
            if not p.exists():
                err('缺少 tab 图标 %s' % p)

for json_path in (ROOT / 'miniprogram').rglob('*.json'):
    if json_path.name != 'app.json':
        check_json(json_path)

for js_path in (ROOT / 'miniprogram').rglob('*.js'):
    if js_path.name != 'app.js':
        check_js(js_path)

cf_root = ROOT / 'cloudfunctions'
funcs = [p.name for p in cf_root.iterdir() if p.is_dir()]
if len(funcs) != 10:
    err('云函数数量 %d，应为 10' % len(funcs))

for fn in sorted(funcs):
    d = cf_root / fn
    idx = d / 'index.js'
    pkg = d / 'package.json'
    if not idx.exists():
        err('云函数 %s 缺少 index.js' % fn)
        continue
    check_js(idx)
    if not pkg.exists():
        err('云函数 %s 缺少 package.json' % fn)
    else:
        pkg_data = check_json(pkg)
        if pkg_data and 'wx-server-sdk' not in str(pkg_data.get('dependencies', {})):
            err('云函数 %s 缺少 wx-server-sdk 依赖' % fn)

for wxml in (ROOT / 'miniprogram').rglob('*.wxml'):
    content = wxml.read_text(encoding='utf-8')
    opens = re.findall(r'<([a-zA-Z][a-zA-Z0-9-]*)(\s|>)', content)
    closes = re.findall(r'</([a-zA-Z][a-zA-Z0-9-]*)>', content)
    self_closing = re.findall(r'<([a-zA-Z][a-zA-Z0-9-]*)[^>]*/>', content)
    from collections import Counter
    co, cc, cs = Counter(o[0] for o in opens), Counter(closes), Counter(s for s in self_closing)
    for tag, n in co.items():
        if tag in ('input', 'image', 'switch', 'icon', 'progress', 'slider', 'checkbox', 'radio', 'import', 'include'):
            continue
        if cc[tag] + cs[tag] < n:
            err('WXML 标签未闭合 %s: <%s> %d 处' % (wxml.name, tag, n))

if not (ROOT / 'admin' / 'index.html').exists():
    err('缺少管理后台 admin/index.html')

if not (ROOT / 'README.md').exists():
    err('缺少 README.md')

if not (ROOT / 'project.config.json').exists():
    err('缺少 project.config.json')

print('云函数: %s' % ', '.join(sorted(funcs)))
print('错误: %d' % len(errors))
for e in errors:
    print('  [ERROR] ' + e)
for w in warnings:
    print('  [WARN] ' + w)
sys.exit(1 if errors else 0)
