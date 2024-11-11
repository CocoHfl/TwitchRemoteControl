const puppeteer = require('puppeteer');

class StreamPlayer {
  constructor() {
    this.puppeteerBrowser = null;
    this.puppeteerPage = null;
    this.currentlyWatching = null;
    this.togglePauseBtn = null;
    this.toggleMuteBtn = null;
  }

  async launchBrowser() {
    if (!this.puppeteerBrowser || !this.puppeteerBrowser.connected) {
      this.puppeteerBrowser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
      });

      const pages = await this.puppeteerBrowser.pages();
      this.puppeteerPage = pages[0];
    }
  }

  async watchStreamer(streamer) {
    try {
      await this.launchBrowser();
      await this.puppeteerPage.goto(`https://twitch.tv/${streamer}`);

      this.togglePauseBtn = await this.puppeteerPage.$(`button[data-a-target='player-play-pause-button']`);
      this.toggleMuteBtn = await this.puppeteerPage.$(`button[data-a-target='player-mute-unmute-button']`);

      const buttons = [
        'content-classification-gate-overlay-start-watching-button', // Start watching button when warning is shown
        'player-fullscreen-button', // Fullscreen button
      ];

      for (const button of buttons) {
        const buttonElement = await this.puppeteerPage.$(`button[data-a-target='${button}']`);
        if (buttonElement) {
          await buttonElement.click();
        }
      }

      const volumeSlider = await this.puppeteerPage.$(`input[data-a-target='player-volume-slider']`);
      const muted = await volumeSlider?.evaluate(el => el.value) == 0;

      if (muted && this.toggleMuteBtn) {
        await this.toggleMuteBtn.click();
      }

      this.currentlyWatching = streamer;
    } catch (error) {
      console.error('Error watching streamer:', error.message);
    }
  }

  async handlePlayerAction(playerAction) {
    switch (playerAction) {
      case 'togglePause':
        await this.togglePauseBtn.click();
        break;
      case 'toggleMute':
        await this.toggleMuteBtn.click();
        break;
      case 'closeStream':
        await this.puppeteerPage.close();
        this.currentlyWatching = null;
        break;
      default:
        throw new Error(`Unknown player action: ${playerAction}`);
    }
  }
}

module.exports = StreamPlayer;