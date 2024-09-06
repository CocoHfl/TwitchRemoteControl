const eventSource = new EventSource('/event');
const currentlyWatchingDiv = document.getElementById('currently-watching');
const currentlyWatchingText = document.getElementById('currently-watching-text');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.event === 'puppeteerDisconnected') {
    currentlyWatchingDiv.setAttribute('style', 'display: none;');
    currentlyWatchingText.textContent = '';
  }
};

async function watchStreamer(streamer) {
  try {
    const request = await fetch(`/api/watch/${streamer}`);
    const data = await request.json();
    const streamerName = data?.currentlyWatching;

    if (streamerName) {
      currentlyWatchingDiv.setAttribute('style', 'display: block;');
      currentlyWatchingText.textContent = `Currently watching: ${streamerName}`;
    }
  } catch (error) {
    console.error('Error fetching currently watching:', error);
  }
}

async function fetchStreams() {
  try {
    const request = await fetch('/api/followed-streams');
    const followedStreams = await request.json();
    const streamEle = document.getElementById('streams');

    for (const stream of followedStreams.data) {
      const streamCard = document.createElement('div');
      streamCard.classList.add('stream-card');

      // Thumbnail
      const thumbnail = document.createElement('img');
      thumbnail.classList.add('stream-thumbnail');
      thumbnail.src = stream.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080');
      thumbnail.alt = `${stream.user_name}'s stream thumbnail`;
      streamCard.appendChild(thumbnail);

      // Streamer Name
      const name = document.createElement('h3');
      name.textContent = `${stream.user_name}`;
      streamCard.appendChild(name);
      
      // Stream Title
      const title = document.createElement('p');
      title.classList.add('stream-title');
      title.textContent = ` ${stream.title}`;
      streamCard.appendChild(title);

      // Game Name
      const game = document.createElement('p');
      game.classList.add('game-name');
      game.textContent = `🎮 ${stream.game_name}`;
      streamCard.appendChild(game);

      // Viewer Count
      const viewers = document.createElement('p');
      viewers.classList.add('viewer-count');
      viewers.textContent = `👁️ ${stream.viewer_count}`;
      streamCard.appendChild(viewers);

      // Watch Button
      const button = document.createElement('button');
      button.classList.add('watch-button');
      button.textContent = 'Watch';
      button.addEventListener('click', () => {
        watchStreamer(stream.user_name);
      });
      streamCard.appendChild(button);

      streamEle.appendChild(streamCard);
    }
  } catch (error) {
    console.error('Error fetching streams:', error);
  }
}

async function sendChatMessage(message) {
  try {
    await fetch('/api/sendChatMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message : message.value }),
    });
    message.value = '';
  } catch (error) {
    console.error('Error sending chat message:', error);
  }
}

fetchStreams();