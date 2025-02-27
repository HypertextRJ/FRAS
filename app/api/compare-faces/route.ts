import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';
    
    // Clone the request body since it can only be read once
    const clonedBody = await request.clone().blob();
    
    // Forward the request to Flask backend
    const response = await fetch(`${flaskUrl}/compare-faces`, {
      method: 'POST',
      headers: {
        // Only pass necessary headers
        'Accept': 'application/json',
        // Don't copy Content-Type, let it be set automatically for FormData
      },
      body: clonedBody,
    });

    // Get both text and parsed JSON for better error handling
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Flask backend error:', data);
      return NextResponse.json(
        { error: data.error || `Server error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in compare-faces proxy:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}