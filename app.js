document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loyaltyForm');
    const registrationSection = document.getElementById('registration-form');
    const successSection = document.getElementById('success-section');
    const errorSection = document.getElementById('error-section');
    const downloadLink = document.getElementById('downloadLink');
    const currentPointsEl = document.getElementById('currentPoints');
    const errorMessage = document.getElementById('errorMessage');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Disable button and show loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim()
        };

        try {
            // First, register the user
            const registerResponse = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!registerResponse.ok) {
                throw new Error('Registration failed');
            }

            const userData = await registerResponse.json();
            
            // Then generate the pass
            const passResponse = await fetch('/api/generate-pass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serialNumber: userData.serialNumber,
                    name: formData.name,
                    email: formData.email
                })
            });

            if (!passResponse.ok) {
                throw new Error('Pass generation failed');
            }

            // Get the pass as a blob
            const passBlob = await passResponse.blob();
            const passUrl = URL.createObjectURL(passBlob);
            
            // Update UI
            registrationSection.style.display = 'none';
            successSection.style.display = 'block';
            downloadLink.href = passUrl;
            downloadLink.download = 'FlyingDutchman.pkpass';
            currentPointsEl.textContent = userData.points || 0;
            
        } catch (error) {
            console.error('Error:', error);
            registrationSection.style.display = 'none';
            errorSection.style.display = 'block';
            errorMessage.textContent = 'Sorry, something went wrong. Please try again.';
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });
});