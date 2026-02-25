export default async function handler(req: any, res: any) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract the path after /api/nvidia/
    const { path } = req.query;
    const targetPath = Array.isArray(path) ? path.join('/') : path || '';
    const targetUrl = `https://integrate.api.nvidia.com/${targetPath}`;

    const apiKey = process.env.VITE_NVIDIA_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body),
        });

        const data = await response.json();

        // Forward status code and body
        res.status(response.status).json(data);
    } catch (error) {
        console.error('NVIDIA API proxy error:', error);
        res.status(502).json({ error: 'Failed to proxy request to NVIDIA API' });
    }
}
