# -*- coding: utf-8 -*-
# 병합 후: 슬라이드의 실제 도형을 읽어 애니메이션/전환/자동진행 동적 주입
import sys
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re

KEY_PIC = {1: 7}
TRANSITIONS = {1:'<p:fade/>',2:'<p:push dir="l"/>',3:'<p:fade/>',4:'<p:push dir="l"/>',
 5:'<p:fade/>',6:'<p:push dir="l"/>',7:'<p:fade/>',8:'<p:push dir="l"/>',
 9:'<p:fade/>',10:'<p:push dir="l"/>',11:'<p:fade/>',12:'<p:fade/>'}
STAGGER=1300; TEXT_DUR=1400; IMG_DUR=950; EMPH_DUR=900; EMPH_SCALE=112000; READ_TAIL=3500
AE={'fade':(10,0,'fade'),'wipeL':(22,2,'wipe(left)'),'wipeUp':(22,1,'wipe(up)'),
 'box':(25,0,'box(out)'),'circle':(27,0,'circle(out)'),'wheel':(26,0,'wheel(1)'),
 'wipeR':(22,4,'wipe(right)'),'dissolve':(9,0,'dissolve'),'wipeD':(22,8,'wipe(down)')}
IMG_PALETTE=['wipeL','box','wipeUp','wheel','circle','wipeR','dissolve','wipeD']

class G:
    def __init__(s,v): s.v=v
    def n(s):
        v=s.v; s.v+=1; return v

def setv(spid,g):
    return (f'<p:set><p:cBhvr><p:cTn id="{g.n()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="visible"/></p:to></p:set>')

def entr(spid,name,g,delay,dur):
    pid,sub,filt=AE[name]; ep=g.n(); cid=g.n()
    eff=(f'<p:animEffect transition="in" filter="{filt}"><p:cBhvr><p:cTn id="{cid}" dur="{dur}"/>'
         f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>')
    return (f'<p:par><p:cTn id="{ep}" presetID="{pid}" presetClass="entr" presetSubtype="{sub}" fill="hold" nodeType="afterEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'+setv(spid,g)+eff+'</p:childTnLst></p:cTn></p:par>')

def emph(spid,g,delay):
    return (f'<p:par><p:cTn id="{g.n()}" presetID="6" presetClass="emph" presetSubtype="0" fill="hold" nodeType="afterEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            f'<p:animScale><p:cBhvr additive="base"><p:cTn id="{g.n()}" dur="{EMPH_DUR}" autoRev="1" fill="hold">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr>'
            f'<p:by x="{EMPH_SCALE}" y="{EMPH_SCALE}"/></p:animScale></p:childTnLst></p:cTn></p:par>')

for n in range(1,13):
    path=f'ppt/slides/slide{n}.xml'
    s=open(path,encoding='utf-8').read()
    s=re.sub(r'<p:transition\b.*?</p:transition>','',s,flags=re.S)
    s=re.sub(r'<p:transition\b[^>]*/>','',s,flags=re.S)
    s=re.sub(r'<p:timing\b.*?</p:timing>','',s,flags=re.S)

    shapes=[]
    for m in re.finditer(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>',s,re.S):
        b=m.group(0)
        off=re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>',b)
        pid=re.search(r'<p:cNvPr id="(\d+)"',b)
        if not off or not pid: continue
        shapes.append(dict(id=int(pid.group(1)), y=int(off.group(2)), is_text='<a:t>' in b))
    shapes.sort(key=lambda x:x['y'])
    pics=[x for x in shapes if not x['is_text']]
    key=KEY_PIC.get(n, pics[0]['id'] if pics else None)

    g=G(4); inner=[]; pic_pos=0
    for i,sh in enumerate(shapes):
        delay=i*STAGGER; grp=g.n(); effs=[]
        if sh['is_text']:
            name='wipeL' if n%2==1 else 'fade'
            effs.append(entr(sh['id'],name,g,0,TEXT_DUR))
        else:
            name=IMG_PALETTE[(n-1+pic_pos*3)%len(IMG_PALETTE)]; pic_pos+=1
            effs.append(entr(sh['id'],name,g,0,IMG_DUR))
            if sh['id']==key: effs.append(emph(sh['id'],g,IMG_DUR+250))
        inner.append(f'<p:par><p:cTn id="{grp}" fill="hold"><p:stCondLst><p:cond delay="{delay}"/></p:stCondLst>'
                     f'<p:childTnLst>'+''.join(effs)+'</p:childTnLst></p:cTn></p:par>')
    timing=('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            +''.join(inner)+'</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn>'
            '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
            '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')
    adv=len(shapes)*STAGGER+READ_TAIL
    trans=f'<p:transition spd="slow" advClick="1" advTm="{adv}">{TRANSITIONS[n]}</p:transition>'
    s=s.replace('</p:sld>', trans+timing+'</p:sld>')
    open(path,'w',encoding='utf-8').write(s)
    print(f"slide{n}: shapes={[x['id'] for x in shapes]} key={key}")
print("DONE")
