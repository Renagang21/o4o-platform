# -*- coding: utf-8 -*-
import zipfile, os, re

out = r'C:\Users\home\OneDrive\개인계정\Documents\자일리톨 그린껌_동영상용.pptx'
if os.path.exists(out):
    os.remove(out)

files = []
for root, dirs, fs in os.walk('.'):
    for f in fs:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, '.').replace(os.sep, '/')
        if rel in ('inject.py', 'repack.py'):
            continue
        files.append(rel)

# [Content_Types].xml 가 가장 먼저 들어가도록
files.sort(key=lambda x: (x != '[Content_Types].xml', x))

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in files:
        z.write(rel, rel)

print('WROTE', out)
print('size', os.path.getsize(out))

with zipfile.ZipFile(out) as z:
    bad = z.testzip()
    print('testzip:', 'OK' if bad is None else bad)
    slides = [n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
    print('slides:', len(slides))
    s1 = z.read('ppt/slides/slide1.xml').decode('utf-8')
    print('slide1 advTm:', re.findall(r'advTm="[0-9]*"', s1))
    print('slide1 has timing:', '<p:timing>' in s1)
    print('media files:', len([n for n in z.namelist() if n.startswith('ppt/media/')]))
