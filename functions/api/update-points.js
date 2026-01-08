export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const { serialNumber, pointsToAdd, action } = await request.json();
        
        if (!serialNumber || pointsToAdd === undefined) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user data
        const userData = await env.LOYALTY_CARDS.get(`serial:${serialNumber}`);
        
        if (!userData) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = JSON.parse(userData);
        
        // Update points
        const oldPoints = user.points;
        user.points = Math.max(0, user.points + pointsToAdd);
        user.lastUpdated = new Date().toISOString();
        
        // Add to transaction history
        if (!user.transactions) {
            user.transactions = [];
        }
        
        user.transactions.push({
            date: new Date().toISOString(),
            pointsChange: pointsToAdd,
            action: action || (pointsToAdd > 0 ? 'earned' : 'redeemed'),
            newBalance: user.points
        });

        // Update in KV
        await env.LOYALTY_CARDS.put(`serial:${serialNumber}`, JSON.stringify(user));
        await env.LOYALTY_CARDS.put(`user:${user.email}`, JSON.stringify(user));

        // Trigger pass update notification
        // Apple Wallet will request the updated pass from our webServiceURL
        // This happens automatically when we return the update notification
        
        return new Response(JSON.stringify({
            success: true,
            oldPoints,
            newPoints: user.points,
            pointsChange: pointsToAdd,
            serialNumber
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update points error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update points',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}