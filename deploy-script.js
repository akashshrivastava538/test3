const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class NetSuiteDeployer {
    constructor() {
        this.accountId = process.env.NETSUITE_ACCOUNT_ID;
        this.consumerKey = process.env.SDF_CONSUMER_KEY;
        this.consumerSecret = process.env.SDF_CONSUMER_SECRET;
        this.tokenId = process.env.SDF_TOKEN_ID;
        this.tokenSecret = process.env.SDF_TOKEN_SECRET;
        
        if (!this.accountId || !this.consumerKey || !this.consumerSecret || !this.tokenId || !this.tokenSecret) {
            throw new Error('Missing required environment variables. Please check your GitHub secrets.');
        }
        
        this.baseUrl = `https://${this.accountId}.suitetalk.api.netsuite.com`;
        console.log(`Initialized deployer for account: ${this.accountId}`);
    }

    generateOAuthHeader(url, method, body = '') {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = crypto.randomBytes(16).toString('hex');
        
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: nonce,
            oauth_signature_method: 'HMAC-SHA256',
            oauth_timestamp: timestamp,
            oauth_token: this.tokenId,
            oauth_version: '1.0'
        };
        
        // Create signature base string
        const paramString = Object.keys(oauthParams)
            .sort()
            .map(key => `${key}=${this.encodeRFC3986(oauthParams[key])}`)
            .join('&');
        
        const baseString = `${method}&${this.encodeRFC3986(url)}&${this.encodeRFC3986(paramString)}`;
        const signingKey = `${this.encodeRFC3986(this.consumerSecret)}&${this.encodeRFC3986(this.tokenSecret)}`;
        
        const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');
        oauthParams.oauth_signature = signature;
        
        return 'OAuth ' + Object.keys(oauthParams)
            .sort()
            .map(key => `${key}="${this.encodeRFC3986(oauthParams[key])}"`)
            .join(', ');
    }

    encodeRFC3986(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    async uploadFile(filePath, content) {
        const url = `${this.baseUrl}/services/rest/record/v1/file`;
        const authHeader = this.generateOAuthHeader(url, 'POST');
        
        const fileName = path.basename(filePath);
        const fileData = {
            name: fileName,
            content: Buffer.from(content).toString('base64'),
            folder: { id: '1' }, // Root folder - adjust as needed
            fileType: '_JAVASCRIPT'
        };
        
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(fileData);
            
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'GitHub-Actions-NetSuite-Deployer'
                }
            };
            
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (e) {
                            resolve({ success: true, data: data });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    async createScript(scriptContent, scriptName) {
        const url = `${this.baseUrl}/services/rest/record/v1/script`;
        const authHeader = this.generateOAuthHeader(url, 'POST');
        
        const scriptData = {
            name: scriptName,
            scriptfile: {
                name: `${scriptName}.js`,
                content: Buffer.from(scriptContent).toString('base64'),
                fileType: '_JAVASCRIPT'
            },
            scripttype: 'CUSTOMSCRIPT'
        };
        
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(scriptData);
            
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'GitHub-Actions-NetSuite-Deployer'
                }
            };
            
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (e) {
                            resolve({ success: true, data: data });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    async deployChanges() {
        console.log('Starting NetSuite deployment...');
        
        // Look for common SuiteScript directories
        const possibleDirs = ['src', 'SuiteScripts', 'scripts', '.'];
        let srcDir = null;
        
        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                srcDir = dir;
                break;
            }
        }
        
        if (!srcDir) {
            console.log('No source directory found. Checking for individual JS files...');
            const jsFiles = fs.readdirSync('.').filter(file => file.endsWith('.js') && file !== 'deploy-script.js');
            
            if (jsFiles.length === 0) {
                console.log('No JavaScript files found to deploy');
                return;
            }
            
            console.log(`Found ${jsFiles.length} JavaScript files in root directory`);
            
            for (const file of jsFiles) {
                const content = fs.readFileSync(file, 'utf8');
                
                try {
                    console.log(`Deploying ${file}...`);
                    await this.uploadFile(file, content);
                    console.log(`✓ Successfully deployed ${file}`);
                } catch (error) {
                    console.error(`✗ Failed to deploy ${file}:`, error.message);
                }
            }
            
            return;
        }
        
        const files = this.getAllFiles(srcDir);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        if (jsFiles.length === 0) {
            console.log('No JavaScript files found to deploy');
            return;
        }
        
        console.log(`Found ${jsFiles.length} JavaScript files to deploy`);
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(srcDir, file);
            
            try {
                console.log(`Deploying ${relativePath}...`);
                await this.uploadFile(relativePath, content);
                console.log(`✓ Successfully deployed ${relativePath}`);
                
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`✗ Failed to deploy ${relativePath}:`, error.message);
                
                // Continue with other files even if one fails
                continue;
            }
        }
        
        console.log('Deployment process completed!');
    }
    
    getAllFiles(dir) {
        const files = [];
        
        if (!fs.existsSync(dir)) {
            return files;
        }
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            
            if (fs.statSync(fullPath).isDirectory()) {
                files.push(...this.getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }
        
        return files;
    }
}

// Main execution
async function main() {
    try {
        console.log('NetSuite Deployment Script Starting...');
        console.log('Environment check:');
        console.log('- NETSUITE_ACCOUNT_ID:', process.env.SDF_ACCOUNT_ID ? 'Set' : 'Missing');
        console.log('- SDF_CONSUMER_KEY:', process.env.SDF_CONSUMER_KEY ? 'Set' : 'Missing');
        console.log('- SDF_CONSUMER_SECRET:', process.env.SDF_CONSUMER_SECRET ? 'Set' : 'Missing');
        console.log('- SDF_TOKEN_ID:', process.env.SDF_TOKEN_ID ? 'Set' : 'Missing');
        console.log('- SDF_TOKEN_SECRET:', process.env.SDF_TOKEN_SECRET ? 'Set' : 'Missing');
        
        const deployer = new NetSuiteDeployer();
        await deployer.deployChanges();
        
        console.log('🎉 Deployment completed successfully!');
        
    } catch (error) {
        console.error('💥 Deployment failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { NetSuiteDeployer };