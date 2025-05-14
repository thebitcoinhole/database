# The Bitcoin Hole - Hardware Wallets

## Introduction

Hardware wallets are an essential tool for those who want to keep their bitcoin secure. These devices allow you to store your private keys offline, so they can’t be accessed by hackers or other online threats. But with so many hardware wallets on the market, it can be challenging to choose the right one for your needs.

This repository goal is to have the more complete database of Hardware Wallets features, so they can be compared, helping users to choose wisely. The database is open-source, meaning anyone can collaborate to improve and correct any wrong data or add new items.

## Collaboration

Inside the `items` directory, there is a JSON file for each wallet, with all the data about it. To collaborate (adding missing data, fixing wrong data or adding a new wallet), just fork the repository and send a pull request with the changes.

Before sending the pull request, please run the following commands to format the JSON:

```
cd scripts/
node json-format.js
```

## JSON format

The following is a sample of the JSON format:

```json
{
    "id": "wallet-id",
    "name": "Wallet Name",
    "purchasable": true,
    "pre-order": false,
    "category-name": {
      "feature-name-1": {
        "value": "YES", 
        "flag": "positive",
        "supported": true,
        "texts": [
          "Optional contextual text describing the feature"
        ],
        "links": [
          {
            "title": "Optional contextual link referencing official documentation",
            "url": "url"
          }
        ]
      },
      "feature-name-2": {
        "value": "Experimental",
        "flag": "neutral",
        "supported": true
      },
      "feature-name-3": {
        "value": "NO",
        "flag": "negative",
        "supported": false
      }
    }
}
```

JSON fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | string | true | The wallet id. It matches with the JSON file name. |
| name | string | true | The wallet name. |
| purchasable | boolean | true | If the wallet can be purchased in the official website |
| pre-order | boolean | false | If the wallet is not released yet and can be reserved/pre-ordered |
| category-name.feature-name-1.value | string | yes | The visible feature value. For example: `"YES"`, `"NO"`, `"Experimental"`, etc |
| category-name.feature-name-1.flag | string | no | The flag of the wallet feature. Possible values: `"positive"`, `"neutral"` or `"negative"` |
| category-name.feature-name-1.supported | boolean | no | If the feature is supported by the wallet. This is used to filter by this feature |
| category-name.feature-name-1.texts | array of strings | no | Official Texts with info about the feature |
| category-name.feature-name-1.links | array of objects | no | Official links with info about the feature |
| category-name.feature-name-1.links.title | string | yes | The title of the link |
| category-name.feature-name-1.links.url | string | yes | The url of the link |

On each pull request, the JSON files are verified to be sure they are valid and well-formatted. You can run the following command inside the `scripts` directory to format the JSON before sending a pull request:

```
node json-format.js
```

All the features supported:

| Category | Category Id | Feature | Feature Id |
| --- | --- | --- | --- |
| Basic Information | basic-information | Launch Year | year |
| Basic Information | basic-information | Assembled In | assembled-in |
| Basic Information | basic-information | DIY | diy |

| Communities | communities | Telegram | telegram |
| Communities | communities | Reddit | reddit |
| Official Store | official-store | PO Box Support | po-box-support |
| Official Store | official-store | BTC On Chain Support | btc-on-chain |
| Official Store | official-store | BTC Lightning Support | btc-lightning |
| Official Store | official-store | Alt Coins Support | alt-coins |
| Official Store | official-store | Credit/Debit Card Support | credit-debit-card |
| Size & Materials | size-materials | Warranty | warranty |
| Size & Materials | size-materials | Weight | weight |
| Size & Materials | size-materials | Dimensions | dimensions |
| Size & Materials | size-materials | Casing Material | materials |
| Size & Materials | size-materials | Available in colors | available-in-colors |
| Size & Materials | size-materials | Waterproof | waterproof |
| Display | display | Screen | screen |
| Display | display | Screen Type | screen-type |
| Display | display | Gorilla Glass | gorilla-glass |
| Display | display | Color Screen | color-screen |
| Display | display | Touch Screen | touch-screen |
| Display | display | Screen Size | screen-size |
| Display | display | Screen Resolution | screen-resolution |
| Input | input | Controls | controls |
| Input | input | Qwerty Keyboard | qwerty-keyboard |
| Power | power | Battery | battery |
| Power | power | Removable Battery | removable-battery |
| Power | power | Battery Size | battery-size |
| Power | power | USB charging | usb-charging |
| Power | power | Wireless charging | wireless-charging |
| Connectivity | connectivity | USB Data | usb-data |
| Connectivity | connectivity | Bluetooth | bluetooth |
| Connectivity | connectivity | Wifi | wifi |
| Connectivity | connectivity | Ethernet | ethernet |
| Connectivity | connectivity | NFC | nfc |
| Connectivity | connectivity | microSD card | microsd-card |
| Connectivity | connectivity | QR scanner | qr-scanner |
| Connectivity | connectivity | 100% Air-gapped | air-gapped |
| Security | security | Secure Element | secure-element |
| Security | security | Supply Chain & Physical Attacks Protection | supply-chain-physical-attacks |
| Security | security | Deterministic nonces (RFC6979) | deterministic-nonces |
| Security | security | Anti-Klepto / Anti-Exfil protocol | anti-klepto |
| Networks | networks | Bitcoin Mainnet | btc-mainnet |
| Networks | networks | Bitcoin Testnet | btc-testnet |
| Networks | networks | Alt Coins | alt-coins |
| Firmware | firmware | Bitcoin-only firmware | bitcoin-only-firmware |
| Firmware | firmware | Upgradable Firmware | upgradable-firmware |
| Firmware | firmware | Upgrade via MicroSD Card | upgrade-via-sdcard |
| Firmware | firmware | Upgrade via USB External Storage | upgrade-via-usb-external-storage |
| Firmware | firmware | Upgrade via USB Cable | upgrade-via-usb-cable |
| Firmware | firmware | Upgrade via Bluetooth | upgrade-via-bluetooth |
| Firmware | firmware | Upgrade via NFC | upgrade-via-nfc |
| Firmware | firmware | Secure Boot | secure-boot |
| Firmware | firmware | Latest Version | latest-version |
| Firmware | firmware | Latest Release Date | latest-release-date |
| Firmware | firmware | Release Notes | release-notes |
| Firmware | firmware | Source-available | source-available |
| Firmware | firmware | Free & Open Source (FOSS) | open-source |
| Firmware | firmware | License | license |
| Firmware | firmware | Reproducible Builds | reproducible-builds |
| Device Lock | device-lock | PIN entry | pin-entry |
| Device Lock | device-lock | Dynamic Keypad | dynamic-keypad |
| Device Lock | device-lock | Countdown to Brick/Reset PIN | countdown-brick-reset-pin |
| Device Lock | device-lock | Brick/Reset me PIN | brick-reset-pin |
| Device Lock | device-lock | Time Delay to Unlock | time-delay-to-unlock |
| Device Lock | device-lock | Anti-phishing words | anti-phishing-words |
| Device Lock | device-lock | Alphanumeric PIN | alphanumeric-pin |
| Device Lock | device-lock | Pattern Lock | pattern-lock |
| Device Lock | device-lock | Fingerprint Lock | fingerprint-lock |
| Device Lock | device-lock | Dummy/Decoy Wallet | dummy-wallet |
| Private Keys | private-keys | Stateless | stateless |
| Private Keys | private-keys | User Added Entropy | user-added-entropy |
| Private Keys | private-keys | Multiple Private Keys | multiple-private-keys |
| Private Keys | private-keys | Passphrases support (BIP39) | passphrase-support |
| Private Keys | private-keys | Passphrase entry | passphrase-entry |
| Private Keys | private-keys | Master Key Fingerprint | master-key-fingerprint |
| Private Keys | private-keys | Deterministic Entropy (BIP-85) | bip85 |
| Private Keys | private-keys | Shamir (SLIP39) Backup / Import | shamir-backup |
| Private Keys | private-keys | Seed XOR Backup / Import | seed-xor |
| Private Keys | private-keys | microSD card Backup / Import | backup-recovery-microsd |
| Private Keys | private-keys | NFC card Backup / Import | backup-recovery-nfc-card |
| Private Keys | private-keys | 12 Words BIP39 Seed Creation | create-12-words |
| Private Keys | private-keys | 24 Words BIP39 Seed Creation | create-24-words |
| Private Keys | private-keys | 12/24 BIP39 Words Display | display-12-24-words |
| Private Keys | private-keys | 12 Words BIP39 Seed Import | import-12-words |
| Private Keys | private-keys | 24 Words BIP39 Seed Import | import-24-words |
| Private Keys | private-keys | SeedQR Backup / Import | seed-qr |
| Address Format | address-format | Legacy (P2PKH) | legacy |
| Address Format | address-format | Nested Segwit (P2SH) | nested-segwit |
| Address Format | address-format | Native Segwit (P2WPKH) | native-segwit |
| Address Format | address-format | Taproot (P2TR) | taproot |
| Receive Addresses | addresses | View Address as Text | view-address-text |
| Receive Addresses | addresses | View Address as QR | view-address-qr |
| Receive Addresses | addresses | Export Address to SD Card | export-address-sdcard |
| Receive Addresses | addresses | Verify Address from QR | verify-address-qr |
| Signing | signing | Multi-sig (PSBTs) | multi-sig |
| Signing | signing | Frost | frost |
| Signing | signing | UR2.0 Animated QRs | ur-2-animated-qrs |
| Signing | signing | BBQr | bbqr |
| Signing | signing | NFC Push Tx | nfc-push-tx |
| Signing | signing | Sign Messages | message-signing |
| Signing | signing | Change Verification | change-verification |
| Signing | signing | Change Address Display | change-address-display |
| Fees | fees | Fee Control | fee-control |
| Fees | fees | Replace-by-fee (RBF) | replace-by-fee |
| Fees | fees | Child-pays-for-parent (CPFP) | child-pays-for-parent |
| Fees | fees | Maximum Fee Protection | maximum-fee-protection |
| Privacy | privacy | Coin Control | coin-control |
| Privacy | privacy | Custom Node | custom-node |
| Privacy | privacy | Tor | tor |
| Privacy | privacy | Silent Payments | silent-payments |
| Other Features | other-features | Miniscript | miniscript |
| Other Features | other-features | Taproot Miniscript | taproot-miniscript |
| Other Features | other-features | Virtual Disk Mode | virtual-disk-mode |
| Other Features | other-features | Password Manager | password-manager |
| Other Features | other-features | U2F authentication | u2f-authentication |
| Other Features | other-features | FIDO authentication | fido-authentication |
| Other Features | other-features | Hardware-based SSH/GPG | hardware-based-ssh-gpg |
| Official Apps | official-apps | Web App | web-app |
| Official Apps | official-apps | Windows App | windows-app |
| Official Apps | official-apps | MacOS App | macos-app |
| Official Apps | official-apps | Linux App | linux-app |
| Official Apps | official-apps | Chrome Extension | chrome-extension |
| Official Apps | official-apps | Firefox Extension | firefox-extension |
| Official Apps | official-apps | Edge Extension | edge-extension |
| Official Apps | official-apps | Android App | android-app |
| Official Apps | official-apps | iOS App | ios-app |
| Third-Party Apps / Services | third-party-apps | Nunchuk | nunchuk |
| Third-Party Apps / Services | third-party-apps | Electrum | electrum |
| Third-Party Apps / Services | third-party-apps | Sparrow | sparrow |
| Third-Party Apps / Services | third-party-apps | Specter Desktop | specter-desktop |
| Third-Party Apps / Services | third-party-apps | Blockstream Green | blockstream-green |
| Third-Party Apps / Services | third-party-apps | BlueWallet | bluewallet |
| Third-Party Apps / Services | third-party-apps | Bitcoin Keeper | bitcoin-keeper |
| Third-Party Apps / Services | third-party-apps | Liana | liana |
| Third-Party Apps / Services | third-party-apps | Casa | casa |
| Third-Party Apps / Services | third-party-apps | Unchained | unchained |

## Website

The [thebitcoinhole.com](https://thebitcoinhole.com/) website offers a Hardware Wallet Comparison using this database. This website is the most comprehensive resource for comparing the features of top hardware wallets. It provides an in-depth analysis of each wallet’s security features, privacy, usability, compatibility, and more.

## Sponsor this project
Sponsor this project to help us get the funding we need to continue working on it.

* [Donate with Bitcoin Lightning](https://getalby.com/p/thebitcoinhole) ⚡️ [thebitcoinhole@getalby.com](https://getalby.com/p/thebitcoinhole)
* [Donate with PayPal or a credit card using Ko-fi](https://ko-fi.com/thebitcoinhole)
* [Donate on Patreon](https://www.patreon.com/TheBitcoinHole)

## Follow us
* [Twitter](http://x.com/thebitcoinhole)
* [Nostr](https://primal.net/p/npub1mtd7s63xd85ykv09p7y8wvg754jpsfpplxknh5xr0pu938zf86fqygqxas)
* [Medium](https://medium.com/the-bitcoin-hole)
* [GitHub](https://github.com/thebitcoinhole)
