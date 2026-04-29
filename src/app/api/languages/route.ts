import { NextResponse } from 'next/server';
import { getLanguages } from '@/lib/iptvApi';

export async function GET() {
  try {
    const languages = await getLanguages();
    return NextResponse.json(languages);
  } catch (error) {
    console.error('Error in /api/languages:', error);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}
