#!/usr/bin/env python3
# يحوّل dist/index.html إلى صفحة جاهزة للنشر كـ Artifact (بلا وسوم html/head/body؛ المنصة تضيفها)
import re, sys
src = open('dist/index.html', encoding='utf-8').read()
title = re.search(r'<title>(.*?)</title>', src, re.S).group(1)
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', src, re.S).group(1)
styles = ''.join(re.findall(r'<style[^>]*>.*?</style>', head, re.S))
scripts = re.findall(r'<script[^>]*>.*?</script>', head + body, re.S)
body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)
scripts = [re.sub(r'<script[^>]*>', '<script type="module">', s, count=1) for s in scripts]
out = f'<title>{title}</title>\n<script>document.documentElement.dir="rtl";document.documentElement.lang="ar"</script>\n{styles}\n{body}\n' + '\n'.join(scripts)
import os; os.makedirs('out/artifact', exist_ok=True)
out = out.replace('\ufffd', '\\uFFFD'); open('out/artifact/index.html', 'w', encoding='utf-8').write(out); print(len(out), 'bytes')
