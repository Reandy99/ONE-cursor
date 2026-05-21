import { workflow, node, trigger, newCredential } from '@n8n/workflow-sdk';

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: { name: 'Webhook', position: [0, 0], parameters: { httpMethod: 'POST', path: 'photo-size-cm-12c-success', responseMode: 'lastNode' } },
  output: [{}],
});

const defineFolders = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Define Folders',
    position: [224, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "return [{json:{folderId:'1jvnMm0mVdtR7ztqVebhxCv1qDVKPQhjr',folderLabel:'12A'}},{json:{folderId:'1E9vkIIFS6k4GlIKyMh1oqB9lKPw2OqzN',folderLabel:'12B'}},{json:{folderId:'1CG57mnpapPzfPvp488N0FACZ4kBu7vAy',folderLabel:'12C'}},{json:{folderId:'1qOQa4RdJW8aDEwpSMZntx6iEwLtMRJ7I',folderLabel:'12D'}}];",
    },
  },
  output: [{ folderLabel: '12A' }],
});

const fetchFolderHtml = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Folder HTML',
    position: [448, 0],
    parameters: {
      method: 'GET',
      url: '={{ "https://drive.google.com/drive/folders/" + $json.folderId }}',
      options: { response: { response: { responseFormat: 'text' } } },
    },
  },
  output: [{ data: '<html/>' }],
});

const extractImages = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extract Images',
    position: [672, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const out=[];const items=$input.all();const folderItems=$items('Define Folders');for(let i=0;i<items.length;i++){const html=items[i].json.data;const folderLabel=folderItems[i].json.folderLabel;const regex=/data-id=\\\"([^\\\"]+)\\\"[^>]*data-tooltip=\\\"([^\\\"]+\\.(?:jpg|jpeg|png|webp)) Image\\\"/gi;const seen=new Set();let m;while((m=regex.exec(html))!==null){const fileId=m[1];const name=m[2];if(seen.has(fileId))continue;seen.add(fileId);out.push({json:{fileId,name,folderLabel}});}}return out;",
    },
  },
  output: [{ fileId: 'x', name: 'a.jpg', folderLabel: '12A' }],
});

const downloadImage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Download Image',
    position: [896, 0],
    parameters: {
      method: 'GET',
      url: '={{ "https://drive.google.com/uc?export=download&id=" + $json.fileId }}',
      options: { response: { response: { responseFormat: 'file', outputPropertyName: 'data' } } },
    },
  },
  output: [{ name: 'a.jpg' }],
});

const calculateCm = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Calculate CM',
    position: [1120, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const items=$input.all();const fallbackDpi=300;function readUInt16(buf,offset,little){return little?buf.readUInt16LE(offset):buf.readUInt16BE(offset);}function readUInt32(buf,offset,little){return little?buf.readUInt32LE(offset):buf.readUInt32BE(offset);}function rational(buf,offset,little){const num=readUInt32(buf,offset,little);const den=readUInt32(buf,offset+4,little);return den?num/den:0;}function parseExifDpi(exif){if(exif.toString('ascii',0,4)!=='Exif')return null;const tiff=6;const little=exif.toString('ascii',tiff,tiff+2)==='II';const ifd0=tiff+readUInt32(exif,tiff+4,little);const entries=readUInt16(exif,ifd0,little);let xResOffset=null,yResOffset=null,unit=2;for(let i=0;i<entries;i++){const e=ifd0+2+i*12;const tag=readUInt16(exif,e,little);const valueOffset=e+8;if(tag===0x011A)xResOffset=readUInt32(exif,valueOffset,little);if(tag===0x011B)yResOffset=readUInt32(exif,valueOffset,little);if(tag===0x0128)unit=readUInt16(exif,valueOffset,little);}if(!xResOffset||!yResOffset)return null;let x=rational(exif,tiff+xResOffset,little);let y=rational(exif,tiff+yResOffset,little);if(unit===3){x*=2.54;y*=2.54;}return{x:x||fallbackDpi,y:y||fallbackDpi};}function parseJpeg(buffer){let offset=2;let dpi=null;while(offset<buffer.length){if(buffer[offset]!==0xFF){offset++;continue;}const marker=buffer[offset+1];if(marker===0xD9||marker===0xDA)break;const size=buffer.readUInt16BE(offset+2);if(marker===0xE0){const seg=buffer.slice(offset+4,offset+2+size);if(seg.toString('ascii',0,4)==='JFIF'){const unit=seg[7];let x=seg.readUInt16BE(8);let y=seg.readUInt16BE(10);if(unit===2){x*=2.54;y*=2.54;}dpi={x:x||fallbackDpi,y:y||fallbackDpi};}}if(marker===0xE1){const seg=buffer.slice(offset+4,offset+2+size);const exifDpi=parseExifDpi(seg);if(exifDpi)dpi=exifDpi;}if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){const height=buffer.readUInt16BE(offset+5);const width=buffer.readUInt16BE(offset+7);return{width,height,dpiX:dpi?.x||fallbackDpi,dpiY:dpi?.y||fallbackDpi};}offset+=2+size;}throw new Error('Unsupported JPEG structure');}function parsePng(buffer){const width=buffer.readUInt32BE(16);const height=buffer.readUInt32BE(20);let dpiX=fallbackDpi,dpiY=fallbackDpi;let offset=8;while(offset<buffer.length){const len=buffer.readUInt32BE(offset);const type=buffer.toString('ascii',offset+4,offset+8);if(type==='pHYs'){const ppux=buffer.readUInt32BE(offset+8);const ppuy=buffer.readUInt32BE(offset+12);const unit=buffer[offset+16];if(unit===1){dpiX=ppux/39.3701;dpiY=ppuy/39.3701;}break;}offset+=12+len;}return{width,height,dpiX,dpiY};}const out=[];for(let i=0;i<items.length;i++){const buf=await this.helpers.getBinaryDataBuffer(i,'data');let meta;if(buf[0]===0xFF&&buf[1]===0xD8)meta=parseJpeg(buf);else if(buf.slice(0,8).toString('hex')==='89504e470d0a1a0a')meta=parsePng(buf);else throw new Error('Unsupported file for '+items[i].json.name);const widthCm=+(meta.width/meta.dpiX*2.54).toFixed(2);const heightCm=+(meta.height/meta.dpiY*2.54).toFixed(2);out.push({json:{folderLabel:items[i].json.folderLabel,name:items[i].json.name,ukuran_cm:widthCm+' x '+heightCm+' cm',width_cm:widthCm,height_cm:heightCm}});}return out;",
    },
  },
  output: [{ ukuran_cm: '3 x 4 cm' }],
});

const prepareRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Rows',
    position: [1344, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const items=$input.all().map(i=>i.json);const order=['12A','12B','12C','12D'];const grouped={};for(const item of items){const label=item.folderLabel;if(!grouped[label])grouped[label]=[];grouped[label].push(item);}const out=[];for(const label of order){if(!grouped[label])continue;out.push({json:{folder_name:label,name:'',ukuran_cm:'',width_cm:'',height_cm:''}});out.push({json:{folder_name:'nomor',name:'Nama',ukuran_cm:'size',width_cm:'',height_cm:''}});grouped[label].forEach((item,idx)=>{out.push({json:{folder_name:(idx+1).toString(),name:item.name,ukuran_cm:item.ukuran_cm,width_cm:item.width_cm,height_cm:item.height_cm}});});out.push({json:{folder_name:'',name:'',ukuran_cm:'',width_cm:'',height_cm:''}});}return out;",
    },
  },
  output: [{ folder_name: '12A' }],
});

const appendToGoogleSheets = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Append to Google Sheets',
    position: [1568, 0],
    parameters: {
      operation: 'append',
      documentId: { __rl: true, mode: 'id', value: '1-5_BicTXEPxk0pwPPBpkxRwxY8l6-pBNaf4pL2UPMT0' },
      sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
      columns: { mappingMode: 'autoMapInputData' },
    },
  },
  output: [{}],
});

const generateHtmlReport = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Generate HTML Report',
    executeOnce: true,
    position: [1792, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const rows=$('Prepare Rows').all().map(i=>i.json);const generatedAt=$now.setZone('Asia/Jakarta').toFormat('dd MMM yyyy HH:mm');const sheetUrl='https://docs.google.com/spreadsheets/d/1-5_BicTXEPxk0pwPPBpkxRwxY8l6-pBNaf4pL2UPMT0';function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}let body='';let currentFolder='';for(const row of rows){const folder=row.folder_name;const name=row.name;const size=row.ukuran_cm;if(['12A','12B','12C','12D'].includes(folder)){currentFolder=folder;body+='<h2>Kelas '+esc(folder)+'</h2><table><thead><tr><th>No</th><th>Nama File</th><th>Ukuran (cm)</th></tr></thead><tbody>';continue;}if(folder==='nomor')continue;if(!folder&&!name&&!size){if(currentFolder)body+='</tbody></table><br/>';currentFolder='';continue;}if(currentFolder&&folder&&name){body+='<tr><td>'+esc(folder)+'</td><td>'+esc(name)+'</td><td>'+esc(size)+'</td></tr>';}}if(currentFolder)body+='</tbody></table>';const html='<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:22px}h2{font-size:16px;margin-top:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;font-size:12px}th{background:#f3f4f6}.meta{color:#555;font-size:12px}</style></head><body><h1>Laporan Ukuran Foto (cm)</h1><p class=\"meta\">Kelas 12A-12D | '+esc(generatedAt)+' WIB | Sheet: '+esc(sheetUrl)+'</p>'+body+'</body></html>';return[{json:{htmlContent:html,reportTitle:'Laporan Ukuran Foto '+$now.setZone('Asia/Jakarta').toFormat('yyyy-MM-dd')}}];",
    },
  },
  output: [{ reportTitle: 'Laporan Ukuran Foto 2026-05-21' }],
});

const createGoogleDoc = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Create Google Doc',
    executeOnce: true,
    position: [2016, 0],
    parameters: {
      resource: 'file',
      operation: 'createFromText',
      name: "={{ $('Generate HTML Report').first().json.reportTitle }}",
      content: "={{ $('Generate HTML Report').first().json.htmlContent }}",
      options: { convertToGoogleDocument: true },
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
  },
  output: [{ id: 'doc-id' }],
});

const exportPdf = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Export PDF',
    executeOnce: true,
    position: [2240, 0],
    parameters: {
      resource: 'file',
      operation: 'download',
      fileId: { __rl: true, mode: 'id', value: "={{ $('Create Google Doc').first().json.id }}" },
      options: {
        googleFileConversion: { conversion: { docsToFormat: 'application/pdf' } },
        fileName: "={{ 'laporan-ukuran-foto-' + $now.setZone('Asia/Jakarta').toFormat('yyyy-MM-dd') + '.pdf' }}",
      },
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
  },
  output: [{ id: 'doc-id' }],
});

const sendPdfTelegram = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Send PDF to Telegram',
    executeOnce: true,
    position: [2464, 0],
    parameters: {
      resource: 'message',
      operation: 'sendDocument',
      chatId: "={{ $('Webhook').first().json.body?.telegram_chat_id || $('Webhook').first().json.telegram_chat_id || '8637267690' }}",
      binaryData: true,
      binaryPropertyName: 'data',
      additionalFields: {
        appendAttribution: false,
        caption: "={{ 'Laporan ukuran foto 12A-12D selesai.\\nSheet: https://docs.google.com/spreadsheets/d/1-5_BicTXEPxk0pwPPBpkxRwxY8l6-pBNaf4pL2UPMT0\\nWaktu: ' + $now.setZone('Asia/Jakarta').toFormat('dd MMM yyyy HH:mm') + ' WIB' }}",
        fileName: "={{ 'laporan-ukuran-foto-' + $now.setZone('Asia/Jakarta').toFormat('yyyy-MM-dd') + '.pdf' }}",
      },
    },
    credentials: { telegramApi: newCredential('Telegram 3') },
  },
  output: [{ ok: true }],
});

export default workflow('E7bMzLuWKui9CovW', 'Google Drive Photo Size (cm) -> Google Sheets [SUCCESS]')
  .add(webhookTrigger)
  .to(defineFolders)
  .to(fetchFolderHtml)
  .to(extractImages)
  .to(downloadImage)
  .to(calculateCm)
  .to(prepareRows)
  .to(appendToGoogleSheets)
  .to(generateHtmlReport)
  .to(createGoogleDoc)
  .to(exportPdf)
  .to(sendPdfTelegram);
