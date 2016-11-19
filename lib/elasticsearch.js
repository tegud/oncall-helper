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

function createDocumentFromShift(shift) {
	return Object.keys(shift).reduce((document, property) => {
		if(property === 'date') {
			document['@timestamp'] = `${shift[property]}T00:00:00Z`;
			return document;
		}

		document[property] = shift[property];

		return document;
	}, {});
}

function upsert(shifts) {
	return config.get()
        .then(config => new Promise((resolve, reject) => {
    		const type = 'oncall_shift';
			const host = config.elasticsearch.host;
			const port = config.elasticsearch.port || 9200;
			const data = shifts.reduce((data, shift) => {
				const index = setDatesInIndex(moment(), config.elasticsearch.index || 'oncall-${YYYY}.${MM}');
				const documentId = `${shift.team}_${shift.user}_${shift.date}`;

				return [
					...data,
					{ "update" : {"_id" : documentId, "_type" : type, "_index" : index, "_retry_on_conflict" : 3} },
					{ "doc" : createDocumentFromShift(shift), "doc_as_upsert" : true }
				];
			}, []).map(row => JSON.stringify(row)).join('\n');

    		console.log('Upserting elasticsearch shift record', { host: host, port: port });

    		const request =  http.request({
    			host: host,
    			port: port,
    			path: `/_bulk`,
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

    		request.write(`${data}\n`);

    		request.on('error', e => reject(logger.logError('Could not upsert Elasticsearch shift record', { error: e, id: id, host: config.host, port: config.port })));

    		request.end();
    	}));
}

module.exports = {
    store: upsert
};
