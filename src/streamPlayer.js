const puppeteer = require('puppeteer');

class StreamPlayer {
  constructor() {
    this.puppeteerBrowser = null;
    this.puppeteerPage = null;
    this.currentlyWatching = null;
  }

  async launchBrowser() {
    if (!this.puppeteerBrowser) {
      this.puppeteerBrowser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        args: ['--start-maximized'] 
      });
    }
  }

  async createPage() {
    if (!this.puppeteerPage) {
      this.puppeteerPage = await this.puppeteerBrowser.newPage();
    }
  }

  async watchStreamer(streamer) {
    await this.launchBrowser();
    await this.createPage();
    await this.puppeteerPage.goto(`https://twitch.tv/${streamer}`);

    const buttons = [
      'content-classification-gate-overlay-start-watching-button', // Start watching button when warning is shown
      'player-fullscreen-button', // Fullscreen button
      'player-mute-unmute-button', // Mute/unmute button
    ];

    for (const button of buttons) {
      const buttonElement = await this.puppeteerPage.$(`button[data-a-target='${button}']`);
      if (buttonElement) {
        await buttonElement.click();
      }
    }

    this.currentlyWatching = streamer;
  }
}

module.exports = StreamPlayer;