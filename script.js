document.addEventListener('DOMContentLoaded', function() {
    const predictBtn = document.getElementById('predict-btn');
    const cityInput = document.getElementById('city');
    const resultSection = document.getElementById('result');
    const loadingSection = document.getElementById('loading');
    
    // US Census Bureau API Key
    const CENSUS_API_KEY = '5ababc1dc641315e24f27d9eb0de6713ea365673';
    
    // Enhanced state mapping with common aliases
    const STATE_DATA = {
        'alabama': { fips: '01', adjustment: 1.15, trend: 1.04 },
        'alaska': { fips: '02', adjustment: 1.10, trend: 1.03 },
        'arizona': { fips: '04', adjustment: 1.18, trend: 1.06 },
        'arkansas': { fips: '05', adjustment: 1.12, trend: 1.03 },
        'california': { fips: '06', adjustment: 1.32, trend: 1.03 },
        'colorado': { fips: '08', adjustment: 1.25, trend: 1.05 },
        'connecticut': { fips: '09', adjustment: 1.20, trend: 1.04 },
        'delaware': { fips: '10', adjustment: 1.18, trend: 1.04 },
        'florida': { fips: '12', adjustment: 1.20, trend: 1.07 },
        'georgia': { fips: '13', adjustment: 1.17, trend: 1.05 },
        'hawaii': { fips: '15', adjustment: 1.30, trend: 1.02 },
        'idaho': { fips: '16', adjustment: 1.22, trend: 1.08 },
        'illinois': { fips: '17', adjustment: 1.19, trend: 1.04 },
        'indiana': { fips: '18', adjustment: 1.14, trend: 1.03 },
        'iowa': { fips: '19', adjustment: 1.13, trend: 1.03 },
        'kansas': { fips: '20', adjustment: 1.14, trend: 1.03 },
        'kentucky': { fips: '21', adjustment: 1.13, trend: 1.03 },
        'louisiana': { fips: '22', adjustment: 1.14, trend: 1.03 },
        'maine': { fips: '23', adjustment: 1.16, trend: 1.05 },
        'maryland': { fips: '24', adjustment: 1.21, trend: 1.04 },
        'massachusetts': { fips: '25', adjustment: 1.23, trend: 1.04 },
        'michigan': { fips: '26', adjustment: 1.16, trend: 1.04 },
        'minnesota': { fips: '27', adjustment: 1.17, trend: 1.04 },
        'mississippi': { fips: '28', adjustment: 1.12, trend: 1.03 },
        'missouri': { fips: '29', adjustment: 1.15, trend: 1.04 },
        'montana': { fips: '30', adjustment: 1.20, trend: 1.07 },
        'nebraska': { fips: '31', adjustment: 1.14, trend: 1.03 },
        'nevada': { fips: '32', adjustment: 1.19, trend: 1.06 },
        'new hampshire': { fips: '33', adjustment: 1.18, trend: 1.05 },
        'new jersey': { fips: '34', adjustment: 1.22, trend: 1.04 },
        'new mexico': { fips: '35', adjustment: 1.16, trend: 1.04 },
        'new york': { fips: '36', adjustment: 1.28, trend: 1.04 },
        'north carolina': { fips: '37', adjustment: 1.17, trend: 1.05 },
        'north dakota': { fips: '38', adjustment: 1.13, trend: 1.03 },
        'ohio': { fips: '39', adjustment: 1.15, trend: 1.03 },
        'oklahoma': { fips: '40', adjustment: 1.14, trend: 1.03 },
        'oregon': { fips: '41', adjustment: 1.21, trend: 1.05 },
        'pennsylvania': { fips: '42', adjustment: 1.17, trend: 1.04 },
        'rhode island': { fips: '44', adjustment: 1.19, trend: 1.04 },
        'south carolina': { fips: '45', adjustment: 1.16, trend: 1.05 },
        'south dakota': { fips: '46', adjustment: 1.13, trend: 1.03 },
        'tennessee': { fips: '47', adjustment: 1.16, trend: 1.05 },
        'texas': { fips: '48', adjustment: 1.15, trend: 1.05 },
        'utah': { fips: '49', adjustment: 1.20, trend: 1.06 },
        'vermont': { fips: '50', adjustment: 1.17, trend: 1.05 },
        'virginia': { fips: '51', adjustment: 1.19, trend: 1.04 },
        'washington': { fips: '53', adjustment: 1.24, trend: 1.05 },
        'west virginia': { fips: '54', adjustment: 1.12, trend: 1.03 },
        'wisconsin': { fips: '55', adjustment: 1.15, trend: 1.04 },
        'wyoming': { fips: '56', adjustment: 1.14, trend: 1.03 },
        // Common abbreviations
        'ca': { fips: '06', adjustment: 1.32, trend: 1.03 },
        'ny': { fips: '36', adjustment: 1.28, trend: 1.04 },
        'tx': { fips: '48', adjustment: 1.15, trend: 1.05 },
        'fl': { fips: '12', adjustment: 1.20, trend: 1.07 }
    };

    predictBtn.addEventListener('click', async function() {
        const location = cityInput.value.trim().toLowerCase();
        
        if (!location) {
            showError('Enter a state name (e.g. "California" or "TX")');
            return;
        }

        loadingSection.classList.remove('hidden');
        resultSection.classList.add('hidden');

        try {
            const stateInfo = STATE_DATA[location];
            if (!stateInfo) throw new Error(`No data for "${location}". Try full state names like "California".`);

            const rentData = await fetchRentData(stateInfo.fips, stateInfo);
            displayResults(location, rentData);
        } catch (error) {
            console.error("Prediction error:", error);
            showError(error.message);
            displayResults(location, generateRealisticData(location));
        } finally {
            loadingSection.classList.add('hidden');
        }
    });

    async function fetchRentData(fipsCode, stateInfo) {
        // 1. Get Census Data
        const endpoint = `https://api.census.gov/data/2021/acs/acs5?get=B25064_001E,NAME&for=state:${fipsCode}&key=${CENSUS_API_KEY}`;
        const response = await fetch(endpoint);
        
        if (!response.ok) throw new Error('Census API failed');
        
        const data = await response.json();
        if (!data || data.length < 2) throw new Error('No census data available');
        
        const censusRent = parseFloat(data[1][0]);
        if (isNaN(censusRent)) throw new Error('Invalid census data');

        // 2. Apply Market Adjustments
        const adjustedRent = Math.round(censusRent * stateInfo.adjustment);
        
        return {
            current: adjustedRent,
            trend: stateInfo.trend,
            volatility: calculateVolatility(adjustedRent),
            source: 'Census+MarketAdj'
        };
    }

    function generateRealisticData(location) {
        // Fallback with region-based realistic values
        const regionRanges = {
            'west': { min: 1800, max: 3500, trend: 1.05 },
            'northeast': { min: 1900, max: 3200, trend: 1.04 },
            'south': { min: 1200, max: 2200, trend: 1.06 },
            'midwest': { min: 1100, max: 2000, trend: 1.03 }
        };
        
        const region = getRegion(location);
        const range = regionRanges[region] || regionRanges.south;
        const current = range.min + Math.random() * (range.max - range.min);
        
        return {
            current: Math.round(current),
            trend: range.trend,
            volatility: calculateVolatility(current),
            source: 'Simulated'
        };
    }

    function getRegion(state) {
        // Simplified regional grouping
        const west = ['ca', 'or', 'wa', 'nv', 'az', 'ut', 'id', 'mt', 'wy', 'co', 'nm', 'ak', 'hi'];
        const northeast = ['ny', 'nj', 'pa', 'ct', 'ma', 'vt', 'nh', 'me', 'ri'];
        const midwest = ['il', 'in', 'mi', 'oh', 'wi', 'mn', 'ia', 'mo', 'nd', 'sd', 'ne', 'ks'];
        
        return west.includes(state) ? 'west' :
               northeast.includes(state) ? 'northeast' :
               midwest.includes(state) ? 'midwest' : 'south';
    }

    function calculateVolatility(rent) {
        // Higher volatility for expensive markets
        return 0.05 + (rent > 2500 ? 0.1 : rent > 1500 ? 0.07 : 0.05);
    }

    function displayResults(location, data) {
        const formattedLocation = location.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Calculate projections with realistic variance
        const nextYear = Math.round(data.current * data.trend * (1 + (Math.random() - 0.5) * data.volatility));
        const fiveYear = Math.round(data.current * Math.pow(data.trend, 5) * (1 + (Math.random() - 0.4) * data.volatility));
        
        // Risk level based on price and trend
        const riskLevel = Math.min(100, Math.round(
            (data.trend - 1) * 300 + // Trend impact
            (data.current > 3000 ? 40 : data.current > 2000 ? 20 : 0) + // Price impact
            data.volatility * 80 // Volatility impact
        ));

        // Update UI
        document.getElementById('result-city').textContent = formattedLocation;
        document.getElementById('current-rent').textContent = `$${data.current.toLocaleString()}`;
        document.getElementById('next-year').textContent = `$${nextYear.toLocaleString()}`;
        document.getElementById('five-year').textContent = `$${fiveYear.toLocaleString()}`;
        
        // Animate risk meter
        const riskMeter = document.getElementById('risk-level');
        riskMeter.style.width = '0%';
        setTimeout(() => {
            riskMeter.style.width = `${riskLevel}%`;
            riskMeter.setAttribute('data-level', riskLevel);
        }, 100);
        
        // Show results with cyberpunk effects
        resultSection.classList.remove('hidden');
        if (riskLevel > 75) {
            resultSection.classList.add('glitch-effect');
            setTimeout(() => resultSection.classList.remove('glitch-effect'), 1000);
        }
    }

    function showError(message) {
        // Cyberpunk-styled error alert
        const errorBox = document.createElement('div');
        errorBox.className = 'cyber-alert';
        errorBox.innerHTML = `
            <div class="cyber-alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${message}</span>
            </div>
        `;
        document.body.appendChild(errorBox);
        setTimeout(() => errorBox.remove(), 5000);
    }
});