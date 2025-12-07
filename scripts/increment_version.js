import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const versionParts = packageJson.version.split('.');

    // Increment patch version
    versionParts[2] = parseInt(versionParts[2]) + 1;
    const newVersion = versionParts.join('.');

    packageJson.version = newVersion;

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Version updated to ${newVersion}`);

    // Stage the updated package.json so it's included in the commit
    execSync(`git add "${packageJsonPath}"`);

} catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
}
