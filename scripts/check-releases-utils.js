const fs = require('fs');
const { exit } = require('process');
const axios = require('axios');
const util = require('util');
const path = require('path');
const cheerio = require('cheerio');

const twitter = require('./tweet');
const nostr = require('./nostr');
const utils = require('./utils');

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

    async execute() {
        console.log("Request url: " + this.getUrl());
        let release;
    
        try {
            const data = await this.fetchWithRetry(this.getUrl(), this.getHeaders());
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

    async fetchWithRetry(url, headers, retries = 3, delayMs = 3000) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await axios.get(url, { headers });
                return res.data;
            } catch (err) {
                if (err.response?.status === 429 && i < retries - 1) {
                    console.warn(`429 received. Retrying in ${delayMs}ms...`);
                    await sleep(delayMs);
                } else {
                    throw err;
                }
            }
        }
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
        version = version.replace(/-hotfix$/, '');

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

    constructor(itemId, itemType, githubOwner, githubRepo, platforms = undefined) {
        super(itemId, itemType);
        this.githubOwner = githubOwner;
        this.githubRepo = githubRepo;
        this.platforms = platforms
        this.baseUrl = `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}`
    }

    getHeaders() {
        return {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "User-Agent": 'MySyncScript/1.0'
        };
    }

    getPlatforms() {
        return this.platforms;
    }
}

class GithubLatestReleaseCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo, platforms = undefined) {
        super(itemId, itemType, githubOwner, githubRepo, platforms);
    }

    parseRelease(data) {
        console.log("Using latest releases API")
        var date = getDate(data.published_at)
        var version = data.name.trim()
        console.log("Release name: " + version)
        if (version === undefined || version === "") {
            version = data.tag_name.trim()
            console.log("Tag name: " + version)
        }
        return { version: version, date: date};
    }


    getUrl() {
        return `${this.baseUrl}/releases/latest`;
    }
}

class GithubAllReleasesCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo, platforms = undefined, allReleasesInclude = undefined, allReleasesExclude = undefined, assetsMatch = undefined) {
        super(itemId, itemType, githubOwner, githubRepo, platforms);
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
                        if (asset.name.endsWith(this.assetsMatch)) {
                            match = true
                        }
                    });
                } else {
                    console.error('Not defined any allReleasesInclude or allReleasesExclude or assetsMatch');
                    exit(1);
                }
                if (match) {
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

    constructor(itemId, itemType, githubOwner, githubRepo, platforms = undefined) {
        super(itemId, itemType, githubOwner, githubRepo, platforms);
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
        return `${this.baseUrl}/tags`;
    }

}

class GitlagTagCommand extends BaseCommand {

    constructor(itemId, itemType, gitlabProjectId, platforms = undefined) {
        super(itemId, itemType);
        this.gitlabProjectId = gitlabProjectId;
        this.platforms = platforms;
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

    getPlatforms() {
        return this.platforms;
    }
}

class ChangeLogCommand extends BaseCommand {

    constructor(itemId, itemType, changelogUrl) {
        super(itemId, itemType);
        this.changelogUrl = changelogUrl;
    }

    getUrl() {
        return this.changelogUrl;
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

async function runCommandsSequentially(commands) {
    let hadErrors = false;
    for (const command of commands) {
        try {
            const result = await command.execute();
            checkRelease(result.itemType, result.itemId, result.platforms, result.version, result.date);
        } catch (error) {
            var platforms = ""
            if (command.platforms != undefined) {
                platforms = ` (${command.platforms})`
            }
            console.log(`❌ ${command.itemType} - ${command.itemId}${platforms}: ${error.message}`);
            hadErrors = true;
        }
    };

    if (hadErrors) {
        console.error('❌ One or more items failed. Exiting with error.');
    } else {
        console.log("✅ Finished successfully");
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkRelease(itemType, itemId, platforms, latestVersion, latestReleaseDate) {

    console.log('---------------------');
    console.log(`Item Id: ${itemId}`);

    // Define the path to your JSON file.
    const filePath = `../item-types/${itemType}/items/${itemId}.json`;

    // Read the JSON file.
    const item = utils.readJSONFile(filePath)
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

    twitter.appendTextToTweet(`${itemName}`)
    nostr.appendTextToNostr(`${itemName}`)
    if (platforms) {
        twitter.appendTextToTweet(` (${platforms})`)
        nostr.appendTextToNostr(` (${platforms})`)
    }

    twitter.appendTextToTweet(` ${version} released`)
    nostr.appendTextToNostr(` ${version} released`)

    var brand = utils.readJSONFile(`../brands/${brandId}.json`)
    if (brand?.twitter?.value) {
        twitter.appendTextToTweet(` by ${brand.twitter.value}`)
    }
    if (brand?.nostr?.url) {
        nostr.appendTextToNostr(` by #[0]`)
        nostr.appendNostrPublicKeyTag(brand?.nostr?.url.split('/').pop())
    }

    if (changelogUrl) {
        twitter.appendTextToTweet(`\n\nRelease notes: ${changelogUrl}`)
        nostr.appendTextToNostr(`\n\nRelease notes: ${changelogUrl}`)
    }

    var tbhPromo
    if (itemType == "software-wallets") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Software Wallets. https://thebitcoinhole.com/software-wallets"
    } else if (itemType == "hardware-wallets") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Hardware Wallets. https://thebitcoinhole.com/hardware-wallets"
    } else if (itemType == "bitcoin-nodes") {
        tbhPromo = "\n\nDiscover and compare the Best Bitcoin Nodes. https://thebitcoinhole.com/bitcoin-nodes"
    }
    twitter.appendTextToTweet(tbhPromo)
    nostr.appendTextToNostr(tbhPromo)

    twitter.postTweet();
    
    // This is added to wait for a fail on Twitter posting
    sleep(2000);

    nostr.postNostr();
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

module.exports = {
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
  };