const moment = require('moment');
const fs = require('fs');

function loadDataFromStub() {
    return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../stub-data.json`, 'utf-8', (err, data) => {
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

    loadDataFromStub()
        .then(data => {
            const dates = data.userLogs.reduce((dates, user) => {
                if(ignore.includes(user.userId)) {
                    return dates;
                }

                user.log.forEach(date => {
                    const start = moment(date.on);
                    const end = moment(date.off);
                    const shiftDay = start.format('YYYY-MM-DD');

                    if(!dates[shiftDay]) {
                        dates[shiftDay] = {};
                    }

                    if(dates[shiftDay][user.userId]) {
                        dates[shiftDay][user.userId].shifts.push({ start: start, end: end });
                        dates[shiftDay][user.userId].timeOnCall += end.diff(start, 'minutes')
                    }
                    else {
                        dates[shiftDay][user.userId] = { shifts: [{ start: start, end: end }], timeOnCall: end.diff(start, 'minutes') };
                    }
                });

                return dates;
            }, {});

            console.log(JSON.stringify(dates, null, 4));
        })
        .catch(err => console.log(`Could not load data: ${err}`));
};
