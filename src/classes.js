'use strict';

const excludeCreditsMap = new Map([
	[true, "EXCLUDE_ALL_CREDITS"],
	[false, "INCLUDE_ALL_CREDITS"]
]);

const useForecastedMap = new Map([
	[true, "FORECASTED_SPEND"],
	[false, "CURRENT_SPEND"]
]);

const getValidScopeTypes = function() {
	return [
		'service',
		'project',
		'subaccount',
		'label'
	];
};

class Threshold {
	constructor(percent, useForecasted) {
		this.thresholdPercent = ('number' === typeof percent && percent >= 0) ?
			percent :
			100;
		this.spendBasis = (('boolean' === typeof useForecasted && useForecasted) || ('string' === typeof useForecasted && 'false' !== useForecasted.toLowerCase())) ?
			useForecastedMap.get(true) :
			useForecastedMap.get(false);
	}
}

class ThresholdRules {
	constructor(thresholds) {
		this.rulesArray = thresholds;
	}
	
	getAllRules() {
		var allRules = [];
		for (let i = 0; i < this.rulesArray.length; i++) {
			let thisRule = new Threshold(parseFloat(this.rulesArray[i].percentage), this.rulesArray[i].use_forecasted);
			allRules.push(thisRule);
			if ((i + 1) >= this.rulesArray.length) {
				return allRules;
			}
		}
	}
}

class Notifications {
	constructor(channels, opts) {
		this.schemaVersion = "1.0";
		this.disableDefaultIamRecipients = false;
		if ('undefined' !== typeof channels) {
			if ('string' === typeof channels) {
				this.monitoringNotificationChannels = [
					channels
				];
			}
			else if ('object' === typeof channels && Array.isArray(channels)) {
				this.monitoringNotificationChannels = channels;
			}
		}
		if ('object' === typeof opts && null !== opts) {
			if ('string' === typeof opts.pubSubTopic) {
				this.pubSubTopic = opts.pubSubTopic;
			}
			if ('boolean' === typeof disableDefault) {
				this.disableDefaultIamRecipients = opts.disableDefault;
			}
		}
	}
}

class Money {
	constructor(amount, currency) {
		if ('string' !== typeof currency) {
			currency = 'USD';
		}
		this.currencyCode = currency;
		var amtNum = parseFloat(amount);
		var amtArr = amount.split('.');
		const sign = Math.sign(amtNum);
		this.units = amtArr[0];
		var nanos = ('string' === typeof amtArr[1]) ?
			amtArr[1].substring(0,9) :	// truncated, not rounded!
			0;
		// nanos are, as you might guess, exactly 9 chars long
		if (nanos.length < 9) {
			var nanoDiff = 9 - nanos.length;
			nanos = nanos + "0".repeat(nanoDiff);
		}
		nanos = parseInt(nanos);
		// nanos sign matches whole number sign... for reasons...
		if (sign !== 0) {
			nanos = nanos * sign;
		}
		this.nanos = nanos;
	}
}

class BudgetFilter {
	constructor(scopes, excludeCredits) {
		this.isValid = false;
		if ('object' === typeof scopes && Array.isArray(scopes) && scopes.length > 0) {
			this.isValid = true;
			if ('boolean' === typeof excludeCredits) {
				this.creditTypesTreatment = excludeCreditsMap.get(excludeCredits);
			}
			var filterServices = [];
			var filterProjects = [];
			var filterSubaccounts = [];
			var filterLabels = [];
			var validScopes = getValidScopeTypes();
			this.filters = [];
			for (let i = 0; i < scopes.length; i++) {
				let thisScope = scopes[i];
				if (-1 !== validScopes.indexOf(thisScope.type)) {
					switch(thisScope.type) {
						case validScopes[0]:	//service
							if ('string' === typeof thisScope.id) {
								filterServices.push('services/' + thisScope.id);
							}
							break;
						case validScopes[1]:	//project
							if ('string' === typeof thisScope.id) {
								filterProjects.push('projects/' + thisScope.id);
							}
							break;
						case validScopes[2]:	//subaccount
							if ('string' === typeof thisScope.id) {
								filterSubaccounts.push('billingAccounts/' + thisScope.id);
							}
							break;
						case validScopes[3]:	//label (possibly limited to one?)
							if ('string' === typeof thisScope.key && 'object' === typeof thisScope.values && Array.isArray(thisScope.values)) {
								let thisLabel = {};
								thisLabel[thisScope.key] = thisScope.values;
								filterLabels.push(thisLabel);
							} 
							break;
					}
				}
				if ((i + 1) >= scopes.length) {
					if (filterServices.length > 0) {
						this.services = filterServices;
						this.filters.push('services');
					}
					if (filterProjects.length > 0) {
						this.projects = filterProjects;
						this.filters.push('projects');
					}
					if (filterSubaccounts.length > 0) {
						this.subaccounts = filterSubaccounts;
						this.filters.push('subaccounts');
					}
					if (filterLabels.length > 0) {
						this.labels = filterLabels;
						this.filters.push('labels');
					}
				}
			}
		}
	}
	
	getGenericObj() {
		var genericBudgetFilter = {};
		if ('string' === typeof this.creditTypesTreatment) {
			genericBudgetFilter.creditTypesTreatment = this.creditTypesTreatment;
		}
		if (0 === this.filters.length) {
			return genericBudgetFilter;
		}
		for (let i = 0; i < this.filters.length; i++) {
			genericBudgetFilter[this.filters[i]] = this[this.filters[i]];
			if ((i + 1) >= this.filters.length) {
				return genericBudgetFilter;
			}
		}
	}
}

/**
* Primary class, representing a GCP Budget to be sent in the body of a create call
* 
* @class
* @property	{string}	displayName			- User data for display name in UI. Validation: <= 60 chars.
* @property	{Object}	[budgetFilter]		- Filters that define which resources are used to compute the actual spend against the budget.
* @property {Object}	amount				- Budgeted amount.
* @property {Object[]}	[thresholdRules]	- Rules that trigger alerts (notifications of thresholds being crossed) when spend exceeds the specified percentages of the budget.
* @property	{Object}	[allUpdatesRule]	- Rules to apply to notifications sent based on budget spend and thresholds.
*/
class Budget {
	/**
     * Constructor for class.
     * @param	{string}			name							- User supplied displayName.
     * @param	{string|null}		amount							- Budgeted amount, as a string. Defaults to last month if not provided as string (null is preferred).
     * @param	{Object[]}			[scopes]						- Array of scope objects to define budgetFilter
     * @param	{string}			scopes[].type					- Defined type of scope rule for budgetFilter. Must be one of ['service', 'project', 'subaccount', 'label'].
     * @param	{string}			scopes[].id						- If type is not 'label', this value identifies the GCP id of the service, project, or billing account to limit the scope of the budget by.
     * @param	{string}			scopes[].key					- If type is 'label', this identifies the label key for limiting the budget scope.
     * @param	{string[]}			scopes[].values					- If type is 'label', this identifies the label values that are applicable for the key in limiting the budget scope.
     * @param	{Object[]}			[thresholds]					- Array of threshold objects used to create threshold rules for thresholdRules of Budget. Each object must have a percentage number and may set whether to use forecasted value.
     * @param	{number}			thresholds[].percent			- Percentage of budget amount at which alert is triggered.
     * @param	{boolean}			[thresholds[].useForecasted]	- If set to true, trigger alert when forecast to exceed percentage of budget amount. If unset or false, trigger alert when actual spend exceeds percentage of budget amount.
     * @param	{string|string[]}	[notificationChannels]			- Either single or array of notification channel ids from GCP. The limit is 5 values per budget.
     * @param	{Object}			[opts]							- Various options that set non-default values within the Budget object.
     * @param	{string}			[opts.currency]					- 3 character currency code. If unset, default is USD.
     * @param	{boolean}			[opts.disableDefault]			- If set to true, will disable sending budget alerts to default recipients; if false or unset, default recipients will receive notifications for this budget.
     * @param	{boolean}			[opts.excludeCredits]			- If set to true, will use invoice values prior to applying credits to determine when to trigger alerts; if false or unset, will use payable amounts, post-credits, to trigger alerts.
     * @param	{string}			[opts.pubSub]					- The full name of a PubSub topic to publish alerts to, in the format "projects/{project_id}/topics/{topic_id}". Will not publish to a topic if unset.
     */
	constructor(name, amount, scopes, thresholds, notificationChannels, opts) {
		// set default options
		var options = {
			currency: 'USD',
			disableDefault: false,
			excludeCredits: false
		};
		// throw if required arg not passed
		if ('string' !== typeof name) {
			throw new TypeError('Invalid args passed to Budget constructor');
		}
		// set displayName from name arg, truncate and warn if too long.
		this.displayName = name.trim();
		if (name.length > 60) {
			console.warn('Budget DisplayName longer than allowed 60 chars has been truncated to fit.')
			this.displayName = this.displayName.substring(0, 59);
		}
		// default to month over month if specified amount not provided as string
		if ('string' !== typeof amount) {
			this.amount = {
				"lastPeriodAmount": {}
			};
		}
		// if provided as string, create money object from specified budget amount
		else {
			this.amount = {
				"specifiedAmount": new Money(amount, options.currency)
			};
		}
		// add or change any options values if opts are passed
		if ('object' === typeof opts && null !== opts) {
			if ('string' === typeof opts.currency) {
				options.currency = opts.currency.substring(0, 3).toUpperCase();
			}
			if ('boolean' === typeof opts.disableDefault) {
				options.disableDefault = opts.disableDefault;
			}
			if ('boolean' === typeof opts.excludeCredits) {
				options.excludeCredits = opts.excludeCredits;
			}
			if ('string' === typeof opts.pubSub && '' !== opts.pubSub) {
				options.pubSub = opts.pubSub;
			}
		}
		// generate filter using any provided scopes
		if ('object' === typeof scopes && Array.isArray(scopes)) {
			let theBudgetFilter = new BudgetFilter(scopes, options.excludeCredits);
			if (theBudgetFilter.isValid) {
				this.budgetFilter = theBudgetFilter.getGenericObj();
			}
		}
		// generate thresholdRules using any provided thresholds
		if ('object' === typeof thresholds && Array.isArray(thresholds)) {
			var thresholdRulesObj = new ThresholdRules(thresholds);
			this.thresholdRules = thresholdRulesObj.getAllRules();
		}
		// set allUpdatesRule prop if pubsub, default sending, or notification channels provided
		var setNotify = false;
		var notifyObj = {
			channels: null,
			opts: {}
		};
		if ('string' === typeof notificationChannels || ('object' === typeof notificationChannels && Array.isArray(notificationChannels) && notificationChannels.length > 0)) {
			notifyObj.channels = notificationChannels;
			setNotify = true;
		};
		if ('string' === typeof options.pubSub) {
			notifyObj.opts.pubSubTopic = options.pubSub;
			setNotify = true;
		}
		if ('boolean' === typeof options.disableDefault && options.disableDefault) {
			notifyObj.opts.disableDefault = true;
			setNotify = true;
		}
		if (setNotify) {
			this.allUpdatesRule = new Notifications(notifyObj.channels, notifyObj.opts);
		}
	}
}

module.exports = {
	Threshold,
	Notifications,
	Money,
	BudgetFilter,
	Budget
}