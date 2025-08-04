document.addEventListener('DOMContentLoaded', function() {
    const predictBtn = document.getElementById('predict-btn');
    const cityInput = document.getElementById('city');
    const resultSection = document.getElementById('result');
    const loadingSection = document.getElementById('loading');
    
    // US Census Bureau API Key (hardcoded)
    const CENSUS_API_KEY = '5ababc1dc641315e24f27d9eb0de6713ea365673';
    
    // State to FIPS code mapping
    const STATE_FIPS = {
        'alabama': '01', 'alaska': '02', 'arizona': '04', 'arkansas': '05',
        'california': '06', 'colorado': '08', 'connecticut': '09', 'delaware': '10',
        'florida': '12', 'georgia': '13', 'hawaii': '15', 'idaho': '16',
        'illinois': '17', 'indiana': '18', 'iowa': '19', 'kansas': '20',
        'kentucky': '21', 'louisiana': '22', 'maine': '23', 'maryland': '24',
        'massachusetts': '25', 'michigan': '26', 'minnesota': '27', 'mississippi': '28',
        'missouri': '29', 'montana': '30', 'nebraska': '31', 'nevada': '32',
        'new hampshire': '33', 'new jersey': '34', 'new mexico': '35', 'new york': '36',
        'north carolina': '37', 'north dakota': '38', 'ohio': '39', 'oklahoma': '40',
        'oregon': '41', 'pennsylvania': '42', 'rhode island': '44', 'south carolina': '45',
        'south dakota': '46', 'tennessee': '47', 'texas': '48', 'utah': '49',
        'vermont': '50', 'virginia': '51', 'washington': '53', 'west virginia': '54',
        'wisconsin': '55', 'wyoming': '56'
    };

    predictBtn.addEventListener('click', async function() {
        const location = cityInput.value.trim().toLowerCase();
        
        if (!location) {
            alert('Please enter a state name');
            return;
        }

        // Show loading animation
        loadingSection.classList.remove('hidden');
        resultSection.classList.add('hidden');

        try {
            const fipsCode = STATE_FIPS[location];
            if (!fipsCode) {
                throw new Error('State not found. Try "California" or "NY"');
            }

            const rentData = await fetchCensusRentData(fipsCode);
            displayResults(location, rentData);
        } catch (error) {
            console.error('Prediction error:', error);
            alert(error.message || 'Prediction failed. Using simulated data.');
            displayResults(location, generateRandomData());
        } finally {
            loadingSection.classList.add('hidden');
        }
    });

    async function fetchCensusRentData(fipsCode) {
        const endpoint = `https://api.census.gov/data/2021/acs/acs5?get=B25064_001E,NAME&for=state:${fipsCode}&key=${CENSUS_API_KEY}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to fetch Census data');
        }

        const data = await response.json();
        if (!data || data.length < 2) {
            throw new Error('No rent data available');
        }

        const medianRent = parseFloat(data[1][0]);
        if (isNaN(medianRent)) {
            throw new Error('Invalid rent data format');
        }

        // Calculate trends (simplified - in a real app, you'd compare historical data)
        const trend = 1 + (Math.random() * 0.1); // Random growth between 0-10%
        const volatility = 0.05 + (Math.random() * 0.1); // Random volatility

        return {
            current: medianRent,
            trend: trend,
            volatility: volatility
        };
    }

    function generateRandomData() {
        // Fallback data generation if API fails
        const randomCurrent = 800 + Math.random() * 3000;
        return {
            current: Math.round(randomCurrent),
            trend: 1 + (Math.random() * 0.2),
            volatility: 0.1 + (Math.random() * 0.2)
        };
    }

    function displayResults(location, data) {
        // Format location name
        const formattedLocation = location.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Calculate predictions
        const nextYear = Math.round(data.current * data.trend * (1 + (Math.random() - 0.5) * data.volatility));
        const fiveYear = Math.round(data.current * Math.pow(data.trend, 5) * (1 + (Math.random() - 0.5) * data.volatility));
        
        // Calculate risk level (0-100)
        const riskLevel = Math.min(100, Math.max(0, 
            Math.round((data.trend - 1) * 200 + data.volatility * 100 + (data.current > 2000 ? 20 : 0))
        ));

        // Update DOM
        document.getElementById('result-city').textContent = formattedLocation;
        document.getElementById('current-rent').textContent = `$${data.current}`;
        document.getElementById('next-year').textContent = `$${nextYear}`;
        document.getElementById('five-year').textContent = `$${fiveYear}`;
        
        // Animate risk meter
        const riskMeter = document.getElementById('risk-level');
        riskMeter.style.width = '0%';
        setTimeout(() => {
            riskMeter.style.width = `${riskLevel}%`;
            riskMeter.setAttribute('data-level', riskLevel);
        }, 100);
        
        // Show results
        resultSection.classList.remove('hidden');
        
        // Add glitch effect for high risk
        if (riskLevel > 70) {
            resultSection.classList.add('glitch-effect');
            setTimeout(() => {
                resultSection.classList.remove('glitch-effect');
            }, 500);
        }
    }
});