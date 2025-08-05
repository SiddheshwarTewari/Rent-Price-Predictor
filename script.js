document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const predictBtn = document.getElementById('predict-btn');
    const cityInput = document.getElementById('city');
    const resultSection = document.getElementById('result');
    const loadingSection = document.getElementById('loading');
    const visualizationSection = document.getElementById('3d-visualization');
    const voiceBtn = document.getElementById('voice-btn');
    const voiceStatus = document.getElementById('voice-status');
    const hackerBtn = document.getElementById('hacker-btn');
    const arBtn = document.getElementById('ar-btn');
    const arModal = document.getElementById('ar-modal');
    const timeMachineBtn = document.getElementById('time-machine-btn');
    const glitchSound = document.getElementById('glitch-sound');
    const scanSound = document.getElementById('scan-sound');
    const errorSound = document.getElementById('error-sound');
    
    // Crypto data
    const cryptoRates = {
        'BTC': 42350.78,
        'ETH': 2275.64,
        'SOL': 102.45,
        'DOGE': 0.084,
        'XMR': 165.32
    };
    
    // AI Commentary phrases
    const aiComments = {
        lowRisk: [
            "CORPO OVERLORDS APPROVE - This zone is gentrification-ready",
            "Risk assessment: Minimal. Even wage slaves can afford this... for now",
            "The 1% haven't discovered this neighborhood yet. Enjoy it while it lasts"
        ],
        mediumRisk: [
            "Gentrification in progress. Artisanal toast shops appearing in 3... 2...",
            "Corporate scouts detected in the area. Time to move?",
            "Rent's climbing faster than a cyborg up a megabuilding"
        ],
        highRisk: [
            "WARNING: Full corporate takeover imminent",
            "Only the top 10% of netrunners can afford this district now",
            "This is why we need the housing revolution yesterday"
        ]
    };
    
    // Initialize 3D visualization
    let scene, camera, renderer, chart;
    init3DVisualization();
    
    // Initialize voice recognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    
    // Event Listeners
    predictBtn.addEventListener('click', predictRent);
    voiceBtn.addEventListener('click', toggleVoiceRecognition);
    hackerBtn.addEventListener('click', toggleHackerMode);
    arBtn.addEventListener('click', openARView);
    timeMachineBtn.addEventListener('click', openTimeMachine);
    document.querySelector('.close-modal').addEventListener('click', () => arModal.classList.add('hidden'));
    
    // Location type buttons
    document.querySelectorAll('.location-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.location-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            playSound(scanSound);
        });
    });
    
    // Voice Recognition
    function toggleVoiceRecognition() {
        if (voiceStatus.classList.contains('hidden')) {
            voiceStatus.classList.remove('hidden');
            voiceBtn.classList.add('active');
            recognition.start();
            playSound(scanSound);
        } else {
            voiceStatus.classList.add('hidden');
            voiceBtn.classList.remove('active');
            recognition.stop();
        }
    }
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        cityInput.value = transcript;
        predictRent();
    };
    
    recognition.onerror = function(event) {
        showError("Voice recognition failed: " + event.error);
        playSound(errorSound);
    };
    
    // Hacker Mode
    function toggleHackerMode() {
        document.body.classList.toggle('hacker-mode');
        document.getElementById('matrix-effect').style.opacity = document.body.classList.contains('hacker-mode') ? '1' : '0';
        playSound(glitchSound);
    }
    
    // AR View
    function openARView() {
        arModal.classList.remove('hidden');
        playSound(scanSound);
        
        // Simulate AR scanning
        setTimeout(() => {
            document.querySelector('.ar-rent').textContent = `$${Math.floor(Math.random() * 2000) + 1000}`;
            document.querySelector('.ar-risk').textContent = `RISK: ${Math.floor(Math.random() * 60) + 20}%`;
        }, 1500);
    }
    
    // Time Machine
    function openTimeMachine() {
        // In a real implementation, this would show historical/future data
        showError("TIME MACHINE OFFLINE: Chrono-disruptor needs recalibration");
        playSound(errorSound);
    }
    
    // 3D Visualization
    function init3DVisualization() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(visualizationSection.offsetWidth, visualizationSection.offsetHeight);
        document.getElementById('3d-container').appendChild(renderer.domElement);
        
        // Create a simple chart
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        chart = new THREE.Mesh(geometry, material);
        scene.add(chart);
        
        camera.position.z = 5;
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            chart.rotation.x += 0.01;
            chart.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();
    }
    
    // Main prediction function
    async function predictRent() {
        const location = cityInput.value.trim();
        
        if (!location) {
            showError("INPUT REQUIRED: Enter a location, choomba");
            playSound(errorSound);
            return;
        }
        
        loadingSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
        visualizationSection.classList.add('hidden');
        playSound(scanSound);
        
        try {
            // Simulate API call with timeout
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate realistic data based on location
            const rentData = generateRealisticData(location);
            displayResults(location, rentData);
            
            // Show 3D visualization
            visualizationSection.classList.remove('hidden');
            update3DVisualization(rentData);
            
        } catch (error) {
            console.error("Prediction error:", error);
            showError("SYSTEM FAILURE: " + error.message);
            playSound(errorSound);
        } finally {
            loadingSection.classList.add('hidden');
        }
    }
    
    function generateRealisticData(location) {
        // Base values with location-based adjustments
        const baseValue = 1000 + Math.random() * 3000; // $1000-$4000 range
        const locationFactor = location.length * 10; // Longer names = more expensive
        const trend = 1 + (Math.random() * 0.1); // 0-10% annual increase
        
        return {
            current: Math.round(baseValue + locationFactor),
            trend: trend,
            volatility: 0.05 + (Math.random() * 0.1),
            source: 'NeuralNet v7.2'
        };
    }
    
    function displayResults(location, data) {
        // Format location name
        const formattedLocation = location.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Calculate predictions
        const nextYear = Math.round(data.current * data.trend * (1 + (Math.random() - 0.5) * data.volatility));
        const fiveYear = Math.round(data.current * Math.pow(data.trend, 5) * (1 + (Math.random() - 0.4) * data.volatility));
        
        // Calculate risk level (0-100)
        const riskLevel = Math.min(100, Math.round(
            (data.trend - 1) * 300 + // Trend impact
            (data.current > 3000 ? 40 : data.current > 2000 ? 20 : 0) + // Price impact
            data.volatility * 80 // Volatility impact
        ));

        // Update DOM
        document.getElementById('result-city').textContent = formattedLocation;
        document.getElementById('current-rent').textContent = `$${data.current.toLocaleString()}`;
        document.getElementById('next-year').textContent = `$${nextYear.toLocaleString()}`;
        document.getElementById('five-year').textContent = `$${fiveYear.toLocaleString()}`;
        
        // Crypto conversion
        const randomCrypto = Object.keys(cryptoRates)[Math.floor(Math.random() * Object.keys(cryptoRates).length)];
        const cryptoAmount = (data.current / cryptoRates[randomCrypto]).toFixed(4);
        document.getElementById('crypto-amount').textContent = `${cryptoAmount} ${randomCrypto}`;
        
        // Animate risk meter
        const riskMeter = document.getElementById('risk-level');
        riskMeter.style.width = '0%';
        setTimeout(() => {
            riskMeter.style.width = `${riskLevel}%`;
            riskMeter.setAttribute('data-level', riskLevel);
        }, 100);
        
        // AI Commentary
        const aiCommentary = document.getElementById('ai-commentary');
        let comment;
        if (riskLevel > 70) {
            comment = aiComments.highRisk[Math.floor(Math.random() * aiComments.highRisk.length)];
        } else if (riskLevel > 40) {
            comment = aiComments.mediumRisk[Math.floor(Math.random() * aiComments.mediumRisk.length)];
        } else {
            comment = aiComments.lowRisk[Math.floor(Math.random() * aiComments.lowRisk.length)];
        }
        aiCommentary.textContent = `AI ANALYSIS: ${comment}`;
        
        // Show results with cyberpunk effects
        resultSection.classList.remove('hidden');
        if (riskLevel > 75) {
            resultSection.classList.add('glitched');
            setTimeout(() => resultSection.classList.remove('glitched'), 1000);
        }
        
        // Show heatmap for high risk
        document.getElementById('heatmap-container').classList.toggle('hidden', riskLevel < 60);
        if (riskLevel >= 60) {
            renderHeatmap(riskLevel);
        }
        
        playSound(scanSound);
    }
    
    function update3DVisualization(data) {
        // In a real implementation, this would update the 3D chart with actual data
        chart.scale.y = data.current / 1000;
        chart.material.color.setHex(0xff0000);
    }
    
    function renderHeatmap(riskLevel) {
        // Simulate heatmap rendering
        const canvas = document.getElementById('heatmap');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add risk zones
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width * (riskLevel/100), canvas.height);
    }
    
    function showError(message) {
        const errorBox = document.createElement('div');
        errorBox.className = 'cyber-alert glitched';
        errorBox.innerHTML = `
            <div class="cyber-alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${message}</span>
            </div>
        `;
        document.body.appendChild(errorBox);
        setTimeout(() => {
            errorBox.classList.remove('glitched');
            setTimeout(() => errorBox.remove(), 2000);
        }, 500);
    }
    
    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Simulate connection status
    setInterval(() => {
        const status = document.getElementById('connection-status');
        if (Math.random() > 0.9) {
            status.textContent = "OFFLINE";
            status.style.color = "var(--neon-pink)";
        } else {
            status.textContent = "ONLINE";
            status.style.color = "var(--neon-green)";
        }
    }, 5000);
});