import { NextResponse } from 'next/server';
import { getSubdivisions } from '@/lib/iptvApi';

export async function GET() {
  try {
    const subdivisions = await getSubdivisions();
    return NextResponse.json(subdivisions);
  } catch (error) {
    console.error('Error in /api/subdivisions:', error);
    return NextResponse.json({ error: 'Failed to fetch subdivisions' }, { status: 500 });
  }
}
