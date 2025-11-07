export interface SortConfiguration {
	fieldName: string;
	direction: 'ASC' | 'DESC';
}

export class OrderByClauseBuilder {
	static build(sorts: SortConfiguration[]): string {
		if (sorts.length === 0) {
			return '';
		}

		const orderParts = sorts.map((sort) => {
			if (!sort.fieldName) {
				throw new Error('Field name is required for sort configuration');
			}

			const direction = sort.direction === 'DESC' ? 'DESC' : 'ASC';

			return `${sort.fieldName} ${direction}`;
		});

		return orderParts.join(',');
	}
}
