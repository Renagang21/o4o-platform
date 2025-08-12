import{a1 as B,a2 as F,r as a,V as p,j as e,bU as O,bN as T,cA as W,cB as D,b_ as $,b$ as E,B as L,$ as R,bZ as A,F as U,v as I,bX as G,G as H,P as V,T as q,p as J}from"./vendor-react-BZRIq8oW.js";import{B as o}from"./page-gutenberg-iVBL5IS_.js";import"./wp-block-editor-C14Ds6es.js";import"./wp-blocks-CnCGET8b.js";import"./wp-core-BctBwZpo.js";import"./wp-i18n-Niz9RVma.js";import"./wp-element-CB9_H0_F.js";import"./vendor-ui-BkLtITBR.js";import"./vendor-monaco-cpVGocfO.js";import"./vendor-query-GrNIwsDq.js";import"./vendor-utils-DQ8F5vJI.js";import"./wp-components-CLkQS2qf.js";const ie=()=>{const h=B(),{id:v}=F(),c=a.useRef(null),[i,f]=a.useState(null),[j,x]=a.useState(!0),[n,m]=a.useState("desktop"),[u,w]=a.useState("home"),[l,N]=a.useState(!1),[y,C]=a.useState(!1),[r,t]=a.useState({primaryColor:"#3b82f6",secondaryColor:"#8b5cf6",fontFamily:"Inter",fontSize:"16px",containerWidth:"1200px",sidebarPosition:"right"});a.useEffect(()=>{k()},[v]),a.useEffect(()=>{b()},[r,l]);const k=async()=>{try{x(!0),f(z())}catch(s){console.error("Error fetching preview data:",s),p.error("Failed to load theme preview")}finally{x(!1)}},z=()=>({theme:{id:"1",name:"Modern Business",version:"2.1.0",colorSchemes:[{name:"Default",colors:{primary:"#3b82f6",secondary:"#8b5cf6"}},{name:"Ocean",colors:{primary:"#0ea5e9",secondary:"#06b6d4"}},{name:"Forest",colors:{primary:"#10b981",secondary:"#059669"}},{name:"Sunset",colors:{primary:"#f97316",secondary:"#f59e0b"}}],layoutOptions:{containerWidth:["1000px","1200px","1400px","full"],sidebarPosition:["left","right","none"]},typography:{fonts:["Inter","Roboto","Open Sans","Lato","Poppins"],sizes:["14px","16px","18px"]}},styles:[],scripts:[],templates:[]}),S=()=>{switch(n){case"mobile":return"375px";case"tablet":return"768px";case"desktop":default:return"100%"}},b=()=>{if(!c.current?.contentWindow)return;const s=c.current.contentWindow.document,d=s.createElement("style");d.innerHTML=`
      :root {
        --primary-color: ${r.primaryColor};
        --secondary-color: ${r.secondaryColor};
        --font-family: ${r.fontFamily}, sans-serif;
        --font-size: ${r.fontSize};
        --container-width: ${r.containerWidth};
        --theme-mode: ${l?"dark":"light"};
      }
      
      ${l?`
        body {
          background-color: #1a1a1a !important;
          color: #ffffff !important;
        }
        .header, .footer {
          background-color: #2a2a2a !important;
        }
      `:""}
      
      body {
        font-family: var(--font-family);
        font-size: var(--font-size);
      }
      
      .container {
        max-width: var(--container-width);
        margin: 0 auto;
      }
      
      .primary-color {
        color: var(--primary-color);
      }
      
      .secondary-color {
        color: var(--secondary-color);
      }
      
      .primary-bg {
        background-color: var(--primary-color);
      }
      
      .secondary-bg {
        background-color: var(--secondary-color);
      }
    `;const g=s.getElementById("theme-customizations");g&&g.remove(),d.id="theme-customizations",s.head.appendChild(d)},P=()=>({home:`
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Modern Business</h1>
            <nav style="padding-bottom: 20px;">
              <a href="#" style="color: white; margin-right: 20px;">Home</a>
              <a href="#" style="color: white; margin-right: 20px;">About</a>
              <a href="#" style="color: white; margin-right: 20px;">Services</a>
              <a href="#" style="color: white; margin-right: 20px;">Blog</a>
              <a href="#" style="color: white;">Contact</a>
            </nav>
          </div>
        </div>
        
        <div class="hero secondary-bg" style="padding: 60px 0; text-align: center;">
          <div class="container">
            <h2 style="color: white; font-size: 2.5em; margin-bottom: 20px;">Welcome to Modern Business</h2>
            <p style="color: white; font-size: 1.2em; margin-bottom: 30px;">Professional solutions for your business needs</p>
            <button style="background: white; color: var(--primary-color); padding: 12px 30px; border: none; border-radius: 5px; font-size: 1.1em; cursor: pointer;">Get Started</button>
          </div>
        </div>
        
        <div class="features" style="padding: 60px 0;">
          <div class="container">
            <h3 style="text-align: center; font-size: 2em; margin-bottom: 40px;" class="primary-color">Our Features</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--primary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>Fast Performance</h4>
                <p>Lightning fast loading speeds for better user experience</p>
              </div>
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--secondary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>Responsive Design</h4>
                <p>Looks great on all devices and screen sizes</p>
              </div>
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--primary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>SEO Optimized</h4>
                <p>Built with search engines in mind</p>
              </div>
            </div>
          </div>
        </div>
      `,blog:`
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Blog</h1>
          </div>
        </div>
        
        <div class="blog-content" style="padding: 40px 0;">
          <div class="container">
            <article style="margin-bottom: 40px; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 class="primary-color">Getting Started with Modern Business Theme</h2>
              <p style="color: #666; margin: 10px 0;">Published on January 15, 2024</p>
              <p>Learn how to set up and customize the Modern Business theme for your website. This comprehensive guide covers installation, configuration, and best practices...</p>
              <a href="#" class="secondary-color">Read More →</a>
            </article>
            
            <article style="margin-bottom: 40px; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 class="primary-color">10 Tips for Better Website Performance</h2>
              <p style="color: #666; margin: 10px 0;">Published on January 10, 2024</p>
              <p>Discover essential tips and techniques to optimize your website's performance. From image optimization to caching strategies...</p>
              <a href="#" class="secondary-color">Read More →</a>
            </article>
          </div>
        </div>
      `,shop:`
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Shop</h1>
          </div>
        </div>
        
        <div class="shop-content" style="padding: 40px 0;">
          <div class="container">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
              <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <div style="height: 200px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));"></div>
                <div style="padding: 15px;">
                  <h3>Product Name</h3>
                  <p style="color: #666;">Brief product description</p>
                  <p style="font-size: 1.5em; color: var(--primary-color); margin: 10px 0;">$99.99</p>
                  <button style="width: 100%; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Add to Cart</button>
                </div>
              </div>
              <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <div style="height: 200px; background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));"></div>
                <div style="padding: 15px;">
                  <h3>Product Name</h3>
                  <p style="color: #666;">Brief product description</p>
                  <p style="font-size: 1.5em; color: var(--primary-color); margin: 10px 0;">$149.99</p>
                  <button style="width: 100%; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,about:`
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">About Us</h1>
          </div>
        </div>
        
        <div class="about-content" style="padding: 40px 0;">
          <div class="container">
            <h2 class="primary-color" style="margin-bottom: 20px;">Our Story</h2>
            <p style="line-height: 1.8; margin-bottom: 20px;">Founded in 2020, Modern Business has been helping companies transform their digital presence. We believe in creating beautiful, functional websites that drive results.</p>
            <p style="line-height: 1.8; margin-bottom: 30px;">Our team of experts specializes in web design, development, and digital marketing solutions tailored to your business needs.</p>
            
            <h3 class="secondary-color" style="margin-bottom: 20px;">Our Values</h3>
            <ul style="line-height: 2;">
              <li>Quality First - We never compromise on quality</li>
              <li>Customer Success - Your success is our success</li>
              <li>Innovation - Always staying ahead of the curve</li>
              <li>Transparency - Open and honest communication</li>
            </ul>
          </div>
        </div>
      `,contact:`
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Contact Us</h1>
          </div>
        </div>
        
        <div class="contact-content" style="padding: 40px 0;">
          <div class="container">
            <div style="max-width: 600px; margin: 0 auto;">
              <form>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Name</label>
                  <input type="text" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" />
                </div>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Email</label>
                  <input type="email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" />
                </div>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Message</label>
                  <textarea style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 150px;"></textarea>
                </div>
                <button type="submit" style="width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 5px; font-size: 1.1em; cursor: pointer;">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      `})[u],M=async()=>{try{p.success("테마가 적용되었습니다"),h("/themes")}catch(s){console.error("Error applying theme:",s),p.error("테마 적용에 실패했습니다")}};return j?e.jsx("div",{className:"flex items-center justify-center h-96",children:e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"})}):e.jsxs("div",{className:"h-screen flex flex-col bg-gray-100",children:[e.jsxs("div",{className:"bg-white border-b px-4 py-3 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs(o,{variant:"ghost",size:"sm",onClick:()=>h("/themes/marketplace"),children:[e.jsx(O,{className:"w-4 h-4 mr-1"}),"뒤로"]}),e.jsxs("h1",{className:"text-lg font-semibold",children:[i?.theme.name," - 미리보기"]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex gap-1 border rounded-lg p-1",children:[e.jsx(o,{variant:n==="desktop"?"default":"ghost",size:"sm",onClick:()=>m("desktop"),children:e.jsx(T,{className:"w-4 h-4"})}),e.jsx(o,{variant:n==="tablet"?"default":"ghost",size:"sm",onClick:()=>m("tablet"),children:e.jsx(W,{className:"w-4 h-4"})}),e.jsx(o,{variant:n==="mobile"?"default":"ghost",size:"sm",onClick:()=>m("mobile"),children:e.jsx(D,{className:"w-4 h-4"})})]}),e.jsx(o,{variant:"outline",size:"sm",onClick:()=>N(!l),children:l?e.jsx($,{className:"w-4 h-4"}):e.jsx(E,{className:"w-4 h-4"})}),e.jsxs(o,{variant:"outline",size:"sm",onClick:()=>C(!y),children:[e.jsx(L,{className:"w-4 h-4 mr-1"}),"사용자 정의"]}),e.jsxs(o,{onClick:M,children:[e.jsx(R,{className:"w-4 h-4 mr-1"}),"테마 적용"]})]})]}),e.jsxs("div",{className:"bg-white border-b px-4 py-2 flex items-center gap-2",children:[e.jsx("span",{className:"text-sm text-gray-600 mr-2",children:"페이지:"}),["home","blog","shop","about","contact"].map(s=>e.jsxs(o,{variant:u===s?"default":"ghost",size:"sm",onClick:()=>w(s),children:[s==="home"&&e.jsx(A,{className:"w-4 h-4 mr-1"}),s==="blog"&&e.jsx(U,{className:"w-4 h-4 mr-1"}),s==="shop"&&e.jsx(I,{className:"w-4 h-4 mr-1"}),s==="about"&&e.jsx(G,{className:"w-4 h-4 mr-1"}),s==="contact"&&e.jsx(H,{className:"w-4 h-4 mr-1"}),s.charAt(0).toUpperCase()+s.slice(1)]},s))]}),e.jsxs("div",{className:"flex-1 flex overflow-hidden",children:[y&&e.jsx("div",{className:"w-80 bg-white border-r overflow-y-auto",children:e.jsxs("div",{className:"p-4 space-y-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"font-semibold mb-3 flex items-center gap-2",children:[e.jsx(V,{className:"w-4 h-4"}),"색상"]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"기본 색상"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"color",value:r.primaryColor,onChange:s=>t({...r,primaryColor:s.target.value}),className:"w-12 h-8 border rounded cursor-pointer"}),e.jsx("input",{type:"text",value:r.primaryColor,onChange:s=>t({...r,primaryColor:s.target.value}),className:"flex-1 px-2 py-1 border rounded text-sm"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"보조 색상"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"color",value:r.secondaryColor,onChange:s=>t({...r,secondaryColor:s.target.value}),className:"w-12 h-8 border rounded cursor-pointer"}),e.jsx("input",{type:"text",value:r.secondaryColor,onChange:s=>t({...r,secondaryColor:s.target.value}),className:"flex-1 px-2 py-1 border rounded text-sm"})]})]})]}),i?.theme.colorSchemes&&e.jsxs("div",{className:"mt-3",children:[e.jsx("label",{className:"block text-sm font-medium mb-2",children:"색상 스키마"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:i.theme.colorSchemes.map((s,d)=>e.jsxs("button",{onClick:()=>t({...r,primaryColor:s.colors.primary,secondaryColor:s.colors.secondary}),className:"p-2 border rounded text-sm hover:bg-gray-50",children:[e.jsxs("div",{className:"flex gap-1 mb-1",children:[e.jsx("div",{className:"w-4 h-4 rounded",style:{backgroundColor:s.colors.primary}}),e.jsx("div",{className:"w-4 h-4 rounded",style:{backgroundColor:s.colors.secondary}})]}),e.jsx("span",{className:"text-xs",children:s.name})]},d))})]})]}),e.jsxs("div",{children:[e.jsxs("h3",{className:"font-semibold mb-3 flex items-center gap-2",children:[e.jsx(q,{className:"w-4 h-4"}),"타이포그래피"]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"폰트"}),e.jsx("select",{value:r.fontFamily,onChange:s=>t({...r,fontFamily:s.target.value}),className:"w-full px-2 py-1 border rounded text-sm",children:i?.theme.typography?.fonts.map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"크기"}),e.jsx("select",{value:r.fontSize,onChange:s=>t({...r,fontSize:s.target.value}),className:"w-full px-2 py-1 border rounded text-sm",children:i?.theme.typography?.sizes.map(s=>e.jsx("option",{value:s,children:s},s))})]})]})]}),e.jsxs("div",{children:[e.jsxs("h3",{className:"font-semibold mb-3 flex items-center gap-2",children:[e.jsx(J,{className:"w-4 h-4"}),"레이아웃"]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"컨테이너 너비"}),e.jsx("select",{value:r.containerWidth,onChange:s=>t({...r,containerWidth:s.target.value}),className:"w-full px-2 py-1 border rounded text-sm",children:i?.theme.layoutOptions?.containerWidth.map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium mb-1",children:"사이드바 위치"}),e.jsx("select",{value:r.sidebarPosition,onChange:s=>t({...r,sidebarPosition:s.target.value}),className:"w-full px-2 py-1 border rounded text-sm",children:i?.theme.layoutOptions?.sidebarPosition.map(s=>e.jsx("option",{value:s,children:s==="none"?"없음":s==="left"?"왼쪽":"오른쪽"},s))})]})]})]})]})}),e.jsx("div",{className:"flex-1 flex items-center justify-center p-8",children:e.jsx("div",{className:"bg-white shadow-2xl transition-all duration-300",style:{width:S(),height:n==="mobile"?"667px":n==="tablet"?"1024px":"90%",maxWidth:"100%",borderRadius:n==="mobile"?"20px":"8px",overflow:"hidden"},children:e.jsx("iframe",{ref:c,srcDoc:`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                      line-height: 1.6;
                    }
                  </style>
                </head>
                <body>
                  ${P()}
                </body>
                </html>
              `,className:"w-full h-full border-0",onLoad:b})})})]})]})};export{ie as default};
