const config = require('./config');
const http = require('http');
const moment = require('moment');

function setDatesInIndex(date, indexTemplate) {
	const replacements = {
		'YYYY': /\$\{YYYY\}/,
		'MM': /\$\{MM\}/,
		'DD': /\$\{DD\}/
	};

	const dateToFormat = moment(date);

	return Object.keys(replacements)
		.reduce((indexTemplate, momentFormat) => indexTemplate.replace(replacements[momentFormat], dateToFormat.format(momentFormat)), indexTemplate);
}

function upsert(shift) {
	return config.get()
        .then(config => new Promise((resolve, reject) => {
    		const index = setDatesInIndex(moment(), config.elasticsearch.index || 'oncall-${YYYY}.${MM}');
    		const type = 'oncall_shift';
    		const documentId = ``;
			const host = config.elasticsearch.host;
			const port = config.elasticsearch.port || 9200;

    		console.log('Upserting elasticsearch shift record', { host: host, port: port, index: index, type: type, id: documentId, data: JSON.stringify(shift, null, 4) });

            return resolve();

    		const request =  http.request({
    			host: host,
    			port: port,
    			path: `/${index}/${type}/${documentId}/_update?retry_on_conflict=3`,
    			method: 'POST'
    		}, function(response) {
    			let allData = '';

    			response.on('data', function (chunk) {
    				allData += chunk;
    			});

    			response.on('end', function () {
    				console.log('Elasticsearch shift upsert complete', { esResponse: JSON.parse(JSON.stringify(allData, null, 4))});
    				resolve();
    			});
    		});

    		request.write(JSON.stringify({
    			"doc": shift,
    			"upsert" : shift
    		}));

    		request.on('error', e => reject(logger.logError('Could not upsert Elasticsearch shift record', { error: e, id: id, host: config.host, port: config.port })));

    		request.end();
    	}));
}

module.exports = {
    store: upsert
};
