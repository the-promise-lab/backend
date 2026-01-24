import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service';

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const ROOT_DIRECTORY_KEY = 'root';

export type ResourceVersion =
  | 'original'
  | 'webp'
  | 'resized-png'
  | 'resized-webp';

/**
 * GameResourceService groups object storage paths and converts them to CDN URLs.
 */
@Injectable()
export class GameResourceService {
  private cacheMap: Map<string, CacheEntry<Record<string, string[]>>> =
    new Map();
  private readonly cacheTtlMs = CACHE_TTL_MS;

  constructor(
    private readonly objectStorageService: ObjectStorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns grouped game resources with CDN URLs.
   */
  async getResources(
    version: ResourceVersion = 'original',
  ): Promise<Record<string, string[]>> {
    const cached = this.cacheMap.get(version);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const cdnBase = this.configService.getOrThrow<string>('KAKAO_CDN_BASE');
    try {
      const names = await this.objectStorageService.getObjectNames();
      const filteredNames = this.filterByVersion(names, version);
      const grouped = this.groupByDirectory(filteredNames, cdnBase);

      this.cacheMap.set(version, {
        value: grouped,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      return grouped;
    } catch {
      throw new ServiceUnavailableException('Failed to load game resources.');
    }
  }

  private filterByVersion(names: string[], version: ResourceVersion): string[] {
    switch (version) {
      case 'webp':
        return names.filter((name) => name.endsWith('@w.webp'));
      case 'resized-png':
        return names.filter((name) => name.endsWith('@s.png'));
      case 'resized-webp':
        return names.filter((name) => name.endsWith('@s.webp'));
      case 'original':
      default:
        // Exclude all versioned suffixes
        return names.filter(
          (name) =>
            !name.endsWith('@w.webp') &&
            !name.endsWith('@s.png') &&
            !name.endsWith('@s.webp'),
        );
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

  /**
   * Transforms an image URL to a versioned version.
   */
  transformImageUrl(
    url: string | null,
    version: ResourceVersion,
  ): string | null {
    if (!url) return null;
    if (version === 'original') return url;

    const lastDotIndex = url.lastIndexOf('.');
    if (lastDotIndex === -1) return url;

    const base = url.substring(0, lastDotIndex);
    switch (version) {
      case 'webp':
        return `${base}@w.webp`;
      case 'resized-png':
        return `${base}@s.png`;
      case 'resized-webp':
        return `${base}@s.webp`;
      default:
        return url;
    }
  }
}
