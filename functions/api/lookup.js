export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        const url = new URL(request.url);
        const serialNumber = url.searchParams.get('serial');
        
        if (!serialNumber) {
            return new Response(JSON.stringify({ error: 'Serial number required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user data by serial number
        const userData = await env.LOYALTY_CARDS.get(`serial:${serialNumber}`);
        
        if (!userData) {
            return new Response(JSON.stringify({ error: 'Customer not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const customer = JSON.parse(userData);
        
        return new Response(JSON.stringify(customer), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Lookup error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}