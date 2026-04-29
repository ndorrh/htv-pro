import { NextResponse } from 'next/server';
import { getCities } from '@/lib/iptvApi';

export async function GET() {
  try {
    const cities = await getCities();
    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error in /api/cities:', error);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}
