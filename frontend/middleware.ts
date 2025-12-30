import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Проверяем параметр ref в URL
  const refCode = request.nextUrl.searchParams.get('ref');
  
  if (refCode) {
    // Валидация: только A-Z0-9, длина до 12 (как в модели).
    const normalized = refCode.toUpperCase().trim();
    const isValid = /^[A-Z0-9]{3,12}$/.test(normalized);

    if (isValid) {
      // Anti-affiliate-stealing: "first-touch attribution"
      // Не перетираем существующий ref_code, если он уже установлен.
      const existing = request.cookies.get('ref_code')?.value;
      if (!existing) {
        response.cookies.set('ref_code', normalized, {
          maxAge: 60 * 60 * 24 * 30, // 30 дней
          path: '/',
          httpOnly: false, // Доступен из JS для отправки при регистрации
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      }
    }
  }
  
  return response;
}

// Применяем middleware ко всем страницам
export const config = {
  matcher: [
    // Исключаем API и статику
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

