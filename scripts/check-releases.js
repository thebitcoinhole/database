const fs = require('fs');
const { exit } = require('process');
const axios = require('axios');
const util = require('util');
const path = require('path');
const cheerio = require('cheerio');
const { platform } = require('os');

eval(fs.readFileSync('./tweet.js', 'utf-8'));
eval(fs.readFileSync('./nostr.js', 'utf-8'));
eval(fs.readFileSync('./utils.js', 'utf-8'));

setTwitterEnabled(process.argv[2] === 'true' ? true : false)
setNostrEnabled(process.argv[3] === 'true' ? true : false)

const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

// const sleep = util.promisify(setTimeout);

// async function processReleases() {
//     const dirs = fs.readdirSync("../item-types/", { withFileTypes: true })
//         .filter(dirent => dirent.isDirectory());

//     for (const dirent of dirs) {
//         const itemType = dirent.name;
//         const path = `../item-types/${itemType}/json/check-releases.json`;

//         try {
//             if (fs.existsSync(path)) {
//                 const data = fs.readFileSync(path, 'utf8');
//                 const json = JSON.parse(data);

//                 for (const key of Object.keys(json)) {
//                     await fetchRelease(itemType, json[key]);
//                     await sleep(1000);
//                 }
//             }
//         } catch (err) {
//             console.error(`Error reading or parsing ${path}:`, err);
//             process.exit(1);
//         }
//     }
// }

class BaseCommand {

    constructor(itemId, itemType) {
        this.itemId = itemId;
        this.itemType = itemType;
    }

    async execute() {
        console.log("Request url: " + this.getUrl())
        var release 
        try {
            const response = await axios.get(this.getUrl(), { headers: this.getHeaders() });
            release = this.parseRelease(response.data);
        } catch (err) {
          throw new Error(`${err.message}`);
        }
    
        if (release == null || release == undefined) {
          throw new Error(`Release not found`);
        }

        release.version = this.sanitizeVersion(release.version)

        if (!this.ignoreVersion(release.version)) {
            // TODO

            if (!isValidVersion(release.version, this.isPreReleaseSupported())) {
                throw new Error('Invalid version found: ' + release.version);
            }
    
            if (!isValidDate(release.date)) {
                throw new Error('Invalid release data found: ' + release.date);
            }


        } else {
            console.log("Ignoring version")
        }
    
        console.log(`✅ ${this.itemId}: ${release.version} (${release.date})`);
        return { itemId: this.itemId, itemType: this.itemType, platforms: this.getPlatforms(), version: release.version, date: release.date };
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

        // Check if the input starts with "v"
        if (!version.startsWith("v")) {
            // If it doesn't match the version pattern, add the "v" prefix
            version = "v" + version;
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
}

class GithubLatestReleaseCommand extends GithubCommand {

    constructor(itemId, itemType, githubOwner, githubRepo) {
        super(itemId, itemType, githubOwner, githubRepo);
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

    getHeaders() {
        return {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        };
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

class SeedSigner extends GithubTagCommand {

    constructor(itemId, itemType, githubOwner, githubRepo) {
        super(itemId, itemType, githubOwner, githubRepo);
    }
}

(async () => {

  const commands = [
    new BitkeyCommand(),
    new GithubTagCommand("seedsigner", "hardware-wallets", "SeedSigner", "seedsigner"),
    new ParmanodeCommand(),
    new MyNodeCommand("mynode-community-edition"),
    new MyNodeCommand("mynode-model-one"),
    new MyNodeCommand("mynode-model-two"),
    new MyNodeCommand("mynode-premium"),
    new NodlCommand("nodl-one-mark-2", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-one/www/changelog.txt?ref_type=heads"),
    new NodlCommand("nodl-two", "https://gitlab.lightning-solutions.eu/nodl-private/nodl-admin-private/-/raw/nodl-two/www/changelog.txt?ref_type=heads")
  ];

  // Map commands into wrapped tasks with error context
  const allTasks = commands.map(cmd =>
    cmd.execute().then(result => ({ result, cmd })).catch(err => {
      err.itemId = cmd.itemId;
      return { error: err, cmd };
    })
  );

  const results = await Promise.allSettled(allTasks);

  let hadErrors = false;

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const { result: value, cmd, error } = result.value;

      if (error) {
        console.log(`❌ ${cmd.itemId} error: ${error.message}`);
        hadErrors = true;
        return;
      }

       const { itemId, itemType, platforms, version, date } = value;
       checkRelease(itemType, itemId, platforms, version, date);
    } else {
      console.log(`⚠️ Unexpected rejection: ${result.reason?.message || result.reason}`);
      hadErrors = true;
    }
  });

  if (hadErrors) {
    console.error('❌ One or more items failed. Exiting with error.');
  } else {
    process.stdout.write("✅ Finished successfully\n");
    process.stdout.write('', () => process.exit(0));
  }

})();

function fetchRelease(itemType, json) {

    const enabled = json["enabled"]
    const itemId = json["item-id"]
    const changelogUrl = json["changelog-url"]
    const githubOwner = json["github-org"]
    const githubRepo = json["github-repo"]
    const gitlabProjectId = json["gitlab-project-id"]
    const tag = json.tag
    const latestRelease = json["latest-release"]
    const allReleases = json["all-releases"]
    const allReleasesInclude = json["all-releases-include"]
    const allReleasesExclude = json["all-releases-exclude"]
    const assetsMatch = json["assets-match"]
    const preReleaseSupported = itemId == "frostnap"

    // if (enabled == false) {
    //     console.warn(`⚠️ ${itemId} disabled`)
    //     return
    // }
    
    const githubApiKey = process.env.GITHUB_TOKEN
    const gitlabApiKey = process.env.GITLAB_TOKEN
    
    var headers = {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${githubApiKey}`,
      };
    var apiUrl 
    if (tag == true) {
        if (gitlabProjectId != undefined) {
            headers = {
                Authorization: `Bearer ${gitlabApiKey}`
              };
            apiUrl = `https://gitlab.com/api/v4/projects/${gitlabProjectId}/repository/tags`;
        } else {
            apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/tags`;
        }
    } else if (latestRelease == true) {
        apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/latest`;
    } else if (allReleases == true) {
        apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases`;
    } else if (changelogUrl != undefined) {
        apiUrl = changelogUrl
        headers = {}
    } else {
        console.error(`${itemId} - Not defined api url to use`);
        exit(1);
    }
    
    console.log('---------------------');
    console.log(`Item Id: ${itemId}`);
    console.log("Request url: " + apiUrl)
    axios
      .get(apiUrl, { headers })
      .then((response) => {

        var latestVersion
        var latestReleaseDate
        // var assetFileNames = [];
    
        // var assets = []
        var body = ""

        if (itemId == "bitkey") {
            const $ = cheerio.load(response.data);
            let found = false;

            $('.border-t.py-6').each((_, element) => {
                if (found) return;

                const date = $(element).find('.text-primary50').first().text().trim();
                const versionText = $(element).find('.font-semibold').first().text().trim();
                const type = $(element).find('.text-primary50').first().next().text().trim();

                if (type.toLowerCase().includes('firmware')) {
                    latestVersion = versionText
                    latestReleaseDate = date
                    found = true
                }
            });
        } else if (latestRelease == true) {
            console.log("Using latest releases API")
            body = response.data.body
    
            latestReleaseDate = getDate(response.data.published_at)
            //assets = response.data.assets
            latestVersion = response.data.name.trim()
            console.log("Release name: " + latestVersion)
            if (latestVersion === undefined || latestVersion === "") {
                latestVersion = response.data.tag_name.trim()
                console.log("Tag name: " + latestVersion)
            }
        } else if (allReleases == true) {
            console.log("Using releases API")
            response.data.forEach((release) => {
                if (latestVersion === undefined) {
                    var match = false
                    if (allReleasesInclude != undefined) {
                        match = release.name.toLowerCase().includes(allReleasesInclude.toLowerCase())
                    } else if (allReleasesExclude != undefined) {
                        match = !release.name.toLowerCase().includes(allReleasesExclude.toLowerCase())
                    } else if (assetsMatch != undefined) {
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
                        latestReleaseDate = getDate(release.published_at)
                        //assets = release.assets
                        latestVersion = release.name.trim()
                        console.log("Release name: " + latestVersion)
                        if (latestVersion === undefined || latestVersion === "") {
                            latestVersion = release.tag_name
                            console.log("Tag name: " + latestVersion)
                        }
                    }
                }
            });
        } else if (tag == true) {
            console.log("Using tags API")
            const tags = response.data;
            latestTag = tags[0];

            for (const tag of tags) {
                if (latestVersion == undefined && !tag.name.trim().includes("$(MARKETING_VERSION)")) {
                    latestVersion = tag.name.trim()
                }
            }

            console.log("Tag name: " + latestVersion)
            latestReleaseDate = today()
        } else if (changelogUrl != undefined) {
            var body = response.data
            // Split the content into lines
            const lines = body.split('\n');
    
            if (itemId == "parmanode") {
                // const regex = /^Version ([\d.]+)/;
                // for (const line of lines) {
                //     // Skip empty lines and lines starting with #
                //     if (line.trim() === "" || line.trim().startsWith("#")) {
                //         continue;
                //     }
                
                //     const match = line.match(regex);
                //     if (match) {
                //         latestVersion = match[1];
                //         latestReleaseDate = today();
                //         break; // Stop after finding the first valid version line
                //     }
                // }
            } else if (itemId.startsWith("mynode-")) {
                // === v0.3.25 ===
                // - Released 1/11/24

                // for (let i = 0; i < lines.length; i++) {
                //     const line = lines[i].trim();
                
                //     if (line.startsWith("===")) {
                //         const versionRegex = /^=== v([\d.]+) ===/;
                //         const versionMatch = line.match(versionRegex);
                
                //         if (versionMatch) {
                //             latestVersion = versionMatch[1];
                
                //             // Check if the next line exists
                //             const nextLine = lines[i + 1]?.trim();
                //             const dateRegex = /^- Released ([\d.]+)\/([\d.]+)\/([\d.]+)/;
                //             const dateMatch = nextLine.match(dateRegex);
                
                //             if (dateMatch) {
                //                 latestReleaseDate = `${getShortMonthByIndex(parseInt(dateMatch[1]) - 1)} ${dateMatch[2]}, ${2000 + parseInt(dateMatch[3])}`;
                //             }
                //         }
                
                //         break; // Only need the first match
                //     }
                // }
            } else if (itemId.startsWith("nodl-")) {
                // const line = lines[0]
                // const regex = /^([\d.]+) -/;
                // const match = line.match(regex);
                // if (match) {
                //     latestVersion = match[1];
                //     latestReleaseDate = today();
                // }
            } else if (itemId == "coolwallet-pro") {
                // Coolwallet Pro. Example: ## [332] - 2023-08-10
                const regex = /^## \[([\d]+)\] - (\d{4}-\d{2}-\d{2})/;
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        latestVersion = match[1];
                        latestReleaseDate = formatYYYYMMDD(match[2]);
                        break;
                    }
                }
            } else if (itemId == "coldcard-mk4") {
                // Coldcard Mk4. Example: ## 5.2.2 - 2023-12-21
                const regex = /^## ([\d.]+) - (\d{4}-\d{2}-\d{2})/;
                var onSection = false
                for (const line of lines) {
                    if (onSection == true) {
                        const match = line.match(regex);
                        if (match) {
                            latestVersion = match[1];
                            latestReleaseDate = formatYYYYMMDD(match[2]);
                            break;
                        }
                    } else if (line == "# Mk4 Specific Changes") {
                        onSection = true
                    }
                }
            } else if (itemId == "coldcard-q") {
                // Coldcard Q. Example: ## 0.0.6Q - 2024-02-22
                const regex = /^## ([\d.]+)Q - (\d{4}-\d{2}-\d{2})/;
                var onSection = false
                for (const line of lines) {
                    if (onSection == true) {
                        const match = line.match(regex);
                        if (match) {
                            latestVersion = match[1];
                            latestReleaseDate = formatYYYYMMDD(match[2]);
                            break;
                        }
                    } else if (line == "# Q Specific Changes") {
                        onSection = true
                    }
                }
            } else if (itemId == "trezor-model-t" || itemId.startsWith("trezor-safe")) {
                // Example: ## [2.7.0] (20th March 2024) or ## [2.8.5] (internal release)
                const regex = /^## \[([\d.]+)\] \((\d{1,2}(?:st|nd|rd|th) \w+ \d{4}|internal release)\)/;
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        latestVersion = match[1];
                        latestReleaseDate = formatDDMonthYYYY(match[2]);
                        if (match[2] === "internal release") {
                            latestReleaseDate = today()
                        } else {
                            latestReleaseDate = formatDDMonthYYYY(match[2]);
                        }
                        break;
                    }
                }
            } else if (itemId == "trezor-model-one") {
                // Example: ## 1.12.1 [15th March 2023]
                const regex = /^## ([\d.]+) \[(\d{1,2}\w\w \w+ \d{4})\]/;
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        console.log("Matched line: " + line)
                        latestVersion = match[1];
                        latestReleaseDate = formatDDMonthYYYY(match[2]);
                        break;
                    }
                }
            } else if (itemId == "muun") {
                // ## [51.5] - 2023-12-22
                const regex = /^## \[([\d.]+)\] - (\d{4}-\d{2}-\d{2})/;
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        console.log("Matched line: " + line)
                        latestVersion = match[1];
                        latestReleaseDate = formatYYYYMMDD(match[2]);
                        break;
                    }
                }
            } else if (itemId == "electrum") {
                // # Release 4.4.6 (August 18, 2023) (security update)
                // Find the first line starting with "#"
                const regex = /^# Release ([\d.]+) \(([^)]+)\)/;
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        console.log("Matched line: " + line)
                        latestVersion = match[1];
                        latestReleaseDate = formatMonthDDYYYY(match[2]);
                        break;
                    }
                }
            } else {
                console.error("Date parser not found")
                exit(1);
            }
            
            if (latestVersion == undefined) {
                console.error("latestVersion not found")
                hadErrors = true
                return
            }
    
            if (latestReleaseDate == undefined) {
                console.error("latestReleaseDate not found")
                hadErrors = true
                return
            }
        }
    
        if (!hadErrors && !ignoreVersion(itemId, latestVersion, preReleaseSupported)) {

            console.log("Pre processed latestVersion: " + latestVersion)
            if (itemType == "bitcoin-nodes") {
                // MiniBolt
                latestVersion = latestVersion.replace(/^MiniBolt /, '');
        
                // Bitcoin Core
                latestVersion = latestVersion.replace(/^Bitcoin Core /, '');
        
                // Bitcoin Knots
                latestVersion = latestVersion.replace(/^Bitcoin Knots /, '');
                latestVersion = latestVersion.replace(/knots/, '');
        
                // Umbrel
                latestVersion = latestVersion.replace(/^umbrelOS /, '');

                // Raspibolt
                latestVersion = latestVersion.replace(/^RaspiBolt /, '');
            } else if (itemType == "hardware-wallets") {
    
                // Bitbox
                latestVersion = latestVersion.replace(/ - Multi$/, '');
                latestVersion = latestVersion.replace(/ - Bitcoin-only$/, '');
    
                // OneKey
                latestVersion = latestVersion.replace(/^mini\//, '');
                latestVersion = latestVersion.replace(/^classic\//, '');
                latestVersion = latestVersion.replace(/^touch\//, '');
    
                // Passport
                latestVersion = latestVersion.replace(/^Passport Firmware /, '');
                latestVersion = latestVersion.replace(/^Passport /, '');
                latestVersion = latestVersion.replace(/ Firmware$/, '');
    
                // Portal
                latestVersion = latestVersion.replace(/^Firmware /, '');

                // ProKey
                latestVersion = latestVersion.replace(/^Prokey Firmware /, '');
    
                // Keepkey
                latestVersion = latestVersion.replace(/^Release /, '');
    
                // Krux
                latestVersion = latestVersion.replace(/^Version /, '');
    
                // Keystone
                latestVersion = latestVersion.replace(/-BTC$/, '');
                latestVersion = latestVersion.replace(/-btc$/, '');
    
                // Grid+ Lattice1
                latestVersion = latestVersion.replace(/^HSM-/, '');
    
                // Satochip
                const match = latestVersion.match(/^Satochip (v\d+(\.\d+)+)/)
                if (match) {
                    latestVersion = match[1];
                }
            } else if (itemType == "software-wallets") {

                // Bitcoin Core
                latestVersion = latestVersion.replace(/^Bitcoin Core /, '');

                // Bitcoin Keeper
                latestVersion = latestVersion.replace(/^Keeper Desktop /, '');
    
                // My Cytadel: Version 1.5 (Blazing Venus)
                latestVersion = latestVersion.replace(/^Version (\d+(\.\d+)+) \(.*\)$/, '$1');
    
                // Zeuz: v0.8.5-hotfix
                latestVersion = latestVersion.replace(/-hotfix$/, '');
    
                // Proton Wallet: v1.0.0+58
                latestVersion = latestVersion.replace(/\+\d+$/, '');
    
                // Nunchuk: android.1.9.46
                latestVersion = latestVersion.replace(/^android./, '');
    
                // Phoenix
                if (itemId == "phoenix") {
                    latestVersion = latestVersion.replace(/^Android /, '');
                    latestVersion = latestVersion.replace(/^Phoenix Android /, '');
                    latestVersion = latestVersion.replace(/^Phoenix /, '');
                    latestVersion = latestVersion.replace(/^Phoenix Android\/iOS /, '');
                }
    
                // Specter
                latestVersion = latestVersion.replace(/^Specter /, '');
    
                // Stack Wallet
                latestVersion = latestVersion.replace(/^Stack Wallet /, '');
    
                // Wasabi v2.0.4 - Faster Than Fast Latest
                latestVersion = latestVersion.replace(/^Wasabi v(\d+(\.\d+)+) - .*$/, '$1');
                latestVersion = latestVersion.replace(/^Wasabi Wallet v(\d+(\.\d+)+) - .*$/, '$1');
                latestVersion = latestVersion.replace(/^Wasabi Wallet v(\d+(\.\d+)+)*$/, '$1');

                // 2.7.14-1035
                if (itemId == "muun") {
                    latestVersion = latestVersion.split("-")[0]
                }
            }

            // For example: "2023-09-08T2009-v5.1.4"
            if (!preReleaseSupported) {
                latestVersion = latestVersion.replace(/.*-([^:]+)$/, '$1');
            }
    
            latestVersion = latestVersion.replace(/^(v\d+(\.\d+)+):(.*)$/, '$1');
            latestVersion = latestVersion.replace(/^Android Release\s*/, '');
            latestVersion = latestVersion.replace(/^Release\s*/, '');
            latestVersion = latestVersion.replace(/^release_/, '');

            latestVersion = latestVersion.replace(/^v\./, '');
    
            // Check if the input starts with "v"
            if (!latestVersion.startsWith("v")) {
                // If it doesn't match the version pattern, add the "v" prefix
                latestVersion = "v" + latestVersion;
            }

            console.log("Post processed latestVersion: " + latestVersion)
    
            if (!isValidVersion(latestVersion, preReleaseSupported)) {
                console.error('Invalid version found: ' + latestVersion);
                hadErrors = true
                return
            }
    
            if (!isValidDate(latestReleaseDate)) {
                console.error('Invalid release data found: ' + latestReleaseDate);
                hadErrors = true
                return
            }
    
            // Iterate through release assets and collect their file names
            // assets.forEach((asset) => {
            //     assetFileNames.push(asset.name);
            // });
            //console.log('Release Notes:\n', body);
            //console.log('Asset File Names:', assetFileNames.join());
            checkRelease(itemType, itemId, json.platforms, latestVersion, latestReleaseDate);
        } else {
            console.log("Ignoring version")
        }
      })
      .catch((error) => {
        console.error(`Error fetching release information from ${apiUrl}:`, error.message);
        hadErrors = true
      });
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

const longMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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

function ignoreVersion(itemId, latestVersion, preReleaseSupported) {

    // Ignore if it ends with "-pre1", "-pre2", etc.
    var pattern = /-pre\d+$/;
    if (pattern.test(latestVersion)) {
        return true
    }

    // Ignore if it contains "-alpha"
    if (!preReleaseSupported && latestVersion.toLowerCase().includes("-alpha")) {
        return true
    }

    // Ignore if contains the word beta
    if (!preReleaseSupported && latestVersion.toLowerCase().includes("beta")) {
        return true
    }

    // Seedsigner
    if (itemId == "seedsigner" && latestVersion.endsWith("_EXP")) {
        return true
    }

    // Ignore if it ends with "-rc", "-rc1", "-rc2", etc.
    pattern = /-rc\d*$/;
    if (!preReleaseSupported && pattern.test(latestVersion)) {
        return true
    }

    return false
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
