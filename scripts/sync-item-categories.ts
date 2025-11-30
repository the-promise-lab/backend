import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const CATEGORY_CSV_RELATIVE_PATH =
  '../data/csv/[가방싸lab] 기획 소통 문서 통합.xlsx - [기획]ItemCategory.csv';

interface ItemCategoryCsvRecord {
  readonly ItemCategoryID: string;
  readonly '#국문설명'?: string;
  readonly '#영문설명'?: string;
  readonly '#영문ID'?: string;
  readonly ItemList?: string;
}

interface ParsedCategory {
  readonly id: number;
  readonly korName: string;
  readonly engName: string | null;
  readonly itemIds: number[];
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const categories = parseCategoriesFromCsv();

  if (categories.length === 0) {
    throw new Error('No categories parsed from CSV.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemToCategory.deleteMany({});

    for (const category of categories) {
      await tx.itemCategory.upsert({
        where: { id: BigInt(category.id) },
        update: {
          korName: category.korName,
          engName: category.engName,
        },
        create: {
          id: BigInt(category.id),
          korName: category.korName,
          engName: category.engName,
        },
      });
    }

    await tx.itemCategory.deleteMany({
      where: {
        id: {
          notIn: categories.map((category) => BigInt(category.id)),
        },
      },
    });

    const itemToCategoryPayload = categories.flatMap((category) =>
      category.itemIds.map((itemId) => ({
        itemId: BigInt(itemId),
        categoryId: BigInt(category.id),
      })),
    );

    if (itemToCategoryPayload.length > 0) {
      await tx.itemToCategory.createMany({
        data: itemToCategoryPayload,
        skipDuplicates: true,
      });
    }
  });

  console.log('Item categories and mappings synchronized successfully.');
}

function parseCategoriesFromCsv(): ParsedCategory[] {
  const csvPath = path.resolve(__dirname, CATEGORY_CSV_RELATIVE_PATH);
  const raw = readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    from_line: 7,
    skip_empty_lines: true,
    trim: true,
  }) as ItemCategoryCsvRecord[];

  return records
    .map((record) => toParsedCategory(record))
    .filter((category): category is ParsedCategory => category !== null);
}

function toParsedCategory(
  record: ItemCategoryCsvRecord,
): ParsedCategory | null {
  const id = Number(record.ItemCategoryID);
  if (!Number.isFinite(id)) {
    return null;
  }
  const korName = (record['#국문설명'] ?? '').trim();
  const engField = record['#영문설명'] ?? record['#영문ID'] ?? '';
  const engName = engField.trim() || null;
  const itemIds = parseItemIdList(record.ItemList);

  return {
    id,
    korName: korName || `카테고리 ${id}`,
    engName,
    itemIds,
  };
}

function parseItemIdList(raw?: string): number[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
}

main()
  .catch((error) => {
    console.error('Failed to sync item categories:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
