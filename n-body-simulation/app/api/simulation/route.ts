import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: for Edge Runtime

export async function POST(request: Request) {
  try {
    const { bodies, method, scale } = await request.json();

    // Validate input
    if (!Array.isArray(bodies) || typeof method !== 'number' || typeof scale !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Here you could:
    // 1. Save simulation to database
    // 2. Perform heavy computations
    // 3. Validate data further

    return NextResponse.json({
      status: 'success',
      data: {
        bodies,
        method,
        scale,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}