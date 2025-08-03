//console.log('MIDDLEWARE CHECK: No global body parser should be present!');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Serve static files from public directory
app.use(express.static('public'));

// Store for active workflow sessions (in production, use a proper database)
const activeSessions = new Map();

// Endpoint to start the n8n workflow with local parser express.json()
app.post('/api/start-workflow', express.json(), async (req, res) => {
    try {
        console.log('Starting new workflow...');
        
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        
        const workflowData = {
            action: 'start_claim',
            timestamp: new Date().toISOString(),
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...req.body
        };

        console.log('Sending data to n8n:', workflowData);

        // Make request to n8n webhook
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflowData)
        });

        if (!response.ok) {
            throw new Error(`n8n webhook responded with status: ${response.status}`);
        }

        const n8nResponse = await response.json();
        console.log('n8n response:', n8nResponse);

        // Store session info if resumeUrl is provided
        if (n8nResponse.resumeUrl) {
            activeSessions.set(workflowData.sessionId, {
                resumeUrl: n8nResponse.resumeUrl,
                startTime: new Date(),
                status: 'awaiting_documents'
            });
        }

        res.json({
            success: true,
            sessionId: workflowData.sessionId,
            resumeUrl: n8nResponse.resumeUrl,
            message: 'Workflow started successfully',
            ...n8nResponse
        });

    } catch (error) {
        console.error('Error starting workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start workflow',
            message: error.message
        });
    }
});

// Endpoint to resume workflow with file uploads
app.post('/api/resume-workflow', async (req, res) => {
    console.log('Registering /api/resume-workflow handler');
    try {
        const resumeUrl = req.query.resumeUrl;
        if (!resumeUrl) {
            return res.status(400).json({ success: false, error: 'Missing resumeUrl parameter' });
        }

        const contentType = req.headers['content-type'] || '';
        let response;

        if (contentType.startsWith('multipart/form-data')) {
            // Stream file upload directly
            response = await fetch(resumeUrl, {
                method: 'POST',
                body: req,
                duplex: 'half',
                headers: {
                    'Content-Type': req.headers['content-type'],
                    'Content-Length': req.headers['content-length']
                }
            });
        } else if (contentType.startsWith('application/json')) {
            // Read JSON body and forward
            const body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => resolve(data));
                req.on('error', reject);
            });

            console.log('Received JSON body:', body);

            response = await fetch(resumeUrl, {
                method: 'POST',
                body,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            });
        } else {
            return res.status(415).json({ success: false, error: 'Unsupported Content-Type' });
        }

        if (!response.ok) {
            throw new Error(`n8n resume webhook responded with status: ${response.status}`);
        }

        const result = await response.json();
        res.json({ success: true, message: 'Workflow resumed', ...result });
    } catch (error) {
        console.error('Error resuming workflow:', error.stack || error);
        res.status(500).json({
            success: false,
            error: 'Failed to resume workflow',
            message: error.message
        });
    }
});

// Endpoint to check workflow status
app.get('/api/workflow-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    res.json({
        success: true,
        session: {
            ...session,
            sessionId
        }
    });
});

// Endpoint to get all active sessions (for debugging)
app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
        sessionId: id,
        ...data
    }));
    
    res.json({
        success: true,
        activeSessions: sessions.length,
        sessions
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Catch-all handler: send back the frontend's index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 AI Claims Portal backend running on http://localhost:${port}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔗 n8n webhook URL: ${process.env.N8N_WEBHOOK_URL || 'Not configured - set N8N_WEBHOOK_URL environment variable'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
