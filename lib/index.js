const fs = require('fs');
const moment = require('moment');
const request = require('request');
const program = require('commander');
const config = require('./config');
const elasticsearch = require('./elasticsearch');

function getShifts(start, end, team) {
    return config.get()
        .then(config => new Promise((resolve, reject) => {
            const queryStart = `${moment(start).format('YYYY-MM-DDTHH:mm:ss')}Z`;
            const queryEnd = `${moment(end).format('YYYY-MM-DDTHH:mm:ss')}Z`;

            console.log(`Querying VictorOps API for: ${queryStart} to ${queryEnd}`);

            request.get(`https://api.victorops.com/api-reporting/v1/team/${team}/oncall/log?start=${queryStart}&end=${queryEnd}`, {
                'headers': {
                    'X-VO-Api-Id': config.victorops.apiId,
                    'X-VO-Api-Key': config.victorops.apiKey
                }
            }, (error, response, body) => {
                if(error) {
                    return reject(error);
                }

                if(response.statusCode !== 200) {
                    return reject(`Victorops API returned Status: ${response.statusCode}`);
                }
                resolve(JSON.parse(body));
            });
    }));
}

function loadDataFromStub(start, end, team) {
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



module.exports = function() {
    const ignore = ['itservicedesk'];

    const relevantArgs = process.argv.slice(2);
    if(!relevantArgs.length) {
        console.log('No team specified.');
        process.exit(1);
    }

    const team = relevantArgs[0];

    program
        .version('0.0.1')
        .option('-s, --start [date]', 'Period Start Date')
        .parse(process.argv);

    const specificDate = moment(program.start);

    const periodEnd = moment(`${moment(specificDate).add(1, 'days').format("YYYY-MM-DDT08:00:00Z")}`);
    const periodStart = moment(`${moment(specificDate).format("YYYY-MM-DDT08:00:00Z")}`);

    const loadData = getShifts;

    console.log(`Loading data for: ${periodStart.format()} to ${periodEnd.format()}`);

    config.load()
        .then(() => loadData(periodStart, periodEnd, team))
        .then(data => new Promise(resolve => {
            const users = data.userLogs.reduce((users, user) => {
                if(ignore.includes(user.userId)) {
                    return users;
                }

                user.log.forEach(date => {
                    let start = moment(date.on);
                    let end;

                    if(!date.off && moment().isAfter(periodEnd)) {
                        end = moment(periodEnd);
                    }
                    else {
                        end = moment(date.off);
                    }

                    if(start.isSameOrBefore(periodStart) && end.isSameOrBefore(periodStart)) {
                        return;
                    }

                    if(start.isBefore(periodStart)) {
                        start = moment(periodStart);
                    }

                    if(end.isAfter(periodEnd)) {
                        end = moment(periodEnd);
                    }

                    const shiftDay = start.format('YYYY-MM-DD');
                    const timeOnCall = end.diff(start, 'minutes');

                    if(users[user.userId]) {
                        users[user.userId].shifts.push({ start: start, end: end });
                        users[user.userId].timeOnCall += timeOnCall
                    }
                    else {
                        users[user.userId] = { date: periodStart.startOf('day'), shifts: [{ start: start, end: end }], timeOnCall: timeOnCall };
                    }
                });

                return users;
            }, {});

            const totalTimeOnCall = Object.keys(users).reduce((totalTimeOnCall, userId) => totalTimeOnCall += users[userId].timeOnCall, 0);

            resolve(Object.keys(users).map(userId => {
                const percentageCovered = parseFloat(((users[userId].timeOnCall / totalTimeOnCall) * 100).toFixed(2));
                let pay = 'unpaid';

                if(percentageCovered > 40 && percentageCovered < 60) {
                    pay = 'unknown';
                }
                else if(percentageCovered > 60) {
                    pay = 'paid';
                }

                return {
                    user: userId,
                    team: team,
                    date: users[userId].date.format('YYYY-MM-DD'),
                    shifts: users[userId].shifts.map(shift => `${shift.start.format('HH:mm')}-${shift.end.format('HH:mm')}`).join(', '),
                    timeOnCall: users[userId].timeOnCall,
                    percentageCovered: percentageCovered,
                    pay: pay
                };
            }));
        }))
        .then(elasticsearch.store)
        .catch(err => console.log(`Could not load data: ${err}`));
};
