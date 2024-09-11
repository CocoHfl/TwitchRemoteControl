const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TwitchApi = require('./twitchApi');
const StreamPlayer = require('./streamPlayer');
const tmi = require('tmi.js');

const twitch = new TwitchApi();
const player = new StreamPlayer();

const app = express();
const port = 3002;

let clients = [];
let userInfo = { userId: null, displayName: null };
let tmiClient = null;

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/twitchConnect', (req, res) => {
  const authorizeUrl = twitch.getAuthorizeUrl();
  res.redirect(authorizeUrl);
});

app.get('/twitchCallback', async (req, res) => {
  if (req.query.code) {
    // Get access and refresh tokens
    await twitch.getTokens(req.query.code);
    res.redirect('/home');
  } else {
    res.status(500).send('Could not connect');
  }
});

app.get('/api/followed-streams', async (req, res) => {
  try {
    const followedStreams = await twitch.getLiveFollowedStreams(userInfo.userId);

    res.json(followedStreams);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.get('/event', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

app.get('/api/watch/:streamer', async (req, res) => {
  const streamer = req.params.streamer;
  await player.watchStreamer(streamer);

  if (clients.length > 0) {
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ event: 'startedWatching', streamer: streamer })}\n\n`);
    });
  }

  initializeTmiClient();

  player.puppeteerBrowser.on('disconnected', () => {
    if (clients.length > 0) {
      clients.forEach(client => {
        player.currentlyWatching = null;
        client.write(`data: ${JSON.stringify({ event: 'puppeteerDisconnected', message: `Puppeteer browser disconnected` })}\n\n`);
      });
    }

    if (tmiClient?.readyState() === 'OPEN') {
      tmiClient.disconnect().catch(console.error);
    }
  });

  res.json({ currentlyWatching: player.currentlyWatching });
});

function initializeTmiClient() {
  if (tmiClient?.readyState() === 'OPEN') {
    tmiClient.disconnect().catch(console.error);
  }

  tmiClient = new tmi.Client({
    channels: [player.currentlyWatching],
    identity: {
      username: userInfo.displayName,
      password: `oauth:${twitch.accessToken}`
    }
  });

  tmiClient.connect().catch(console.error);

  tmiClient.on('message', (channel, tags, message, self) => {
    const msg = JSON.stringify({
      event: 'chatMessage',
      username: tags['display-name'],
      usernameColor: tags['color'],
      message: message
    });

    clients.forEach(client => {
      client.write(`data: ${msg}\n\n`);
    });
  });
}

app.post('/api/sendChatMessage', async (req, res) => {
  const message = req.body.message;

  if (!message || !player.currentlyWatching) {
    res.status(400).send(`${!message ? 'Missing message' : 'Not watching a stream'}`);
    return;
  }

  try {
    await tmiClient.say(player.currentlyWatching, message);
    res.status(200).send('Chat message sent');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Failed to send chat message');
  }
});

// Check for active stream activity
app.post('/streamActivity', (req, res) => {
  if (player.currentlyWatching && clients.length > 0) {
    // Send SSE event to latest client
    clients[clients.length - 1].write(`data: ${JSON.stringify({ event: 'userJoinedActiveStream', streamer: player.currentlyWatching })}\n\n`);
  }

  res.status(200);
})

// Middleware: check access token and get user info
app.use(async (req, res, next) => {
  if (!twitch.accessToken) {
    return res.redirect('/login');
  }

  const isAccessTokenValid = await twitch.isAccessTokenValid();

  if (!isAccessTokenValid) {
    try {
      // Attempt to refresh access token
      await twitch.refreshAccessToken();
    } catch (error) {
      console.error(error.message);
      return res.redirect('/login');
    }
  }

  const user = await twitch.getUserInfo();
  userInfo.userId = user.userId;
  userInfo.displayName = user.displayName;

  next();
})

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', async (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});