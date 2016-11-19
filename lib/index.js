const fs = require('fs');
const moment = require('moment');
const request = require('request');

function getShifts(config, start, end, team) {
    return new Promise((resolve, reject) => {
        request.get(`https://api.victorops.com/api-reporting/v1/team/${team}/oncall/log?start=${start.format('YYYY-MM-DDTHH:mm:ss')}Z&end=${end.format('YYYY-MM-DDTHH:mm:ss')}`, {
            'headers': {
                'X-VO-Api-Id': config.voApiId,
                'X-VO-Api-Key': config.voApiKey
            }
        }, (error, response, body) => {
            if(error) {
                return reject(error);
            }

            if(response.statusCode !== 200) {
                reject(`Victorops API returned Status: ${response.statusCode}`);
            }
            resolve(JSON.parse(body));
        });
    });
}

function loadDataFromStub(config, start, end, team) {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../stub-data-${team}.json`, 'utf-8', (err, data) => {
            if(err) {
                return reject(err);
            }
            try {
                resolve(JSON.parse(data));
            }
            catch(err) {
                reject(err);
            }
        });
    });
}

function loadConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../config.json`, 'utf-8', (err, data) => {
            if(err) {
                reject(err);
            }
            try {
                resolve(JSON.parse(data));
            }
            catch(err) {
                reject(err);
            }
        });
    });
}

module.exports = function() {
    const ignore = ['itservicedesk'];

    const periodEnd = moment(`${moment().subtract(2, 'days').format("YYYY-MM-DDT08:00:00Z")}`);
    const periodStart = moment(periodEnd).subtract(1, 'days');

    const loadData = loadDataFromStub;

    console.log(`Loading data for: ${periodStart.format()} to ${periodEnd.format()}`);

    loadConfig()
        .then(config => loadData(config, periodStart, periodEnd, 'application-support'))
        .then(data => {
            const users = data.userLogs.reduce((users, user) => {
                if(ignore.includes(user.userId)) {
                    return users;
                }

                user.log.forEach(date => {
                    let start = moment(date.on);
                    let end = moment(date.off);

                    if(start.isBefore(periodStart)) {
                        start = moment(periodStart);
                    }

                    if(end.isAfter(periodEnd)) {
                        end = moment(periodEnd);
                    }

                    const shiftDay = start.format('YYYY-MM-DD');

                    if(users[user.userId]) {
                        users[user.userId].shifts.push({ start: start, end: end });
                        users[user.userId].timeOnCall += end.diff(start, 'minutes')
                    }
                    else {
                        users[user.userId] = { shifts: [{ start: start, end: end }], timeOnCall: end.diff(start, 'minutes') };
                    }
                });

                return users;
            }, {});

            console.log(JSON.stringify(users, null, 4));
        })
        .catch(err => console.log(`Could not load data: ${err}`));
};
