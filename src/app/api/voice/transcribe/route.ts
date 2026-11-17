import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!body.audioBase64 || !body.mimeType) {
      return NextResponse.json(
        { error: 'Missing audio recording payload.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.',
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: body.mimeType,
              data: body.audioBase64,
            },
          },
          {
            text: 'Transcribe this spoken expense or bill-split command verbatim.',
          },
        ],
      },
    });

    return NextResponse.json({ transcript: (response.text ?? '').trim() });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to transcribe voice note.';
    console.error('Voice transcribe API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
