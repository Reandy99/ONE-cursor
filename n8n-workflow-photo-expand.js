import {
  workflow,
  node,
  trigger,
  newCredential,
  languageModel,
  splitInBatches,
  nextBatch,
} from '@n8n/workflow-sdk';

const DEFAULT_FOLDER_URL =
  'https://drive.google.com/drive/u/1/folders/1BZHKczX_Dg-Lw17PuWc_uYJFzvipRQ6y';

const googleDriveCreds = {
  googleDriveOAuth2Api: newCredential('Google Drive account'),
};

const openAi9routerCreds = {
  openAiApi: newCredential('OpenAI account 2'),
};

const googleGeminiCreds = {
  googlePalmApi: newCredential('Google Gemini(PaLM) Api account'),
};

const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Start', position: [-240, 300] },
  output: [{}],
});

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Receive Expand Request',
    parameters: {
      httpMethod: 'POST',
      path: 'gdrive-photo-expand-center',
      responseMode: 'lastNode',
    },
    position: [-240, 480],
  },
  output: [{ body: { folderUrl: DEFAULT_FOLDER_URL } }],
});

const parseInput = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parse Input',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const firstItem = $input.first();
const payload = firstItem?.json?.body ?? firstItem?.json ?? {};

const folderUrl = String(payload.folderUrl ?? '${DEFAULT_FOLDER_URL}').trim();
const outputFolderName = String(payload.outputFolderName ?? 'sudah di expand').trim();
const uploadToSourceFolder = outputFolderName === '' || Boolean(payload.uploadToSourceFolder);
const resolvedOutputFolderName = uploadToSourceFolder ? '' : (outputFolderName || 'sudah di expand');
const outputWidth = Number(payload.outputWidth ?? 1080);
const outputHeight = Number(payload.outputHeight ?? 1350);
const backgroundColor = String(payload.backgroundColor || '#D2B48C').trim();
const skipGeminiCheck = Boolean(payload.skipGeminiCheck);

const folderPathMatch = folderUrl.match(/\\/folders\\/([a-zA-Z0-9_-]+)/);
const folderQueryMatch = folderUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
const directIdMatch = /^[a-zA-Z0-9_-]{10,}$/.test(folderUrl) ? folderUrl : '';
const sourceFolderId = folderPathMatch?.[1] || folderQueryMatch?.[1] || directIdMatch;

if (!sourceFolderId) {
  throw new Error('Invalid Google Drive folder URL. Use /folders/{id} or id={id}.');
}

if (!Number.isFinite(outputWidth) || outputWidth <= 0 || !Number.isFinite(outputHeight) || outputHeight <= 0) {
  throw new Error('outputWidth and outputHeight must be positive numbers.');
}

const searchQuery = "'" + sourceFolderId + "' in parents and trashed = false and mimeType contains 'image/'";

return [
  {
    json: {
      folderUrl,
      sourceFolderId,
      outputFolderName: resolvedOutputFolderName,
      uploadToSourceFolder,
      outputWidth,
      outputHeight,
      backgroundColor,
      skipGeminiCheck,
      searchQuery,
      geminiChatModel: 'gc/gemini-3-flash-preview',
      geminiImageModel: String(
        payload.geminiImageModel || 'models/gemini-2.5-flash-image',
      ).trim(),
      geminiApiUrl: String(payload.geminiApiUrl || '').trim(),
      subjectHeightRatio: Number(payload.subjectHeightRatio ?? 0.72),
      bottomPadRatio: Number(payload.bottomPadRatio ?? 0.28),
    },
  },
];`,
    },
    position: [0, 390],
  },
});

const verifyGemini = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Verify 9router Gemini',
    executeOnce: true,
    parameters: {
      promptType: 'define',
      text: 'Reply with exactly: GEMINI_OK',
      messages: {
        messageValues: [
          {
            type: 'SystemMessagePromptTemplate',
            message:
              'You are a connectivity check. Reply with exactly GEMINI_OK and nothing else.',
          },
        ],
      },
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        config: {
          name: '9router Gemini Chat Model',
          parameters: {
            model: {
              __rl: true,
              mode: 'id',
              value: '={{ $("Parse Input").first().json.geminiChatModel }}',
            },
            responsesApiEnabled: false,
            options: {
              baseURL:
                '={{ (($("Parse Input").first().json.geminiApiUrl || "http://43.156.181.204:20128/v1").replace(/\\/$/, "")) }}',
              temperature: 0,
              maxTokens: 64,
            },
          },
          credentials: openAi9routerCreds,
          position: [240, 620],
        },
      }),
    },
    position: [240, 390],
  },
  output: [{ text: 'GEMINI_OK' }],
});

const attachGeminiStatus = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Attach Gemini Status',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const request = $items('Parse Input', 0, 0)[0]?.json ?? {};
const geminiText = String($input.first()?.json?.text ?? '').trim();
const geminiOk = geminiText.includes('GEMINI_OK') || (geminiText.length > 0 && !geminiText.toLowerCase().includes('error'));

return [
  {
    json: {
      ...request,
      geminiCheck: {
        ok: geminiOk,
        chatModel: request.geminiChatModel,
        imageModel: request.geminiImageModel,
        provider: '9router chat check + Google Gemini image edit',
        responsePreview: geminiText.slice(0, 120),
      },
    },
  },
];`,
    },
    position: [480, 390],
  },
});

const buildSummaryContext = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Summary Context',
    executeOnce: true,
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const request = $items('Attach Gemini Status', 0, 0)[0]?.json ?? {};
const folderId = String(request.sourceFolderId || '').trim();
if (!folderId) {
  throw new Error('Missing source/output folder id.');
}

const folderName = request.uploadToSourceFolder
  ? 'source folder (same as input)'
  : request.outputFolderName || 'sudah di expand';

return [
  {
    json: {
      __meta: true,
      ok: true,
      status: 'success',
      geminiCheck: request.geminiCheck,
      outputSize: {
        width: request.outputWidth,
        height: request.outputHeight,
        backgroundColor: request.backgroundColor,
      },
      outputFolder: {
        id: folderId,
        name: folderName,
        url: 'https://drive.google.com/drive/folders/' + folderId + '?usp=sharing',
      },
    },
  },
];`,
    },
    position: [960, 200],
  },
});

const listSourceImages = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'List Source Images',
    parameters: {
      authentication: 'oAuth2',
      resource: 'fileFolder',
      operation: 'search',
      searchMethod: 'query',
      queryString: '={{ $("Attach Gemini Status").first().json.searchQuery }}',
      returnAll: true,
    },
    credentials: googleDriveCreds,
    position: [1200, 390],
  },
});

const filterImages = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Filter Valid Images',
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        combinator: 'and',
        conditions: [
          {
            leftValue: '={{ $json.name }}',
            rightValue: 'edited_',
            operator: { type: 'string', operation: 'notStartsWith' },
          },
        ],
      },
    },
    position: [1440, 390],
  },
});

const downloadSourceImage = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Download Source Image',
    parameters: {
      authentication: 'oAuth2',
      resource: 'file',
      operation: 'download',
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {
        binaryPropertyName: 'data',
        fileName: '={{ $json.name }}',
      },
    },
    credentials: googleDriveCreds,
    position: [1920, 390],
  },
});

const padCanvasForOutpaint = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pad Canvas For Outpaint',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const sharp = require('sharp');
const request = $('Attach Gemini Status').first().json;
const sourceMeta = $('Download Source Image').item.json;
const binary = $input.item.binary?.data;

if (!binary?.data) {
  throw new Error('Missing image binary for ' + (sourceMeta.name || 'unknown'));
}

const outW = Number(request.outputWidth || 1080);
const outH = Number(request.outputHeight || 1350);
const subjectHeightRatio = Number(request.subjectHeightRatio ?? 0.72);
const bottomPadRatio = Number(request.bottomPadRatio ?? 0.28);

const bgHex = String(request.backgroundColor || '#D2B48C').replace('#', '');
const bg = {
  r: parseInt(bgHex.slice(0, 2), 16) || 210,
  g: parseInt(bgHex.slice(2, 4), 16) || 180,
  b: parseInt(bgHex.slice(4, 6), 16) || 140,
};

const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
const meta = await sharp(buffer).metadata();

const maxSubjectH = Math.round(outH * subjectHeightRatio);
const scale = Math.min(outW / meta.width, maxSubjectH / meta.height);
const fitW = Math.max(1, Math.round(meta.width * scale));
const fitH = Math.max(1, Math.round(meta.height * scale));

const subjectTop = Math.round(outH * 0.05);
const subjectLeft = Math.round((outW - fitW) / 2);
const subjectBottom = subjectTop + fitH;
const bottomPadPx = outH - subjectBottom;

const resized = await sharp(buffer).resize(fitW, fitH, { fit: 'inside' }).toBuffer();

const canvas = await sharp({
  create: {
    width: outW,
    height: outH,
    channels: 3,
    background: bg,
  },
})
  .composite([{ input: resized, top: subjectTop, left: subjectLeft }])
  .jpeg({ quality: 92 })
  .toBuffer();

const fileName = String(binary.fileName || sourceMeta.name || 'padded.jpg');

return {
  json: {
    canvasWidth: outW,
    canvasHeight: outH,
    subjectBottom,
    bottomPadPx,
    subjectHeightRatio,
    bottomPadRatio,
  },
  binary: {
    data: await this.helpers.prepareBinaryData(canvas, fileName, 'image/jpeg'),
  },
};`,
    },
    position: [2144, 390],
  },
  output: [
    {
      canvasWidth: 1080,
      canvasHeight: 1350,
      subjectBottom: 980,
      bottomPadPx: 370,
    },
  ],
});

const prepareGeminiRequest = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Gemini Request',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const request = $('Attach Gemini Status').first().json;
const sourceMeta = $('Download Source Image').item.json;
const binary = $input.item.binary?.data;

if (!binary?.data) {
  throw new Error('Missing image binary for ' + (sourceMeta.name || 'unknown'));
}

const mimeType = String(binary.mimeType || 'image/jpeg');

const sourceName = String(binary.fileName || sourceMeta.name || 'photo.jpg');
const hasExt = sourceName.includes('.');
const base = hasExt ? sourceName.slice(0, sourceName.lastIndexOf('.')) : sourceName;
const ext = String(hasExt ? sourceName.slice(sourceName.lastIndexOf('.') + 1) : 'jpg').toLowerCase();
let outExt = 'jpg';
if (ext === 'png') outExt = 'png';
else if (ext === 'webp') outExt = 'webp';

const bg = request.backgroundColor || '#D2B48C';
const pad = $('Pad Canvas For Outpaint').item.json;
const prompt =
  'OUTPAINT / INPAINT TASK on a 4:5 studio portrait canvas. ' +
  'The tan/beige studio background below the subject (' +
  bg +
  ', about ' +
  (pad.bottomPadPx || 300) +
  'px) is EMPTY padding — you must GENERATE the missing body there. ' +
  'The subject arms currently end abruptly at the waist/crop line with NO hands visible. ' +
  'MANDATORY: paint continuous forearms from the blazer sleeves and BOTH HANDS fully visible (natural relaxed pose at sides, fingers clear). ' +
  'Do NOT stop arms at the old crop edge. Match exact suit, shirt, tie, skin tone, lighting, and studio background. ' +
  'Keep face, hair, and identity unchanged. Center subject with balanced headroom. ' +
  'Photorealistic, no text, logos, or watermarks.';

return {
  json: {
    sourceFileId: sourceMeta.id,
    sourceFileName: sourceMeta.name,
    outputFileName: 'edited_' + base + '.' + outExt,
    outputFormat: outExt === 'png' ? 'png' : 'jpeg',
    outputMimeType: mimeType,
    geminiImageModel: request.geminiImageModel,
    geminiPrompt: prompt,
  },
  binary: $input.item.binary,
};`,
    },
    position: [2368, 390],
  },
});

const geminiExpandImage = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: {
    name: 'Gemini Expand Image',
    parameters: {
      resource: 'image',
      operation: 'edit',
      modelId: {
        __rl: true,
        mode: 'id',
        value: '={{ $json.geminiImageModel }}',
      },
      prompt: '={{ $json.geminiPrompt }}',
      images: {
        values: [{ binaryPropertyName: 'data' }],
      },
      options: {
        binaryPropertyOutput: 'data',
      },
    },
    credentials: googleGeminiCreds,
    position: [2592, 390],
  },
  output: [
    {
      sourceFileId: 'abc123',
      sourceFileName: 'photo.jpg',
      outputFileName: 'edited_photo.jpg',
      outputFormat: 'jpeg',
      geminiImageModel: 'models/gemini-2.5-flash-image',
    },
  ],
});

const finalResize = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Final Resize',
    parameters: {
      operation: 'resize',
      dataPropertyName: 'data',
      width: '={{ $("Attach Gemini Status").first().json.outputWidth }}',
      height: '={{ $("Attach Gemini Status").first().json.outputHeight }}',
      resizeOption: 'maximumArea',
      options: {
        destinationKey: 'edited',
        fileName: '={{ $("Prepare Gemini Request").item.json.outputFileName }}',
        format: '={{ $("Prepare Gemini Request").item.json.outputFormat }}',
        quality: 92,
      },
    },
    position: [3264, 390],
  },
});

const uploadEditedImage = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Upload Edited Image',
    parameters: {
      authentication: 'oAuth2',
      resource: 'file',
      operation: 'upload',
      inputDataFieldName: 'edited',
      name: '={{ $("Prepare Gemini Request").item.json.outputFileName }}',
      folderId: {
        __rl: true,
        mode: 'id',
        value: '={{ $("Attach Gemini Status").first().json.sourceFolderId }}',
      },
      options: { simplifyOutput: true },
    },
    credentials: googleDriveCreds,
    position: [3488, 390],
  },
});

const processEachPhoto = splitInBatches({
  version: 3,
  config: {
    name: 'Process Each Photo',
    parameters: { batchSize: 1 },
    position: [1696, 390],
  },
});

const buildFinalResponse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Final Response',
    executeOnce: true,
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const meta = $('Build Summary Context').first().json;
const uploadedFiles = $('Upload Edited Image').all().map((item) => ({
  id: item.json.id || null,
  name: item.json.name || null,
  mimeType: item.json.mimeType || null,
  webViewLink: item.json.webViewLink || null,
}));

return [
  {
    json: {
      ok: true,
      status: meta.status || 'success',
      geminiCheck: meta.geminiCheck,
      outputSize: meta.outputSize,
      outputFolder: meta.outputFolder,
      totalUploaded: uploadedFiles.length,
      uploadedFiles,
      note:
        'Outpaint via padded 4:5 canvas + Gemini image edit; forearms and hands generated in bottom pad area.',
    },
  },
];`,
    },
    position: [3712, 200],
  },
});

export default workflow(
  'gdrive-photo-expand-center',
  'Google Drive Photo Expand + Center (Gemini AI)',
)
  .add(manualTrigger)
  .to(parseInput)
  .add(webhookTrigger)
  .to(parseInput)
  .to(verifyGemini)
  .to(attachGeminiStatus)
  .to(buildSummaryContext)
  .to(listSourceImages)
  .to(filterImages)
  .to(
    processEachPhoto
      .onDone(buildFinalResponse)
      .onEachBatch(
        downloadSourceImage
          .to(padCanvasForOutpaint)
          .to(prepareGeminiRequest)
          .to(geminiExpandImage)
          .to(finalResize)
          .to(uploadEditedImage)
          .to(nextBatch(processEachPhoto)),
      ),
  );
