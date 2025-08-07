const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files from marketing directory
app.use(express.static(path.join(__dirname)));

// Serve the brochure
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'brochure.html'));
});

app.listen(PORT, () => {
    console.log(`Brochure server running at http://localhost:${PORT}`);
    console.log('Open this URL in browser and use Print -> Save as PDF');
});