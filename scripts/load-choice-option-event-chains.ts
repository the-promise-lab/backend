import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient, choiceOption_resultType } from '@prisma/client';

const CSV_RELATIVE_PATH =
  'data/csv/[가방싸lab] 기획 소통 문서 통합.xlsx - Act(배포용) (2).csv';

interface ActCsvRecord {
  ActID: string;
  ChoiceEventId: string;
  Select1AfterEvents?: string;
  Select1Result?: string;
  Select2AfterEvents?: string;
  Select2Result?: string;
  Select3AfterEvents?: string;
  Select3Result?: string;
  SelectXAfterEvents?: string;
  SelectXResult?: string;
}

interface OptionFieldMapping {
  readonly eventsField: keyof ActCsvRecord;
  readonly resultField: keyof ActCsvRecord;
}

const OPTION_MAPPINGS: OptionFieldMapping[] = [
  { eventsField: 'Select1AfterEvents', resultField: 'Select1Result' },
  { eventsField: 'Select2AfterEvents', resultField: 'Select2Result' },
  { eventsField: 'Select3AfterEvents', resultField: 'Select3Result' },
  { eventsField: 'SelectXAfterEvents', resultField: 'SelectXResult' },
];

const RESULT_MAP: Record<string, choiceOption_resultType> = {
  actend: choiceOption_resultType.CONTINUE,
  continue: choiceOption_resultType.CONTINUE,
  dayend: choiceOption_resultType.DAY_END,
  gameend: choiceOption_resultType.GAME_END,
  gameover: choiceOption_resultType.GAME_OVER,
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const csvPath = path.resolve(CSV_RELATIVE_PATH);
  const raw = readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    from_line: 2,
    skip_empty_lines: true,
    trim: true,
  }) as ActCsvRecord[];

  const usableRows = records.filter(
    (row) => row.ActID && row.ActID.toLowerCase() !== 'int',
  );

  for (const row of usableRows) {
    const choiceEventId = Number(row.ChoiceEventId);
    if (!choiceEventId || Number.isNaN(choiceEventId)) {
      continue;
    }

    const choiceEvent = await prisma.choiceEvent.findFirst({
      where: { eventId: BigInt(choiceEventId) },
      include: {
        choiceOption: {
          orderBy: { optionOrder: 'asc' },
        },
      },
    });

    if (!choiceEvent) {
      continue;
    }

    await Promise.all(
      OPTION_MAPPINGS.map(async (mapping, index) => {
        const option = choiceEvent.choiceOption[index];
        if (!option) {
          return;
        }

        const eventIds = parseEventList(row[mapping.eventsField]);
        await prisma.choiceOptionEventChain.deleteMany({
          where: { choiceOptionId: option.id },
        });

        if (eventIds.length > 0) {
          await prisma.choiceOptionEventChain.createMany({
            data: eventIds.map((eventId, idx) => ({
              choiceOptionId: option.id,
              seqOrder: idx + 1,
              eventId: BigInt(eventId),
            })),
          });
        }

        const mappedResult = mapResult(row[mapping.resultField]);
        if (mappedResult && mappedResult !== option.resultType) {
          await prisma.choiceOption.update({
            where: { id: option.id },
            data: { resultType: mappedResult },
          });
        }
      }),
    );
  }
}

function parseEventList(raw?: string): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => !Number.isNaN(value));
}

function mapResult(raw?: string): choiceOption_resultType | null {
  if (!raw) {
    return null;
  }
  return RESULT_MAP[raw.trim().toLowerCase()] ?? null;
}

main()
  .catch((error) => {
    console.error('Failed to load choice option event chains:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
