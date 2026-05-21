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
        payload.geminiImageModel || 'gc/gemini-2.5-flash-image',
      ).trim(),
      geminiApiUrl: String(payload.geminiApiUrl || '').trim(),
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
        provider: '9router via OpenAI account 2',
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

const resizeForGemini = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Resize For Gemini',
    parameters: {
      operation: 'resize',
      dataPropertyName: 'data',
      width: '={{ $("Attach Gemini Status").first().json.outputWidth }}',
      height: '={{ $("Attach Gemini Status").first().json.outputHeight }}',
      resizeOption: 'maximumArea',
      options: {
        destinationKey: 'data',
        fileName: '={{ $binary.data.fileName }}',
        quality: 92,
      },
    },
    position: [2144, 390],
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

const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
const base64 = Buffer.from(buffer).toString('base64');
const mimeType = String(binary.mimeType || 'image/jpeg');
const dataUrl = 'data:' + mimeType + ';base64,' + base64;

const sourceName = String(binary.fileName || sourceMeta.name || 'photo.jpg');
const hasExt = sourceName.includes('.');
const base = hasExt ? sourceName.slice(0, sourceName.lastIndexOf('.')) : sourceName;
const ext = String(hasExt ? sourceName.slice(sourceName.lastIndexOf('.') + 1) : 'jpg').toLowerCase();
let outExt = 'jpg';
if (ext === 'png') outExt = 'png';
else if (ext === 'webp') outExt = 'webp';

const bg = request.backgroundColor || '#D2B48C';
const prompt =
  'Edit this portrait photo. Expand the canvas outward to a full 4:5 studio portrait. ' +
  'Seamlessly extend the background so it naturally continues from the original frame (same lighting, same tan/beige studio tone ' +
  bg +
  '). Keep the person identical: same face, skin, hair, clothing. ' +
  'If arms, hands, or elbows are cut off at the image edges, naturally complete them so they are fully visible. ' +
  'Center the person in the frame with balanced headroom. ' +
  'Do not change identity. Do not add text, logos, or watermarks. Photorealistic studio result.';

const geminiBody = {
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
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ],
};

return {
  json: {
    sourceFileId: sourceMeta.id,
    sourceFileName: sourceMeta.name,
    outputFileName: 'edited_' + base + '.' + outExt,
    outputFormat: outExt === 'png' ? 'png' : 'jpeg',
    outputMimeType: mimeType,
    geminiImageModel: request.geminiImageModel,
    geminiPrompt: prompt,
    geminiBody,
  },
  binary: $input.item.binary,
};`,
    },
    position: [2368, 390],
  },
});

const geminiExpandImage = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Gemini Expand Image',
    parameters: {
      promptType: 'define',
      text: '={{ $json.geminiPrompt }}',
      messages: {
        messageValues: [
          {
            type: 'HumanMessagePromptTemplate',
            messageType: 'imageBinary',
            binaryImageDataKey: 'data',
            imageDetail: 'high',
          },
        ],
      },
      batching: { batchSize: 1, delayBetweenBatches: 0 },
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        config: {
          name: '9router Gemini Image Model',
          parameters: {
            model: {
              __rl: true,
              mode: 'id',
              value: '={{ $json.geminiImageModel }}',
            },
            responsesApiEnabled: false,
            options: {
              baseURL:
                '={{ (($("Attach Gemini Status").first().json.geminiApiUrl || "http://43.156.181.204:20128/v1").replace(/\\/$/, "")) }}',
              temperature: 0.2,
              maxTokens: 8192,
              timeout: 180000,
            },
          },
          credentials: openAi9routerCreds,
          position: [2592, 620],
        },
      }),
    },
    position: [2592, 390],
  },
  output: [
    {
      text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
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

if (!imageUrl && typeof message.content === 'string' && message.content.includes('base64')) {
  const match = message.content.match(/data:image\\/[^;]+;base64,[A-Za-z0-9+/=]+/);
  if (match) imageUrl = match[0];
}

if (!imageUrl) {
  const err =
    response.error?.message ||
    response.message ||
    textBlob.slice(0, 500) ||
    JSON.stringify(response).slice(0, 500);
  throw new Error('Gemini did not return an image for ' + meta.sourceFileName + '. Response: ' + err);
}

const dataMatch = String(imageUrl).match(/^data:([^;]+);base64,(.+)$/s);
const imageMimeType = dataMatch?.[1] || meta.outputMimeType || 'image/png';
const imageBase64 = (dataMatch?.[2] || imageUrl).replace(/\\s+/g, '');

return {
  json: {
    sourceFileId: meta.sourceFileId,
    sourceFileName: meta.sourceFileName,
    outputFileName: meta.outputFileName,
    outputFormat: meta.outputFormat,
    imageMimeType,
    imageBase64,
    geminiImageModel: meta.geminiImageModel,
  },
};`,
    },
    position: [2816, 390],
  },
});

const convertGeminiToFile = node({
  type: 'n8n-nodes-base.convertToFile',
  version: 1.1,
  config: {
    name: 'Convert Gemini To File',
    parameters: {
      operation: 'toBinary',
      sourceProperty: 'imageBase64',
      options: {
        dataIsBase64: true,
        mimeType: '={{ $json.imageMimeType }}',
        fileName: '={{ $json.outputFileName }}',
      },
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
        'Generative expand via Gemini image model on 9router, then resize to target dimensions. Hands/background should continue seamlessly from the original frame.',
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
          .to(resizeForGemini)
          .to(prepareGeminiRequest)
          .to(geminiExpandImage)
          .to(parseGeminiImage)
          .to(convertGeminiToFile)
          .to(finalResize)
          .to(uploadEditedImage)
          .to(nextBatch(processEachPhoto)),
      ),
  );
