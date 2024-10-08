const puppeteer = require('puppeteer');

class StreamPlayer {
  constructor() {
    this.puppeteerBrowser = null;
    this.puppeteerPage = null;
    this.currentlyWatching = null;
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
      
      if(muted) {
        const unmuteButton = await this.puppeteerPage.$(`button[data-a-target='player-mute-unmute-button']`);
        if(unmuteButton) {
          await unmuteButton.click(); 
        }
      }
  
      this.currentlyWatching = streamer;
    } catch (error) {
      console.error('Error watching streamer:', error.message);
    }
  }
}

module.exports = StreamPlayer;