import { NextResponse } from 'next/server';
import { getTimezones } from '@/lib/iptvApi';

export async function GET() {
  try {
    const timezones = await getTimezones();
    return NextResponse.json(timezones);
  } catch (error) {
    console.error('Error in /api/timezones:', error);
    return NextResponse.json({ error: 'Failed to fetch timezones' }, { status: 500 });
  }
}
