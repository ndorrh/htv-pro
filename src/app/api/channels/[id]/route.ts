import { NextResponse } from 'next/server';
import { getChannelById } from '@/lib/iptvApi';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params based on Next.js 15 rules
    const resolvedParams = await params;
    const channel = await getChannelById(resolvedParams.id);
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    
    return NextResponse.json(channel);
  } catch (error) {
    console.error(`Error in /api/channels/[id]:`, error);
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 });
  }
}
