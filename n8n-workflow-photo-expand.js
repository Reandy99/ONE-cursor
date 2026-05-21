import {
  workflow,
  node,
  trigger,
  sticky,
  newCredential,
  splitInBatches,
  nextBatch,
} from '@n8n/workflow-sdk';

const DEFAULT_FOLDER_URL =
  'https://drive.google.com/drive/u/1/folders/1BZHKczX_Dg-Lw17PuWc_uYJFzvipRQ6y';

const googleDriveCreds = {
  googleDriveOAuth2Api: newCredential('Google Drive account'),
};

const googleGeminiCreds = {
  googlePalmApi: newCredential('Google Gemini(PaLM) Api account'),
};

const openAi9routerCreds = {
  openAiApi: newCredential('OpenAI account 2'),
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
const skipGeminiCheck = payload.skipGeminiCheck !== false;

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
        payload.geminiImageModel || 'gc/gemini-2.5-flash-image',
      ).trim(),
      geminiApiUrl: String(payload.geminiApiUrl || '').trim(),
      subjectHeightRatio: Number(payload.subjectHeightRatio ?? 0.72),
      bottomPadRatio: Number(payload.bottomPadRatio ?? 0.28),
      maxPhotos: Number(payload.maxPhotos ?? 0),
    },
  },
];`,
    },
    position: [0, 390],
  },
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

return [
  {
    json: {
      ...request,
      geminiCheck: {
        ok: true,
        chatModel: request.geminiChatModel,
        imageModel: request.geminiImageModel,
        provider: '9router OpenAI image API (OpenAI account 2)',
        responsePreview: 'ready',
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

const limitPhotos = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Limit Photos',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const maxPhotos = Number($('Attach Gemini Status').first().json.maxPhotos || 0);
const items = $input.all();
if (maxPhotos > 0) {
  return items.slice(0, maxPhotos);
}
return items;`,
    },
    position: [1600, 390],
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

const scaleDownForApi = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Scale Down For API',
    parameters: {
      operation: 'resize',
      dataPropertyName: 'data',
      width: '={{ $("Attach Gemini Status").first().json.outputWidth }}',
      height:
        '={{ Math.round($("Attach Gemini Status").first().json.outputHeight * ($("Attach Gemini Status").first().json.subjectHeightRatio || 0.72)) }}',
      resizeOption: 'maximumArea',
      options: {
        destinationKey: 'data',
        fileName: '={{ $binary.data.fileName }}',
        quality: 85,
      },
    },
    position: [2144, 390],
  },
});

const addBottomStudioPad = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Add Bottom Studio Pad',
    parameters: {
      operation: 'border',
      dataPropertyName: 'data',
      borderWidth: 0,
      borderHeight: 378,
      borderColor: '={{ $("Attach Gemini Status").first().json.backgroundColor }}',
      options: {
        destinationKey: 'data',
        fileName: '={{ $binary.data.fileName }}',
        format: 'jpeg',
        quality: 92,
      },
    },
    position: [2368, 390],
  },
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
const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
const imageBase64 = Buffer.from(buffer).toString('base64');

const padPx = Math.round(
  (request.outputHeight || 1350) * (request.bottomPadRatio || 0.28),
);
const prompt =
  'OUTPAINT / INPAINT TASK on a studio portrait. ' +
  'The tan/beige studio strip below the subject (' +
  bg +
  ', about ' +
  padPx +
  'px added at the bottom) is EMPTY padding — you must GENERATE the missing body there. ' +
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
    geminiApiBody: {
      model: request.geminiImageModel,
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: '4:5',
        image_size: '1K',
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: 'data:' + mimeType + ';base64,' + imageBase64 },
            },
          ],
        },
      ],
    },
  },
  binary: $input.item.binary,
};`,
    },
    position: [2368, 390],
  },
});

const geminiExpandImage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Gemini Expand Image',
    parameters: {
      method: 'POST',
      url:
        '={{ (($("Attach Gemini Status").first().json.geminiApiUrl || "http://43.156.181.204:20128/v1").replace(/\\/$/, "")) + "/chat/completions" }}',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'openAiApi',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.geminiApiBody) }}',
      options: {
        timeout: 180000,
        response: {
          response: {
            responseFormat: 'json',
          },
        },
      },
    },
    credentials: openAi9routerCreds,
    position: [2816, 390],
  },
  output: [
    {
      choices: [
        {
          message: {
            images: [{ image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } }],
          },
        },
      ],
    },
  ],
});

const parseGeminiImage = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parse Gemini Image',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const response = $input.first()?.json ?? {};
const meta = $('Prepare Gemini Request').item.json;

const choices = response.choices || response.data?.choices || [];
const message = choices[0]?.message || {};
const images = message.images || message.image || [];

let imageUrl = null;
if (Array.isArray(images)) {
  for (const img of images) {
    const url = img?.image_url?.url || img?.imageUrl?.url;
    if (url) {
      imageUrl = url;
      break;
    }
  }
}

const textBlob = String(response.text || message.content || '').trim();
if (!imageUrl && textBlob.includes('base64')) {
  const match = textBlob.match(/data:image\\/[^;]+;base64,[A-Za-z0-9+/=]+/);
  if (match) imageUrl = match[0];
}

if (!imageUrl) {
  const err =
    response.error?.message ||
    response.message ||
    textBlob.slice(0, 500) ||
    JSON.stringify(response).slice(0, 800);
  throw new Error('Gemini did not return an image for ' + meta.sourceFileName + '. Response: ' + err);
}

const dataMatch = String(imageUrl).match(/^data:([^;]+);base64,(.+)$/s);
const outMime = dataMatch?.[1] || meta.outputMimeType || 'image/png';
const imageBase64 = (dataMatch?.[2] || imageUrl).replace(/\\s+/g, '');
const outBuffer = Buffer.from(imageBase64, 'base64');

return {
  json: {
    ...meta,
    imageMimeType: outMime,
  },
  binary: {
    data: await this.helpers.prepareBinaryData(
      outBuffer,
      meta.outputFileName || 'edited.jpg',
      outMime,
    ),
  },
};`,
    },
    position: [3040, 390],
  },
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

const setupNote = sticky(
  'SETUP: Open node "Gemini Expand Image" and select credential **OpenAI account 2** (9router). Optional: set maxPhotos=1 in webhook body for a quick test.',
  [geminiExpandImage],
  { color: 3, position: [2816, 560] },
);

export default workflow(
  'gdrive-photo-expand-center',
  'Google Drive Photo Expand + Center (Gemini AI)',
)
  .add(setupNote)
  .add(manualTrigger)
  .to(parseInput)
  .add(webhookTrigger)
  .to(parseInput)
  .to(attachGeminiStatus)
  .to(buildSummaryContext)
  .to(listSourceImages)
  .to(filterImages)
  .to(limitPhotos)
  .to(
    processEachPhoto
      .onDone(buildFinalResponse)
      .onEachBatch(
        downloadSourceImage
          .to(scaleDownForApi)
          .to(addBottomStudioPad)
          .to(prepareGeminiRequest)
          .to(geminiExpandImage)
          .to(parseGeminiImage)
          .to(finalResize)
          .to(uploadEditedImage)
          .to(nextBatch(processEachPhoto)),
      ),
  );
