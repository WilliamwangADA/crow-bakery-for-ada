#!/usr/bin/env python3
"""通用：给静态游戏生成 App 图标 + 扫码二维码。
用法：改下面 3 个变量，在游戏仓库根目录运行 python3 make_icon_qr.py
依赖：pip install segno pillow
"""
from PIL import Image, ImageDraw
import segno, os

# ==== 改这里 ====
URL       = "https://williamwangada.github.io/crow-bakery-for-ada/index.html"
CHAR_PNG  = "assets/sprites/choco.png"  # 透明底主角图；没有就设 None 用纯色底
TOP, BOT  = (247,222,166), (196,132,60)                       # 图标背景渐变(上,下)
# ================

os.makedirs("assets/icons", exist_ok=True)

def grad(w,h,top,bot):
    img=Image.new("RGB",(w,h))
    for y in range(h):
        t=y/(h-1)
        img.paste(tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)),(0,y,w,y+1))
    return img

# ---- 512 图标(圆角渐变 + 主角) ----
S=512
base=grad(S,S,TOP,BOT).convert("RGBA")
mask=Image.new("L",(S,S),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,S-1,S-1],radius=96,fill=255)
base.putalpha(mask)
if CHAR_PNG and os.path.exists(CHAR_PNG):
    ch=Image.open(CHAR_PNG).convert("RGBA")
    cw=int(S*0.82); ch=ch.resize((cw,int(ch.height*cw/ch.width)))
    base.alpha_composite(ch,((S-ch.width)//2,max(0,S-ch.height-8)))
base.save("assets/icons/icon-512.png")
base.resize((192,192)).save("assets/icons/icon-192.png")
base.resize((180,180)).convert("RGB").save("assets/icons/apple-touch-icon.png")
print("icons ->", "assets/icons/")

# ---- 带 logo 二维码 ----
segno.make(URL,error='h').save("assets/qrcode_plain.png",scale=12,border=3,dark="#5a3410",light="#fff8e6")
q=Image.open("assets/qrcode_plain.png").convert("RGBA")
logo=Image.open("assets/icons/icon-192.png").convert("RGBA")
ls=q.width//5; logo=logo.resize((ls,ls))
pad=Image.new("RGBA",(ls+20,ls+20),(255,248,230,255))
q.alpha_composite(pad,((q.width-pad.width)//2,(q.height-pad.height)//2))
q.alpha_composite(logo,((q.width-ls)//2,(q.height-ls)//2))
q.save("assets/qrcode.png")
print("qrcode ->", "assets/qrcode.png  |", URL)
