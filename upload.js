const fs = require('fs');
const https = require('https');

let zipPath = 'project.zip';
if (!fs.existsSync(zipPath)) {
    if (fs.existsSync('public/project.zip')) zipPath = 'public/project.zip';
    else if (fs.existsSync('static/project.zip')) zipPath = 'static/project.zip';
    else if (fs.existsSync('dist/project.zip')) zipPath = 'dist/project.zip';
    else {
        console.error('Error: project.zip not found.');
        process.exit(1);
    }
}

const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
const fileData = fs.readFileSync(zipPath);

let payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`),
    fileData,
    Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const req = https.request('https://www.file.io', {
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('\n------------------------------------');
                console.log('SUCCESS! COPY THE LINK BELOW TO DOWNLOAD:');
                console.log(json.link);
                console.log('------------------------------------\n');
            } else { console.log('Upload failed:', json); }
        } catch(e) { console.log('Raw response:', data); }
    });
});

req.on('error', console.error);
req.write(payload);
req.end();
