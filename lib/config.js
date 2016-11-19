const fs = require('fs');

let config;

function loadConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../config.json`, 'utf-8', (err, data) => {
            if(err) {
                reject(err);
            }
            try {
                resolve(config = JSON.parse(data));
            }
            catch(err) {
                reject(err);
            }
        });
    });
}

module.exports = {
    get: () => new Promise(resolve => {
        if(config) {
            return resolve(config);
        }

        return loadConfig();
    }),
    load: () => loadConfig()
};
