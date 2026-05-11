const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 80;

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// Proxy for Ollama MUST be before express.json()
app.use('/ollama', createProxyMiddleware({
  target: 'http://ollama:11434',
  changeOrigin: true,
  pathRewrite: { '^/ollama': '' },
}));

app.use(express.json());

// Helper to get Jira config and auth headers
function getJiraConfig() {
  const domain = process.env.JIRA_DOMAIN?.replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !token) {
    throw new Error('Jira credentials not configured in environment.');
  }

  const authBuffer = Buffer.from(`${email}:${token}`).toString('base64');
  return {
    domain,
    headers: {
      'Authorization': `Basic ${authBuffer}`,
      'Accept': 'application/json',
    },
  };
}

// Helper to extract plain text from ADF (Atlassian Document Format)
function extractTextFromADF(adf) {
  if (!adf) return 'No Description provided.';
  if (typeof adf === 'string') return adf; // already plain text (api/2 fallback)

  let text = '';
  function walk(node) {
    if (node.type === 'text') text += node.text || '';
    if (node.type === 'hardBreak') text += '\n';
    if (node.type === 'paragraph') {
      if (node.content) node.content.forEach(walk);
      text += '\n';
    } else if (node.content) {
      node.content.forEach(walk);
    }
  }

  if (adf.content) adf.content.forEach(walk);
  return text.trim() || 'No Description provided.';
}

// Get Jira Projects
app.get('/api/jira/projects', async (req, res) => {
  try {
    const { domain, headers } = getJiraConfig();
    const response = await axios.get(`${domain}/rest/api/3/project`, { headers });

    const projects = response.data.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
    }));

    res.json(projects);
  } catch (error) {
    console.error('Jira projects error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch Jira projects' });
  }
});

// Get Jira Issues for a Project
app.get('/api/jira/issues/:projectKey', async (req, res) => {
  try {
    const { domain, headers } = getJiraConfig();
    const { projectKey } = req.params;

    const jql = encodeURIComponent(`project="${projectKey}" ORDER BY updated DESC`);


    const response = await axios.get(
      `${domain}/rest/api/3/search?jql=${jql}&maxResults=50&fields=summary,status,priority`,
      { headers }
    );

    const issues = response.data.issues.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name || 'Unknown',
      priority: i.fields.priority?.name || 'None',
    }));

    res.json(issues);
  } catch (error) {
    console.error('Jira issues error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch Jira issues' });
  }
});

// Fetch Single Issue Detail
app.post('/api/jira', async (req, res) => {
  try {
    const { issueKey } = req.body;

    if (!issueKey) {
      return res.status(400).json({ error: 'Missing issue key' });
    }

    const { domain, headers } = getJiraConfig();


    const response = await axios.get(
      `${domain}/rest/api/3/issue/${issueKey}?expand=renderedFields`,
      { headers }
    );

    const issue = response.data;
    const summary = issue.fields?.summary || 'No Summary';


    const description = extractTextFromADF(issue.fields?.description);

    const formattedReq = `Title: ${summary}\n\nDescription:\n${description}`;

    res.json({ requirement: formattedReq });
  } catch (error) {
    console.error('Jira fetch error:', error.response?.data || error.message);
    const msg = error.message === 'Jira credentials not configured in environment.'
      ? error.message
      : 'Failed to fetch Jira issue.';
    res.status(error.response?.status || 500).json({ error: msg });
  }
});

// Fallback for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Test Case Generator UI server running on port ${PORT}`);
});