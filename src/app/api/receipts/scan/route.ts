import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!body.imageBase64 || !body.mimeType) {
      return NextResponse.json(
        { error: 'Please provide a receipt image (base64 + mimeType).' },
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
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: body.mimeType,
              data: body.imageBase64,
            },
          },
          {
            text: 'Extract the merchant, date, payment method, category (one of Dining, Software, Travel, Groceries, Utilities, Housing), subtotal, tax, tip, total, and every individual line item with its price from this receipt.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            category: { type: Type.STRING },
            subtotal: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            tip: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                },
                required: ['name', 'price'],
              },
            },
          },
          required: [
            'merchant',
            'subtotal',
            'tax',
            'tip',
            'total',
            'category',
            'items',
          ],
        },
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    return NextResponse.json({ receipt: parsed });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to extract receipt image.';
    console.error('Receipt scan API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
