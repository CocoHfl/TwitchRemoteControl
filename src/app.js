const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TwitchApi = require('./twitchApi');
const StreamPlayer = require('./streamPlayer');

const twitch = new TwitchApi();
const player = new StreamPlayer();

const app = express();
const port = 3002;

let client = null;
let userId = null;

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
    const followedStreams = await twitch.getLiveFollowedStreams(userId);

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

  client = res;

  req.on('close', () => {
    client = null;
  });
});

app.get('/api/watch/:streamer', async (req, res) => {
  const streamer = req.params.streamer;
  await player.watchStreamer(streamer);

  player.puppeteerBrowser.on('disconnected', () => {
    if (client) {
      client.write(`data: ${JSON.stringify({ event: 'puppeteerDisconnected', message: `Puppeteer browser disconnected` })}\n\n`);
    }
  });

  res.json({ currentlyWatching: player.currentlyWatching });
});

app.post('/api/sendChatMessage', async (req, res) => {
  const message = req.body.message;

  if (!message || !player.currentlyWatching) {
    res.status(400).send(`${!message ? 'Missing message' : 'Not watching a stream'}`);
    return;
  } else {
    try {
      const broadcasterInfo = await twitch.getUserInfo(player.currentlyWatching);
      await twitch.sendChatMessage(broadcasterInfo.userId, userId, message);
      res.status(200).send('Chat message sent');
    } catch (error) {
      res.status(500).send('Coudn\'t send chat message');
    }
  }
});

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

  const userInfo = await twitch.getUserInfo();
  userId = userInfo.userId;

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