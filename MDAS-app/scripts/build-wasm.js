const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building WASM module with Emscripten...\n');

// Determine which build script to use
const isWindows = process.platform === 'win32';
const buildScript = isWindows ? 'build-wasm.bat' : 'build-wasm.sh';

// Check if the build script exists
const scriptPath = path.join(__dirname, '..', buildScript);
if (!fs.existsSync(scriptPath)) {
    console.error(`ERROR: ${buildScript} not found!`);
    process.exit(1);
}

try {
    // Execute the build script
    execSync(isWindows ? buildScript : `bash ${buildScript}`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
    });
    
    console.log('\n✅ WASM build completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open your browser to view the radar display');
    
} catch (error) {
    console.error('\n❌ Build failed!');
    console.error('\nTo build the WASM module manually:');
    console.log('  Windows: npm run build:wasm:win');
    console.log('  Unix: npm run build:wasm:unix');
    console.log('\nOr create the WASM files manually and place them in the public/ directory.');
    process.exit(1);
}

