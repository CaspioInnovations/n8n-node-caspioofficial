export interface FilterCondition {
	fieldName: string;
	operator: string;
	value?: string;
}

export class WhereClauseBuilder {
	private static readonly operatorMap: Record<string, (filter: FilterCondition) => string> = {
		'equals': (f) => `${f.fieldName} = '${f.value}'`,
		'notEquals': (f) => `${f.fieldName} != '${f.value}'`,
		'contains': (f) => `${f.fieldName} LIKE '%${f.value}%'`,
		'greaterThan': (f) => `${f.fieldName} > ${f.value}`,
		'greaterThanOrEqual': (f) => `${f.fieldName} >= ${f.value}`,
		'lessThan': (f) => `${f.fieldName} < ${f.value}`,
		'lessThanOrEqual': (f) => `${f.fieldName} <= ${f.value}`,
		'isEmpty': (f) => `(${f.fieldName} IS NULL OR ${f.fieldName} = '')`,
		'isNotEmpty': (f) => `(${f.fieldName} IS NOT NULL AND ${f.fieldName} != '')`,
		'isTrue': (f) => `${f.fieldName} = 1`,
		'isFalse': (f) => `${f.fieldName} = 0`,
	};

	private static readonly operatorsWithoutValue = ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'];

	static build(filters: FilterCondition[]): string {
		if (!filters || filters.length === 0) {
			return '';
		}

		const whereParts = filters.map((filter, index) => {
			this.validateFilter(filter, index);

			const builder = this.operatorMap[filter.operator] || this.operatorMap['equals'];
			return builder(filter);
		});

		return whereParts.join(' AND ');
	}

	static validateFilter(filter: FilterCondition, index: number): void {
		if (!filter.fieldName) {
			throw new Error(`Field name is required for filter condition ${index + 1}`);
		}

		if (!filter.operator) {
			throw new Error(`Operator is required for filter condition ${index + 1}`);
		}

		if (!this.operatorsWithoutValue.includes(filter.operator) &&
			(!filter.value && filter.value !== '0')) {
			throw new Error(`Value is required for filter condition ${index + 1} with operator "${filter.operator}"`);
		}
	}

	static getOperatorsWithoutValue(): string[] {
		return [...this.operatorsWithoutValue];
	}
}