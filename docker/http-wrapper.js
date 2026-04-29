/**
 * HTTP Wrapper for MCP Date-Time Server
 *
 * Exposes MCP date-time tools as REST API endpoints for use with n8n
 */

const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

/**
 * Execute MCP command via stdio
 */
async function executeMCPCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const mcp = spawn('node', ['/app/index.js']);
        let stdout = '';
        let stderr = '';

        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: `tools/${method}`,
            params
        };

        mcp.stdin.write(JSON.stringify(request) + '\n');
        mcp.stdin.end();

        mcp.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        mcp.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        mcp.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`MCP process exited with code ${code}: ${stderr}`));
                return;
            }

            try {
                const lines = stdout.trim().split('\n');
                const response = JSON.parse(lines[lines.length - 1]);
                resolve(response);
            } catch (error) {
                reject(new Error(`Failed to parse MCP response: ${error.message}`));
            }
        });

        mcp.on('error', (error) => {
            reject(new Error(`Failed to spawn MCP process: ${error.message}`));
        });
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'mcp-date-time-http-wrapper' });
});

// Readiness check
app.get('/ready', (req, res) => {
    res.json({ status: 'ready' });
});

// Get current date and time
app.get('/api/datetime/current', async (req, res) => {
    try {
        const result = await executeMCPCommand('get_current_datetime', {
            timezone: req.query.timezone || 'UTC',
            format: req.query.format || 'iso'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Parse date string
app.post('/api/datetime/parse', async (req, res) => {
    try {
        const { dateString, timezone } = req.body;
        if (!dateString) {
            return res.status(400).json({ error: 'dateString is required' });
        }
        const result = await executeMCPCommand('parse_date', {
            date_string: dateString,
            timezone: timezone || 'UTC'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Format date
app.post('/api/datetime/format', async (req, res) => {
    try {
        const { dateString, format, timezone } = req.body;
        if (!dateString || !format) {
            return res.status(400).json({ error: 'dateString and format are required' });
        }
        const result = await executeMCPCommand('format_date', {
            date_string: dateString,
            format,
            timezone: timezone || 'UTC'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate date difference
app.post('/api/datetime/difference', async (req, res) => {
    try {
        const { startDate, endDate, unit } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const result = await executeMCPCommand('calculate_date_difference', {
            start_date: startDate,
            end_date: endDate,
            unit: unit || 'days'
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add time to date
app.post('/api/datetime/add', async (req, res) => {
    try {
        const { dateString, amount, unit } = req.body;
        if (!dateString || amount === undefined || !unit) {
            return res.status(400).json({ error: 'dateString, amount, and unit are required' });
        }
        const result = await executeMCPCommand('add_time_to_date', {
            date_string: dateString,
            amount: parseInt(amount),
            unit
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List available tools
app.get('/api/tools', (req, res) => {
    res.json({
        tools: [
            {
                name: 'get_current_datetime',
                description: 'Get current date and time',
                endpoint: 'GET /api/datetime/current',
                parameters: {
                    timezone: 'Optional timezone (default: UTC)',
                    format: 'Optional format (default: iso)'
                }
            },
            {
                name: 'parse_date',
                description: 'Parse and validate a date string',
                endpoint: 'POST /api/datetime/parse',
                parameters: {
                    dateString: 'Required date string to parse',
                    timezone: 'Optional timezone (default: UTC)'
                }
            },
            {
                name: 'format_date',
                description: 'Format a date string',
                endpoint: 'POST /api/datetime/format',
                parameters: {
                    dateString: 'Required date string',
                    format: 'Required output format',
                    timezone: 'Optional timezone (default: UTC)'
                }
            },
            {
                name: 'calculate_date_difference',
                description: 'Calculate difference between two dates',
                endpoint: 'POST /api/datetime/difference',
                parameters: {
                    startDate: 'Required start date',
                    endDate: 'Required end date',
                    unit: 'Optional unit (days, hours, minutes, etc.)'
                }
            },
            {
                name: 'add_time_to_date',
                description: 'Add time to a date',
                endpoint: 'POST /api/datetime/add',
                parameters: {
                    dateString: 'Required date string',
                    amount: 'Required amount to add (integer)',
                    unit: 'Required unit (days, hours, minutes, etc.)'
                }
            }
        ]
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`MCP Date-Time HTTP wrapper listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API documentation: http://localhost:${port}/api/tools`);
});
