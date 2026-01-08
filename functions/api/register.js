export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const { name, email } = await request.json();
        
        // Validate input
        if (!name || !email) {
            return new Response(JSON.stringify({ error: 'Name and email are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if user already exists
        const existingUser = await env.LOYALTY_CARDS.get(`user:${email}`);
        
        if (existingUser) {
            const userData = JSON.parse(existingUser);
            return new Response(JSON.stringify(userData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate unique serial number
        const serialNumber = `FD${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
        
        // Create user data
        const userData = {
            serialNumber,
            name,
            email,
            points: 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Store in KV
        await env.LOYALTY_CARDS.put(`user:${email}`, JSON.stringify(userData));
        await env.LOYALTY_CARDS.put(`serial:${serialNumber}`, JSON.stringify(userData));

        return new Response(JSON.stringify(userData), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}