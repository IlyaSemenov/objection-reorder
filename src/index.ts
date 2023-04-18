import { QueryBuilder } from "objection"
import { Model, PartialModelObject, raw } from "objection"

export async function reorder<M extends Model>(
	query: QueryBuilder<M, M[]>,
	update: PartialModelObject<M>
) {
	const id_column = query.modelClass().idColumn
	if (typeof id_column !== "string") {
		throw new Error("Composite IDs not yet supported.")
	}

	const id = update[id_column as keyof PartialModelObject<M>]
	if (id === undefined) {
		throw new Error("Missing ID in update.")
	}

	const other_keys = Object.keys(update).filter((key) => key !== id_column)
	if (other_keys.length === 0) {
		throw new Error("Update must have new position.")
	} else if (other_keys.length > 1) {
		throw new Error(
			"Update must have only ID and new position, no extra columns."
		)
	}
	const sort_order_column = other_keys[0]
	const position = update[sort_order_column as keyof PartialModelObject<M>]
	if (
		typeof position !== "number" ||
		position < 0 ||
		Math.floor(position) !== position
	) {
		throw new Error("Position must be a non-negative integer.")
	}

	// Operate inside a nested transaction
	await query
		.modelClass()
		.transaction(query.context().transaction, async (trx) => {
			// Let's say the target position is 5.
			// For all objects that will have position >5, increase their order_field by 2.
			const updated = await query
				.clone()
				.transacting(trx)
				.whereIn(
					id_column,
					query
						.clone()
						.select(id_column)
						.where(id_column, "!=", id)
						.orderBy(sort_order_column)
						.offset(position)
				)
				.update({
					[sort_order_column]: raw("?? + 2", sort_order_column),
				} as PartialModelObject<M>)

			// Then set target object's position to order_field of the first affected row (minus 1),
			// or, if there were none, to maximum order_field across all query (plus 1).
			await query
				.clone()
				.transacting(trx)
				.where(id_column, id)
				.update({
					[sort_order_column]: updated
						? query
								.clone()
								.select(raw("?? - 1", sort_order_column))
								.where(id_column, "!=", id)
								.orderBy(sort_order_column)
								.offset(position)
								.limit(1)
						: query.clone().select(raw("max(??) + 1", sort_order_column)),
				} as PartialModelObject<M>)
		})
}
