import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { Readable } from 'stream';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Explicitly load .env from the current working directory
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Successfully loaded .env from:', envPath);
} else {
  console.warn(
    '.env file not found at:',
    envPath,
    '. Proceeding with existing environment variables.',
  );
}

const cleanEnv = (key: string) => {
  const value = process.env[key] || '';
  return value.trim().replace(/^['"]|['"]$/g, '');
};

const bucket = cleanEnv('KAKAO_BUCKET_NAME') || 'gbslab';
const region = cleanEnv('KAKAO_REGION');
const endpoint = cleanEnv('KAKAO_OBJECT_BASE');
const accessKey = cleanEnv('KAKAO_S3_ACCESS_KEY');
const secretKey = cleanEnv('KAKAO_S3_SECRET_KEY');

console.log('--- Current Configuration ---');
console.log('Bucket:  ', bucket);
console.log('Region:  ', region);
console.log('Endpoint:', endpoint);
console.log('AccessKey Status:', accessKey ? 'PRESENT' : 'MISSING');
console.log('SecretKey Status:', secretKey ? 'PRESENT' : 'MISSING');
console.log('-----------------------------');

if (!region || !endpoint || !accessKey || !secretKey) {
  console.error(
    'CRITICAL ERROR: Missing required S3 configuration in environment.',
  );
  process.exit(1);
}

const s3Client = new S3Client({
  region: region,
  endpoint: endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function processImages() {
  console.log('Fetching objects from bucket:', bucket);
  let continuationToken: string | undefined;
  const imageExtensions = ['.png', '.jpg', '.jpeg'];

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    for (const obj of objects) {
      const key = obj.Key;
      if (!key) continue;

      const ext = path.extname(key).toLowerCase();
      if (!imageExtensions.includes(ext)) continue;

      // Skip already processed files
      if (
        key.includes('_w.webp') ||
        key.includes('_s.png') ||
        key.includes('_s.webp')
      ) {
        continue;
      }

      console.log('Processing:', key);

      try {
        const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
        const { Body } = await s3Client.send(getCommand);
        const buffer = await streamToBuffer(Body as Readable);

        const baseName = key.substring(0, key.length - ext.length);

        // 1. Webp original size
        const webpOriginal = await sharp(buffer).webp().toBuffer();
        await upload(baseName + '_w.webp', webpOriginal, 'image/webp');

        // 2 & 3: Resize (Max height 512, width 1024)
        const resizer = sharp(buffer).resize({
          width: 1024,
          height: 512,
          fit: 'inside',
          withoutEnlargement: true,
        });

        const pngResized = await resizer.clone().png().toBuffer();
        await upload(baseName + '_s.png', pngResized, 'image/png');

        const webpResized = await resizer.clone().webp().toBuffer();
        await upload(baseName + '_s.webp', webpResized, 'image/webp');

        console.log('Successfully processed:', key);
      } catch (err) {
        console.error('Failed to process:', key, err);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log('All images processed.');
}

async function upload(key: string, buffer: Buffer, contentType: string) {
  const uploadCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(uploadCommand);
}

processImages();
