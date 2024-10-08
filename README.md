# TwitchRemoteControl

I often watch Twitch streams on my PC from my nearby couch.\
But then, I want to watch another stream, or interact with chat.\
What am I supposed to do? Stand up? No way!

Thanks to TwitchRemoteControl, you can control your PC live streams from another device, such as your phone.

## Features

- 🎥 Browse live followed streams.
- 📺 Pick a stream to display on your PC.
- 💬 Read live chat.
- 📝 Send chat messages.

## Setup

1. Clone this repository.
2. Install dependencies:
 ```bash
 npm install
```
3. Create a Twitch application:
- Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps) and create a new application.
- Set the **OAuth Redirect URL** to: `http://localhost:3000/twitchCallback`.
4. Set up the environment:
- Make a copy of the `.env.sample` file and name it `.env`.
- Fill `.env` with your Twitch application `Client-ID` and `Client-Secret`.

## Running the app
 ```bash
 npm run start
```

Navigate to `http://localhost:3000` and log in with your Twitch account.\
**The log in step must be done on the device hosting the server (most likely your PC).**

Once the authentication is done, you are ready to go!\
You can access the app from your phone or any other device on the same network.