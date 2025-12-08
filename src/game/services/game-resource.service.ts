import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service';

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const ROOT_DIRECTORY_KEY = 'root';

/**
 * GameResourceService groups object storage paths and converts them to CDN URLs.
 */
@Injectable()
export class GameResourceService {
  private cache: CacheEntry<Record<string, string[]>> | null = null;
  private readonly cacheTtlMs = CACHE_TTL_MS;

  constructor(
    private readonly objectStorageService: ObjectStorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns grouped game resources with CDN URLs.
   */
  async getResources(): Promise<Record<string, string[]>> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.value;
    }
    const cdnBase = this.configService.getOrThrow<string>('KAKAO_CDN_BASE');
    try {
      const names = await this.objectStorageService.getObjectNames();
      const grouped = this.groupByDirectory(names, cdnBase);
      this.cache = {
        value: grouped,
        expiresAt: Date.now() + this.cacheTtlMs,
      };
      return grouped;
    } catch {
      throw new ServiceUnavailableException('Failed to load game resources.');
    }
  }

  private groupByDirectory(
    names: string[],
    cdnBase: string,
  ): Record<string, string[]> {
    return names.reduce<Record<string, string[]>>((acc, name) => {
      if (name.endsWith('/')) {
        return acc;
      }
      const directory = this.resolveDirectory(name);
      const url = `${cdnBase}/${name}`;
      const existing = acc[directory] ?? [];
      existing.push(url);
      acc[directory] = existing;
      return acc;
    }, {});
  }

  private resolveDirectory(name: string): string {
    if (name.startsWith('img/')) {
      const trimmed = name.slice(4);
      const [primary] = trimmed.split('/');
      return primary || ROOT_DIRECTORY_KEY;
    }
    const [top] = name.split('/');
    if (!top) {
      return ROOT_DIRECTORY_KEY;
    }
    return top;
  }
}
