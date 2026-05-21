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
      geminiModel: 'gc/gemini-3-flash-preview',
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
          name: '9router Gemini Model',
          parameters: {
            model: {
              __rl: true,
              mode: 'id',
              value: '={{ $("Parse Input").first().json.geminiModel }}',
            },
            responsesApiEnabled: false,
            options: { temperature: 0, maxTokens: 64 },
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
        model: request.geminiModel,
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
    position: [1200, 520],
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
    position: [1440, 520],
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
    position: [1680, 520],
  },
});

const resizeToFit = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Resize To Fit',
    parameters: {
      operation: 'resize',
      dataPropertyName: 'data',
      width: '={{ Math.round($("Attach Gemini Status").first().json.outputWidth * 0.78) }}',
      height: '={{ Math.round($("Attach Gemini Status").first().json.outputHeight * 0.82) }}',
      resizeOption: 'maximumArea',
      options: {
        destinationKey: 'data',
        fileName: '={{ $binary.data.fileName }}',
        quality: 92,
      },
    },
    position: [1920, 520],
  },
});

const getImageInfo = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Get Image Info',
    parameters: {
      operation: 'information',
      dataPropertyName: 'data',
    },
    position: [2160, 520],
  },
});

const prepareLayout = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Layout',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const request = $('Attach Gemini Status').first().json;
const sourceMeta = $('Download Source Image').item.json;
const info = $json || {};

const canvasWidth = Number(request.outputWidth || 1080);
const canvasHeight = Number(request.outputHeight || 1350);
const subjectWidth = Number(info.width || info.size?.width || 0);
const subjectHeight = Number(info.height || info.size?.height || 0);

if (!subjectWidth || !subjectHeight) {
  throw new Error('Could not read resized image dimensions for ' + (sourceMeta.name || 'unknown file'));
}

const positionX = Math.max(0, Math.round((canvasWidth - subjectWidth) / 2));
const positionY = Math.max(0, Math.round((canvasHeight - subjectHeight) / 2));

const sourceName = String($binary?.data?.fileName || sourceMeta.name || 'photo.jpg');
const hasExt = sourceName.includes('.');
const base = hasExt ? sourceName.slice(0, sourceName.lastIndexOf('.')) : sourceName;
const ext = String(hasExt ? sourceName.slice(sourceName.lastIndexOf('.') + 1) : 'jpg').toLowerCase();
let outExt = 'jpg';
if (ext === 'png') outExt = 'png';
else if (ext === 'webp') outExt = 'webp';

const item = $input.item;
return {
  json: {
    sourceFileId: sourceMeta.id,
    sourceFileName: sourceMeta.name,
    canvasWidth,
    canvasHeight,
    backgroundColor: request.backgroundColor || '#D2B48C',
    subjectWidth,
    subjectHeight,
    positionX,
    positionY,
    outputFileName: 'edited_' + base + '.' + outExt,
    outputFormat: outExt === 'png' ? 'png' : 'jpeg',
  },
  binary: $('Resize To Fit').item.binary,
};`,
    },
    position: [2400, 520],
  },
});

const createBackgroundCanvas = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Create Background Canvas',
    parameters: {
      operation: 'create',
      backgroundColor: '={{ $json.backgroundColor }}',
      width: '={{ $json.canvasWidth }}',
      height: '={{ $json.canvasHeight }}',
      options: {
        destinationKey: 'canvas',
        fileName: '={{ $json.outputFileName }}',
        format: '={{ $json.outputFormat }}',
        quality: 92,
      },
    },
    position: [2640, 520],
  },
});

const compositeCentered = node({
  type: 'n8n-nodes-base.editImage',
  version: 1,
  config: {
    name: 'Composite Centered',
    parameters: {
      operation: 'composite',
      dataPropertyName: 'canvas',
      dataPropertyNameComposite: 'data',
      positionX: '={{ $json.positionX }}',
      positionY: '={{ $json.positionY }}',
      operator: 'Over',
      options: {
        destinationKey: 'edited',
        fileName: '={{ $json.outputFileName }}',
        format: '={{ $json.outputFormat }}',
        quality: 92,
      },
    },
    position: [2880, 520],
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
      name: '={{ $json.outputFileName }}',
      folderId: {
        __rl: true,
        mode: 'id',
        value: '={{ $("Attach Gemini Status").first().json.sourceFolderId }}',
      },
      options: { simplifyOutput: true },
    },
    credentials: googleDriveCreds,
    position: [3120, 520],
  },
});

const processEachPhoto = splitInBatches({
  version: 3,
  config: {
    name: 'Process Each Photo',
    parameters: { batchSize: 1 },
    position: [1440, 520],
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
        'Background expanded using canvas fill + centered composite. Gemini via 9router is used for connectivity check; swap in image-edit model when available.',
    },
  },
];`,
    },
    position: [3600, 360],
  },
});

export default workflow(
  'gdrive-photo-expand-center',
  'Google Drive Photo Expand + Center',
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
          .to(resizeToFit)
          .to(getImageInfo)
          .to(prepareLayout)
          .to(createBackgroundCanvas)
          .to(compositeCentered)
          .to(uploadEditedImage)
          .to(nextBatch(processEachPhoto)),
      ),
  );
