# -*- coding: utf-8 -*-
# 사용법: python repack.py "<출력 pptx 경로>"
#   인자 없으면 환경변수 OSMU_OUT, 그것도 없으면 작업폴더에 out.pptx 생성.
#   (집 PC 등 경로가 다른 환경에서 하드코딩 경로 의존 제거)
import zipfile, os, re, sys

out = (sys.argv[1] if len(sys.argv) > 1
       else os.environ.get('OSMU_OUT')
       or os.path.abspath('out.pptx'))
if os.path.exists(out):
    os.remove(out)

files = []
for root, dirs, fs in os.walk('.'):
    for f in fs:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, '.').replace(os.sep, '/')
        if rel.endswith('.py'):
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
