# gcp-create-budgets-from-csv
 
## Purpose
Allows for automated creation of budgets for Google Cloud Platform billing accounts using CSV files. Targeted at creating budgets scoped for individual projects, although can be modified to use other scopes. Run from the CLI using a shell interface invoked via the node command (in the shell directory, of course).

## Functional Design
This code incorporates a few elements:

* Node Client for GCP Budget API
* CSV to JSON parser
* ES6 Classes for creating Budget objects and its component objects
* Exported functions in an index file that can be used programmatically or via CLI
* Shell script that calls index functions with an interface for console feedback within CLI

## Installation
Best bet is to clone to a cloud shell in GCP from git repo; it can also be run locally if the gcloud SDK is installed, as well as NodeJS and NPM. 

Assuming those prerequisites are met, once cloned, run `npm install` from within the project directory to install all of the dependencies. Once that's done, from the project's root directory, run `node shell/gcpBudgetFromCSV.js --help` to verify it is working and all dependencies are installed. You should see something similar to the following output rather than error messages if it is set up correctly:

```**********************************
*  HELP FOR GCPBUDGETFROMCSV.JS  *
**********************************
Syntax for gcpBudgetFromCSV.js:
	gcpBudgetFromCSV.js [Command Set] [Action] [arg1]...[arg(n)]
	
Available Command Sets & Actions:
	test
		parser
		budgetClass
		budgetClient
		parserToBudgets
	budgets
		create
```


## Usage

### Module
Although this is designed to be used solely as a CLI shell, the exported functions can be included in a node project. There are no plans to provide this via NPM, so you would need to include via a github source line in your software's package.json file, or manually clone and commit the package. Either way, when imported via "require", the following functions are exposed as properties:

* **parseCSVTest(csvStr)** - returns the result of parsing the argument's string from (assumedly) CSV to JS object structure. This object is the "data" property of the result; other properties are the same resulting from the [parser's output](https://www.papaparse.com/docs#results).
* **budgetClassTest(budgetStr, thresholdStr)** - returns a human-readable string representing a Budget object. In absence of arguments, uses hard-coded constants for the JSON input for budget values and thresholds. Each argument can be used to test a valid JSON string for results against the Budget class's constructor.
* **getBudgetList(parentId, callback)** - returns the result of calling the GCP Budget Client's listBudgets method to the callback function. parentId must be provided as a string, or null, and callback is required. Requires that authentication to GCP be set up for NodeJS runtime environment as described in [Google's documentation](https://cloud.google.com/docs/authentication/getting-started).
* **parseCsvToBudgets(budgetFilePath, thresholdFilePath, returnDebug)** - Returns the result of reading a CSV file and parsing it to an Array of Budget objects. If returnDebug is **true**, will also return the arguments passed to the Budget constructor for each CSV line. The budgetFilePath argument is required, is a string filepath pointing to a local CSV file, and is relative to the process.env.cwd or can be an absolute path. The thresholdFilePath argument is not required, but otherwise follows the same rules as budgetFilePath.
* **createBudgetsFromCsv(budgetsCsv, thresholdCsv)** - This function will actually perform the API request using the GCP library, given a local filepath to the budgets CSV file (budgetsCsv), and, optionally, the thresholds CSV file (thresholdCsv). The file(s) will be parsed, processed into Budget objects, and requested (in parallel) with the createBudget call to the API. Returns a Promise resolved with an array of results from each API call or a rejection with the relevant error.

### CLI
All commands are invoked from the CLI using `node shell/gcpBudgetFromCSV.js`, plus a "command" and an "action", followed by any arguments. All commands and actions also support the --help flag if you need specific docs and syntax within the CLI.

### Testing
Actions in the "test" command set each perform a specific test of the various parts of the module:

* `node shell/gcpBudgetFromCSV.js test parser` - Accepts 1 argument (filePath) and will display a representation of the Object resulting from parsing the file.
* `node shell/gcpBudgetFromCSV.js test budgetClass` - Accepts 0-2 arguments. Displays the Budget object resulting from passing parsed JSON as objects to the class constructor. Can accept JSON representation of budgets and thresholds.
* `node shell/gcpBudgetFromCSV.js test budgetClient` - Accepts 0-1 arguments, and will test the GCP Budget API client by performing a call to listBudgets. Must be authenticated, and can optionally specify parent id. Displays results or errors.
* `node shell/gcpBudgetFromCSV.js test parserToBudgets` - Accepts 1-2 arguments. Will display the resulting object (including arguments passed to constructor) from parsing a budget CSV file and an optional thresholds CSV file, and passing the results to the Budget class constructor, along with any errors encountered. File paths are relative to the cwd that the command is invoked from. This is a good way to verify that the CSV files you want to use are formatted correctly.

### Creating Budgets

As of now, there's only one action in the "budgets" command set: "create"

`node shell/gcpBudgetFromCSV.js budgets create` - Accepts 1-2 arguments, and requires authentication to be set up for the GCP account you need to use. The first, required, argument is a local filepath to the CSV file containing the budget(s) you want to create. The second, optional, argument is a local filepath to the CSV file you want to use to define thresholds for all budgets (absent other threshold definitions). Thresholds can be assigned to each budget using one of these methods, in order of precedence:

1. Within the budgets CSV file, the "thresholds" column can be filled with (properly escaped and valid) JSON string defining the thresholds to be used for the defined budget on that line.
2. Within the budgets CSV file, the "thresholds_filepath" column can be filled with a string pointing to a local CSV file containing thresholds to be used for the defined budget on that line.
3. The second argument can point to a CSV file containing threshold definitions to be used for all budgets that do not have valid thresholds defined in the "thresholds" column or the "thresholds_filepath" column of the budgets CSV file, i.e. the default thresholds for all budgets.
4. If the second argument is not defined or is invalid, a hardcoded (and quite extensive) set of default thresholds will be used for each budget that does not have thresholds or thresholds_filepath defined in the budget CSV. This is the default default.

### CSV File Formatting

Input files need to follow the formats given in the 'example' directory. The 'scopeAndBudget.csv' file is an example of a budget file that can be used as the first argument for 'budgets create'. The 'thresholds.csv' file is an example of a thresholds file that may be used to define thresholds for a budget (in the budget CSV or as the second argument of 'budgets create'). Headers are *required*, but the order is not important. All values are strings, cuz that's how CSV rolls.

**Budgets CSV Columns**

* *display_name* - optional - The name of your budget. Will always be appended with a random string to keep things unique. If not provided, will be generated from the scope type.
* *scope_type* - required - Define the scope (just one type supported in this interface) as one of: project, service, subaccount, or label.
* *scope_id* - required if not type 'label' - The GCP identifier for the project, service, or subaccount the budget will be applied to.
* *scope_key* - required if type is 'label' - The label key that is used to limit the scope of your budget.
* *scope_value* - required if type is 'label' - The label value that is used for the label key to limit the scope of your budget.
* *budget_amt* - optional - The dollar amount (in USD) for monthly spend for the budget. If omitted, will change budget to use previous month's spend instead of static amount.
* *thresholds* - optional - A valid, escaped JSON string representing an array of objects that have properties "percentage" (numerical percentage of budget amount) and "use_forecasted" (boolean true to set threshold when predicted to hit % by months end, false to trigger when actual spending hits %). Will override thresholds_filepath, any thresholds in the thresholdCsv argument file, and default thresholds.
* *thresholds_filepath* - optional - A string containing a local filepath pointing to a CSV file containing the thresholds you want to use for this budget. Overrides any thresholds in the thresholdCsv argument file, and default thresholds.
* *pubSubTopic* - optional - The GCP identifier for a Pub/Sub topic to send any alert events for this budget to.
* *notification_channel_1...5* - optional - Each of these columns (5 is the max currently supported by GCP) define a notification channel to send alerts for this budget to.

**Thresholds CSV Columns**

* *percentage* - required - Float >= 0, represents the percentage of the monthly budget amount at which an alert will be triggered.
* *use_forecasted* - required - true or false, (boolean string) determines whether the forecasted value or actual spend will trigger for this percentage threshold. Same percentage can be used for a line with this value true and a line with this value false.