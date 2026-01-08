import { PKPass } from 'passkit-generator';

// GET - Return updated pass when Apple Wallet requests it
export async function onRequestGet(context) {
    const { params, request, env } = context;
    const serialNumber = params.serialNumber;
    
    try {
        // Verify authentication token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('ApplePass ')) {
            return new Response('Unauthorized', { status: 401 });
        }
        
        const token = authHeader.replace('ApplePass ', '');
        if (token !== serialNumber) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Get user data
        const userData = await env.LOYALTY_CARDS.get(`serial:${serialNumber}`);
        if (!userData) {
            return new Response('Pass not found', { status: 404 });
        }
        
        const user = JSON.parse(userData);

        // Generate updated pass
        const pass = await PKPass.from({
            model: './pass-assets',
            certificates: {
                wwdr: env.APPLE_WWDR_CERT,
                signerCert: env.SIGNER_CERT,
                signerKey: env.SIGNER_KEY,
                signerKeyPassphrase: env.PASS_CERT_PASSWORD
            }
        }, {
            serialNumber: serialNumber,
            description: 'The Flying Dutchman Loyalty Card',
            organizationName: 'The Flying Dutchman',
            passTypeIdentifier: env.PASS_TYPE_ID,
            teamIdentifier: env.TEAM_ID,
            backgroundColor: 'rgb(102, 126, 234)',
            foregroundColor: 'rgb(255, 255, 255)',
            labelColor: 'rgb(255, 255, 255)',
            logoText: 'The Flying Dutchman',
            
            webServiceURL: `https://${new URL(request.url).hostname}`,
            authenticationToken: serialNumber,
            
            barcodes: [{
                message: serialNumber,
                format: 'PKBarcodeFormatQR',
                messageEncoding: 'iso-8859-1'
            }],
            
            storeCard: {
                headerFields: [
                    {
                        key: 'points',
                        label: 'AVAILABLE',
                        value: user.points.toString(),
                        changeMessage: 'Your balance is now %@'
                    }
                ],
                primaryFields: [
                    {
                        key: 'name',
                        label: 'CARD OF',
                        value: user.name
                    }
                ],
                secondaryFields: [
                    {
                        key: 'member-since',
                        label: 'MEMBER SINCE',
                        value: new Date(user.createdAt).toLocaleDateString()
                    }
                ],
                backFields: [
                    {
                        key: 'email',
                        label: 'Email',
                        value: user.email
                    },
                    {
                        key: 'serial',
                        label: 'Card Number',
                        value: serialNumber
                    },
                    {
                        key: 'last-updated',
                        label: 'Last Updated',
                        value: new Date(user.lastUpdated).toLocaleString()
                    },
                    {
                        key: 'terms',
                        label: 'Terms & Conditions',
                        value: 'Earn 1 point for every purchase. Redeem points for free drinks and food items. Points never expire.'
                    }
                ]
            }
        });

        const buffer = pass.getAsBuffer();
        const lastModified = new Date(user.lastUpdated).toUTCString();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.apple.pkpass',
                'Last-Modified': lastModified
            }
        });

    } catch (error) {
        console.error('Pass retrieval error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}

// POST - Register device for push notifications
export async function onRequestPost(context) {
    const { params, request, env } = context;
    const serialNumber = params.serialNumber;
    
    try {
        const { deviceLibraryIdentifier, pushToken } = await request.json();
        
        if (!deviceLibraryIdentifier || !pushToken) {
            return new Response('Missing required fields', { status: 400 });
        }

        // Store device registration
        const registrationKey = `device:${deviceLibraryIdentifier}:${serialNumber}`;
        await env.LOYALTY_CARDS.put(registrationKey, JSON.stringify({
            pushToken,
            registeredAt: new Date().toISOString()
        }));

        return new Response('', { status: 201 });

    } catch (error) {
        console.error('Device registration error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}

// DELETE - Unregister device
export async function onRequestDelete(context) {
    const { params, env } = context;
    const serialNumber = params.serialNumber;
    const deviceLibraryIdentifier = new URL(context.request.url).searchParams.get('deviceLibraryIdentifier');
    
    try {
        if (!deviceLibraryIdentifier) {
            return new Response('Missing deviceLibraryIdentifier', { status: 400 });
        }

        const registrationKey = `device:${deviceLibraryIdentifier}:${serialNumber}`;
        await env.LOYALTY_CARDS.delete(registrationKey);

        return new Response('', { status: 200 });

    } catch (error) {
        console.error('Device unregistration error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}