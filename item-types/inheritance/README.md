# The Bitcoin Hole - Inheritance Services

## Introduction

Unlike traditional assets such as real estate or stocks, bitcoin is often stored in digital wallets, accessible only through private keys or passwords. Without proper planning, the sudden loss of these keys can result in the permanent loss of significant wealth for heirs.

Bitcoin inheritance services offer a solution to this problem by providing individuals with the tools and strategies to securely pass on their bitcoin holdings to beneficiaries. These services typically include features such as multi-signature wallets, secure storage solutions, and detailed instructions for heirs on how to access the assets in the event of the owner's death or incapacitation.

This repository goal is to have the more complete database of Inheritance Services features, so they can be compared, helping users to choose wisely. The database is open-source, meaning anyone can collaborate to improve and correct any wrong data or add new items.

## Collaboration

Inside the `items` directory, there is a JSON file for each item, with all the data about it. To collaborate (adding missing data, fixing wrong data or adding a new item), just fork the repository and send a pull request with the changes.

Before sending the pull request, please run the following commands to format the JSON:

```
cd scripts/
node json-format.js
```

## JSON format

The following is a sample of the JSON format:

```json
{
    "id": "inheritance-service-id",
    "name": "Inheritance Service Name",
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
| id | string | true | The Inheritance Service id. It matches with the JSON file name. |
| name | string | true | The Inheritance Service name. |
| category-name.feature-name-1.value | string | yes | The visible feature value. For example: `"YES"`, `"NO"`, `"Experimental"`, etc |
| category-name.feature-name-1.flag | string | no | The flag of the Inheritance Service feature. Possible values: `"positive"`, `"neutral"` or `"negative"` |
| category-name.feature-name-1.supported | boolean | no | If the feature is supported by the Inheritance Service. This is used to filter by this feature |
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
| Subscription Payment Methods | payment-methods | BTC On Chain | btc-on-chain |
| Subscription Payment Methods | payment-methods | BTC Lightning | btc-lightning |
| Subscription Payment Methods | payment-methods | Alt Coins | alt-coins |
| Subscription Payment Methods | payment-methods | Credit/Debit Card | credit-debit-card |
| Private Keys | private-keys | Non-custodial | non-custodial |
| Private Keys | private-keys | Third-Party Independence | provider-independence |
| Private Keys | private-keys | Single-Sig | single-sig |
| Private Keys | private-keys | Multi-sig (PSBTs) | multi-sig |
| Private Keys | private-keys | Required Hardware Wallet | required-hardware-wallet |
| Private Keys | private-keys | Key Replacement Assisted Support | key-replacement-support |
| Private Keys | private-keys | Beneficiary Key Lost Protection | beneficiary-key-lost-protection |
| Private Keys | private-keys | Health Checks | health-checks |
| Private Keys | private-keys | Health Checks Reminders | health-checks-reminders |
| Passing Down Alternatives | passing-down-alternatives | Direct Inheritance | direct-inheritance |
| Passing Down Alternatives | passing-down-alternatives | Indirect Inheritance | indirect-inheritance |
| Passing Down Alternatives | passing-down-alternatives | Joint Control | joint-control |
| Passing Down Alternatives | passing-down-alternatives | Multiple Beneficiaries | multiple-beneficiaries |
| Passing Down Alternatives | passing-down-alternatives | Assign Percentage to each Beneficiary | assign-percentage-beneficiaries |
| Privacy | privacy | Non-KYC | non-kyc |
| Privacy | privacy | Coin Control | coin-control |
| Privacy | privacy | Custom Node | custom-node |
| Privacy | privacy | Tor | tor |
| Features | features | Bitcoin-only | bitcoin-only |
| Features | features | Crypto Specific Solution | crypto-specific-solution |
| Features | features | Exchanges Integration | exchanges-integration |
| Features | features | Message for Beneficiary | message-for-beneficiary |
| Features | features | Notifications to Beneficiary | notifications-to-beneficiary |
| Features | features | Onchain Timelock | onchain-timelock |
| Features | features | Timelock Refresh Method | timelock-refresh-method |
| Features | features | Zero Cost to Update Timelock | zero-cost-to-update-timelock |
| Features | features | Waiting Period to Claim | waiting-period-to-claim |
| Android Support | android-support | Supported | android-supported |
| Android Support | android-support | Google Play | android-googleplay-support |
| Android Support | android-support | Direct APK Download | android-apk-support |
| Android Support | android-support | Release Notes | android-release-notes |
| Android Support | android-support | Source-available | android-source-available |
| Android Support | android-support | Open Source | android-open-source |
| Android Support | android-support | License | android-license |
| Android Support | android-support | Reproducible Builds | android-reproducible-builds |
| iOS Support | ios-support | Supported | ios-supported |
| iOS Support | ios-support | Release Notes | ios-release-notes |
| iOS Support | ios-support | Source-available | ios-source-available |
| iOS Support | ios-support | Open Source | ios-open-source |
| iOS Support | ios-support | License | ios-license |
| iOS Support | ios-support | Reproducible Builds | ios-reproducible-builds |
| Web Support | web-support | Supported | web-supported |
| MacOS Support | macos-support | Supported | macos-supported |
| MacOS Support | macos-support | Release Notes | macos-release-notes |
| MacOS Support | macos-support | Source-available | macos-source-available |
| MacOS Support | macos-support | Open Source | macos-open-source |
| MacOS Support | macos-support | License | macos-license |
| MacOS Support | macos-support | Reproducible Builds | macos-reproducible-builds |
| Linux Support | linux-support | Supported | linux-supported |
| Linux Support | linux-support | Release Notes | linux-release-notes |
| Linux Support | linux-support | Source-available | linux-source-available |
| Linux Support | linux-support | Open Source | linux-open-source |
| Linux Support | linux-support | License | linux-license |
| Linux Support | linux-support | Reproducible Builds | linux-reproducible-builds |
| Windows Support | windows-support | Supported | windows-supported |
| Windows Support | windows-support | Release Notes | windows-release-notes |
| Windows Support | windows-support | Source-available | windows-source-available |
| Windows Support | windows-support | Open Source | windows-open-source |
| Windows Support | windows-support | License | windows-license |
| Windows Support | windows-support | Reproducible Builds | windows-reproducible-builds |
| Hardware Wallets Support | hardware-wallets-support | Bitbox02 | bitbox02 |
| Hardware Wallets Support | hardware-wallets-support | Bitkey | bitkey |
| Hardware Wallets Support | hardware-wallets-support | Coldcard Mk4 | coldcard-mk4 |
| Hardware Wallets Support | hardware-wallets-support | Coldcard Q | coldcard-q |
| Hardware Wallets Support | hardware-wallets-support | Cypherock X1 | cypherock-x1 |
| Hardware Wallets Support | hardware-wallets-support | Jade | jade |
| Hardware Wallets Support | hardware-wallets-support | Keystone 3 Pro | keystone-3-pro |
| Hardware Wallets Support | hardware-wallets-support | Ledger Nano S Plus | ledger-nano-s-plus |
| Hardware Wallets Support | hardware-wallets-support | Ledger Nano X | ledger-nano-X |
| Hardware Wallets Support | hardware-wallets-support | Passport Core | passport-core |
| Hardware Wallets Support | hardware-wallets-support | Portal | portal |
| Hardware Wallets Support | hardware-wallets-support | SeedSigner | seedsigner |
| Hardware Wallets Support | hardware-wallets-support | Specter DIY | specter-diy |
| Hardware Wallets Support | hardware-wallets-support | Tapsigner | tapsigner |
| Hardware Wallets Support | hardware-wallets-support | Trezor Model One | trezor-model-one |
| Hardware Wallets Support | hardware-wallets-support | Trezor Safe 3 | trezor-safe-3 |
| Hardware Wallets Support | hardware-wallets-support | Trezor Safe 5 | trezor-safe-5 |
| Hardware Wallets Support | hardware-wallets-support | Trezor Model t | trezor-model-t |

## Website

The [thebitcoinhole.com](https://thebitcoinhole.com/) website offers a Inheritance Services Comparison using this database. This website is the most comprehensive resource for comparing the features of top Bitcoin Inheritance Services.

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