import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const browser = await chromium.launch({ executablePath: execFileSync('which',['chromium'],{encoding:'utf8'}).trim(), headless:true, args:['--no-sandbox'] });
try {
  const page=await browser.newPage({ viewport:{width:1920,height:1080} });
  await page.goto('http://localhost:80/tager-presentation/allslides',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
    const slides=[...document.querySelectorAll('.slide[data-slide-id]')];
    return slides.map((slide,index)=>{
      const root=slide.getBoundingClientRect();
      const issues=[];
      for(const image of slide.querySelectorAll('img')) if(!image.complete || image.naturalWidth===0) issues.push(`Missing image: ${image.getAttribute('src')}`);
      const text=[...slide.querySelectorAll('h1,p,.photo-label')].map(node=>({node,rect:node.getBoundingClientRect()}));
      for(const {node,rect} of text) {
        if(rect.left<root.left-1 || rect.right>root.right+1 || rect.top<root.top-1 || rect.bottom>root.top+995) issues.push(`Text exceeds safe area: ${node.textContent?.slice(0,60)} @ ${Math.round(rect.bottom-root.top)}`);
        if(Number.parseFloat(getComputedStyle(node).fontSize)<28.7) issues.push(`Small font: ${node.textContent?.slice(0,40)}`);
      }
      for(let a=0;a<text.length;a++) for(let b=a+1;b<text.length;b++){
        const x=text[a].rect,y=text[b].rect;
        if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2 && Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2) issues.push(`Overlapping text: ${text[a].node.textContent?.slice(0,35)} / ${text[b].node.textContent?.slice(0,35)}`);
      }
      return {slide:index+1,images:slide.querySelectorAll('img').length,issues};
    });
  });
  console.log(JSON.stringify(result,null,2));
  if(result.length!==12 || result.some(s=>s.issues.length)) process.exitCode=1;
} finally { await browser.close(); }
