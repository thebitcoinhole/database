# The Bitcoin Hole - Seed Backup

## Introduction

Seed backup solutions are tools that help users securely store and protect their Bitcoin recovery phrases. They focus on safeguarding the seed phrase from loss, theft, or damage. These solutions come in various forms, including metal backups, encrypted digital storage, and secure offline methods, ensuring long-term access to funds even if the primary wallet is lost or compromised.

This repository goal is to have the more complete database of Seed Backup Solutions features, so they can be compared, helping users to choose wisely. The database is open-source, meaning anyone can collaborate to improve and correct any wrong data or add new items.

## Collaboration

Inside the `items` directory, there is a JSON file for each seed backup solution, with all the data about it. To collaborate (adding missing data, fixing wrong data or adding a new item), just fork the repository and send a pull request with the changes.

Before sending the pull request, please run the following commands to format the JSON:

```
cd scripts/
node json-format.js
```

## JSON format

The following is a sample of the JSON format:

```json
{
    "id": "item-id",
    "name": "Item Name",
    "purchasable": true,
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
| id | string | true | The item id. It matches with the JSON file name. |
| name | string | true | The item name. |
| category-name.feature-name-1.value | string | yes | The visible feature value. For example: `"YES"`, `"NO"`, `"Experimental"`, etc |
| category-name.feature-name-1.flag | string | no | The flag of the item feature. Possible values: `"positive"`, `"neutral"` or `"negative"` |
| category-name.feature-name-1.supported | boolean | no | If the feature is supported by the item. This is used to filter by this feature |
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
| Payment Methods to buy the device | payment-methods | BTC On Chain | btc-on-chain |
| Payment Methods to buy the device | payment-methods | BTC Lightning | btc-lightning |
| Payment Methods to buy the device | payment-methods | Alt Coins | alt-coins |
| Payment Methods to buy the device | payment-methods | Credit/Debit Card | credit-debit-card |
| Size & Materials | size-materials | Weight | weight |
| Size & Materials | size-materials | Dimensions | dimensions |
| Size & Materials | size-materials | Materials | materials |
| Size & Materials | size-materials | Include All Tools | include-all-tools |
| Size & Materials | size-materials | Water-proof | water-proof |
| Size & Materials | size-materials | Fire-proof | fire-proof |
| Size & Materials | size-materials | Crush-proof | crush-proof |
| Size & Materials | size-materials | Corrosion-proof | corrosion-proof |
| Size & Materials | size-materials | Shock-proof | shock-proof |
| Size & Materials | size-materials | Stress tests | stress-tests |
| Security | security | PIN Protection | pin-protection |
| Security | security | Encrypted Backup | encrypted-backup |
| Security | security | Tamper Evident Seal | tamper-evident-seal |
| Capacity | capacity | Multiple Private Keys | multiple-private-keys |
| Backup Compatibility | backup-compatibility | Output Descriptor | output-descriptor |
| Backup Compatibility | backup-compatibility | 12 Words BIP-39 | bip39-12-words |
| Backup Compatibility | backup-compatibility | 24 Words BIP-39 | bip39-24-words |
| Backup Compatibility | backup-compatibility | Seed QR | seed-qr |
| Backup Compatibility | backup-compatibility | Shamir Backup SLIP-39 | shamir-backup |
| Backup Compatibility | backup-compatibility | Hexadecimal Strings | hexadecimal-strings |
| Backup Compatibility | backup-compatibility | ASCII Strings | ascii-strings |

## Website

The [thebitcoinhole.com](https://thebitcoinhole.com/) website offers a Seed Backup Gadgets Comparison using this database.

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