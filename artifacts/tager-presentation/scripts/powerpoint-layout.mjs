// Transfer verified browser text geometry into editable, RTL-aware PowerPoint text.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto('http://localhost:80/tager-presentation/allslides',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>[...document.querySelectorAll('.slide[data-slide-id]')].map(slide=>{
    const root=slide.getBoundingClientRect();
    let elements=[...slide.querySelectorAll('h1,h2,h3,p,.photo-label,.diagram-arrow,.footer > span')];
    const coverHeading=elements.find(el=>el.tagName==='H1' && el.querySelector('.en'));
    if(coverHeading) elements=elements.filter(el=>el!==coverHeading).concat([...coverHeading.children]);
    const coverLabel=slide.querySelector('.logo-tager + span');
    if(coverLabel) elements.push(coverLabel);
    return elements.map(el=>{
      const rect=el.getBoundingClientRect(),css=getComputedStyle(el);
      const lh=parseFloat(css.lineHeight)||parseFloat(css.fontSize)*1.5;
      const groups=[];
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        const style=getComputedStyle(node.parentElement);
        for(let i=0;i<node.textContent.length;i++){
          const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
          const r=range.getBoundingClientRect();
          if(!r.height) continue;
          const lineIndex=Math.max(0,Math.round((r.top-rect.top)/lh));
          const line=groups[lineIndex]??(groups[lineIndex]=[]);
          const run={text:node.textContent[i],size:parseFloat(style.fontSize),font:style.fontFamily.split(',')[0].replaceAll("'","").replaceAll('"',''),bold:Number(style.fontWeight)>=600,color:style.color};
          const last=line.at(-1);
          if(last && last.font===run.font && last.size===run.size && last.bold===run.bold && last.color===run.color)last.text+=run.text;else line.push(run);
        }
      }
      const lines=groups.filter(Boolean);
      const pr=parseFloat(css.paddingRight)||0,pl=parseFloat(css.paddingLeft)||0,pt=parseFloat(css.paddingTop)||0;
      let x=rect.left-root.left+pl,w=rect.width-pl-pr;
      if(el.classList.contains('brand')){
        const tn=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
        if(tn){const range=document.createRange();range.selectNodeContents(tn);const r=range.getBoundingClientRect();x=r.left-root.left;w=r.width;}
      }
      return {x,y:rect.top-root.top+pt,w,h:rect.height-pt-(parseFloat(css.paddingBottom)||0),lineHeight:lh,direction:css.direction,align:css.textAlign,title:el.tagName==='H1'||el.parentElement?.tagName==='H1',footer:!!el.closest('.footer'),lines};
    }).filter(el=>el.lines.length);
  }));
  await writeFile('generated-artifacts/tager-text-layout.json',JSON.stringify(data));
  console.log('Captured verified editable text layout for',data.length,'slides.');
} finally {await browser.close();}
