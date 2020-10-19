'use strict';

const EOL = require('os').EOL;
const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const localFns = require('../index');

/**
 * Command validation set
 * All available shell commands need to be listed in hierarchy here.
 */
var commandSets = {
	test: [
		"parser",
		"budgetClass",
		"budgetClient",
		"parserToBudgets"
	],
	budgets: [
		"create"
	]
};

/**
 * Output helper functions
 */

// outputs array of objects as table with properly spaced headers for each obj property and index for each element
function arrayWithIdx(ar) {

		var topline = '  index';
		var divider = '-------';
		var logLines = [];
		var padding = 4;
		var leftPad = 3;
		var headers = new Map();
		ar.forEach(function(arEl) {
		
			var theseKeys = Object.keys(arEl);
			theseKeys.forEach(function(key) {
			
				var thisHead = headers.get(key);
				var thisLen = 'string' === typeof arEl[key] ? arEl[key].length : 0;
				if ('undefined' === typeof thisHead) {
				
					headers.set(
						key,
						{
							kLen: key.length,
							maxLen: thisLen
						}
					);
				
				}
				else {
				
					thisHead.maxLen = thisHead.maxLen < thisLen ? thisLen : thisHead.maxLen;
				
				}
			
			});
		
		});
		var logHeaders = function(value, key) {
		
			for (let sp = value.maxLen + padding - value.kLen; sp > 0; sp--) {
			
				topline += ' ';
			
			}
			topline += key;
			for (let dsh = value.maxLen + padding; dsh > 0; dsh--) {
			
				divider += '-';
			
			}
		
		};
		headers.forEach(logHeaders(v, k));
		for (let i = 0; i < ar.length; i++) {
		
			var logLine = '';
			for (let sp = leftPad + padding - i.toString().length; sp > 0; sp--) {
			
				logLine += ' ';
			
			}
			logLine += i.toString();
			headers.forEach(function(val, col) {
			
				var valLen = 'string' === typeof ar[i][col] ? ar[i][col].length : 0;
				
				for (let sp = val.maxLen + padding - valLen; sp > 0; sp--) {
				
					logLine += ' ';
				
				}
				logLine += 0 ===  valLen ? '' : ar[i][col];
			
			});
			logLines[i] = logLine;
		
		}
		console.log(topline);
		console.log(divider);
		logLines.forEach(function(el) {
		
			console.log(el);
		
		});

}

function actionHelp(action, description, syntax, helpText) {

	titleBlock('help for ' + action);
	console.log(description);
	console.log('Syntax for "' + action + '":');
	console.log('	gcpBudgetFromCSV.js ' + action + ' ' + syntax);
	if ('undefined' !== typeof helpText && helpText) {
	
		console.log(helpText);
	
	}

}

function commandSetHelp(commandSet, helpText) {

	titleBlock('help for ' + commandSet);
	console.log('Available Actions for ' + commandSet + ':');
	var actions = commandSets[commandSet];
	for (let action in actions) {
	
		if ('string' === typeof actions[action]) {
		
			console.log('	' + actions[action]);
		
		}
	
	}
	if ('undefined' !== typeof helpText && helpText) {
	
		console.log(helpText.toString());
	
	}

}

function unrecognizedAction(commandSet, action) {

	console.log('Unrecognized Action "' + action + '" for Command Set "' + commandSet + '". (use gcpBudgetFromCSV.js ' + commandSet + ' -h for list of available Actions)');

}

function titleBlock(title) {

	title = (title).toUpperCase();
	var titleLine = '******';
	for (let sp = 0; sp < title.toString().length; sp++) {

		titleLine += '*';

	}
	console.log(titleLine);
	console.log('*  ' + title + '  *');
	console.log(titleLine);

}

/**
 * Command functions
 */

//test csv parser and view result object
//usage:
//	gcpBudgetFromCSV.js test parser filePath
function parserTest(filePath) {
	if ('undefined' !== typeof filePath && ('-h' === filePath || '--help' === filePath || 'help' === filePath)) {
		actionHelp("test parser", 'Test CSV parser by parsing file at specified filePath and displaying resulting object.', 'filePath');
		return process.exit();
	}
	if ('string' !== typeof filePath || '' === filePath) {
		console.log('No filePath defined. Use -h to see help for this action');
		return process.exit();
	}
	var parsedData, csvStr;
	try {
		csvStr = fs.readFileSync(filePath).toString();
	}
	catch(e) {
		console.log(e.message);
		return process.exit();
	}
	try {
		parsedData = localFns.parseCSVTest(csvStr);
	}
	catch(e) {
		console.log(e.message);
		return process.exit();
	}
	titleBlock("Result from parsing file '" + filePath + "':");
	console.log(parsedData);
	return process.exit();
}

//test budget class and view result test object; may pass json string for budget and threshold
//usage:
//	gcpBudgetFromCSV.js test budgetClass <budgetJSON> <thresholdJSON>
function budgetClassTest(budgetJSON, thresholdJSON) {
	if ('undefined' !== typeof budgetJSON && ('-h' === budgetJSON || '--help' === budgetJSON || 'help' === budgetJSON)) {
		actionHelp("test budgetClass", 'Test budget object class by parsing file at specified filePath and displaying resulting object.', '[budgetJSON] [thresholdJSON]', 'This will pass values from a default set of budget and threshold values if no JSON strings are passed to budgetJSON or thresholdJSON.' + EOL + ' It is possible to test with just budgetJSON using default thresholds as well.');
		return process.exit();
	}
	var result;
	try {
		if ('string' !== typeof budgetJSON || '' === budgetJSON) {
			result = localFns.budgetClassTest();
		}
		else if ('string' !== typeof thresholdJSON || '' === thresholdJSON) {
			result = localFns.budgetClassTest(budgetJSON);
		}
		else {
			result = localFns.budgetClassTest(budgetJSON, thresholdJSON);
		}
	}
	catch(e) {
		console.log(e.message);
		return process.exit();
	}
	titleBlock("Result from Budget Class test:");
	console.log(result);
	return process.exit();
}

//test budget client with request to get budget list and view result object; may pass parent id
//usage:
//	gcpBudgetFromCSV.js test budgetClient <parentId>
function budgetClientTest(arg) {
	if ('undefined' !== typeof arg && ('-h' === arg || '--help' === arg || 'help' === arg)) {
		actionHelp("test budgetClient", 'Test access to the budget client for your credentials. May specify a parent billing account ID in arg.', '[parentId]', 'Credentials for Google Cloud must be set in environment var GOOGLE_APPLICATION_CREDENTIALS if not run within a GCP resource.');
		return process.exit();
	}
	titleBlock("Result from Budget Client test:");
	if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		console.log('no credentials available for Google Cloud authentication.');
		return process.exit();
	}
	console.log('Google Cloud credentials provided...');
	var parentId = 'string' === typeof arg ? arg : null;
	localFns.getBudgetList(parentId, (er, res) => {
		if (er) {
			console.log(util.inspect(er, {showHidden: false, depth: null}));
			return process.exit();
		}
		else {
			console.log(util.inspect(res, {showHidden: false, depth: null}));
			return process.exit();
		}
	});
}

//test creating array of budget objects using values from CSV; 
//must include filePath to scoped budgets CSV file, 
//may include filePath to a CSV with thresholds to use for all members of scoped budgets file without defined thresholds or thresholds_file column value
//usage:
//	gcpBudgetFromCSV.js test parserToBudgets budgetsCsvPath <thresholdsCsvPath>
function parserToBudgetsTest(budgetsCsvPath, thresholdsCsvPath) {
	if ('undefined' !== typeof budgetsCsvPath && ('-h' === budgetsCsvPath || '--help' === budgetsCsvPath || 'help' === budgetsCsvPath)) {
		actionHelp("test parserToBudgets", 'Test full process of creating array of budget objects using values from CSV file', 'budgetsCsvPath [thresholdsCsvPath]', 'Must include filePath to scoped budgets CSV file, ' + EOL + 'Optionally use a filePath to a CSV with thresholds for all members of scoped budgets file without defined thresholds or thresholds_file column value.');
		return process.exit();
	}
	var budgetsAndErrors = localFns.parseCsvToBudgets(budgetsCsvPath, thresholdsCsvPath, true);
	console.log(util.inspect(budgetsAndErrors, {showHidden: false, depth: null}));
	return process.exit();
	if (budgetsAndErrors.budgets.length > 0) {
		console.log('Budget Objects Array:');
		console.log(util.inspect(budgetsAndErrors.budgets, {showHidden: false, depth: null}));
	}
	else {
		console.log('No valid budget objects created.');
	}
	if (budgetsAndErrors.errors.length > 0) {
		console.log('Errors:');
		console.log(util.inspect(budgetsAndErrors.errors, {showHidden: false, depth: null}));
	}
	else {
		console.log('No errors creating budget objects array.');
	}
	return process.exit();
}

//use budget client to send request to create budget(s) using values from CSV; 
//must include filePath to scoped budgets CSV file, 
//may include filePath to a CSV with thresholds to use for all members of scoped budgets file without defined thresholds or thresholds_file column value
//usage:
//	gcpBudgetFromCSV.js create budgets parentId budgetsCsvPath <thresholdsCsvPath>
function createBudgets(parentId, budgetsCsvPath, thresholdsCsvPath) {
	if ('undefined' !== typeof parentId && ('-h' === parentId || '--help' === parentId || 'help' === parentId)) {
		actionHelp("create budgets", 'Connect to budget client to send request to create budget(s) using values from CSV file', 'parentId budgetsCsvPath [thresholdsCsvPath]', 'Must include a parentId in the form of "billingAccounts/123456-78910A-BCDEF0"' + EOL + 'and a filePath to scoped budgets CSV file.' + EOL + 'Optionally use a filePath to a CSV with thresholds for all members of scoped budgets file without defined thresholds or thresholds_file column value.');
		return process.exit();
	}
	titleBlock("Result from createBudgets:");
	return localFns.createBudgetsFromCsv(parentId, budgetsCsvPath, thresholdsCsvPath, (error, results) => {
		if (error) {
			if (error instanceof Error) {
				console.log(util.inspect(error, {showHidden: false, depth: null}));
			}
			if ('object' === typeof results && null !== results && 'object' === typeof results.errors) {
				console.log("known errors: \n");
				console.log(util.inspect(results.errors, {showHidden: false, depth: null}))
			}
			return process.exit();
		}
		console.log(util.inspect(results, {showHidden: false, depth: null}));
		return process.exit();
	});
}

/**
 * Input Processing
 */
// Parse CLI args
var args = [];
var i = 0;
process.argv.slice(2).forEach(function (arg) {
    args[i] = arg;
    i++;
});
// Call command function matching args
switch (args[0]) {
	case "test":
		switch(args[1]) {
			case 'parser': 
				parserTest(args[2]);
				break;
			case 'budgetClass': 
				budgetClassTest(args[2], args[3]);
				break;
			case 'budgetClient':
				budgetClientTest(args[2]);
				break;
			case 'parserToBudgets':
				parserToBudgetsTest(args[2], args[3]);
				break;
			case undefined:
			case '-h':
			case '--help':
			case 'help':
				commandSetHelp(args[0]);
				break;
			default:
				unrecognizedAction(args[0], args[1]);
		}
		break;
	case "budgets":
		switch(args[1]) {
			case 'create': 
				createBudgets(args[2], args[3], args[4]);
				break;
			case undefined:
			case '-h':
			case '--help':
			case 'help':
				commandSetHelp(args[0]);
				break;
			default:
				unrecognizedAction(args[0], args[1]);
		}
		break;
	case undefined:
	case '-h':
	case '--help':
	case 'help':
		titleBlock('help for gcpBudgetFromCSV.js');
		console.log('Syntax for gcpBudgetFromCSV.js:');
		console.log('	gcpBudgetFromCSV.js [Command Set] [Action] [arg1]...[arg(n)]');
		console.log('	');
		console.log('Available Command Sets & Actions:');
		var help = Object.keys(commandSets);
		for (let cSet in help) {
		
			if ('string' === typeof help[cSet]) {
			
				console.log('	' + help[cSet]);
				if ('object' === typeof commandSets[help[cSet]]) {
				
					for (let cAction in commandSets[help[cSet]]) {
					
						if ('string' === typeof commandSets[help[cSet]][cAction]) {
						
							console.log('		' + commandSets[help[cSet]][cAction]);
						
						}
					
					}
					
				}
			
			}
		
		}
		process.exit();
		break;
	default:
		console.log('Unrecognized Command Set: "' + args[0] + '". (use gcpBudgetFromCSV.js -h for list of available Command Sets)');

}