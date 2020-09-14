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

