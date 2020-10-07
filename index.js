'use strict';

const util = require('util');
const fs = require('fs-extra');
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


function makeSingleScopeBudget(inputData, returnDebug) {
	if ('object' !== typeof inputData || null === inputData) {
		throw new TypeError('Invalid inputData arg passed to makeSingleScopeBudget');
	}
	else if ('string' !== typeof inputData.scope_type || '' === inputData.scope_type || ('label' !== inputData.scope_type && ('string' !== typeof inputData.scope_id || '' === inputData.scope_id)) || ('label' === inputData.scope_type && ('string' !== typeof inputData.scope_key || '' === inputData.scope_key || 'string' !== typeof inputData.scope_value || '' === inputData.scope_value))) {
		throw new TypeError('Invalid scope definition in inputData passed to makeSingleScopeBudget');
	}
	if ('boolean' !== typeof returnDebug) {
		returnDebug = false;
	}
	var resultObj, name, amount, scopes, thresholds, notificationChannels, opts, useOpts = false;
	var isLabel = 'label' === inputData.scope_type;
	if ('string' !== typeof inputData.display_name || '' === inputData.display_name) {
		name = isLabel ?
			'label_' + inputData.scope_key + '_' + inputData.scope_value + '_budget_' + Str.random(8) :
			inputData.scope_type + '_' + inputData.scope_id + '_budget_' + Str.random(8);
	}
	else {
		name = inputData.display_name + '_' + Str.random(8);
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
	if (returnDebug) {
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
		resultObj.result = new LocalClasses.Budget(resultObj.args.name, resultObj.args.amount, resultObj.args.scopes, resultObj.args.thresholds, resultObj.args.notificationChannels, resultObj.args.opts);
		return resultObj;
	}
	else {
		return new LocalClasses.Budget(name, amount, scopes, thresholds, notificationChannels, useOpts ? opts : null);
	}
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

// create client and call listBudgets, return error, result to callback function
function getBudgetList(parentId, callback) {
	var reqObj = {};
	const budget = new BudgetServiceClient();
	if ('function' !== typeof callback) {
		return callback(new TypeError('Invalid callback passed to getBudgetList'));
	}
	else {
		if ('string' === typeof parentId && '' !== parentId) {
			reqObj.parent = parentId;
		}
		return budget.listBudgets(reqObj, callback);
	}
}

function createSingleBudget(budgetObj, parentId) {
	const budget = new BudgetServiceClient();
	// returns a PROMISE!
	return budget.createBudget({parent: parentId, budget: budgetObj});
}

function createBudgetsFromArray(arrayOfBudgetObjs, parentId) {
	//returns Promise resolved with array of results or rejected with error
	return Promise.all(arrayOfBudgetObjs.map(budgetObj => createSingleBudget(budgetObj, parentId)));
}

//throws an error if arg is not a valid array of budget object args
function assertBudgetInputArrayIsValid(biArr) {
	if ('object' !== typeof biArr || !(Array.isArray(biArr))) {
		throw new TypeError('Invalid Budget Input Array: must be an Array');
	}
	else if (biArr.length < 1) {
		throw new TypeError('Invalid Budget Input Array: Array must not be empty');
	}
	else {
		var valArr = biArr.map((argObj, idx) => {
			if ('object' !== typeof argObj || null === argObj) {
				throw new TypeError('Invalid Budget Input Array: element ' + idx + 'is not an object');
			}
			if ('string' !== typeof argObj.scope_type || '' === argObj.scope_type) {
				throw new TypeError('Invalid Budget Input Array: element ' + idx + 'is missing scope_type');
			}
			if ('label' === argObj.scope_type && ('string' !== typeof argObj.scope_key || '' === argObj.scope_key || 'string' !== typeof argObj.scope_value || '' === argObj.scope_value)) {
				throw new TypeError('Invalid Budget Input Array: element ' + idx + 'is label and missing key/value pair');
			}
			if ('label' !== argObj.scope_type && ('string' !== typeof argObj.scope_id || '' === argObj.scope_id)) {
				throw new TypeError('Invalid Budget Input Array: element ' + idx + 'is not label and missing scope_id');
			}
		});
	}
	return true;
}

function parseJsonFile(filePath) {
	var fileData, parsedData;
	try {
		fileData = fs.readFileSync(filePath).toString();
	}
	catch(e) {
		return e;
	}
	try {
		parsedData = Papa.parse(fileData, getDefaultParserSettings());
	}
	catch(e) {
		return e;
	}
	if (parsedData.errors.length > 0) {
		return parsedData.errors;
	}
	return parsedData.data;
}

function parseCsvToBudgets(budgetFilePath, thresholdFilePath, returnDebug) {
	//return error if no file provided for budgets
	if ('string' !== typeof budgetFilePath || '' === budgetFilePath) {
		return new TypeError('Invalid filePath provided for budget csv');
	}
	if ('boolean' !== typeof returnDebug) {
		returnDebug = false;
	}
	var parsedData, csvStr, thresholdStr, parsedThresholds, budgetObjArray, errorArray = [];
	try {
		csvStr = fs.readFileSync(budgetFilePath).toString();
	}
	//return error if cannot read budget file
	catch(e) {
		e.message = 'Attempt to read budgetFilePath file failed: ' + e.message;
		return e;
	}
	try {
		var parsedDataObj = Papa.parse(csvStr, getDefaultParserSettings());
		if (parsedDataObj.errors.length > 0) {
			errorArray = errorArray.concat(parsedDataObj.errors);
		}
		parsedData = parsedDataObj.data;
	}
	//return error if cannot parse data from budget file
	catch(e) {
		e.message = 'Attempt to parse budgetFilePath file failed: ' + e.message;
		return e;
	}
	try {
		assertBudgetInputArrayIsValid(parsedData);
	}
	catch(e) {
		return e;
	}
	//if provided, try to read file at thresholdFilePath
	if ('string' === typeof thresholdFilePath && '' !== thresholdFilePath) {
		try {
			thresholdStr = fs.readFileSync(thresholdFilePath).toString();
		}
		catch(e) {
			e.message = 'Attempt to read thresholdFilePath file failed: ' + e.message;
			console.warn(e);
			errorArray.push(e);
			thresholdStr = null;
		}
	}
	else {
		thresholdStr = null;
	}
	//if valid data could be read from thresholdFilePath, try parsing JSON
	//if data couldn't be read, or file not provided, or parse fails, use default thresholds
	if (thresholdStr !== null) {
		try {
			var parsedThresholdsData = Papa.parse(thresholdStr, getDefaultParserSettings());
			if (parsedThresholdsData.errors.length > 0) {
				errorArray = errorArray.concat(parsedThresholdsData.errors);
			}
			parsedThresholds = parsedThresholdsData.data;
		}
		catch(e) {
			e.message = 'Attempt to parse thresholdFilePath file failed: ' + e.message;
			console.warn(e);
			errorArray.push(e);
			parsedThresholds = getDefaultThresholds();
		}
	}
	else {
		parsedThresholds = getDefaultThresholds();
	}
	// create array of objs for each budget array item from input
	budgetObjArray = [];
	for (let i = 0; i < parsedData.length; i++) {
		let thisArgs = parsedData[i];
		var localThresh;
		//attempt to parse thresholds from filepath given in budget line item if given
		if ('string' !== typeof thisArgs.thresholds || '' === thisArgs.thresholds) {
			if ('string' === typeof thisArgs.thresholds_filepath && '' !== thisArgs.thresholds_filepath) {
				localThresh = parseJsonFile(thisArgs.thresholds_filepath);
				if ('object' !== typeof localThresh) {
					errorArray.push(new Error('Unable to parse local thresholds for budget #' + i + ', using global'));
					thisArgs.thresholds = parsedThresholds;
				}
				else if (localThresh instanceof Error) {
					errorArray.push(localThresh);
					thisArgs.thresholds = parsedThresholds;
				}
				else if (localThresh[0] instanceof Error) {
					errorArray = errorArray.concat(localThresh.errors);
					thisArgs.thresholds = parsedThresholds;
				}
				else {
					thisArgs.thresholds = localThresh;
				}
			}
			else {
				thisArgs.thresholds = parsedThresholds;
			}
		}
		else if ('string' === typeof thisArgs.thresholds && '' !== thisArgs.thresholds) {
			try {
				localThresh = JSON.parse(thisArgs.thresholds);
			}
			catch(e) {
				errorArray.push(new Error('Unable to parse local thresholds for budget #' + i + ', using global'));
				localThresh = parsedThresholds;
			}
			thisArgs.thresholds = localThresh;
			
		}
		else {
			thisArgs.thresholds = parsedThresholds;
		}
		try {
			budgetObjArray.push(makeSingleScopeBudget(thisArgs, returnDebug));
		}
		catch(e) {
			errorArray.push(e);
		}
		if ((i + 1) >= parsedData.length) {
			return {
				budgets: budgetObjArray,
				errors: errorArray
			}
		}
	}
}

function createBudgetsFromCsv(parentId, budgetsCsv, thresholdCsv) {
	if ('string' !== typeof parentId || '' === parentId) {
		return Promise.reject(new Error('invalid parentId passed to createBudgetsFromCsv; must be string in format "billingAccounts/000000-000000-000000"'));
	}
	return new Promise((resolve, reject) => {
		var budgetsAndErrors = parseCsvToBudgets(budgetsCsv, thresholdCsv);
		if (budgetsAndErrors.budgets.length < 1) {
			if (budgetsAndErrors.errors && Array.isArray(budgetsAndErrors.errors) && budgetsAndErrors.errors.length < 1) {
				return reject(new Error('Unable to create budget objects for... reasons'));
			}
			else {
				return reject(budgetsAndErrors.errors);
			}
		}
		else {
			return createBudgetsFromArray(budgetsAndErrors.budgets, parentId)
			.then((resArr) => {
				return resolve(resArr);
			})
			.catch((e) => {
				return reject(e);
			});
		}
	});
}

module.exports = {
	parseCSVTest,
	budgetClassTest,
	getBudgetList,
	parseCsvToBudgets,
	createBudgetsFromCsv
}