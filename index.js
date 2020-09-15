'use strict';

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

function parseCSVTest(csvStr) {
	return Papa.parse(csvStr, getDefaultParserSettings());
}


module.exports = {
	parseCSVTest
}