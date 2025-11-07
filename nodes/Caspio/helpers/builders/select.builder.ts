export interface FieldConfiguration {
	fieldName: string;
	aggregate?: boolean;
	aggregationType?: string;
	alias?: string;
}

export class SelectClauseBuilder {
	static build(fields: FieldConfiguration[]): {
		select: string;
		groupBy?: string;
		isAggregateOnly: boolean;
	} {
		if (!fields || fields.length === 0) {
			return { select: '', isAggregateOnly: false };
		}

		const selectParts: string[] = [];
		const groupByFields: string[] = [];
		let hasAggregations = false;

		fields.forEach((field) => {
			if (field.aggregate) {
				hasAggregations = true;
				const aggType = field.aggregationType || 'COUNT';

				let aggExpression: string;
				if (aggType === 'COUNT(DISTINCT') {
					aggExpression = `COUNT(DISTINCT ${field.fieldName})`;
				} else {
					aggExpression = `${aggType}(${field.fieldName})`;
				}

				if (field.alias) {
					selectParts.push(`${aggExpression} AS ${field.alias}`);
				} else {
					selectParts.push(aggExpression);
				}
			} else {
				selectParts.push(field.fieldName);
				groupByFields.push(field.fieldName);
			}
		});

		const result = {
			select: selectParts.join(','),
			isAggregateOnly: false as boolean,
		} as { select: string; groupBy?: string; isAggregateOnly: boolean };

		if (hasAggregations) {
			if (groupByFields.length > 0) {
				result.groupBy = groupByFields.join(',');
			} else {
				result.isAggregateOnly = true;
			}
		}

		return result;
	}
}
