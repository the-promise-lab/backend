import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  S3Client,
} from '@aws-sdk/client-s3';

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * ObjectStorageService handles object listing for Kakao Object Storage (S3 compatible).
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private listCache: CacheEntry<string[]> | null = null;
  private readonly cacheTtlMs = DEFAULT_CACHE_TTL_MS;
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('KAKAO_BUCKET_NAME') || 'gbslab';
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('KAKAO_REGION'),
      endpoint: this.configService.getOrThrow<string>('KAKAO_OBJECT_BASE'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('KAKAO_ACCESS_KEY'),
        secretAccessKey:
          this.configService.getOrThrow<string>('KAKAO_SECRET_KEY'),
      },
    });
  }

  /**
   * Retrieves object names under the img/ prefix with 10-minute caching.
   */
  async getObjectNames(): Promise<string[]> {
    if (this.listCache && Date.now() < this.listCache.expiresAt) {
      return this.listCache.value;
    }
    try {
      const names = await this.listObjectsByPrefix('img/');
      this.listCache = {
        value: names,
        expiresAt: Date.now() + this.cacheTtlMs,
      };
      return names;
    } catch (error) {
      this.logger.error(
        'Failed to fetch object list from Kakao Object Storage',
        error as Error,
      );
      throw new ServiceUnavailableException(
        'Failed to load game resources from object storage.',
      );
    }
  }

  private async listObjectsByPrefix(prefix: string): Promise<string[]> {
    const input: ListObjectsV2CommandInput = {
      Bucket: this.bucket,
      Prefix: prefix,
    };
    const names: string[] = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          ...input,
          ContinuationToken: continuationToken,
        }),
      );
      const batch =
        response.Contents?.map((item) => item.Key).filter(Boolean) ?? [];
      names.push(...(batch as string[]));
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return names;
  }
}
