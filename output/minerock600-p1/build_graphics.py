"""Original editable production graphics; no product-photo editing."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from html import escape
import math, json

OUT = Path(__file__).parent
FONT = 'C:/Windows/Fonts/malgun.ttf'
BOLD = 'C:/Windows/Fonts/malgunbd.ttf'
INK, BLUE, ORANGE, GREEN, PURPLE = '#153C4A', '#008DB5', '#CE6036', '#338577', '#7960AC'

class Canvas:
    def __init__(self, name, size=(1920,1080)):
        self.name, self.size = name, size
        self.base = Image.new('RGBA', size)
        self.labels = Image.new('RGBA', size)
        self.d = ImageDraw.Draw(self.base)
        self.t = ImageDraw.Draw(self.labels)
        self.shapes, self.texts = [], []
    def rect(self, box, fill, radius=0):
        self.d.rounded_rectangle(box, radius, fill=fill)
        x,y,r,b=box
        self.shapes.append(f'<rect x="{x}" y="{y}" width="{r-x}" height="{b-y}" rx="{radius}" fill="{fill}"/>')
    def circle(self,x,y,r,fill):
        self.d.ellipse((x-r,y-r,x+r,y+r),fill=fill)
        self.shapes.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>')
    def line(self, pts, fill, width=5):
        self.d.line(pts,fill=fill,width=width)
        self.shapes.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="none" stroke="{fill}" stroke-width="{width}"/>')
    def poly(self,pts,fill):
        self.d.polygon(pts,fill=fill)
        self.shapes.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="{fill}"/>')
    def text(self,x,y,s,size=40,fill=INK,bold=False,center=False):
        f=ImageFont.truetype(BOLD if bold else FONT,size)
        self.t.text((x,y),s,font=f,fill=fill,anchor='mt' if center else 'lt')
        self.texts.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" text-anchor="{"middle" if center else "start"}" font-family="Malgun Gothic,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{fill}">{escape(s)}</text>')
    def arrow(self,x,y1,y2,fill):
        self.line([(x,y1),(x,y2)],fill,14)
        sign=1 if y2>y1 else -1
        self.poly([(x,y2),(x-22,y2-sign*35),(x+22,y2-sign*35)],fill)
    def save(self):
        im=Image.alpha_composite(self.base,self.labels)
        im.save(OUT/f'{self.name}.png')
        self.base.save(OUT/f'{self.name}-base.png')
        self.labels.save(OUT/f'{self.name}-labels.png')
        w,h=self.size
        (OUT/f'{self.name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><g id="graphics">{"".join(self.shapes)}</g><g id="editable-labels">{"".join(self.texts)}</g></svg>',encoding='utf-8')

minerals=[('Na','나트륨',BLUE),('K','칼륨',ORANGE),('Mg','마그네슘',GREEN),('Ca','칼슘',PURPLE)]
for symbol,label,color in minerals:
    c=Canvas('mineral-'+symbol,(512,512))
    c.circle(256,256,234,color)
    c.text(256,142,symbol,142,'#FFFFFF',True,True)
    c.text(256,330,label, 40,'#FFFFFF',False,True)
    c.save()

c=Canvas('mineral-icon-set')
c.rect((0,0,1920,1080),'#F4FAFC')
c.text(110,90,'미네랄 기본 기호',66,bold=True)
c.text(110,184,'영상 전편에 공통으로 사용하는 색상과 표기',32)
for i,(symbol,label,color) in enumerate(minerals):
    x=285+i*450
    c.circle(x,545,165,color)
    c.text(x,445,symbol,110,'#FFFFFF',True,True)
    c.text(x,590,label,37,'#FFFFFF',False,True)
c.text(110,950,'원소 기호 표기 · 제품의 함량이나 효능을 뜻하지 않음',28)
c.save()

def membrane(name,title):
    c=Canvas(name)
    c.rect((0,0,1920,1080),'#F4FAFC')
    c.rect((0,660,1920,1080),'#E4F3EF')
    c.text(100,70,title,60,bold=True)
    c.text(100,235,'세포 밖',48,bold=True)
    c.text(100,815,'세포 안',48,bold=True)
    c.rect((100,488,1820,660),'#D2E8EC',22)
    for x in range(130,1810,42):
        c.circle(x,510,14,'#79B7C2'); c.circle(x,638,14,'#79B7C2')
        c.line([(x-5,526),(x-5,564)],'#79B7C2',5)
        c.line([(x+5,526),(x+5,564)],'#79B7C2',5)
        c.line([(x-5,622),(x-5,584)],'#79B7C2',5)
        c.line([(x+5,622),(x+5,584)],'#79B7C2',5)
    c.text(1490,695,'세포막',34,bold=True)
    return c
c=membrane('cell-base','세포와 세포막')
c.text(100,970,'설명용 개념도 · 실제 크기와 구조를 단순화',26)
c.save()
c=membrane('na-k-pump-static','Na+/K+ 펌프')
c.rect((670,420,1280,730),'#FFFFFF',90)
c.rect((680,430,1270,720),'#315B69',84)
c.arrow(790,810,340,BLUE)
c.arrow(1160,340,810,ORANGE)
c.text(790,270,'3 Na+ → 세포 밖',43,BLUE,True,True)
c.text(1190,840,'2 K+ → 세포 안',43,ORANGE,True,True)
c.text(978,535,'Na+/K+',38,'#FFFFFF',True,True)
c.text(978,587,'ATPase',34,'#FFFFFF',False,True)
c.rect((500,867,990,940),'#E6DDF3',20)
c.text(745,881,'ATP → ADP + Pi',35,PURPLE,True,True)
c.text(100,1000,'1 ATP당 이동량 · 한 주기의 순이동을 나타낸 개념도',25)
c.save()

c=Canvas('east-sea-bedrock-reference')
c.rect((0,0,1920,1080),'#F4FAFC')
c.text(100,75,'동해 · 암반수',64,bold=True)
c.text(100,175,'미네락600 기존 공개 상세페이지의 취수 스토리 참고',31)
c.rect((100,285,1160,880),'#D9EDF4',28)
for y,col in [(390,'#8BC5D7'),(530,'#48A0BD'),(700,'#226A87')]:
    c.rect((100,y,1160,880),col,10)
c.poly([(700,530),(840,485),(930,375),(1060,330),(1160,350),(1160,880),(700,880)],'#A9B5AE')
c.poly([(700,670),(855,585),(965,560),(1160,575),(1160,880),(700,880)],'#727E79')
c.text(185,320,'동해',46,bold=True)
c.text(920,745,'암반',39,'#FFFFFF',True)
c.rect((1220,285,1820,880),'#FFFFFF',28)
c.text(1270,340,'1,050m',70,BLUE,True)
c.text(1270,440,'암반수',46,bold=True)
c.text(1270,550,'기존 원문 표현',30)
c.text(1270,615,'해양 수심 표기가 아님',29)
c.text(1270,725,'심층수와 암반수는',28)
c.text(1270,770,'구분하여 설명',28)
c.text(100,950,'참고 개념도 · 위치·축척·실제 취수 경로를 재현한 도면이 아님',28)
c.save()

names=['mineral-icon-set','cell-base','na-k-pump-static','east-sea-bedrock-reference']
sheet=Image.new('RGB',(1280,720),'white')
for i,name in enumerate(names):
    im=Image.open(OUT/f'{name}.png').convert('RGB').resize((640,360))
    sheet.paste(im,((i%2)*640,(i//2)*360))
sheet.save(OUT/'graphics-review-sheet.jpg',quality=95)
print(json.dumps({'graphics':names,'icons':[x[0] for x in minerals],'format':'PNG + base/labels layers + editable SVG'},ensure_ascii=False))
