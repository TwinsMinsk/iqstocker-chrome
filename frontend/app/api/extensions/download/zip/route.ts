/**
 * Скачивание актуальной версии расширения в ZIP.
 *
 * Файл `public/downloads/extension/latest.zip` создаётся скриптом упаковки.
 * Мы отдаём его через API-роут, чтобы:
 * - выставить корректные заголовки (attachment + no-store)
 * - не привязывать UI к конкретному имени файла (всегда один URL)
 */
import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  const zipPath = path.join(
    process.cwd(),
    'public',
    'downloads',
    'extension',
    'latest.zip',
  );

  // Попробуем взять версию, чтобы красиво назвать файл при скачивании
  let version = 'latest';
  try {
    const latestJsonPath = path.join(
      process.cwd(),
      'public',
      'downloads',
      'extension',
      'latest.json',
    );
    const raw = await readFile(latestJsonPath, 'utf8');
    const data = JSON.parse(raw) as { version?: string };
    if (data?.version) version = `v${data.version}`;
  } catch {
    // версия необязательна — отдаём как есть
  }

  try {
    const info = await stat(zipPath);
    const buffer = await readFile(zipPath);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(info.size),
        'Content-Disposition': `attachment; filename="iqstocker-auto-extension-${version}.zip"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: 'zip_not_found',
        message:
          'Файл latest.zip не найден. Сначала упакуйте расширение и опубликуйте latest.zip.',
      },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  }
}


