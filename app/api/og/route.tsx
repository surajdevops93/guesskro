/**
 * app/api/og/route.tsx
 * ----------------------------------------------------------------------------
 * Dynamically renders the Open Graph share-card image for a quiz.
 * Called like: /api/og?creator=Aman&reward=a%20coffee&score=5
 *
 * Runs on the Edge runtime (required by @vercel/og / ImageResponse) so the
 * image generates in <100ms at the CDN edge, close to whoever's link-preview
 * bot (WhatsApp/Instagram/iMessage) is requesting it.
 * ----------------------------------------------------------------------------
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Standard OG image size (matches WhatsApp/Instagram/FB preview aspect ratio)
const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Sanitize + fall back to safe defaults — this endpoint is publicly
  // hittable by any share-preview bot, so never trust params blindly.
  const creatorName = (searchParams.get('creator') ?? 'Someone').slice(0, 40);
  const rewardText = (searchParams.get('reward') ?? 'a surprise').slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Gamified gradient background — brand-agnostic, tweak to your palette
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Trophy / badge icon */}
        <div
          style={{
            display: 'flex',
            fontSize: 80,
            marginBottom: 20,
          }}
        >
          🏆
        </div>

        {/* Title: "Aman challenged you!" */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: 24,
            maxWidth: 1000,
          }}
        >
          {creatorName} challenged you!
        </div>

        {/* Description: "Score 5/5 and win a coffee with Aman!" */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: 'rgba(255,255,255,0.92)',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Score 5/5 and win {rewardText} with {creatorName}!
        </div>

        {/* Bottom pill CTA */}
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            padding: '14px 36px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 999,
            color: 'white',
            fontSize: 28,
            fontWeight: 600,
            border: '2px solid rgba(255,255,255,0.4)',
          }}
        >
          Tap to Play →
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}