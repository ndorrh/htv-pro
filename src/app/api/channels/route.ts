import { NextResponse } from 'next/server';
import { getChannels } from '@/lib/iptvApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const category = searchParams.get('category') || undefined;
  const country = searchParams.get('country') || undefined;
  const language = searchParams.get('language') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('search') || undefined;
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  
  const idsParam = searchParams.get('ids');
  const ids = idsParam ? idsParam.split(',') : undefined;

  try {
    const result = await getChannels({
      category,
      country,
      language,
      region,
      search,
      page,
      limit,
      ids
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}
