import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'downloads',
      'extension',
      'latest.json',
    );

    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: 'latest_metadata_not_found',
        message:
          'Файл latest.json не найден. Сначала упакуйте расширение и опубликуйте latest.json.',
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


