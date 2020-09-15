'use strict';

const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const localFns = require('../index');

var commandSets = {
	test: [
		"parser"
	]
};

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
	console.log('	shell.js ' + action + ' ' + syntax);
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

	console.log('Unrecognized Action "' + action + '" for Command Set "' + commandSet + '". (use shell.js ' + commandSet + ' -h for list of available Actions)');

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

// Command functions

//test csv parser and view result object
//usage:
//	gcpBudgetFromCSV.js test parser filePath
function parserTest(filePath) {
	if ('undefined' !== typeof filePath && ('-h' === filePath || '--help' === filePath || 'help' === filePath)) {
		actionHelp("test parser", 'Test CSV parser by parsing file at specified filePath and displaying resulting object.', '[filePath]');
		return process.exit();
	}
	if ('string' !== typeof filePath || '' === filePath) {
		console.log('No filePath defined.');
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

// Input Processing