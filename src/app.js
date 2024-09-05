const express = require('express');
const path = require('path');
const fs = require('fs');
const TwitchApi = require('./twitchApi');
const StreamPlayer = require('./streamPlayer');

const twitch = new TwitchApi();
const player = new StreamPlayer();

const app = express();
const port = 3002;

app.use(express.static(path.join(__dirname, '../public')));

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
    const userInfo = await twitch.getUserInfo();
    const followedStreams = await twitch.GetLiveFollowedStreams(userInfo.userId);

    res.json(followedStreams);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/watch/:streamer', async (req, res) => {
  const streamer = req.params.streamer;
  await player.watchStreamer(streamer);

  res.json({ currentlyWatching: player.currentlyWatching });
});

// Middleware to check if access token is valid
// Will only apply to routes below this code
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