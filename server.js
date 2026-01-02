const { clear } = require('console');
const express = require('express');
const app = express();
const path = require('path');

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for any other requests (SPA behavior) - using app.use to avoid path-to-regexp issues with *
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
