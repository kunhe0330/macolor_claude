// /api/analyze-colors.js
// Vercel 서버리스 함수 - Google Vision API를 안전하게 호출

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // 환경 변수에서 API 키 가져오기 (Vercel 대시보드에서 설정)
    const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

    if (!GOOGLE_VISION_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

    const requestBody = {
      requests: [{
        image: {
          content: imageBase64
        },
        features: [{
          type: 'IMAGE_PROPERTIES',
          maxResults: 10
        }]
      }]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Vision API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to analyze image',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    
    // 색상 데이터 추출 및 변환
    const colors = data.responses[0].imagePropertiesAnnotation.dominantColors.colors;
    
    const hexColors = colors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(colorInfo => {
        const color = colorInfo.color;
        const r = Math.round(color.red || 0);
        const g = Math.round(color.green || 0);
        const b = Math.round(color.blue || 0);
        return rgbToHex(r, g, b);
      });

    return res.status(200).json({ 
      success: true,
      colors: hexColors 
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}