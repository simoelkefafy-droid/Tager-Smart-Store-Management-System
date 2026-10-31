// Publish finalized presentation assets only. No database or store access.
import { Storage } from "@google-cloud/storage";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root=fileURLToPath(new URL("../../../",import.meta.url));
const source=path.join(root,".local/outputs/Tager---Smart-Store-Management-System");
const digest=buffer=>createHash("sha256").update(buffer).digest("hex");
const pdf=await readFile(`${source}.pdf`),pptx=await readFile(`${source}.pptx`);
if(pdf.subarray(0,5).toString()!=="%PDF-" || pptx.subarray(0,2).toString()!=="PK")throw new Error("Invalid presentation source files.");
const version=digest(Buffer.concat([pdf,pptx])).slice(0,16);
const storage=new Storage({
  credentials:{
    audience:"replit",subject_token_type:"access_token",type:"external_account",
    token_url:"http://127.0.0.1:1106/token",
    credential_source:{url:"http://127.0.0.1:1106/credential",format:{type:"json",subject_token_field_name:"access_token"}},
    universe_domain:"googleapis.com",
  },projectId:"",
});
const bucketId=process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
if(!bucketId)throw new Error("App Storage is not configured.");
const bucket=storage.bucket(bucketId);
const entries=[
  {name:"Tager-Presentation.pptx",type:"application/vnd.openxmlformats-officedocument.presentationml.presentation",kind:"pptx",bytes:pptx},
  {name:"Tager-Presentation.pdf",type:"application/pdf",kind:"pdf",bytes:pdf},
  {name:"cover.webp",type:"image/webp",kind:"cover",bytes:await readFile(path.join(root,"generated-artifacts/tager-downloads/cover.webp"))},
];
for(let i=1;i<=12;i++){
  const name=`slide-${String(i).padStart(2,"0")}.svg`;
  entries.push({name,type:"image/svg+xml",kind:"page",bytes:await readFile(path.join(root,"generated-artifacts/tager-downloads/pages",name))});
}
const assets={};
for(const entry of entries){
  const objectName=`public/presentations/tager/${version}/${entry.name}`;
  await bucket.file(objectName).save(entry.bytes,{resumable:false,validation:"crc32c",metadata:{contentType:entry.type,cacheControl:"public, max-age=31536000, immutable"}});
  assets[entry.name]={objectName,contentType:entry.type,size:entry.bytes.length,sha256:digest(entry.bytes),kind:entry.kind};
  console.log(`Published ${entry.name} (${entry.bytes.length} bytes)`);
}
const out=path.join(root,"artifacts/api-server/src/data/presentation-assets.json");
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify({title:"Tager — Smart Store Management System",slideCount:12,version,assets},null,2)+"\n");
console.log("Published a complete versioned presentation bundle; catalog updated.");
