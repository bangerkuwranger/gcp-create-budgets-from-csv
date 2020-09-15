'use strict';

const util = require('util');
const Str = require('@supercharge/strings');

// GCP Budget API client
const {BudgetServiceClient} = require('@google-cloud/billing-budgets');
// CSV Parser
const Papa = require('papaparse');
// classes to format body of req using GCP API format
const LocalClasses = require('./src/classes');

// Default thresholds (consider supplying your own... these are a lot!)
const getDefaultThresholds = function() {
	return [
		{
			"percent": 50,
			"useForecasted": false
		},
		{
			"percent": 90,
			"useForecasted": false
		},
		{
			"percent": 100,
			"useForecasted": false
		},
		{
			"percent": 105,
			"useForecasted": false
		},
		{
			"percent": 110,
			"useForecasted": false
		},
		{
			"percent": 125,
			"useForecasted": false
		},
		{
			"percent": 150,
			"useForecasted": false
		},
		{
			"percent": 200,
			"useForecasted": false
		},
		{
			"percent": 50,
			"useForecasted": true
		},
		{
			"percent": 90,
			"useForecasted": true
		},
		{
			"percent": 100,
			"useForecasted": true
		},
		{
			"percent": 105,
			"useForecasted": true
		},
		{
			"percent": 110,
			"useForecasted": true
		},
		{
			"percent": 125,
			"useForecasted": true
		},
		{
			"percent": 150,
			"useForecasted": true
		},
		{
			"percent": 200,
			"useForecasted": true
		},
	];
};

// Parser settings
const getDefaultParserSettings = function() {
	return {
		delimiter: "",	// auto-detect
		newline: "",	// auto-detect
		quoteChar: '"',
		escapeChar: '"',
		header: true,
		transformHeader: undefined,
		dynamicTyping: false,
		preview: 0,
		encoding: "",
		worker: false,
		comments: false,
		step: undefined,
		complete: undefined,
		error: undefined,
		download: false,
		downloadRequestHeaders: undefined,
		downloadRequestBody: undefined,
		skipEmptyLines: false,
		chunk: undefined,
		chunkSize: undefined,
		fastMode: undefined,
		beforeFirstChunk: undefined,
		withCredentials: undefined,
		transform: undefined,
		delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP]
	};
};

// Test budget and scope JSON
const getTestBudgetJSON = function() {
	return '[{"display_name": "your_project_123456","scope_type": "project","scope_id": "your_project_123456","budget_amt": "1000.00","thresholds_filepath": "","pubSubTopic": "projects/your_project_123456/topics/your_topic_97654","notification_channel_1": "budget_alerts@yourorg.com","notification_channel_2": "15555555555","notification_channel_3": "","notification_channel_4": "","notification_channel_5": ""}]';
};

function makeSingleScopeBudget(inputData) {
	if ('object' !== typeof inputData || null === inputData) {
		throw new TypeError('Invalid inputData arg passed to makeSingleScopeBudget');
	}
	else if ('string' !== typeof inputData.scope_type || '' === inputData.scope_type || ('label' !== inputData.scope_type && ('string' !== typeof inputData.scope_id || '' === inputData.scope_id)) || ('label' === inputData.scope_type && ('string' !== typeof inputData.scope_key || '' === inputData.scope_key || 'string' !== typeof inputData.scope_value || '' === inputData.scope_value))) {
		throw new TypeError('Invalid scope definition in inputData passed to makeSingleScopeBudget');
	}
	var resultObj, name, amount, scopes, thresholds, notificationChannels, opts, useOpts = false;
	var isLabel = 'label' === inputData.scope_type;
	if ('string' !== typeof inputData.display_name || '' === inputData.display_name) {
		name = isLabel ?
			'label_' + inputData.scope_key + '_' + inputData.scope_value + '_budget' + Str.random(8) :
			inputData.scope_type + '_' + inputData.scope_id + '_budget' + Str.random(8);
	}
	else {
		name = inputData.display_name;
	}
	if ('string' !== typeof inputData.budget_amt || '' === inputData.budget_amt || Number.isNaN(parseFloat(inputData.budget_amt))) {
		amount = null;
	}
	else {
		amount = inputData.budget_amt;
	}
	scopes = [];
	if (isLabel) {
		scopes[0] = {
			type: 'label',
			key: inputData.scope_key,
			value: inputData.scope_value
		};
	}
	else {
		scopes[0] = {
			type: inputData.scope_type,
			id: inputData.scope_id
		}
	}
	if ('object' !== typeof inputData.thresholds || !(Array.isArray(inputData.thresholds)) || inputData.thresholds.length < 1) {
		thresholds = getDefaultThresholds();
	}
	else {
		thresholds = inputData.thresholds;
	}
	notificationChannels = [];
	if ('string' === typeof inputData.notification_channel_1 && '' !== inputData.notification_channel_1) {
		notificationChannels.push(inputData.notification_channel_1);
	}
	if ('string' === typeof inputData.notification_channel_2 && '' !== inputData.notification_channel_2) {
		notificationChannels.push(inputData.notification_channel_2);
	}
	if ('string' === typeof inputData.notification_channel_3 && '' !== inputData.notification_channel_3) {
		notificationChannels.push(inputData.notification_channel_3);
	}
	if ('string' === typeof inputData.notification_channel_4 && '' !== inputData.notification_channel_4) {
		notificationChannels.push(inputData.notification_channel_4);
	}
	if ('string' === typeof inputData.notification_channel_5 && '' !== inputData.notification_channel_5) {
		notificationChannels.push(inputData.notification_channel_5);
	}
	if ('string' === typeof inputData.pubSubTopic && '' !== inputData.pubSubTopic) {
		useOpts = true;
		opts = {
			pubSub: inputData.pubSubTopic
		};
	}
	resultObj = {
		args: {
			name,
			amount,
			scopes,
			thresholds,
			notificationChannels,
			opts: useOpts ? opts : null
		}
	};
	resultObj.result = new LocalClasses.Budget(resultObj.args.name, resultObj.args.amount, resultObj.args.scope, resultObj.args.thresholds, resultObj.args.notificationChannels, resultObj.args.opts);
	return resultObj;
}

function parseCSVTest(csvStr) {
	return Papa.parse(csvStr, getDefaultParserSettings());
}

function budgetClassTest(budgetStr, thresholdStr) {
	if ('string' !== typeof budgetStr || '' === budgetStr) {
		budgetStr = getTestBudgetJSON();
	}
	if ('string' !== typeof thresholdStr || '' === thresholdStr) {
		thresholdStr = JSON.stringify(getDefaultThresholds());
	} 
	var budgetObj, inputBudget, inputThresholds;
	try {
		inputBudget = JSON.parse(budgetStr);
		inputThresholds = JSON.parse(thresholdStr);
	}
	catch(e) {
		throw e;
	}
	if (Array.isArray(inputBudget)) {
		budgetObj = [];
		for (let i = 0; i < inputBudget.length; i++) {
			budgetObj.push(makeSingleScopeBudget(inputBudget[i]));
			if ((i + 1) >= inputBudget.length) {
				return util.inspect(budgetObj, {showHidden: false, depth: null});
			}
		}
	}
	else {
		budgetObj = makeSingleScopeBudget(inputBudget);
		return util.inspect(budgetObj, {showHidden: false, depth: null});
	}
}

module.exports = {
	parseCSVTest,
	budgetClassTest
}