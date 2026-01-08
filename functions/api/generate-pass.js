import { PKPass } from 'passkit-generator';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const { serialNumber, name, email } = await request.json();
        
        if (!serialNumber || !name || !email) {
            return new Response('Missing required fields', { status: 400 });
        }

        // Get user data to get current points
        const userData = await env.LOYALTY_CARDS.get(`serial:${serialNumber}`);
        if (!userData) {
            return new Response('User not found', { status: 404 });
        }
        
        const user = JSON.parse(userData);

        // Create pass
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
            
            // Web service configuration for updates
            webServiceURL: `https://${new URL(request.url).hostname}`,
            authenticationToken: serialNumber, // Use serial as auth token
            
            // Barcode
            barcodes: [{
                message: serialNumber,
                format: 'PKBarcodeFormatQR',
                messageEncoding: 'iso-8859-1'
            }],
            
            // Card layout
            storeCard: {
                headerFields: [
                    {
                        key: 'points',
                        label: 'AVAILABLE',
                        value: user.points.toString()
                    }
                ],
                primaryFields: [
                    {
                        key: 'name',
                        label: 'CARD OF',
                        value: name
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
                        value: email
                    },
                    {
                        key: 'serial',
                        label: 'Card Number',
                        value: serialNumber
                    },
                    {
                        key: 'terms',
                        label: 'Terms & Conditions',
                        value: 'Earn 1 point for every purchase. Redeem points for free drinks and food items. Points never expire.'
                    }
                ]
            }
        });

        // Generate the pass buffer
        const buffer = pass.getAsBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.apple.pkpass',
                'Content-Disposition': 'attachment; filename="FlyingDutchman.pkpass"'
            }
        });

    } catch (error) {
        console.error('Pass generation error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate pass',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}