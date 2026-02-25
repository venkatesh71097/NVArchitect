export default async function handler(req, res) {
  // 1. Reject anything that isn't a POST request
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 2. Forward the exact payload to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_NVIDIA_API_KEY}` // Ensure this matches your Vercel env variable name
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    // 3. Return the NIM response to your frontend
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to proxy request to NVIDIA' });
  }
}
