import{a1 as R,a2 as D,r as a,V as i,j as e,bu as U,B as $,X as H,$ as V,S as q,F as A,y as I,dC as Q,k as Y,C as G,c as W,b as X,da as J,cp as K,d7 as Z}from"./vendor-react-BZRIq8oW.js";import{B as o}from"./page-gutenberg-iVBL5IS_.js";import"./wp-block-editor-C14Ds6es.js";import"./wp-blocks-CnCGET8b.js";import"./wp-core-BctBwZpo.js";import"./wp-i18n-Niz9RVma.js";import"./wp-element-CB9_H0_F.js";import"./vendor-ui-BkLtITBR.js";import"./vendor-monaco-cpVGocfO.js";import"./vendor-query-GrNIwsDq.js";import"./vendor-utils-DQ8F5vJI.js";import"./wp-components-CLkQS2qf.js";const he=()=>{const y=R(),{id:v}=D(),[j,b]=a.useState([]),[r,w]=a.useState(null),[c,N]=a.useState(new Set),[S,F]=a.useState(""),[d,h]=a.useState(!1),[T,m]=a.useState(!0),[l,x]=a.useState(!1),[p,g]=a.useState(""),[u,C]=a.useState("vs-dark"),k=a.useRef(null);a.useEffect(()=>{E()},[v]),a.useEffect(()=>{const t=n=>{l&&(n.preventDefault(),n.returnValue="")};return window.addEventListener("beforeunload",t),()=>window.removeEventListener("beforeunload",t)},[l]);const E=async()=>{try{m(!0),b(_())}catch(t){console.error("Error fetching theme files:",t),i.error("Failed to load theme files")}finally{m(!1)}},_=()=>[{name:"styles",path:"/styles",type:"directory",children:[{name:"main.css",path:"/styles/main.css",type:"file",language:"css",content:`/* Main Theme Styles */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --text-color: #1a1a1a;
  --bg-color: #ffffff;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  color: var(--text-color);
  background-color: var(--bg-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}`},{name:"responsive.css",path:"/styles/responsive.css",type:"file",language:"css",content:`/* Responsive Styles */
@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }
  
  .header {
    padding: 15px 0;
  }
}`}]},{name:"templates",path:"/templates",type:"directory",children:[{name:"header.php",path:"/templates/header.php",type:"file",language:"php",content:`<?php
/**
 * Theme Header Template
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header class="header">
    <div class="container">
      <h1><?php bloginfo('name'); ?></h1>
      <nav><?php wp_nav_menu(['theme_location' => 'primary']); ?></nav>
    </div>
  </header>`},{name:"footer.php",path:"/templates/footer.php",type:"file",language:"php",content:`<?php
/**
 * Theme Footer Template
 */
?>
  <footer class="footer">
    <div class="container">
      <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?></p>
    </div>
  </footer>
  <?php wp_footer(); ?>
</body>
</html>`},{name:"index.php",path:"/templates/index.php",type:"file",language:"php",content:`<?php
/**
 * Main Template File
 */
get_header();
?>

<main class="main">
  <div class="container">
    <?php if (have_posts()) : ?>
      <?php while (have_posts()) : the_post(); ?>
        <article>
          <h2><?php the_title(); ?></h2>
          <?php the_content(); ?>
        </article>
      <?php endwhile; ?>
    <?php endif; ?>
  </div>
</main>

<?php get_footer(); ?>`}]},{name:"scripts",path:"/scripts",type:"directory",children:[{name:"main.js",path:"/scripts/main.js",type:"file",language:"javascript",content:`// Main Theme Scripts
document.addEventListener('DOMContentLoaded', function() {
  // console.log('Theme initialized');
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.navigation');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navigation.classList.toggle('active');
    });
  }
});`}]},{name:"theme.json",path:"/theme.json",type:"file",language:"json",content:`{
  "name": "Custom Theme",
  "version": "1.0.0",
  "description": "A custom WordPress-style theme",
  "author": "O4O Platform",
  "license": "GPL v2",
  "textDomain": "custom-theme",
  "supportedFeatures": [
    "responsive",
    "customizer",
    "widgets",
    "menus",
    "post-thumbnails"
  ]
}`}],L=t=>{N(n=>{const s=new Set(n);return s.has(t)?s.delete(t):s.add(t),s})},M=t=>{t.type==="directory"?L(t.path):(w({path:t.path,content:t.content||"",language:t.language||"text"}),g(t.content||""))},O=t=>{if(t.type==="directory")return c.has(t.path)?e.jsx(J,{className:"w-4 h-4 text-yellow-600"}):e.jsx(K,{className:"w-4 h-4 text-yellow-600"});const n=t.name.split(".").pop();let s="text-gray-500";switch(n){case"css":case"scss":s="text-blue-500";break;case"js":case"jsx":case"ts":case"tsx":s="text-yellow-500";break;case"php":s="text-purple-500";break;case"html":s="text-orange-500";break;case"json":s="text-green-500";break}return e.jsx(Z,{className:`w-4 h-4 ${s}`})},f=(t,n=0)=>t.map(s=>e.jsxs("div",{children:[e.jsxs("div",{className:`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer ${r?.path===s.path?"bg-blue-50":""}`,style:{paddingLeft:`${n*20+8}px`},onClick:()=>M(s),children:[s.type==="directory"&&(c.has(s.path)?e.jsx(W,{className:"w-3 h-3"}):e.jsx(X,{className:"w-3 h-3"})),O(s),e.jsx("span",{className:"text-sm",children:s.name})]}),s.type==="directory"&&c.has(s.path)&&s.children&&f(s.children,n+1)]},s.path)),z=async()=>{if(r)try{h(!0),await new Promise(t=>setTimeout(t,1e3)),i.success("파일이 저장되었습니다"),x(!1)}catch(t){console.error("Error saving file:",t),i.error("파일 저장에 실패했습니다")}finally{h(!1)}},P=t=>{g(t||""),x(!0)},B=t=>{k.current=t};return T?e.jsx("div",{className:"flex items-center justify-center h-96",children:e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"})}):e.jsxs("div",{className:"h-screen flex flex-col",children:[e.jsxs("div",{className:"flex justify-between items-center p-4 border-b bg-white",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("h1",{className:"text-xl font-bold",children:"테마 에디터"}),l&&e.jsxs("span",{className:"text-sm text-orange-500 flex items-center gap-1",children:[e.jsx(U,{className:"w-4 h-4"}),"변경사항이 있습니다"]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(o,{variant:"outline",size:"sm",onClick:()=>C(u==="vs-dark"?"light":"vs-dark"),children:e.jsx($,{className:"w-4 h-4"})}),e.jsxs(o,{variant:"outline",size:"sm",onClick:()=>y("/themes"),children:[e.jsx(H,{className:"w-4 h-4 mr-1"}),"닫기"]}),e.jsx(o,{size:"sm",onClick:z,disabled:!l||d,children:d?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"}),"저장 중..."]}):e.jsxs(e.Fragment,{children:[e.jsx(V,{className:"w-4 h-4 mr-1"}),"저장"]})})]})]}),e.jsxs("div",{className:"flex-1 flex overflow-hidden",children:[e.jsxs("div",{className:"w-64 border-r bg-gray-50 overflow-y-auto",children:[e.jsx("div",{className:"p-2 border-b bg-white",children:e.jsxs("div",{className:"relative",children:[e.jsx(q,{className:"absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"}),e.jsx("input",{type:"text",placeholder:"파일 검색...",value:S,onChange:t=>F(t.target.value),className:"w-full pl-8 pr-2 py-1 text-sm border rounded"})]})}),e.jsx("div",{className:"p-2",children:f(j)})]}),e.jsx("div",{className:"flex-1 flex flex-col",children:r?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"px-4 py-2 border-b bg-white flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(A,{className:"w-4 h-4 text-gray-500"}),e.jsx("span",{className:"text-sm font-medium",children:r.path})]}),e.jsx("div",{className:"flex gap-2",children:e.jsx(o,{variant:"ghost",size:"sm",onClick:()=>{navigator.clipboard.writeText(p),i.success("코드가 클립보드에 복사되었습니다")},children:e.jsx(I,{className:"w-4 h-4"})})})]}),e.jsx("div",{className:"flex-1",children:e.jsx(Q,{value:p,language:r.language,theme:u,onChange:P,onMount:B,options:{minimap:{enabled:!1},fontSize:14,lineNumbers:"on",roundedSelection:!1,scrollBeyondLastLine:!1,automaticLayout:!0,formatOnPaste:!0,formatOnType:!0}})})]}):e.jsx("div",{className:"flex-1 flex items-center justify-center text-gray-500",children:e.jsxs("div",{className:"text-center",children:[e.jsx(Y,{className:"w-12 h-12 mx-auto mb-2 text-gray-300"}),e.jsx("p",{children:"파일을 선택하세요"})]})})})]}),e.jsxs("div",{className:"px-4 py-1 border-t bg-gray-100 text-xs text-gray-600 flex justify-between",children:[e.jsx("div",{className:"flex items-center gap-4",children:r&&e.jsxs(e.Fragment,{children:[e.jsx("span",{children:r.language.toUpperCase()}),e.jsx("span",{children:"UTF-8"}),e.jsxs("span",{children:["줄 ",p.split(`
`).length]})]})}),e.jsx("div",{className:"flex items-center gap-2",children:l?e.jsxs("span",{className:"flex items-center gap-1 text-orange-500",children:[e.jsx("div",{className:"w-2 h-2 bg-orange-500 rounded-full"}),"수정됨"]}):e.jsxs("span",{className:"flex items-center gap-1 text-green-500",children:[e.jsx(G,{className:"w-3 h-3"}),"저장됨"]})})]})]})};export{he as default};
