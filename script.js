// RentCast API Integration
const RENTCAST_API_KEY = '01435b66522d44aea6c581885126f3eb';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const scanBtn = document.getElementById('scanBtn');
    const compareBtn = document.getElementById('compareBtn');
    const loadingEl = document.getElementById('loading');
    const resultsEl = document.getElementById('results');
    const apiStatusEl = document.getElementById('apiStatus');
    const lastUpdateEl = document.getElementById('lastUpdate');

    // Initialize with current date
    lastUpdateEl.textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Event Listeners
    scanBtn.addEventListener('click', fetchRentData);
    compareBtn.addEventListener('click', showCompareModal);

    // Main Function to Fetch Rent Data
    async function fetchRentData() {
        const locationType = document.getElementById('locationType').value;
        const location = document.getElementById('locationInput').value.trim();
        const bedrooms = document.getElementById('bedrooms').value;

        if (!location) {
            showError("Please enter a location");
            return;
        }

        try {
            // Show loading state
            loadingEl.classList.remove('hidden');
            resultsEl.classList.add('hidden');
            apiStatusEl.textContent = "API: QUERYING...";

            // Fetch current rent data
            const currentData = await getCurrentRent(locationType, location, bedrooms);
            
            // Fetch historical data for trends
            const historicalData = await getHistoricalRent(locationType, location, bedrooms);
            
            // Calculate projections
            const projections = calculateProjections(currentData, historicalData);
            
            // Display results
            displayResults(currentData, projections, historicalData);
            
            // Update API status
            apiStatusEl.textContent = "API: SUCCESS";
            apiStatusEl.style.color = "#00ff9d";

        } catch (error) {
            console.error("API Error:", error);
            apiStatusEl.textContent = "API: ERROR";
            apiStatusEl.style.color = "#ff2a6d";
            showError(error.message || "Failed to fetch rent data");
        } finally {
            loadingEl.classList.add('hidden');
            resultsEl.classList.remove('hidden');
        }
    }

    // API Functions
    async function getCurrentRent(locationType, location, bedrooms) {
        let endpoint;
        
        if (locationType === 'city') {
            endpoint = `https://api.rentcast.io/v1/lookup/rental-data/cities?city=${encodeURIComponent(location)}&state=${location.split(', ')[1] || ''}&bedrooms=${bedrooms}`;
        } else if (locationType === 'state') {
            endpoint = `https://api.rentcast.io/v1/lookup/rental-data/states?state=${location}&bedrooms=${bedrooms}`;
        } else { // zip code
            endpoint = `https://api.rentcast.io/v1/lookup/rental-data/zips?zipCode=${location}&bedrooms=${bedrooms}`;
        }

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${RENTCAST_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data[0]; // Return the first result
    }

    async function getHistoricalRent(locationType, location, bedrooms) {
        // Note: RentCast historical API has different endpoints
        // This is a simplified version - you'd need to adjust based on actual API capabilities
        let endpoint;
        
        if (locationType === 'city') {
            const [city, state] = location.includes(', ') ? 
                location.split(', ') : [location, ''];
            endpoint = `https://api.rentcast.io/v1/history/rental-data/cities?city=${encodeURIComponent(city)}&state=${state}&bedrooms=${bedrooms}&startDate=2020-01-01&endDate=${new Date().toISOString().split('T')[0]}`;
        } else if (locationType === 'state') {
            endpoint = `https://api.rentcast.io/v1/history/rental-data/states?state=${location}&bedrooms=${bedrooms}&startDate=2020-01-01&endDate=${new Date().toISOString().split('T')[0]}`;
        } else { // zip code
            endpoint = `https://api.rentcast.io/v1/history/rental-data/zips?zipCode=${location}&bedrooms=${bedrooms}&startDate=2020-01-01&endDate=${new Date().toISOString().split('T')[0]}`;
        }

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${RENTCAST_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Historical API request failed with status ${response.status}`);
        }

        return await response.json();
    }

    // Data Processing
    function calculateProjections(currentData, historicalData) {
        // Calculate average yearly growth rate from historical data
        const yearlyChanges = [];
        for (let i = 1; i < historicalData.length; i++) {
            const change = (historicalData[i].rent - historicalData[i-1].rent) / historicalData[i-1].rent;
            yearlyChanges.push(change);
        }
        
        const avgGrowth = yearlyChanges.reduce((a, b) => a + b, 0) / yearlyChanges.length;
        
        // Calculate projections
        const currentRent = currentData.rent;
        return {
            sixMonths: Math.round(currentRent * (1 + avgGrowth/2)),
            oneYear: Math.round(currentRent * (1 + avgGrowth)),
            threeYears: Math.round(currentRent * Math.pow(1 + avgGrowth, 3)),
            growthRate: (avgGrowth * 100).toFixed(1)
        };
    }

    // UI Display Functions
    function displayResults(currentData, projections, historicalData) {
        // Update basic info
        document.getElementById('resultLocation').textContent = 
            currentData.city ? `${currentData.city}, ${currentData.state}` : currentData.state || currentData.zipCode;
        
        document.getElementById('resultType').textContent = 
            `${document.getElementById('bedrooms').options[document.getElementById('bedrooms').selectedIndex].text} Units`;
        
        document.getElementById('resultDate').textContent = 
            `Updated: ${new Date().toLocaleDateString()}`;
        
        // Current market data
        document.getElementById('currentRent').textContent = `$${currentData.rent.toLocaleString()}`;
        
        const yearlyChange = ((currentData.rent - historicalData[historicalData.length - 1].rent) / 
                            historicalData[historicalData.length - 1].rent * 100).toFixed(1);
        document.getElementById('yearlyChange').textContent = 
            `${yearlyChange >= 0 ? '+' : ''}${yearlyChange}%`;
        
        document.getElementById('trendDirection').textContent = 
            yearlyChange >= 0 ? 'UPWARD' : 'DOWNWARD';
        document.getElementById('trendDirection').style.color = 
            yearlyChange >= 0 ? '#00ff9d' : '#ff2a6d';
        
        // Projections
        document.getElementById('projection6mo').textContent = `$${projections.sixMonths.toLocaleString()}`;
        document.getElementById('projection1yr').textContent = `$${projections.oneYear.toLocaleString()}`;
        document.getElementById('projection3yr').textContent = `$${projections.threeYears.toLocaleString()}`;
        
        // Market health gauges
        const affordabilityScore = calculateAffordabilityScore(currentData.rent, projections.growthRate);
        document.getElementById('affordabilityGauge').style.width = `${affordabilityScore}%`;
        
        const riskScore = calculateRiskScore(currentData.rent, projections.growthRate);
        document.getElementById('riskGauge').style.width = `${riskScore}%`;
        
        // Update chart
        updateTrendChart(historicalData, projections);
        
        // Show neighborhood data if available (for cities)
        if (currentData.city) {
            // This would call another API endpoint for neighborhood data
            // For demo, we'll simulate it
            simulateNeighborhoodData(currentData.city, currentData.state);
        }
    }

    function calculateAffordabilityScore(rent, growthRate) {
        // Simple algorithm - higher rent and growth = less affordable
        const baseScore = Math.min(100, Math.max(0, (rent - 800) / 15));
        const growthImpact = growthRate * 2;
        return Math.min(100, baseScore + growthImpact);
    }

    function calculateRiskScore(rent, growthRate) {
        // Higher growth areas are riskier investments
        const baseScore = Math.min(100, Math.max(0, (rent - 1000) / 10));
        const growthImpact = growthRate * 3;
        return Math.min(100, baseScore + growthImpact);
    }

    function updateTrendChart(historicalData, projections) {
        const chartEl = document.getElementById('trendChart');
        chartEl.innerHTML = '';
        
        // Combine historical and projected data
        const allData = [
            ...historicalData.map(d => ({
                date: new Date(d.date),
                rent: d.rent,
                type: 'historical'
            })),
            {
                date: new Date(new Date().setMonth(new Date().getMonth() + 6)),
                rent: projections.sixMonths,
                type: 'projected'
            },
            {
                date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                rent: projections.oneYear,
                type: 'projected'
            },
            {
                date: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
                rent: projections.threeYears,
                type: 'projected'
            }
        ];
        
        // Find min/max for scaling
        const rents = allData.map(d => d.rent);
        const minRent = Math.min(...rents);
        const maxRent = Math.max(...rents);
        const range = maxRent - minRent;
        
        // Create chart bars
        allData.forEach(dataPoint => {
            const pointEl = document.createElement('div');
            pointEl.className = `chart-point ${dataPoint.type}`;
            
            // Position calculation
            const height = ((dataPoint.rent - minRent) / range) * 100;
            pointEl.style.height = `${height}%`;
            
            // Tooltip
            pointEl.title = `$${dataPoint.rent.toLocaleString()} (${dataPoint.date.toLocaleDateString()})`;
            
            chartEl.appendChild(pointEl);
        });
    }

    function simulateNeighborhoodData(city, state) {
        const neighborhoodGrid = document.getElementById('neighborhoodGrid');
        neighborhoodGrid.innerHTML = '';
        
        // Simulate neighborhood data - in a real app, you'd call the API
        const neighborhoods = [
            { name: "Downtown", rent: 2200, change: "+5.2%" },
            { name: "Midtown", rent: 1850, change: "+3.8%" },
            { name: "Uptown", rent: 2100, change: "+4.5%" },
            { name: "Arts District", rent: 1950, change: "+6.1%" },
            { name: "Riverfront", rent: 2300, change: "+4.9%" },
            { name: "Suburbs", rent: 1650, change: "+2.3%" }
        ];
        
        neighborhoods.forEach(n => {
            const neighborhoodEl = document.createElement('div');
            neighborhoodEl.className = 'neighborhood-card';
            neighborhoodEl.innerHTML = `
                <h4>${n.name}</h4>
                <div class="neighborhood-rent">$${n.rent.toLocaleString()}</div>
                <div class="neighborhood-change ${n.change.startsWith('+') ? 'up' : 'down'}">${n.change}</div>
            `;
            neighborhoodGrid.appendChild(neighborhoodEl);
        });
        
        document.getElementById('neighborhoodSection').classList.remove('hidden');
    }

    // Utility Functions
    function showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'cyber-alert';
        errorEl.innerHTML = `
            <div class="cyber-alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${message}</span>
            </div>
        `;
        document.body.appendChild(errorEl);
        
        setTimeout(() => {
            errorEl.classList.add('fade-out');
            setTimeout(() => errorEl.remove(), 500);
        }, 5000);
    }

    function showCompareModal() {
        showError("Comparison feature coming in v2.0");
    }

    // Initialize
    apiStatusEl.textContent = "API: READY";
});