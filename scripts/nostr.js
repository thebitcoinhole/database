const crypto = require('crypto');

// Polyfill for getRandomValues in Node.js
if (!globalThis.crypto) {
    globalThis.crypto = {
        getRandomValues: (buffer) => crypto.randomFillSync(buffer),
    };
}

const NostrTools = require('nostr-tools');
const WebSocket = require('ws');
const dotenv = require('dotenv');

dotenv.config();

let nostrEnabled = false
let text = ""
let tags = []

function setNostrEnabled(nostrEnabledFlag) {
    nostrEnabled = nostrEnabledFlag
}

function appendNostrPublicKeyTag(publicKey) {
    tags.push(['p', NostrTools.nip19.decode(publicKey.toLowerCase()).data])
}

function appendTextToNostr(textToAppend, url = null) {
    if (url == null) {
        text += textToAppend
    } else if (url != null) {
        text += textToAppend + url
    }
}

// Function to send the event synchronously using callbacks
function postOnNostr(content) {
    const relayUrls = process.env.NOSTR_RELAYS

    // Generate a new private key in Uint8Array format
    const privKey = NostrTools.nip19.decode(process.env.NOSTR_PRIVATE_KEY.toLowerCase()).data;
    // Get the public key in hex format from the private key
    const pubKey = NostrTools.getPublicKey(privKey);

  // Create a new Nostr event
  let NostrEvent = {
    kind: 1, // Kind 1 is a text note
    pubkey: pubKey,
    created_at: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
    tags: tags, // Array of references to other events ('e'), pubkeys ('p') or addressable content ('a')
    content, // Your message content, defined in Step 2
  };

  // Sign the event with the private key
  NostrEvent.id = NostrTools.getEventHash(NostrEvent);
  NostrEvent = NostrTools.finalizeEvent(NostrEvent, privKey);  // No await, make this sync

  // Log the signed event
  console.log("Signed event:", NostrEvent);

  // Track the completion of all relays
  let completedRelays = 0;

  // Loop through the relay URLs synchronously
  relayUrls.split(",").forEach((url) => {
    const socket = new WebSocket(url);

    // Handle WebSocket events
    socket.onopen = () => {
      console.log(`Connected to ${url}`);
      socket.send(JSON.stringify(["EVENT", NostrEvent]));
    };

    socket.onmessage = (message) => {
      console.log(`Message from ${url}:`, message.data);
      console.log("Published on:", url);
      process.exit(0);
    };

    socket.onclose = () => {
      console.log(`Disconnected from ${url}`);
      completedRelays++;

      // Check if all relays have finished
      if (completedRelays === relayUrls.length) {
        console.log("All events published, script finished.");
        process.exit(0); // Exit after all relays are done
      }
    };

    socket.onerror = (err) => {
      console.log(`Error with ${url}:`, err);
      completedRelays++;

      // Check if all relays have finished even if there's an error
      if (completedRelays === relayUrls.length) {
        console.log("All events published (with errors), script finished.");
        process.exit(0); // Exit after all relays are done
      }
    };
  });
}

function postNostr() {
    console.log("Nostr Enabled: " + nostrEnabled)
    console.log("Nostr event to post: ")
    console.log("====================")
    console.log(text)
    console.log("====================")
    if (nostrEnabled == true) {
        postOnNostr(text)
    }
  }

module.exports = {
  setNostrEnabled,
  postNostr,
  appendNostrPublicKeyTag,
  appendTextToNostr
};