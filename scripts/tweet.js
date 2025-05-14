const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const dotenv = require('dotenv');
const { exit } = require('process');

dotenv.config();

async function postTweetWithImage(tweetText, imagePath = null) {
    try {

      // Load Twitter API credentials from .env file
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      if (imagePath != null) {
        const mediaData = await client.v1.uploadMedia(imagePath);
        const tweet = await client.v2.tweet({
          text: tweetText,
          media: { media_ids: [mediaData] },
        });
        console.log('Tweet posted:', tweet);
      } else {
        tweet = await client.v2.tweet({
          text: tweetText
        });
        console.log('Tweet posted:', tweet);
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      exit(1)
    } finally {
      charsCount = 0
      text = ""
      imagePath = null
    }
}

const MAX_TWEET_CHARS = 280

let charsCount = 0
let text = ""
let imagePath = null
let twitterEnabled = false

function setTwitterEnabled(twitterEnabledFlag) {
  twitterEnabled = twitterEnabledFlag
}

function appendImageToTweet(imagePathToAppend) {
  imagePath = imagePathToAppend
  charsCount += 23
  console.log("Image to post: " + imagePath)
}

function appendTextToTweet(textToAppend, url = null) {
  if (url == null && charsCount + textToAppend.length <= MAX_TWEET_CHARS) {
      charsCount += textToAppend.length
      text += textToAppend
  } else if (url != null && charsCount + textToAppend.length + 23 <= MAX_TWEET_CHARS) {
      charsCount += textToAppend.length + 23
      text += textToAppend + url
  }
}

async function postTweet() {
  console.log("Twitter Enabled: " + twitterEnabled)
  console.log("Tweet to post: " + charsCount + `/${MAX_TWEET_CHARS} chars`)
  console.log("====================")
  console.log(text)
  console.log("====================")
  if (twitterEnabled == true) {
    await postTweetWithImage(text, imagePath)
  }
}

module.exports = {
  setTwitterEnabled,
  postTweet,
  appendImageToTweet,
  appendTextToTweet
};