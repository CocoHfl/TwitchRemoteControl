const eventSource = new EventSource('/event');
const currentlyWatchingDiv = document.getElementById('currently-watching');
const currentlyWatchingText = document.getElementById('currently-watching-text');
const chatDiv = document.getElementById('chat');
const sendButton = document.getElementById('send-message-button')
const message = document.getElementById('message-input');
const maxChatMessages = 20;

eventSource.onopen = () => {
  // Check if there is any active stream activity
  fetch('/streamActivity', { method: 'POST' });
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.event) {
    // If the stream has started
    case 'startedWatching':
      clearChat();
      showCurrentlyWatching(data.streamer);
      currentlyWatchingDiv.scrollIntoView({ behavior: 'smooth' });
      break;
    // If a client has joined while a stream is active
    case 'userJoinedActiveStream':
      showCurrentlyWatching(data.streamer);
      break;

    case 'puppeteerDisconnected':
      currentlyWatchingDiv.setAttribute('style', 'display: none;');
      currentlyWatchingText.textContent = '';
      break;

    case 'chatMessage':
      const messageElement = document.createElement('p');
      messageElement.setAttribute('class', 'chat-message');

      const usernameSpan = document.createElement('span');
      usernameSpan.textContent = `${data.username}: `;
      usernameSpan.style.fontWeight = 'bold';
      usernameSpan.style.color = data.usernameColor;

      messageElement.appendChild(usernameSpan);
      messageElement.appendChild(document.createTextNode(data.message));
      chatDiv.appendChild(messageElement);

      if (chatDiv.childElementCount > maxChatMessages) {
        chatDiv.removeChild(chatDiv.firstChild);
      }

      chatDiv.scrollTop = chatDiv.scrollHeight;
      break;

    case 'followedStreamsUpdate':
      appendStreams(data.followedStreams);
      break;
  }
};

function showCurrentlyWatching(streamer) {
  currentlyWatchingDiv.setAttribute('style', 'display: block;');
  currentlyWatchingText.textContent = `Currently watching: ${streamer}`;
}

function clearChat() {
  chatDiv.textContent = '';
}

async function watchStreamer(watchButton, streamer) {
  const watchButtonContent = watchButton.textContent;

  watchButton.disabled = true;
  watchButton.textContent = 'Loading...';

  try {
    await fetch(`/api/watch/${streamer}`);
  } catch (error) {
    console.error('Error fetching currently watching:', error);
  }

  watchButton.disabled = false;
  watchButton.textContent = watchButtonContent;
}

async function fetchStreams() {
  try {
    const request = await fetch('/api/followed-streams');
    const followedStreams = await request.json();

    appendStreams(followedStreams);
  } catch (error) {
    console.error('Error fetching streams:', error);
  }
}

function appendStreams(followedStreams) {
  const streamEle = document.getElementById('streams');
  streamEle.textContent = '';

  for (const stream of followedStreams) {
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
    button.addEventListener('click', (e) => {
      watchStreamer(e.target, stream.user_name);
    });
    streamCard.appendChild(button);

    streamEle.appendChild(streamCard);
  }
}

async function sendChatMessage() {
  const sendButtonContent = sendButton.textContent;

  sendButton.disabled = true;
  sendButton.textContent = 'Sending...';

  try {
    await fetch('/api/sendChatMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message.value }),
    });
    message.value = '';
  } catch (error) {
    console.error('Error sending chat message:', error);
  }

  sendButton.disabled = false;
  sendButton.textContent = sendButtonContent;
}

fetchStreams();