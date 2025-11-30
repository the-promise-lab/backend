import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const CSV_RELATIVE_PATH =
  'data/csv/[가방싸lab] 기획 소통 문서 통합.xlsx - Event(배포용) (2).csv';
const CHAR1_ID = BigInt(9);
const CHAR2_ID = BigInt(10);

interface EventCsvRecord {
  readonly EventID: string;
  readonly Event: string;
  readonly charID1?: string;
  readonly charID2?: string;
  readonly char1EffectType1?: string;
  readonly char1EffectValue1?: string;
  readonly char1EffectType2?: string;
  readonly char1EffectValue2?: string;
  readonly char2ffectType1?: string;
  readonly char2EffectValue1?: string;
  readonly char2EffectType2?: string;
  readonly char2EffectValue2?: string;
  readonly LifePointvalue?: string;
}

interface EffectSlot {
  readonly characterId: bigint | null;
  readonly effectType: string;
  readonly effectValue: string;
}

interface SlotConfig {
  readonly label: string;
  readonly characterId: bigint | null;
  readonly defaultEffectType: string;
  readonly typeField?: keyof EventCsvRecord;
  readonly valueField: keyof EventCsvRecord;
}

const SLOT_CONFIGS: SlotConfig[] = [
  {
    label: 'char1_hp',
    characterId: CHAR1_ID,
    defaultEffectType: 'health',
    typeField: 'char1EffectType1',
    valueField: 'char1EffectValue1',
  },
  {
    label: 'char1_mental',
    characterId: CHAR1_ID,
    defaultEffectType: 'mental',
    typeField: 'char1EffectType2',
    valueField: 'char1EffectValue2',
  },
  {
    label: 'char2_hp',
    characterId: CHAR2_ID,
    defaultEffectType: 'health',
    typeField: 'char2ffectType1',
    valueField: 'char2EffectValue1',
  },
  {
    label: 'char2_mental',
    characterId: CHAR2_ID,
    defaultEffectType: 'mental',
    typeField: 'char2EffectType2',
    valueField: 'char2EffectValue2',
  },
  {
    label: 'lifepoint',
    characterId: null,
    defaultEffectType: 'LIFE_POINT',
    valueField: 'LifePointvalue',
  },
];

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const csvPath = path.resolve(CSV_RELATIVE_PATH);
  const raw = readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    from_line: 2,
    skip_empty_lines: true,
    trim: true,
  }) as EventCsvRecord[];

  const statusRows = records.filter(
    (row) => row.Event?.toLowerCase() === 'status',
  );
  console.log(
    `Parsed ${records.length} rows, status rows: ${statusRows.length}`,
  );

  await prisma.eventStatusEffect.deleteMany({});

  for (const row of statusRows) {
    const eventId = Number(row.EventID);
    if (!Number.isFinite(eventId)) {
      continue;
    }

    const status = await prisma.eventStatus.findUnique({
      where: { eventId: BigInt(eventId) },
    });
    if (!status) {
      continue;
    }

    const effectSlots = buildEffectSlots(row).filter(Boolean);
    for (const slot of effectSlots) {
      await prisma.eventStatusEffect.create({
        data: {
          statusEventId: status.eventId,
          characterId: slot.characterId,
          effectType: slot.effectType,
          effectValue: slot.effectValue,
        },
      });
    }

    console.log(`Inserted ${effectSlots.length} effects for event ${eventId}`);
  }
}

function buildEffectSlots(row: EventCsvRecord): EffectSlot[] {
  return SLOT_CONFIGS.map((config) => {
    const effectType =
      normalizeString(
        config.typeField ? row[config.typeField] : config.defaultEffectType,
      ) ?? config.defaultEffectType;
    const rawValue = normalizeString(row[config.valueField]) ?? '0';
    return {
      characterId: config.characterId,
      effectType,
      effectValue: rawValue,
    };
  });
}

function normalizeString(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

main()
  .catch((error) => {
    console.error('Failed to load event status effects:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
