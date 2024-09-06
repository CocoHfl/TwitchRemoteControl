const fs = require('fs');
require('dotenv').config();

class TwitchApi {
  constructor() {
    this.apiUrl = 'https://api.twitch.tv/helix';
    this.authUrl = 'https://id.twitch.tv/oauth2';
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.tokens = this.loadTokens();
    this.accessToken = this.tokens?.accessToken;
    this.refreshToken = this.tokens?.refreshToken;
  }

  loadTokens() {
    try {
      const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf-8'));
      return tokens;
    } catch (err) {
      return null;
    }
  }

  async fetchTwitchApi(endpoint) {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-ID': this.clientId,
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    return response.json();
  }

  getAuthorizeUrl() {
    const url = `${this.authUrl}/authorize`;
    const responseType = 'response_type=code';
    const clientId = `client_id=${this.clientId}`;
    const redirectUri = `redirect_uri=http://localhost:3002/twitchCallback`;
    const scopesArray = ['user:read:follows', 'user:write:chat'];
    const scopes = `scope=${scopesArray.map(encodeURIComponent).join('+')}`;

    return `${url}?${responseType}&${clientId}&${redirectUri}&${scopes}`;
  }

  async getTokens(authorizationCode) {
    const url = `${this.authUrl}/token`;
    const clientId = `client_id=${this.clientId}`;
    const clientSecret = `client_secret=${this.clientSecret}`;
    const code = `code=${authorizationCode}`;
    const grantType = 'grant_type=authorization_code';
    const redirectUri = 'redirect_uri=http://localhost:3002/twitchCallback';

    const req = await fetch(`${url}?${clientId}&${clientSecret}&${code}&${grantType}&${redirectUri}`, {
      method: 'POST',
    });

    const resp = await req.json();

    this.accessToken = resp['access_token'];
    this.refreshToken = resp['refresh_token'];

    // Save tokens
    this.saveTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    });
  }

  async refreshAccessToken() {
    const url = `${this.authUrl}/token`;
    const clientId = `client_id=${this.clientId}`;
    const clientSecret = `client_secret=${this.clientSecret}`;
    const refreshToken = `refresh_token=${encodeURIComponent(this.refreshToken)}`;
    const grantType = 'grant_type=refresh_token';

    const req = await fetch(`${url}?${clientId}&${clientSecret}&${refreshToken}&${grantType}`, {
      method: 'POST',
    });

    const resp = await req.json();

    if (!resp['access_token']) {
      throw new Error('Failed to refresh access token');
    }

    // Update access token
    this.accessToken = resp['access_token'];
    this.refreshToken = resp['refresh_token'];

    // Save tokens
    this.saveTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    });

    console.log('Refreshed access token:', this.accessToken);
  }

  async isAccessTokenValid() {
    const req = await fetch(`${this.authUrl}/validate`, {
      headers: {
        'Authorization': `OAuth ${this.accessToken}`,
      }
    });

    return req.status === 200;
  }

  saveTokens(tokens) {
    fs.writeFileSync('tokens.json', JSON.stringify(tokens), 'utf-8');
  }

  async getUserInfo(login = null) {
    const url = `${this.apiUrl}/users${login ? `?login=${login}` : ''}`;

    let req = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-Id': this.clientId
      }
    });

    let resp = await req.json();

    return {
      userId: resp?.data[0]?.id,
      displayName: resp?.data[0]?.display_name
    }
  }

  async GetLiveFollowedStreams(userId) {
    const url = `${this.apiUrl}/streams/followed?user_id=${userId}`;

    const req = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-ID': this.clientId,
      }
    });

    return req.json();
  }

  async sendChatMessage(broadcasterId, senderId, message) {
    const url = `${this.apiUrl}/chat/messages`;
    const body = JSON.stringify({
      'broadcaster_id': broadcasterId,
      'sender_id': senderId,
      'message': message
    });

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-ID': this.clientId,
        'Content-Type': 'application/json'
      },
      body
    });
  }
}

module.exports = TwitchApi;