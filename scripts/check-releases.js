const fs = require('fs');
const { exit } = require('process');
const request = require('sync-request')
const util = require('util');
const path = require('path');
const cheerio = require('cheerio');

eval(fs.readFileSync('./tweet.js', 'utf-8'));
eval(fs.readFileSync('./nostr.js', 'utf-8'));
eval(fs.readFileSync('./utils.js', 'utf-8'));

setTwitterEnabled(process.argv[2] === 'true' ? true : false)
setNostrEnabled(process.argv[3] === 'true' ? true : false)

const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
const longMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

class BaseCommand {

    constructor(itemId, itemType) {
        this.itemId = itemId;
        this.itemType = itemType;
    }

    execute() {
        console.log("Request url: " + this.getUrl());
        let release;
    
        try {
            const res = request('GET', this.getUrl(), { headers: this.getHeaders() });
            const data = res.getBody('utf8');
            release = this.parseRelease(data);
        } catch (err) {
            throw new Error(`${err.message}`);
        }
    
        if (release == null || release == undefined) {
            throw new Error(`Release not found`);
        }
        
        if (!this.ignoreVersion(release.version)) {

            console.log("Pre processed version: " + release.version)
            release.version = this.sanitizeVersion(release.version)
            // Check if the input starts with "v"
            if (!release.version.startsWith("v")) {
                // If it doesn't match the version pattern, add the "v" prefix
                release.version = "v" + release.version;
            }
            console.log("Post processed version: " + release.version)
    
            if (!isValidVersion(release.version, this.isPreReleaseSupported())) {
                throw new Error('Invalid version found: ' + release.version);
            }
    
            if (!isValidDate(release.date)) {
                throw new Error('Invalid release data found: ' + release.date);
            }
        } else {
            console.log("Ignoring version")
        }
    
        var platforms = ""
        if (this.getPlatforms() != undefined) {
            platforms = ` (${this.getPlatforms()})`
        }
        console.log(`✅ ${this.itemType} - ${this.itemId}${platforms}: ${release.version} (${release.date})`);
        return {
            itemId: this.itemId,
            itemType: this.itemType,
            platforms: this.getPlatforms(),
            version: release.version,
            date: release.date
        };
    }

    parseRelease(data) {
        throw new Error('doExecute method not implemented');
    }

    getUrl() {
        throw new Error('getUrl method not implemented');
    }

    getHeaders() {
        return {};
    }

    getPlatforms() {
        return undefined;
    }

    sanitizeVersion(version) {
        version = version.replace(/^Version /, '');
        version = version.replace(/^Firmware /, '');
        version = version.replace(/^Release /, '');
        version = version.replace(/^(v\d+(\.\d+)+):(.*)$/, '$1');
        version = version.replace(/^Android Release\s*/, '');
        version = version.replace(/^Release\s*/, '');
        version = version.replace(/^release_/, '');
        version = version.replace(/^v\./, '');

        // TODO Move this to each command
        if (this.itemType == "bitcoin-nodes") {
            // MiniBolt
            version = version.replace(/^MiniBolt /, '');
    
            // Bitcoin Core
            version = version.replace(/^Bitcoin Core /, '');
    
            // Bitcoin Knots
            version = version.replace(/^Bitcoin Knots /, '');
            version = version.replace(/knots/, '');
    
            // Umbrel
            version = version.replace(/^umbrelOS /, '');

            // Raspibolt
            version = version.replace(/^RaspiBolt /, '');
        } else if (this.itemType == "hardware-wallets") {

            // Bitbox
            version = version.replace(/ - Multi$/, '');
            version = version.replace(/ - Bitcoin-only$/, '');

            // OneKey
            version = version.replace(/^mini\//, '');
            version = version.replace(/^classic\//, '');
            version = version.replace(/^touch\//, '');

            // Passport
            version = version.replace(/^Passport Firmware /, '');
            version = version.replace(/^Passport /, '');
            version = version.replace(/ Firmware$/, '');

            // Portal
            version = version.replace(/^Firmware /, '');

            // ProKey
            version = version.replace(/^Prokey Firmware /, '');

            // Keepkey
            version = version.replace(/^Release /, '');

            // Krux
            version = version.replace(/^Version /, '');

            // Keystone
            version = version.replace(/-BTC$/, '');
            version = version.replace(/-btc$/, '');

            // Grid+ Lattice1
            version = version.replace(/^HSM-/, '');

            // Satochip
            const match = version.match(/^Satochip (v\d+(\.\d+)+)/)
            if (match) {
                version = match[1];
            }
        } else if (this.itemType == "software-wallets") {

            // Bitcoin Core
            version = version.replace(/^Bitcoin Core /, '');

            // Bitcoin Keeper
            version = version.replace(/^Keeper Desktop /, '');

            // My Cytadel: Version 1.5 (Blazing Venus)
            version = version.replace(/^Version (\d+(\.\d+)+) \(.*\)$/, '$1');

            // Zeuz: v0.8.5-hotfix
            version = version.replace(/-hotfix$/, '');

            // Proton Wallet: v1.0.0+58
            version = version.replace(/\+\d+$/, '');

            // Nunchuk: android.1.9.46
            version = version.replace(/^android./, '');

            // Phoenix
            if (this.itemId == "phoenix") {
                version = version.replace(/^Android /, '');
                version = version.replace(/^Phoenix Android /, '');
                version = version.replace(/^Phoenix /, '');
                version = version.replace(/^Phoenix Android\/iOS /, '');
            }

            // Specter
            version = version.replace(/^Specter /, '');

            // Stack Wallet
            version = version.replace(/^Stack Wallet /, '');

            // Wasabi v2.0.4 - Faster Than Fast Latest
            version = version.replace(/^Wasabi v(\d+(\.\d+)+) - .*$/, '$1');
            version = version.replace(/^Wasabi Wallet v(\d+(\.\d+)+) - .*$/, '$1');
            version = version.replace(/^Wasabi Wallet v(\d+(\.\d+)+)*$/, '$1');
        }

        // For example: "2023-09-08T2009-v5.1.4"
        if (!this.isPreReleaseSupported()) {
            version = version.replace(/.*-([^:]+)$/, '$1');
        }

        return version
    }

    isPreReleaseSupported() {
        return false
    }

    ignoreVersion(version) {

        // Ignore if it ends with "-pre1", "-pre2", etc.
        var pattern = /-pre\d+$/;
        if (pattern.test(version)) {
            return true
        }
    
        // Ignore if it contains "-alpha"
        if (!this.isPreReleaseSupported() && version.toLowerCase().includes("-alpha")) {
            return true
        }
    
        // Ignore if contains the word beta
        if (!this.isPreReleaseSupported() && version.toLowerCase().includes("beta")) {
            return true
        }
    
        // TODO Move out from here
        // Seedsigner
        if (this.itemId == "seedsigner" && version.endsWith("_EXP")) {
            return true
        }
    
        // Ignore if it ends with "-rc", "-rc1", "-rc2", etc.
        pattern = /-rc\d*$/;
        if (!this.isPreReleaseSupported() && pattern.test(version)) {
            return true
        }
    
        return false
    }
}

class GithubCommand extends BaseCommand {

    constructor(itemId, itemType, githubOwner, githubRepo) {
        super(itemId, itemType);
        this.githubOwner = githubOwner;
        this.githubRepo = githubRepo;
        this.baseUrl = `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}`
    }

    getHeaders() {
        return {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "User-Agent": 'MySyncScript/1.0'
        };
    }
}

class GithubLatestReleaseCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo, platforms = undefined) {
        super(itemId, itemType, githubOwner, githubRepo);
        this.platforms = platforms
    }

    parseRelease(data) {
        console.log("Using latest releases API")
        const json = JSON.parse(data)
        var date = getDate(json.published_at)
        var version = json.name.trim()
        console.log("Release name: " + version)
        if (version === undefined || version === "") {
            version = json.tag_name.trim()
            console.log("Tag name: " + version)
        }
        return { version: version, date: date};
    }


    getUrl() {
        return `${this.baseUrl}/releases/latest`;
    }

    getPlatforms() {
        return this.platforms;
    }
}

class GithubAllReleasesCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo, allReleasesInclude, allReleasesExclude, assetsMatch) {
        super(itemId, itemType, githubOwner, githubRepo);
        this.allReleasesInclude = allReleasesInclude
        this.allReleasesExclude = allReleasesExclude
        this.assetsMatch = assetsMatch
    }

    parseRelease(data) {
        console.log("Using releases API")
        var version
        var date
        data.forEach((release) => {
            if (version === undefined) {
                var match = false
                if (this.allReleasesInclude != undefined) {
                    match = release.name.toLowerCase().includes(this.allReleasesInclude.toLowerCase())
                } else if (this.allReleasesExclude != undefined) {
                    match = !release.name.toLowerCase().includes(this.allReleasesExclude.toLowerCase())
                } else if (this.assetsMatch != undefined) {
                    release.assets.forEach((asset) => {
                        if (asset.name.endsWith(assetsMatch)) {
                            match = true
                        }
                    });
                } else {
                    console.error('Not defined any allReleasesInclude or allReleasesExclude or assetsMatch');
                    exit(1);
                }
                if (match) {
                    body = release.body
                    date = getDate(release.published_at)
                    //assets = release.assets
                    version = release.name.trim()
                    console.log("Release name: " + version)
                    if (version === undefined || version === "") {
                        version = release.tag_name
                        console.log("Tag name: " + version)
                    }
                }
            }
        });
        return { version: version, date: date};
    }

    getUrl() {
        return `${this.baseUrl}/releases`;
    }
}

class GithubTagCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo) {
        super(itemId, itemType, githubOwner, githubRepo);
    }

    parseRelease(data) {
        var version
        for (const tag of JSON.parse(data)) {
            if (version == undefined && !tag.name.trim().includes("$(MARKETING_VERSION)")) {
                version = tag.name.trim()
            }
        }

        console.log("Tag name: " + version)
        return { version: version, date: today()};
    }

    getUrl() {
        return `${this.baseUrl}/tags`;
    }
}

class GitlagTagCommand extends BaseCommand {

    constructor(itemId, itemType, gitlabProjectId) {
        super(itemId, itemType);
        this.gitlabProjectId = gitlabProjectId;
    }

    parseRelease(data) {
        var version
        for (const tag of data) {
            if (version == undefined && !tag.name.trim().includes("$(MARKETING_VERSION)")) {
                version = tag.name.trim()
            }
        }

        console.log("Tag name: " + version)
        return { version: version, date: today()};
    }

    getUrl() {
        return `https://gitlab.com/api/v4/projects/${this.gitlabProjectId}/repository/tags`;
    }

    getHeaders() {
        return {
            Authorization: `Bearer ${process.env.GITLAB_TOKEN}`
        };
    }
}

class ChangeLogCommand extends BaseCommand {

    constructor(itemId, itemType, changelogUrl) {
        super(itemId, itemType);
        this.changelogUrl = changelogUrl;
    }

    getUrl() {
        return this.changelogUrl ;
    }
}

class FirstLineChangeLogCommand extends ChangeLogCommand {

    constructor(itemId, itemType, changelogUrl) {
        super(itemId, itemType, changelogUrl);
    }

    parseRelease(data) {
        var version
        var date
        const lines = data.split('\n');
        const regex = this.getRegex();
        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                console.log("Matched line: " + line)
                version = match[1];
                date = this.formatDate(match[2]);
                break;
            }
        }
        return { version: version, date: date };
    }

    getRegex() {
        throw new Error('getRegex method not implemented');
    }

    formatDate(date) {
        throw new Error('formatDate method not implemented');
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

class BitkeyCommand extends BaseCommand {

    constructor() {
        super("bitkey", "hardware-wallets");
        this.url = "https://bitkey.world/en-US/releases";
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

    getUrl() {
        return this.url ;
    }
}

const commands = [

    // Hardware Wallets
    new BitkeyCommand(),
    new ColdcardMk4Command(),
    new ColdcardQCommand(),
    new CoolWalletProCommand(),
    new GithubLatestReleaseCommand("cypherock-x1", "hardware-wallets", "Cypherock", "x1_wallet_firmware"),
    new GithubLatestReleaseCommand("frostnap", "hardware-wallets", "frostsnap", "frostsnap"),
    new GithubLatestReleaseCommand("keepkey", "hardware-wallets", "keepkey", "keepkey-firmware"),
    new GithubLatestReleaseCommand("krux", "hardware-wallets", "selfcustody", "krux"),
    new GithubLatestReleaseCommand("passport-batch-2", "hardware-wallets", "Foundation-Devices", "passport2"),
    new GithubLatestReleaseCommand("portal", "hardware-wallets", "TwentyTwoHW", "portal-software"),
    new GithubLatestReleaseCommand("prokey-optimum", "hardware-wallets", "prokey-io", "prokey-optimum-firmware"),
    new GithubLatestReleaseCommand("satochip", "hardware-wallets", "Toporin", "SatochipApplet"),
    new GithubLatestReleaseCommand("satochip-diy", "hardware-wallets", "Toporin", "SatochipApplet"),
    new GithubLatestReleaseCommand("specter-diy", "hardware-wallets", "cryptoadvance", "specter-diy"),
    new GithubTagCommand("seedsigner", "hardware-wallets", "SeedSigner", "seedsigner"),
    new TrezorModelOneCommand(),
    new TrezorModelTSafeCommand("trezor-model-t", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2T1.md"),
    new TrezorModelTSafeCommand("trezor-safe-3", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2B1.md"),
    new TrezorModelTSafeCommand("trezor-safe-3-btconly", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T2B1.md"),
    new TrezorModelTSafeCommand("trezor-safe-5", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T3T1.md"),
    new TrezorModelTSafeCommand("trezor-safe-5-btconly", "https://raw.githubusercontent.com/trezor/trezor-firmware/refs/heads/main/core/CHANGELOG.T3T1.md"),

    // Software Wallets
    new GithubLatestReleaseCommand("aqua", "software-wallets", "AquaWallet", "aqua-wallet", ["android", "ios"]),
    new GithubLatestReleaseCommand("bitcoin-core", "software-wallets", "bitcoin", "bitcoin", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("bitcoin-keeper", "software-wallets", "bithyve", "bitcoin-keeper", ["android", "ios"]),
    new GithubLatestReleaseCommand("bitcoin-keeper", "software-wallets", "bithyve", "keeper-desktop", ["linux", "macos", "windows"]),
    new GithubLatestReleaseCommand("bitcoin-safe", "software-wallets", "andreasgriffin", "bitcoin-safe", ["linux", "macos", "windows"]),
    new ElectrumCommand(),
    new GithubLatestReleaseCommand("envoy", "software-wallets", "Foundation-Devices", "envoy", ["android", "ios"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_qt", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_android", ["android"]),
    new GithubLatestReleaseCommand("green", "software-wallets", "Blockstream", "green_ios", ["ios"]),
    new GithubLatestReleaseCommand("liana", "software-wallets", "wizardsardine", "liana", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("my-citadel", "software-wallets", "mycitadel", "mycitadel-desktop", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("my-citadel", "software-wallets", "mycitadel", "mycitadel-apple", ["ios"]),
    new MuunAndroidCommand(),
    new GithubLatestReleaseCommand("nunchuk", "software-wallets", "nunchuk-io", "nunchuk-android", ["android"]),
    new GithubLatestReleaseCommand("nunchuk", "software-wallets", "nunchuk-io", "nunchuk-desktop", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("phoenix", "software-wallets", "ACINQ", "phoenix", ["android", "ios"]),
    new GithubLatestReleaseCommand("simple-bitcoin-wallet", "software-wallets", "akumaigorodski", "wallet", ["android"]),
    new GithubLatestReleaseCommand("sparrow", "software-wallets", "sparrowwallet", "sparrow", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("specter", "software-wallets", "cryptoadvance", "specter-desktop", ["windows", "macos", "linux", "umbrel-os"]),
    new GithubLatestReleaseCommand("specter", "software-wallets", "Start9Labs", "specter-startos", ["start-os"]),
    new GithubLatestReleaseCommand("wasabi-wallet", "software-wallets", "zkSNACKs", "WalletWasabi", ["windows", "macos", "linux"]),
    new GithubLatestReleaseCommand("zeus", "software-wallets", "ZeusLN", "zeus", ["android", "ios"]),
    
    // Bitcoin Nodes
    new GithubLatestReleaseCommand("bitcoin-core", "bitcoin-nodes", "bitcoin", "bitcoin"),
    new GithubLatestReleaseCommand("bitcoin-knots", "bitcoin-nodes", "bitcoinknots", "bitcoin"),
    new GithubLatestReleaseCommand("minibolt", "bitcoin-nodes", "minibolt-guide", "minibolt"),
    new MyNodeCommand("mynode-community-edition"),
    new MyNodeCommand("mynode-model-one"),
    new MyNodeCommand("mynode-model-two"),
    new MyNodeCommand("mynode-premium"),
    new NodlCommand("nodl-one-mark-2", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-one/www/changelog.txt?ref_type=heads"),
    new NodlCommand("nodl-two", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-two/www/changelog.txt?ref_type=heads"),
    new ParmanodeCommand(),
    new GithubLatestReleaseCommand("raspiblitz", "bitcoin-nodes", "raspiblitz", "raspiblitz"),
    new GithubLatestReleaseCommand("raspibolt", "bitcoin-nodes", "raspibolt", "raspibolt"),
    new GithubLatestReleaseCommand("start9-diy", "bitcoin-nodes", "Start9Labs", "start-os"),
    new GithubLatestReleaseCommand("start9-server-one", "bitcoin-nodes", "Start9Labs", "start-os"),
    new GithubLatestReleaseCommand("start9-server-pure", "bitcoin-nodes", "Start9Labs", "start-os")

];

async function runCommandsSequentially(commands) {
    let hadErrors = false;
    for (const command of commands) {
        try {
            const result = command.execute()
            checkRelease(result.itemType, result.itemId, result.platforms, result.version, result.date);
        } catch (error) {
            var platforms = ""
            if (command.platforms != undefined) {
                platforms = ` (${command.platforms})`
            }
            console.log(`❌ ${command.itemType} - ${command.itemId}${platforms}: ${error.message}`);
            hadErrors = true;
        }

        await sleep(5000);
    };

    if (hadErrors) {
        console.error('❌ One or more items failed. Exiting with error.');
    } else {
        console.log("✅ Finished successfully");
    }
}

runCommandsSequentially(commands);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkRelease(itemType, itemId, platforms, latestVersion, latestReleaseDate) {

    console.log('---------------------');
    console.log(`Item Id: ${itemId}`);

    // Define the path to your JSON file.
    const filePath = `../item-types/${itemType}/items/${itemId}.json`;

    // Read the JSON file.
    const item = readJSONFile(filePath)
    var releaseVersion
    var releaseDate
    if (itemType == "software-wallets") {

        // TODO For Bluewallet, some versions are not for all the platforms. Inspect the assets to see which platform to update
        platforms.forEach(platform => {
            console.log(platform + ":")
            var currentVersion = item[`${platform}-support`][`${platform}-latest-version`].value
            var currentReleaseDate = item[`${platform}-support`][`${platform}-latest-release-date`].value
            console.log("- Current version found: " + currentVersion + " (" + currentReleaseDate + ")")
            console.log("- Latest version found: " + latestVersion + " (" + latestReleaseDate + ")")

            if (latestVersion !== currentVersion) {
                releaseVersion = latestVersion
                releaseDate = latestReleaseDate
            }
        });
    } else {
        var currentVersion = item["firmware"]["latest-version"].value
        var currentReleaseDate = item["firmware"]["latest-release-date"].value
        console.log("- Current version found: " + currentVersion + " (" + currentReleaseDate + ")")
        console.log("- Latest version found: " + latestVersion + " (" + latestReleaseDate + ")")

        
        if (latestVersion !== currentVersion) {
            releaseVersion = latestVersion
            releaseDate = latestReleaseDate
        }
    }

    if (releaseVersion != undefined) {
        updateRelease(itemType, itemId, platforms, releaseVersion, releaseDate)
    } else {
        console.log("New release not found")
    }
    console.log('---------------------');

}

function updateRelease(itemType, itemId, platforms, releaseVersion, releaseDate) {
    if (releaseVersion == undefined) {
        console.error('Missing releaseVersion');
        hadErrors = true
        return
    }

    if (releaseDate == undefined) {
        console.error('Missing releaseDate');
        hadErrors = true
        return
    }
       
    const filePath = `../item-types/${itemType}/items/${itemId}.json`;
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            exit(1);
        }
    
        try {
            const item = JSON.parse(data);
            var modifyJson = false
            var currentVersion
            var currentReleaseDate
            var changelogUrl

            if (itemType == "software-wallets") {
                // TODO For Bluewallet, some versions are not for all the platforms. Inspect the assets to see which platform to update

                platforms.forEach(platform => {
                    currentVersion = item[`${platform}-support`][`${platform}-latest-version`].value
                    currentReleaseDate = item[`${platform}-support`][`${platform}-latest-release-date`].value
                    if (releaseVersion !== currentVersion) {
                        item[`${platform}-support`][`${platform}-latest-version`].value = releaseVersion
                        item[`${platform}-support`][`${platform}-latest-release-date`].value= releaseDate
                        modifyJson = true

                        if (item[`${platform}-support`][`${platform}-release-notes`]["links"] && 
                            item[`${platform}-support`][`${platform}-release-notes`]["links"].length > 0) {                            
                                changelogUrl = item[`${platform}-support`][`${platform}-release-notes`]["links"][0]["url"];
                                console.log(`Changelog url (${platform}): ` + changelogUrl);
                        }
                    }
                });
            } else {
                currentVersion = item["firmware"]["latest-version"].value
                currentReleaseDate = item["firmware"]["latest-release-date"].value
                if (releaseVersion !== currentVersion) {
                    item["firmware"]["latest-version"].value = releaseVersion
                    item["firmware"]["latest-release-date"].value = releaseDate
                    modifyJson = true

                    if (item[`firmware`][`release-notes`]["links"] && item[`firmware`][`release-notes`]["links"].length > 0) {
                        changelogUrl = item[`firmware`][`release-notes`]["links"][0]["url"]
                        console.log("Changelog url: " + changelogUrl);
                    }
                }
            }
    
            if (modifyJson) {
                console.log("Updating JSON")
    
                // Convert the modified object back to a JSON string.
                const updatedJsonString = JSON.stringify(item, null, 2);
    
                // Write the updated JSON string back to the file.
                fs.writeFile(filePath, updatedJsonString, (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing JSON file:', writeErr);
                        exit(1);
                    } else {
                        console.log('JSON file updated successfully.');
                    }
                });
    
                var newRelease
                if (platforms != undefined) {
                    platforms.forEach(platform => {
                        newRelease = updateReleasesFile(itemType, itemId, releaseDate, releaseVersion, changelogUrl, platform);
                    });
                } else {
                    newRelease = updateReleasesFile(itemType, itemId, releaseDate, releaseVersion, changelogUrl, "");
                }

                if (newRelease) {
                    const inputDate = new Date(releaseVersion);
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    if (inputDate > oneWeekAgo) {
                        postNewRelease(itemType, itemId, item.name, releaseVersion, changelogUrl, item.company, platforms)
                    } else {
                        console.log("Post ignored, release date more than one week old.")
                    }
                }
            } else {
                console.error('Error updating JSON. Both versions are the same');
                exit(1);
            }
    
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            exit(1);
        }
    });
}

function getShortMonthByIndex(index) {
    return shortMonths[index]
}

function getShortMonth(date) {
    return shortMonths[date.getMonth()]
}

function getLongMonthIndex(month) {
    return longMonths.indexOf(month)
}

function isValidVersion(str, preReleaseSupported) {
    const base = '^v\\d+(\\.\\d+)*';
    const preRelease = '(?:-(alpha|beta|rc)(\\.\\d+)?)?';
    const regex = new RegExp(preReleaseSupported ? `${base}${preRelease}$` : `${base}$`);
    return regex.test(str);
}

function isValidDate(str) {
    const regex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [1-9]|[1-2][0-9]|3[01], \d{4}$/;
    return regex.test(str);
}

function updateReleasesFile(itemType, itemId, date, version, changelogUrl, platform) {
    const fileName = `releases.md`;
    const filePath = path.join(__dirname, "..", fileName);

    let content = "";
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
    }

    const typeHeader = `## ${itemType}`;
    const idHeader = `### ${itemId}`;
    const versionString = platform !== "" ? `${version} (${platform})` : version;
    const newEntry = `- ${date} - ${versionString} - ${changelogUrl}`;

    if (content.includes(newEntry)) {
        return false
    }

    // If the type doesn't exist, add the full structure
    if (!content.includes(typeHeader)) {
        content += `\n${typeHeader}\n${idHeader}\n${newEntry}\n`;
    } else {
        // Type exists, check if the ID exists within that type
        const typeSectionRegex = new RegExp(`(${typeHeader}[\\s\\S]*?)(?=\\n## |$)`, 'g');
        content = content.replace(typeSectionRegex, (typeSection) => {
            if (typeSection.includes(idHeader)) {
                // ID exists, append the new entry if it's not already present
                const idSectionRegex = new RegExp(`(${idHeader}\\n)([\\s\\S]*?)(?=\\n### |\\n## |$)`);
                return typeSection.replace(idSectionRegex, (match, header, entries) => {
                    if (!entries.includes(newEntry)) {
                        return `${header}${entries.trim()}\n${newEntry}\n`;
                    }
                    return match;
                });
            } else {
                // ID does not exist, add it to the type section
                return `${typeSection.trim()}\n${idHeader}\n${newEntry}\n`;
            }
        });
    }

    fs.writeFileSync(filePath, content.trim() + "\n", 'utf8');
    console.log(`Updated ${fileName} with new entry.`);
    return true
}

function postNewRelease(itemType, itemId, itemName, version, changelogUrl, brandId, platforms) {
    console.log("-------------------")
    console.log("Release to post")
    console.log("Item Type: " + itemType)
    console.log("Item Id: " + itemId)
    console.log("Item Name: " + itemName)
    console.log("Version: " + version)
    console.log("Changelog Url: " + changelogUrl)
    console.log("Platforms: " + platforms)

    if (itemName == undefined) {
        console.error("itemName is undefined")
        exit(1)
    }

    if (version == undefined) {
        console.error("version is undefined")
        exit(1)
    }

    appendTextToTweet(`${itemName}`)
    appendTextToNostr(`${itemName}`)
    if (platforms) {
        appendTextToTweet(` (${platforms})`)
        appendTextToNostr(` (${platforms})`)
    }

    appendTextToTweet(` ${version} released`)
    appendTextToNostr(` ${version} released`)

    var brand = readJSONFile(`../brands/${brandId}.json`)
    if (brand?.twitter?.value) {
        appendTextToTweet(` by ${brand.twitter.value}`)
    }
    if (brand?.nostr?.url) {
        appendTextToNostr(` by #[0]`)
        appendNostrPublicKeyTag(brand?.nostr?.url.split('/').pop())
    }

    if (changelogUrl) {
        appendTextToTweet(`\n\nRelease notes: ${changelogUrl}`)
        appendTextToNostr(`\n\nRelease notes: ${changelogUrl}`)
    }

    var tbhPromo
    if (itemType == "software-wallets") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Software Wallets. https://thebitcoinhole.com/software-wallets"
    } else if (itemType == "hardware-wallets") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Hardware Wallets. https://thebitcoinhole.com/hardware-wallets"
    } else if (itemType == "bitcoin-nodes") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Nodes. https://thebitcoinhole.com/bitcoin-nodes"
    }
    appendTextToTweet(tbhPromo)
    appendTextToNostr(tbhPromo)

    postTweet();
    
    // This is added to wait for a fail on Twitter posting
    sleep(2000);

    postNostr();
    console.log("-------------------")
}

function getDate(publishedAt) {
    if (publishedAt != "") {
        return new Date(publishedAt).toLocaleDateString(undefined, dateOptions);
    } else {
        return today()
    }
}

function today() {
    return new Date().toLocaleDateString(undefined, dateOptions);
}

// Input format: March 14, 2024
function formatMonthDDYYYY(inputDate) {
    // Split the input date string into parts
    const parts = inputDate.match(/^(\w+)\s(\d{1,2}),\s(\d{4})$/);

    if (parts && parts.length === 4) {
        const year = parseInt(parts[3]);
        const monthIndex = getLongMonthIndex(parts[1]);
        const day = parseInt(parts[2]);

        // Create a JavaScript Date object
        const date = new Date(year, monthIndex, day);

        // Format the date in the desired output format (e.g., "Dec 22, 2023")
        return `${getShortMonth(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    // Return the original input if parsing fails
    return inputDate;
}

// Input format: 15th March 2023
function formatDDMonthYYYY(inputDate) {
    // Split the input date string into parts
    const parts = inputDate.match(/^(\d{1,2})(st|nd|rd|th)\s(\w+)\s(\d{4})$/);

    if (parts && parts.length === 5) {
        const day = parseInt(parts[1]);
        const monthIndex = getLongMonthIndex(parts[3]);
        const year = parseInt(parts[4]);

        // Create a JavaScript Date object
        const date = new Date(year, monthIndex, day);

        // Format the date in the desired output format (e.g., "Dec 22, 2023")
        return `${getShortMonth(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    // Return the original input if parsing fails
    return inputDate;
}

// Input format: 2023-12-22
function formatYYYYMMDD(inputDate) {
    // Split the input date string into parts
    const parts = inputDate.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (parts && parts.length === 4) {
        const year = parseInt(parts[1]);
        const monthIndex = parseInt(parts[2]) - 1; // JavaScript Date months are 0-based
        const day = parseInt(parts[3]);

        // Create a JavaScript Date object
        const date = new Date(year, monthIndex, day);

        // Format the date in the desired output format (e.g., "Dec 22, 2023")
        return `${getShortMonth(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    // Return the original input if parsing fails
    return inputDate;
}
