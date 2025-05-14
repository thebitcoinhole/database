const fs = require('fs');
const cheerio = require('cheerio');

const twitter = require('./tweet');
const nostr = require('./nostr');
const utils = require('./utils');

const {
    GithubLatestReleaseCommand,
    GithubAllReleasesCommand,
    GithubTagCommand,
    GitlagTagCommand,
    ChangeLogCommand,
    FirstLineChangeLogCommand,
    runCommandsSequentially,
    formatYYYYMMDD,
    formatMonthDDYYYY,
    formatDDMonthYYYY,
    getShortMonthByIndex,
    today
  } = require('./check-releases-utils');

// Hardware Wallets

class BitkeyCommand extends ChangeLogCommand {

    constructor() {
        super("bitkey", "hardware-wallets", "https://bitkey.world/en-US/releases");
    }

    parseRelease(data) {
        var version
        var date
        const $ = cheerio.load(data);
        let found = false;

        $('.border-t.py-6').each((_, element) => {
            if (found) return

            const dateText = $(element).find('.text-primary50').first().text().trim();
            const versionText = $(element).find('.font-semibold').first().text().trim();
            const type = $(element).find('.text-primary50').first().next().text().trim();

            if (type.toLowerCase().includes('firmware')) {
                version = versionText
                date = dateText
                found = true
            }
        });
        return { version: version, date: date }
    }
}

class ColdcardMk4Command extends ChangeLogCommand {

    constructor() {
        super("coldcard-mk4", "hardware-wallets",  "https://raw.githubusercontent.com/Coldcard/firmware/master/releases/ChangeLog.md");
    }

    parseRelease(data) {
        var version
        var date
        const lines = data.split('\n');
        // Coldcard Mk4. Example: ## 5.2.2 - 2023-12-21
        const regex = /^## ([\d.]+) - (\d{4}-\d{2}-\d{2})/;
        var onSection = false
        for (const line of lines) {
            if (onSection == true) {
                const match = line.match(regex);
                if (match) {
                    version = match[1];
                    date = formatYYYYMMDD(match[2]);
                    break;
                }
            } else if (line == "# Mk4 Specific Changes") {
                onSection = true
            }
        }
        return { version: version, date: date};
    }
}

class ColdcardQCommand extends ChangeLogCommand {

    constructor() {
        super("coldcard-q", "hardware-wallets",  "https://raw.githubusercontent.com/Coldcard/firmware/master/releases/ChangeLog.md");
    }

    parseRelease(data) {
        var version
        var date
        const lines = data.split('\n');
        // Coldcard Q. Example: ## 0.0.6Q - 2024-02-22
        const regex = /^## ([\d.]+)Q - (\d{4}-\d{2}-\d{2})/;
        var onSection = false
        for (const line of lines) {
            if (onSection == true) {
                const match = line.match(regex);
                if (match) {
                    version = match[1];
                    date = formatYYYYMMDD(match[2]);
                    break;
                }
            } else if (line == "# Q Specific Changes") {
                onSection = true
            }
        }
        return { version: version, date: date };
    }
}

class CoolWalletProCommand extends FirstLineChangeLogCommand {

    constructor() {
        super("coolwallet-pro", "hardware-wallets",  "https://raw.githubusercontent.com/CoolBitX-Technology/coolwallet-pro-se/main/CHANGELOG.md");
    }

    getRegex() {
        // Coolwallet Pro. Example: ## [332] - 2023-08-10
        return /^## \[([\d]+)\] - (\d{4}-\d{2}-\d{2})/;
    }

    formatDate(date) {
        return formatYYYYMMDD(date)
    }
}

class SatochipCommand extends GithubLatestReleaseCommand {
    constructor(itemId) {
        super(itemId, "hardware-wallets", "Toporin", "SatochipApplet");
    }

    sanitizeVersion(version) {
        const match = version.match(/^Satochip (v\d+(\.\d+)+)/);
        return match ? match[1] : version;
    }
}

class TrezorModelOneCommand extends FirstLineChangeLogCommand {

    constructor() {
        super("trezor-model-one", "hardware-wallets",  "https://raw.githubusercontent.com/trezor/trezor-firmware/master/legacy/firmware/CHANGELOG.md");
    }

    getRegex() {
        // Example: ## 1.12.1 [15th March 2023]
        return /^## ([\d.]+) \[(\d{1,2}\w\w \w+ \d{4})\]/;
    }

    formatDate(date) {
        return formatDDMonthYYYY(date)
    }
}

class TrezorModelTSafeCommand extends ChangeLogCommand {

    constructor(itemId, changelogUrl) {
        super(itemId, "hardware-wallets",  changelogUrl);
    }

    parseRelease(data) {
        var version
        var date
        const lines = data.split('\n');
        // Example: ## [2.7.0] (20th March 2024) or ## [2.8.5] (internal release)
        const regex = /^## \[([\d.]+)\] \((\d{1,2}(?:st|nd|rd|th) \w+ \d{4}|internal release)\)/;
        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                version = match[1];
                date = formatDDMonthYYYY(match[2]);
                if (match[2] === "internal release") {
                    date = today()
                } else {
                    date = formatDDMonthYYYY(match[2]);
                }
                break;
            }
        }
        return { version: version, date: date };
    }
}

// Software Wallets

class ElectrumCommand extends FirstLineChangeLogCommand {

    constructor() {
        super("electrum", "software-wallets",  "https://raw.githubusercontent.com/spesmilo/electrum/master/RELEASE-NOTES");
    }

    getRegex() {
        // # Release 4.4.6 (August 18, 2023) (security update)
        return /^# Release ([\d.]+) \(([^)]+)\)/;
    }

    formatDate(date) {
        return formatMonthDDYYYY(date)
    }

    getPlatforms() {
        return ["windows", "macos", "linux", "android"];
    }
}

class MuunAndroidCommand extends FirstLineChangeLogCommand {

    constructor() {
        super("muun", "software-wallets",  "https://raw.githubusercontent.com/muun/apollo/master/android/CHANGELOG.md");
    }

    getRegex() {
        // ## [51.5] - 2023-12-22
        return /^## \[([\d.]+)\] - (\d{4}-\d{2}-\d{2})/;
    }

    formatDate(date) {
        return formatYYYYMMDD(date)
    }

    getPlatforms() {
        return ["android"];
    }
}

class MuuniOSCommand extends GithubTagCommand {

    constructor() {
        super("muun", "software-wallets", "muun", "falcon", ["ios"]);
    }

    sanitizeVersion(version) {
        return version.split("-")[0]
    }
}

class MyCitadelCommand extends GithubLatestReleaseCommand {

    constructor(githubRepo, platforms) {
        super("my-citadel", "software-wallets", "mycitadel", githubRepo, platforms);
    }

    sanitizeVersion(version) {
        version = version.replace(/^Version (\d+(\.\d+)+) \(.*\)$/, '$1');
        version = version.replace(/^Release /, '');
        return version
    }

}

// Bitcoin Nodes

class MyNodeCommand extends ChangeLogCommand {

    constructor(itemId) {
        super(itemId, "bitcoin-nodes", "https://raw.githubusercontent.com/mynodebtc/mynode/master/CHANGELOG");
    }

    parseRelease(data) {
        var version
        var date
        // === v0.3.25 ===
        // - Released 1/11/24
        const lines = data.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
        
            if (line.startsWith("===")) {
                const versionRegex = /^=== v([\d.]+) ===/;
                const versionMatch = line.match(versionRegex);
        
                if (versionMatch) {
                    version = versionMatch[1];
        
                    // Check if the next line exists
                    const nextLine = lines[i + 1]?.trim();
                    const dateRegex = /^- Released ([\d.]+)\/([\d.]+)\/([\d.]+)/;
                    const dateMatch = nextLine.match(dateRegex);
        
                    if (dateMatch) {
                        date = `${getShortMonthByIndex(parseInt(dateMatch[1]) - 1)} ${dateMatch[2]}, ${2000 + parseInt(dateMatch[3])}`;
                    }
                }
        
                break; // Only need the first match
            }
        }
        return { version: version, date: date};
    }
}

class NodlCommand extends ChangeLogCommand {

    constructor(itemId, changelogUrl) {
        super(itemId, "bitcoin-nodes", changelogUrl);
    }

    parseRelease(data) {
        var version
        const line = data.split('\n')[0]
        const regex = /^([\d.]+) -/;
        const match = line.match(regex);
        if (match) {
            version = match[1];
        }
        return { version: version, date: today()};
    }
}

class ParmanodeCommand extends ChangeLogCommand {

    constructor() {
        super("parmanode", "bitcoin-nodes", "https://raw.githubusercontent.com/ArmanTheParman/Parmanode/refs/heads/master/changelog.txt");
    }

    parseRelease(data) {
        var version
        const lines = data.split('\n');
        const regex = /^Version ([\d.]+)/;
        for (const line of lines) {
            // Skip empty lines and lines starting with #
            if (line.trim() === "" || line.trim().startsWith("#")) {
                continue;
            }
        
            const match = line.match(regex);
            if (match) {
                version = match[1];
                break; // Stop after finding the first valid version line
            }
        }
        return { version: version, date: today()};
    }
}

class UmbrelCommand extends GithubAllReleasesCommand {

    constructor(itemId) {
        super(itemId, "bitcoin-nodes", "getumbrel", "umbrel", undefined, "umbrel");
    }

    sanitizeVersion(version) {
        return version.replace(/^umbrelOS /, '');
    }
}

const commands = [

    // Hardware Wallets
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("bitbox02-btconly", "hardware-wallets", "digitalbitbox", "bitbox02-firmware", undefined, "Bitcoin-only");
        }
        sanitizeVersion(version) {
            return version.replace(/ - Bitcoin-only$/, '');
        }
    })(),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("bitbox02-multi", "hardware-wallets", "digitalbitbox", "bitbox02-firmware", undefined, "Multi");
        }
        sanitizeVersion(version) {
            return version.replace(/ - Multi$/, '');
        }
    })(),
    new BitkeyCommand(),
    new ColdcardMk4Command(),
    new ColdcardQCommand(),
    new CoolWalletProCommand(),
    new GithubLatestReleaseCommand("cypherock-x1", "hardware-wallets", "Cypherock", "x1_wallet_firmware"),
    new GithubLatestReleaseCommand("frostnap", "hardware-wallets", "frostsnap", "frostsnap"),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("gridplus-lattice1", "hardware-wallets", "GridPlus", "lattice-software-releases", undefined, "HSM-");
        }
        sanitizeVersion(version) {
            return version.replace(/^HSM-/, '');
        }
    })(),
    new GithubTagCommand("jade", "hardware-wallets", "Blockstream", "Jade"),
    new GithubTagCommand("jade-plus", "hardware-wallets", "Blockstream", "Jade"),
    new GithubTagCommand("jade-plus-metal", "hardware-wallets", "Blockstream", "Jade"),
    new GithubLatestReleaseCommand("keepkey", "hardware-wallets", "keepkey", "keepkey-firmware"),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("keystone-3-pro", "hardware-wallets", "KeystoneHQ", "keystone3-firmware", undefined, "-BTC");
        }
        sanitizeVersion(version) {
            return version.replace(/-BTC$/, '').replace(/-btc$/, '');
        }
    })(),
    new GithubLatestReleaseCommand("krux", "hardware-wallets", "selfcustody", "krux"),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("onekey-classic-1s", "hardware-wallets", "OneKeyHQ", "firmware", undefined, "classic");
        }
        sanitizeVersion(version) {
            return version.replace(/^classic\//, '');
        }
    })(),

    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("onekey-classic-1s-pure", "hardware-wallets", "OneKeyHQ", "firmware", undefined, "classic");
        }
        sanitizeVersion(version) {
            return version.replace(/^classic\//, '');
        }
    })(),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("onekey-pro", "hardware-wallets", "OneKeyHQ", "firmware", undefined, "touch");
        }
        sanitizeVersion(version) {
            return version.replace(/^touch\//, '');
        }
    })(),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("passport-batch-2", "hardware-wallets", "Foundation-Devices", "passport2");
        }
        sanitizeVersion(version) {
            return version.replace(/^Passport Firmware /, '').replace(/^Passport /, '').replace(/ Firmware$/, '');
        }
    })(),
    new GithubLatestReleaseCommand("portal", "hardware-wallets", "TwentyTwoHW", "portal-software"),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("prokey-optimum", "hardware-wallets", "prokey-io", "prokey-optimum-firmware");
        }
        sanitizeVersion(version) {
            return version.replace(/^Prokey Firmware /, '');
        }
    })(),
    new SatochipCommand("satochip-diy"),
    new SatochipCommand("satochip"),
    new GithubTagCommand("seedsigner", "hardware-wallets", "SeedSigner", "seedsigner"),
    new GithubLatestReleaseCommand("specter-diy", "hardware-wallets", "cryptoadvance", "specter-diy"),
    new TrezorModelOneCommand(),
    new TrezorModelTSafeCommand("trezor-model-t", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2T1.md"),
    new TrezorModelTSafeCommand("trezor-safe-3", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2B1.md"),
    new TrezorModelTSafeCommand("trezor-safe-3-btconly", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2B1.md"),
    new TrezorModelTSafeCommand("trezor-safe-5", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T3T1.md"),
    new TrezorModelTSafeCommand("trezor-safe-5-btconly", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T3T1.md"),

    // Software Wallets
    new GithubLatestReleaseCommand("aqua", "software-wallets", "AquaWallet", "aqua-wallet", ["android", "ios"]),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("bitcoin-core", "software-wallets", "bitcoin", "bitcoin", ["windows", "macos", "linux"]);
        }
        sanitizeVersion(version) {
            return version.replace(/^Bitcoin Core /, '');
        }
    })(),
    new GithubLatestReleaseCommand("bitcoin-keeper", "software-wallets", "bithyve", "bitcoin-keeper", ["android", "ios"]),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("bitcoin-keeper", "software-wallets", "bithyve", "keeper-desktop", ["linux", "macos", "windows"]);
        }
        sanitizeVersion(version) {
            return version.replace(/^Keeper Desktop /, '');
        }
    })(),
    new GithubLatestReleaseCommand("bitcoin-safe", "software-wallets", "andreasgriffin", "bitcoin-safe", ["linux", "macos", "windows"]),
    new GithubAllReleasesCommand("bluewallet", "software-wallets", "BlueWallet", "BlueWallet", ["android"], undefined, undefined, "apk"),
    new GithubAllReleasesCommand("bluewallet", "software-wallets", "BlueWallet", "BlueWallet", ["ios"], undefined, undefined, "ipa"),
    new GithubAllReleasesCommand("bluewallet", "software-wallets", "BlueWallet", "BlueWallet", ["macos"], undefined, undefined, "dmg"),
    new (class extends GithubAllReleasesCommand {
        constructor() {
            super("stack-wallet", "software-wallets", "cypherstack", "stack_wallet", ["android", "ios", "windows", "macos", "linux"], "Stack Wallet");
        }
        sanitizeVersion(version) {
            return version.replace(/^Stack Wallet /, '');
        }
    })(), 
    new ElectrumCommand(),
    new GithubLatestReleaseCommand("envoy", "software-wallets", "Foundation-Devices", "envoy", ["android", "ios"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_qt", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_android", ["android"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_ios", ["ios"]),
    new GithubLatestReleaseCommand("liana", "software-wallets", "wizardsardine", "liana", ["windows", "macos", "linux"]),
    new MyCitadelCommand("mycitadel-desktop", ["windows", "macos", "linux"]),
    new MyCitadelCommand("mycitadel-apple", ["ios"]),
    new MuunAndroidCommand(),
    new MuuniOSCommand(),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("nunchuk", "software-wallets", "nunchuk-io", "nunchuk-android", ["android"]);
        }
        sanitizeVersion(version) {
            return version.replace(/^android\./, '');
        }
    })(),
    new GithubLatestReleaseCommand("nunchuk", "software-wallets", "nunchuk-io", "nunchuk-desktop", ["windows", "macos", "linux"]),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("phoenix", "software-wallets", "ACINQ", "phoenix", ["android", "ios"]);
        }
        sanitizeVersion(version) {
            return version.replace(/^Android /, '')
                        .replace(/^Phoenix Android /, '')
                        .replace(/^Phoenix /, '')
                        .replace(/^Phoenix Android\/iOS /, '');
        }
    })(),
    new (class extends GithubTagCommand {
        constructor() {
            super("proton-wallet", "software-wallets", "ProtonWallet", "flutter-app", ["android"]);
        }
        sanitizeVersion(version) {
            return version.replace(/\+\d+$/, '');
        }
    })(),
    new GithubLatestReleaseCommand("simple-bitcoin-wallet", "software-wallets", "akumaigorodski", "wallet", ["android"]),
    new GithubLatestReleaseCommand("sparrow", "software-wallets", "sparrowwallet", "sparrow", ["windows", "macos", "linux"]),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("specter", "software-wallets", "cryptoadvance", "specter-desktop", ["windows", "macos", "linux", "umbrel-os"]);
        }
        sanitizeVersion(version) {
            return version.replace(/^Specter /, '');
        }
    })(),
    new GithubLatestReleaseCommand("specter", "software-wallets", "Start9Labs", "specter-startos", ["start-os"]),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("wasabi-wallet", "software-wallets", "zkSNACKs", "WalletWasabi", ["windows", "macos", "linux"]);
        }
        sanitizeVersion(version) {
            return version
            .replace(/^Wasabi v(\d+(\.\d+)+) - .*$/, '$1')
            .replace(/^Wasabi Wallet v(\d+(\.\d+)+) - .*$/, '$1')
            .replace(/^Wasabi Wallet v(\d+(\.\d+)+)*$/, '$1');
        }
    })(),    
    new GithubLatestReleaseCommand("zeus", "software-wallets", "ZeusLN", "zeus", ["android", "ios"]),

    // Bitcoin Nodes
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("bitcoin-core", "bitcoin-nodes", "bitcoin", "bitcoin");
        }
        sanitizeVersion(version) {
            return version.replace(/^Bitcoin Core /, '');
        }
    })(),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("bitcoin-knots", "bitcoin-nodes", "bitcoinknots", "bitcoin");
        }
        sanitizeVersion(version) {
            return version.replace(/^Bitcoin Knots /, '').replace(/knots/, '');
        }
    })(),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("minibolt", "bitcoin-nodes", "minibolt-guide", "minibolt");
        }
        sanitizeVersion(version) {
            return version.replace(/^MiniBolt /, '');
        }
    })(),
    new GitlagTagCommand("citadel", "bitcoin-nodes", "48888641"),
    new MyNodeCommand("mynode-community-edition"),
    new MyNodeCommand("mynode-model-one"),
    new MyNodeCommand("mynode-model-two"),
    new MyNodeCommand("mynode-premium"),
    new NodlCommand("nodl-one-mark-2", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-one/www/changelog.txt?ref_type=heads"),
    new NodlCommand("nodl-two", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-two/www/changelog.txt?ref_type=heads"),
    new ParmanodeCommand(),
    new GithubLatestReleaseCommand("raspiblitz", "bitcoin-nodes", "raspiblitz", "raspiblitz"),
    new (class extends GithubLatestReleaseCommand {
        constructor() {
            super("raspibolt", "bitcoin-nodes", "raspibolt", "raspibolt");
        }
        sanitizeVersion(version) {
            return version.replace(/^RaspiBolt /, '');
        }
    })(),
    new GithubLatestReleaseCommand("start9-diy", "bitcoin-nodes", "Start9Labs", "start-os"),
    new GithubLatestReleaseCommand("start9-server-one", "bitcoin-nodes", "Start9Labs", "start-os"),
    new GithubLatestReleaseCommand("start9-server-pure", "bitcoin-nodes", "Start9Labs", "start-os"),
    new UmbrelCommand("umbrel-diy"),
    new UmbrelCommand("umbrel-home")
];

twitter.setTwitterEnabled(process.argv[2] === 'true' ? true : false)
nostr.setNostrEnabled(process.argv[3] === 'true' ? true : false)

runCommandsSequentially(commands);
